const Product = require('../models/productModel');
const { MAX_PRODUCT_IMAGES } = require('../models/productModel');
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');
const auditLogger = require('../utils/auditLogger');
const {
  calculatePagination,
  formatSimplePaginatedResponse,
} = require('../utils/paginationUtil');

// Fields captured in audit logs for product create/update/delete events.
// Excludes binary/large fields and any system-managed metadata.
const AUDITABLE_PRODUCT_FIELDS = [
  'id',
  'name',
  'price',
  'originalPrice',
  'category',
  'description',
  'countInStock',
  'tag',
  'rating',
  'reviews',
  'reviewsCount',
  'concern',
  'ingredients',
  'usage',
  'benefits',
  'image',
  'images',
];

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB per file

const snapshotProduct = (product) => {
  if (!product) return null;
  const source = typeof product.toObject === 'function' ? product.toObject() : product;
  const snapshot = {};
  for (const field of AUDITABLE_PRODUCT_FIELDS) {
    if (source[field] !== undefined) snapshot[field] = source[field];
  }
  return snapshot;
};

const slugify = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const isCloudinaryConfigured = () =>
  !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

/**
 * Stream a single multer-parsed file buffer to Cloudinary and return the
 * resulting `secure_url`.
 */
const uploadBufferToCloudinary = async (file) => {
  const b64 = Buffer.from(file.buffer).toString('base64');
  const dataURI = `data:${file.mimetype};base64,${b64}`;

  const response = await cloudinary.uploader.upload(dataURI, {
    folder: 'ruvia_products',
    resource_type: 'image',
    quality: 'auto',
    fetch_format: 'auto',
  });

  return response.secure_url;
};

/**
 * Validate a single file (mime + size) and throw a tagged error on failure.
 * The wrapping route handler converts the tag into a 400 response.
 */
const assertImageFileValid = (file) => {
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    const err = new Error('Only JPEG, PNG, and WebP images are allowed');
    err.statusCode = 400;
    throw err;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    const err = new Error('Image size must be less than 5MB');
    err.statusCode = 400;
    throw err;
  }
};

/**
 * Collect every file the admin sent in this request, regardless of which
 * field name they used. The upload middleware mounts the route with
 * `multer.fields([{ name: 'image' }, { name: 'images' }])`, so files arrive
 * in `req.files.image` or `req.files.images`. We treat the first file in
 * `image` (legacy single-file uploads) as the new primary, then append the
 * `images` array. Order is preserved.
 */
const collectUploadedFiles = (req) => {
  const buckets = req.files || {};
  const single = Array.isArray(buckets.image) ? buckets.image : [];
  const multi = Array.isArray(buckets.images) ? buckets.images : [];
  return [...single, ...multi];
};

/**
 * Parse the `keepImages` field on update requests. Sent as a JSON-encoded
 * array of Cloudinary URLs the admin wants to retain. Falls back to an
 * empty array when missing or malformed so an absent field implies "drop
 * everything and replace with newly uploaded files".
 */
const parseKeepImages = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((s) => typeof s === 'string' && s.length > 0);
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => typeof s === 'string' && s.length > 0);
  } catch (_e) {
    return [];
  }
};

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { skip, limit, page } = calculatePagination(
      req.query.page,
      req.query.limit
    );
    const sort = req.query.sort || '-createdAt';
    const { category, search } = req.query;

    const query = {};
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query).sort(sort).skip(skip).limit(limit),
    ]);

    res.json(formatSimplePaginatedResponse(products, page, limit, total));
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error while fetching products' });
  }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });

    if (product) {
      res.json(product);
      return;
    }

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      const fallbackProduct = await Product.findById(req.params.id);
      if (fallbackProduct) {
        res.json(fallbackProduct);
        return;
      }
    }

    res.status(404).json({ message: 'Product not found' });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching product' });
  }
};

// @desc    Create a product (Admin)
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res
        .status(503)
        .json({ message: 'Image upload is disabled (Cloudinary not configured)' });
    }

    const incoming = collectUploadedFiles(req);

    if (incoming.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }
    if (incoming.length > MAX_PRODUCT_IMAGES) {
      return res.status(400).json({
        message: `A product can have at most ${MAX_PRODUCT_IMAGES} images`,
      });
    }

    // Validate each uploaded file before any Cloudinary calls — bail early on
    // bad mime/size so we don't burn a slot mid-upload.
    for (const file of incoming) assertImageFileValid(file);

    let uploadedUrls = [];
    try {
      uploadedUrls = await Promise.all(incoming.map((f) => uploadBufferToCloudinary(f)));
    } catch (cloudinaryError) {
      console.error('Cloudinary upload error:', cloudinaryError);
      return res.status(500).json({
        message: 'Failed to upload image(s) to Cloudinary',
        error: cloudinaryError.message,
      });
    }

    const {
      name,
      price,
      category,
      description,
      countInStock,
      originalPrice,
      tag,
      id,
      rating,
      reviews,
      reviewsCount,
      concern,
      ingredients,
      usage,
      benefits,
    } = req.body;

    if (!name || !price || !category) {
      return res
        .status(400)
        .json({ message: 'Name, price, and category are required' });
    }

    const product = new Product({
      id: id || slugify(name),
      name,
      price: parseFloat(price),
      category,
      // Primary image is the first uploaded URL. The pre-save hook will
      // ensure `image` and `images[0]` agree.
      image: uploadedUrls[0],
      images: uploadedUrls,
      description,
      countInStock: parseInt(countInStock) || 0,
      originalPrice: originalPrice ? parseFloat(originalPrice) : parseFloat(price),
      tag,
      rating: rating ? parseFloat(rating) : 0,
      reviews: reviews ? parseInt(reviews) : 0,
      reviewsCount: reviewsCount ? parseInt(reviewsCount) : 0,
      concern,
      ingredients: Array.isArray(ingredients) ? ingredients : [],
      usage,
      benefits: Array.isArray(benefits) ? benefits : [],
    });

    const createdProduct = await product.save();

    auditLogger.logAdminAction({
      adminId: req.user?._id,
      action: 'create',
      resource: 'product',
      resourceId: createdProduct._id,
      changes: { after: snapshotProduct(createdProduct) },
      ipAddress: req.ip,
    });

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Create product error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: 'Failed to create product', error: error.message });
  }
};

// @desc    Update a product (Admin)
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res
        .status(503)
        .json({ message: 'Image upload is disabled (Cloudinary not configured)' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const beforeSnapshot = snapshotProduct(product);

    // The admin tells us which existing URLs to retain via `keepImages`. New
    // file uploads are appended after the retained ones. The final array is
    // then capped at MAX_PRODUCT_IMAGES.
    const keep = parseKeepImages(req.body.keepImages);
    const incoming = collectUploadedFiles(req);

    for (const file of incoming) assertImageFileValid(file);

    if (keep.length + incoming.length > MAX_PRODUCT_IMAGES) {
      return res.status(400).json({
        message: `A product can have at most ${MAX_PRODUCT_IMAGES} images`,
      });
    }

    let uploadedUrls = [];
    if (incoming.length > 0) {
      try {
        uploadedUrls = await Promise.all(
          incoming.map((f) => uploadBufferToCloudinary(f))
        );
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        return res.status(500).json({
          message: 'Failed to upload image(s) to Cloudinary',
          error: cloudinaryError.message,
        });
      }
    }

    let nextImages;
    if (req.body.keepImages !== undefined || incoming.length > 0) {
      // Caller intentionally edited the gallery (via keepImages or new
      // uploads). Recompose from scratch.
      nextImages = [...keep, ...uploadedUrls];
    } else {
      // No gallery edits in this request — leave existing images alone.
      nextImages = Array.isArray(product.images) ? product.images : [];
    }

    if (nextImages.length === 0) {
      return res
        .status(400)
        .json({ message: 'A product needs at least one image' });
    }

    // Optional: explicit primary chosen by the admin (must already be in the
    // resulting gallery). Falls back to images[0].
    let primary = product.image;
    if (typeof req.body.primaryImage === 'string' && req.body.primaryImage.length > 0) {
      if (nextImages.includes(req.body.primaryImage)) {
        primary = req.body.primaryImage;
      } else {
        return res.status(400).json({
          message: 'primaryImage must be one of the gallery images',
        });
      }
    } else if (!nextImages.includes(primary)) {
      // Current primary was just removed; promote the first remaining image.
      primary = nextImages[0];
    }

    const {
      name,
      price,
      category,
      description,
      countInStock,
      originalPrice,
      tag,
      id,
      rating,
      reviews,
      reviewsCount,
      concern,
      ingredients,
      usage,
      benefits,
    } = req.body;

    if (name) product.name = name;
    if (price) product.price = parseFloat(price);
    if (category) product.category = category;
    if (description) product.description = description;
    if (countInStock !== undefined) product.countInStock = parseInt(countInStock);
    if (originalPrice) product.originalPrice = parseFloat(originalPrice);
    if (tag) product.tag = tag;
    if (id) product.id = id;
    if (rating !== undefined) product.rating = parseFloat(rating);
    if (reviews !== undefined) product.reviews = parseInt(reviews);
    if (reviewsCount !== undefined) product.reviewsCount = parseInt(reviewsCount);
    if (concern) product.concern = concern;
    if (ingredients) product.ingredients = Array.isArray(ingredients) ? ingredients : [];
    if (usage) product.usage = usage;
    if (benefits) product.benefits = Array.isArray(benefits) ? benefits : [];

    product.images = nextImages;
    product.image = primary;

    const updatedProduct = await product.save();

    auditLogger.logAdminAction({
      adminId: req.user?._id,
      action: 'update',
      resource: 'product',
      resourceId: updatedProduct._id,
      changes: { before: beforeSnapshot, after: snapshotProduct(updatedProduct) },
      ipAddress: req.ip,
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({
      message: 'Server error while updating product',
      error: error.message,
    });
  }
};

// @desc    Delete a product (Admin)
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);

    auditLogger.logAdminAction({
      adminId: req.user?._id,
      action: 'delete',
      resource: 'product',
      resourceId: product._id,
      changes: { before: snapshotProduct(product) },
      ipAddress: req.ip,
    });

    res.json({ message: 'Product removed successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error while deleting product' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};

const mongoose = require('mongoose');

// Hard cap on the gallery size. Cloudinary can handle far more than this,
// but the admin UI/UX (and the storefront detail page thumbnail strip) gets
// unwieldy past ~5 images per product.
const MAX_PRODUCT_IMAGES = 5;

const productSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    id: { type: String, required: true, unique: true, index: true },
    tag: { type: String },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    category: { type: String, required: true },

    // Primary / cover image (Cloudinary URL). Kept as a top-level required
    // field for backwards compatibility — every storefront card / cart /
    // wishlist render uses `product.image`. The pre-save hook keeps this in
    // sync with the gallery: when `images` is set and `image` is missing, we
    // promote `images[0]` to `image`.
    image: { type: String, required: true },

    // Full image gallery (Cloudinary URLs). The first entry is treated as the
    // primary by convention, mirrored into `image`.
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length <= MAX_PRODUCT_IMAGES,
        message: `A product can have at most ${MAX_PRODUCT_IMAGES} images`,
      },
    },

    description: { type: String },
    concern: { type: String },
    ingredients: [{ type: String }],
    usage: { type: String },
    benefits: [{ type: String }],
    countInStock: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// Keep `image` and `images` in sync. We never want a product where the
// primary image and the first gallery image disagree, and we never want
// `image` to be empty when `images` has values.
productSchema.pre('save', function (next) {
  if (Array.isArray(this.images) && this.images.length > 0) {
    // Promote the first gallery image to the primary slot when no primary
    // is set, or when the current primary is no longer in the gallery
    // (e.g. admin removed it).
    if (!this.image || !this.images.includes(this.image)) {
      this.image = this.images[0];
    }
  } else if (this.image) {
    // No gallery yet but we have a primary -> seed a single-entry gallery
    // so the storefront can iterate uniformly later.
    this.images = [this.image];
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
module.exports.MAX_PRODUCT_IMAGES = MAX_PRODUCT_IMAGES;

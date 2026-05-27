const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateUploadFields } = require('../middleware/uploadMiddleware');
const {
  validateProductListQuery,
  validateObjectId,
  handleValidationErrors,
} = require('../middleware/inputValidationMiddleware');
const { MAX_PRODUCT_IMAGES } = require('../models/productModel');

// Allow either `image` (single, legacy admin form) or `images` (multi-file
// gallery). The controller stitches both buckets into a single ordered list.
const productImageUpload = () =>
  validateUploadFields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: MAX_PRODUCT_IMAGES },
  ]);

router
  .route('/')
  .get(validateProductListQuery, getProducts)
  .post(protect, admin, productImageUpload(), createProduct);

router
  .route('/:id')
  .get(validateObjectId, handleValidationErrors, getProductById)
  .put(
    protect,
    admin,
    validateObjectId,
    handleValidationErrors,
    productImageUpload(),
    updateProduct
  )
  .delete(protect, admin, validateObjectId, handleValidationErrors, deleteProduct);

module.exports = router;

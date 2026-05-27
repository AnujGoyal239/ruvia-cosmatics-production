const multer = require('multer');
const {
  validateUploadedFile,
  sanitizeFilename,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
} = require('../utils/fileUploadValidator');

/**
 * Upload middleware
 *
 * Uses multer with in-memory storage (buffers are streamed directly to
 * Cloudinary), so files never touch the local filesystem / web root. We layer
 * the file upload validator on top of multer to:
 *   - early-reject obviously bad MIME types via multer's fileFilter
 *   - enforce the 5MB size limit (multer LIMIT_FILE_SIZE -> HTTP 413)
 *   - run magic-byte / extension checks after multer parses the upload
 *   - sanitize the original filename to prevent path-traversal artifacts
 *
 * Backwards compatible: `upload` is still exported as a multer instance, so
 * existing routes that call `upload.single('image')` keep working. New routes
 * should prefer `validateUpload('image')` which performs the same parsing
 * plus full validation in a single middleware.
 */

const storage = multer.memoryStorage();

// Early MIME-type filter so obviously-wrong uploads are rejected before we
// buffer the entire body. The full magic-byte check still runs after parsing.
const fileFilter = (req, file, cb) => {
  if (!file || !file.mimetype) {
    return cb(null, false);
  }
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_TYPES, file.mimetype)) {
    const err = new Error(
      `File type ${file.mimetype} is not allowed. Allowed types: jpeg, png, webp`
    );
    err.code = 'INVALID_FILE_TYPE';
    return cb(err, false);
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

/**
 * Translate a multer / validator error into a JSON response with the right
 * HTTP status code.
 */
const sendUploadError = (res, error) => {
  // Oversized file from multer's built-in size limit.
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      },
    });
  }

  // Any other multer error or our INVALID_FILE_TYPE error -> 400 Bad Request.
  return res.status(400).json({
    success: false,
    error: {
      code: error && error.code ? error.code : 'INVALID_UPLOAD',
      message: error && error.message ? error.message : 'Invalid file upload',
    },
  });
};

/**
 * Run the validator against an already-parsed multer file and, if valid,
 * sanitize the originalname in place. Returns null on success or an
 * { status, body } shape describing the failure response.
 */
const runValidator = (file) => {
  // No file uploaded is allowed at this layer; route handlers decide whether
  // a file is required.
  if (!file) {
    return null;
  }

  const result = validateUploadedFile(file);
  if (!result.isValid) {
    const isSize =
      typeof result.error === 'string' &&
      result.error.toLowerCase().includes('size exceeds');
    return {
      status: isSize ? 413 : 400,
      body: {
        success: false,
        error: {
          code: isSize ? 'PAYLOAD_TOO_LARGE' : 'INVALID_FILE',
          message: result.error,
        },
      },
    };
  }

  // Sanitize the original filename to defeat path-traversal attempts before
  // it is logged or forwarded to downstream services like Cloudinary.
  file.originalname = sanitizeFilename(file.originalname);
  return null;
};

/**
 * Build an Express middleware that handles a single-file upload on the given
 * field and runs the full validator on the parsed file.
 *
 * Usage: router.post('/products', validateUpload('image'), createProduct)
 */
const validateUpload = (fieldName) => {
  const parser = upload.single(fieldName);
  return (req, res, next) => {
    parser(req, res, (err) => {
      if (err) {
        return sendUploadError(res, err);
      }
      const failure = runValidator(req.file);
      if (failure) {
        return res.status(failure.status).json(failure.body);
      }
      return next();
    });
  };
};

/**
 * Build an Express middleware that handles a multi-file upload on the given
 * field and validates each file.
 */
const validateUploadArray = (fieldName, maxCount) => {
  const parser = upload.array(fieldName, maxCount);
  return (req, res, next) => {
    parser(req, res, (err) => {
      if (err) {
        return sendUploadError(res, err);
      }
      const files = Array.isArray(req.files) ? req.files : [];
      for (const file of files) {
        const failure = runValidator(file);
        if (failure) {
          return res.status(failure.status).json(failure.body);
        }
      }
      return next();
    });
  };
};

/**
 * Build an Express middleware that handles upload(s) on multiple named
 * fields (e.g. `image` for legacy single-file callers and `images` for the
 * gallery). Each entry in `fields` is `{ name, maxCount }` matching multer's
 * `.fields()` API. Every parsed file is run through the validator.
 */
const validateUploadFields = (fields) => {
  const parser = upload.fields(fields);
  return (req, res, next) => {
    parser(req, res, (err) => {
      if (err) {
        return sendUploadError(res, err);
      }
      const buckets = req.files || {};
      for (const fieldName of Object.keys(buckets)) {
        const list = Array.isArray(buckets[fieldName]) ? buckets[fieldName] : [];
        for (const file of list) {
          const failure = runValidator(file);
          if (failure) {
            return res.status(failure.status).json(failure.body);
          }
        }
      }
      return next();
    });
  };
};

module.exports = upload;
module.exports.upload = upload;
module.exports.validateUpload = validateUpload;
module.exports.validateUploadArray = validateUploadArray;
module.exports.validateUploadFields = validateUploadFields;
module.exports.sendUploadError = sendUploadError;

/**
 * One-time backfill: ensure every Product has its `image` mirrored into the
 * new `images` gallery field. Idempotent — running it again is a no-op for
 * documents that are already in sync.
 *
 * Usage:
 *   cd backend
 *   node scripts/backfillProductImages.js
 */

const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const Product = require('../models/productModel');

const run = async () => {
  await connectDB();

  const products = await Product.find({}).select('id name image images');
  let updated = 0;
  let alreadyOk = 0;
  let skipped = 0;

  for (const p of products) {
    const hasGallery = Array.isArray(p.images) && p.images.length > 0;
    const hasPrimary = typeof p.image === 'string' && p.image.length > 0;

    if (hasGallery && hasPrimary && p.images.includes(p.image)) {
      alreadyOk += 1;
      continue;
    }

    if (!hasGallery && hasPrimary) {
      p.images = [p.image];
      await p.save();
      updated += 1;
      continue;
    }

    if (hasGallery && !hasPrimary) {
      // Pre-save hook will promote images[0] into image.
      await p.save();
      updated += 1;
      continue;
    }

    // Edge case: neither field is populated. We log and skip — the schema
    // would reject a save anyway because image is required.
    console.warn(`Skipping ${p.id || p._id}: no image present`);
    skipped += 1;
  }

  console.log(`Total: ${products.length}`);
  console.log(`Already in sync: ${alreadyOk}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  process.exit(0);
};

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});

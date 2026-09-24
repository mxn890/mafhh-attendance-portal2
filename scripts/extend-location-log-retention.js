/**
 * If you already ran the app locally before this change, MongoDB has a
 * 24-hour TTL index on locationpings baked in — Mongoose doesn't alter an
 * existing index's options on its own. This updates it to 90 days.
 * Safe to run even if the index doesn't exist yet or already matches.
 *
 * Usage: node scripts/extend-location-log-retention.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mafhh-dashboard';
const NINETY_DAYS = 90 * 86400;

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  try {
    await db.command({
      collMod: 'locationpings',
      index: { keyPattern: { timestamp: 1 }, expireAfterSeconds: NINETY_DAYS },
    });
    console.log('✅ locationpings TTL index updated to 90 days.');
  } catch (err) {
    if (err.codeName === 'NamespaceNotFound' || /ns not found/i.test(err.message)) {
      console.log('ℹ️  No locationpings collection yet — nothing to update, the new 90-day setting will apply automatically once it's created.');
    } else if (/index not found/i.test(err.message)) {
      console.log('ℹ️  No existing index on timestamp — Mongoose will create the correct 90-day one automatically.');
    } else {
      throw err;
    }
  }

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => { console.error('❌ Failed:', err.message); process.exit(1); });

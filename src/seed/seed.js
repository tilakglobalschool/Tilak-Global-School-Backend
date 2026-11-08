// dotenv MUST be first — loads .env before any other import
import 'dotenv/config';

import mongoose from 'mongoose';
import bcrypt   from 'bcryptjs';

import AdminUser, { DEFAULT_PERMISSIONS } from '../models/AdminUser.model.js';
import SiteSettings from '../models/SiteSettings.model.js';
import FeeRow, { FEE_CLASS_GROUPS } from '../models/FeeRow.model.js';
import Faq from '../models/Faq.model.js';
import Counter from '../models/Counter.model.js';

const MONGO_URI      = process.env.MONGO_URI;
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@tilakglobalschool.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Super Admin';

// ── Validate Atlas URI before touching the DB ─────────────────────────────────
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set in .env. Cannot run seed.');
  process.exit(1);
}
if (MONGO_URI.includes('127.0.0.1') || MONGO_URI.includes('localhost')) {
  console.error('❌ Localhost MongoDB is disabled. Use Atlas MONGO_URI.');
  process.exit(1);
}

// ── Connect to Atlas ──────────────────────────────────────────────────────────
async function connectAtlas() {
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS:          45000,
  });
  console.log('✅ Connected to MongoDB Atlas!');
  console.log('🌐 Host:    ', mongoose.connection.host);
  console.log('🗄️  Database:', mongoose.connection.name);
  console.log('');
}

// ── Admin user — delete stale users, create fresh with correct hash ───────────
async function seedAdminUser() {
  // Delete ANY user with the target email — both .com and .in variants
  // This wipes double-hashed or stale entries completely
  const deleted = await AdminUser.deleteMany({
    email: { $in: ['admin@tilakglobalschool.com', 'admin@tilakglobalschool.in'] },
  });
  if (deleted.deletedCount > 0) {
    console.log(`🗑️  Deleted ${deleted.deletedCount} stale admin user(s)`);
  }

  // Hash once — no pre-save hook will re-hash (pre-save only handles permissions)
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await AdminUser.create({
    name:        ADMIN_NAME,
    email:       ADMIN_EMAIL,
    passwordHash,
    role:        'super_admin',
    permissions: DEFAULT_PERMISSIONS.super_admin,
    isActive:    true,
  });

  // Verify it landed in Atlas
  const count = await AdminUser.countDocuments({ email: ADMIN_EMAIL });
  console.log(`✅ Admin user created: ${ADMIN_EMAIL}`);
  console.log(`🔍 VERIFICATION: Found ${count} admin document(s) in Atlas.`);

  if (count !== 1) {
    throw new Error(`Expected 1 admin document, got ${count}`);
  }

  // Sanity-check the hash by comparing right now
  const saved = await AdminUser.findOne({ email: ADMIN_EMAIL }).select('+passwordHash');
  const valid = await bcrypt.compare(ADMIN_PASSWORD, saved.passwordHash);
  console.log(`🔑 Password hash verify: ${valid ? '✅ PASS' : '❌ FAIL — password will not work!'}`);
  if (!valid) throw new Error('Password hash verification failed after creation');
}

// ── Site settings singleton ────────────────────────────────────────────────────
async function seedSiteSettings() {
  await SiteSettings.getSingleton();
  console.log('✅ SiteSettings singleton ensured.');
}

// ── Fee row stubs ──────────────────────────────────────────────────────────────
async function seedFeeRows() {
  for (let i = 0; i < FEE_CLASS_GROUPS.length; i++) {
    await FeeRow.findOneAndUpdate(
      { classGroup: FEE_CLASS_GROUPS[i] },
      { $setOnInsert: { classGroup: FEE_CLASS_GROUPS[i], order: i, isActive: true } },
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log(`✅ FeeRow stubs: ${FEE_CLASS_GROUPS.join(', ')}`);
}

// ── Default FAQs ──────────────────────────────────────────────────────────────
async function seedFaqs() {
  const count = await Faq.countDocuments();
  if (count > 0) {
    console.log(`ℹ️  FAQs already exist (${count}). Skipping.`);
    return;
  }
  await Faq.insertMany([
    { question: 'Which classes are open for admission?',
      answer: '[To be confirmed by the school]', order: 1 },
    { question: 'What documents are required for admission?',
      answer: 'Birth certificate, previous school TC, Aadhaar card, passport photos, parent ID and address proof.', order: 2 },
    { question: 'Is there an entrance test or interaction?',
      answer: '[To be confirmed by the school]', order: 3 },
    { question: 'How can I pay the fees?',
      answer: '[Payment methods — to be confirmed by the school]', order: 4 },
    { question: 'Does the school provide transport?',
      answer: '[Transport availability — to be confirmed by the school]', order: 5 },
  ]);
  console.log('✅ 5 FAQ stubs seeded.');
}

// ── Application ID counter ────────────────────────────────────────────────────
async function seedCounter() {
  await Counter.findByIdAndUpdate(
    'application',
    { $setOnInsert: { _id: 'application', seq: 0 } },
    { upsert: true, returnDocument: 'after' }
  );
  console.log('✅ Application ID counter ensured.');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  try {
    await connectAtlas();
    await seedAdminUser();
    await seedSiteSettings();
    await seedFeeRows();
    await seedFaqs();
    await seedCounter();

    console.log('\n🎉 Seed complete — all data is in Atlas.');
    console.log(`\nAdmin login:\n  Email:    ${ADMIN_EMAIL}\n  Password: ${ADMIN_PASSWORD}\n`);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from Atlas.');
  }
}

main();

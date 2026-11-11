/**
 * removeFaqQuestions.js
 * One-time script — removes the two unwanted FAQ entries from MongoDB.
 *
 * Run from backend root:
 *   node src/seed/removeFaqQuestions.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Faq from '../models/Faq.model.js';

const QUESTIONS_TO_REMOVE = [
  "What is the CBSE Affiliation Number of Tilak Global School?",
  "What medium of instruction does the school follow?",
  // Also covers the home.js variant phrasing just in case
  "What is the medium of instruction?",
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log('✅ Connected to MongoDB\n');

  for (const q of QUESTIONS_TO_REMOVE) {
    const result = await Faq.deleteMany({ question: q });
    if (result.deletedCount > 0) {
      console.log(`🗑️  Deleted ${result.deletedCount} FAQ(s): "${q}"`);
    } else {
      console.log(`ℹ️  Not found in DB: "${q}"`);
    }
  }

  console.log('\n✅ Done.');
  await mongoose.disconnect();
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });

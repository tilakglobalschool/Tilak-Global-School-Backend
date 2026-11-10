import 'dotenv/config';
import mongoose from 'mongoose';
import Faq from '../models/Faq.model.js';

await mongoose.connect(process.env.MONGO_URI);

// Old placeholder FAQ answers to deactivate
const stubAnswers = [
  '[To be confirmed by the school]',
  '[Payment methods — to be confirmed by the school]',
  '[Transport availability — to be confirmed by the school]',
  'Birth certificate, previous school TC, Aadhaar card, passport photos, parent ID and address proof.',
];

const result = await Faq.updateMany(
  { answer: { $in: stubAnswers } },
  { $set: { isActive: false } }
);
console.log('Deactivated old FAQ stubs:', result.modifiedCount);

const active = await Faq.find({ isActive: true }).sort({ order: 1 }).lean();
console.log(`Active FAQs: ${active.length}`);
active.forEach(f => console.log(`  ${f.order}. ${f.question.substring(0, 70)}...`));

await mongoose.disconnect();

import 'dotenv/config';
import mongoose from 'mongoose';
import FeeRow from '../models/FeeRow.model.js';

await mongoose.connect(process.env.MONGO_URI);
console.log('Connected to', mongoose.connection.name);

// Deactivate old stub rows that have null admissionFee
const staleGroups = ['Nursery\u2013UKG', 'I\u2013V', 'VI\u2013VIII', 'IX\u2013XII'];
const result = await FeeRow.updateMany(
  { classGroup: { $in: staleGroups }, admissionFee: null },
  { $set: { isActive: false } }
);
console.log('Deactivated stale stub rows:', result.modifiedCount);

// Show remaining active rows
const active = await FeeRow.find({ isActive: true }).sort({ order: 1 }).lean();
console.log('Active fee rows:');
active.forEach(r => console.log(`  ${r.classGroup}: ₹${r.admissionFee} admission, ₹${r.tuitionFeePerMonth}/month`));

await mongoose.disconnect();
console.log('Done.');

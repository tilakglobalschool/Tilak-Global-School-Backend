/**
 * Phase 5 Seed — Populate confirmed client content
 *
 * This script:
 *   1. Updates CMS content blocks with confirmed text from client documents
 *   2. Populates SiteSettings with confirmed school information
 *   3. Upserts FAQs with confirmed questions and answers
 *   4. Creates fee rows for the actual 8-group structure
 *      (Class XI amounts skipped — CF-04/CF-05 conflicts pending)
 *
 * Run: node src/seed/phase5Seed.js
 *
 * SAFE TO RUN MULTIPLE TIMES — uses upsert / findOneAndUpdate.
 * Does NOT delete any existing records.
 * Does NOT touch admin user or Cloudinary uploads.
 *
 * CONFLICTS NOT RESOLVED (do NOT populate):
 *   CF-01: Director name — keeping existing "R. S. Tanwar" until confirmed
 *   CF-02: Class XI/XII streams — not seeded
 *   CF-04: Class XI fee totals — not seeded
 *   CF-05: Bus rate — not seeded
 *   CF-09: Principal name — not seeded
 *   CF-10: Chairman name — not seeded
 *   CF-11: Google Maps URL — not seeded
 *   CF-14: Social media links — not seeded
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Content  from '../models/Content.model.js';
import SiteSettings from '../models/SiteSettings.model.js';
import Faq      from '../models/Faq.model.js';
import FeeRow   from '../models/FeeRow.model.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('❌ MONGO_URI not set'); process.exit(1); }
if (MONGO_URI.includes('localhost') || MONGO_URI.includes('127.0.0.1')) {
  console.error('❌ Localhost not allowed'); process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CMS CONTENT BLOCKS — confirmed client text
// ─────────────────────────────────────────────────────────────────────────────
const CMS_UPDATES = [
  // ── Home ──────────────────────────────────────────────────────────────────
  {
    key:   'home.hero.title',
    value: 'Welcome to Tilak Global School',
  },
  {
    key:   'home.hero.subtitle',
    value: 'A CBSE Affiliated English-Medium School in Jaipur — Nursery to Class XII. Nurturing Curious Minds, Building Future Leaders.',
  },
  {
    key:   'home.hero.badge',
    value: 'Admissions Open · Session 2026-27',
  },
  {
    key:   'home.welcome.title',
    value: 'Welcome to Tilak Global School',
  },
  {
    key:   'home.welcome.body',
    value: 'Welcome to Tilak Global School, where every child\'s potential is nurtured with care, creativity, and commitment. Situated in Jaipur, our school is a CBSE-affiliated institution dedicated to providing quality education from Play Group to Class XII.\n\nAt Tilak Global School, we believe education is not just about academics — it\'s about building well-rounded individuals. Our experienced faculty, modern infrastructure, and holistic approach ensure that every student thrives — academically, socially, and emotionally.',
  },
  {
    key:   'home.cta.title',
    value: 'Give your child the best start.',
  },
  {
    key:   'home.cta.subtitle',
    value: 'Admissions open for session 2026-27. Limited seats available. Contact us today.',
  },

  // ── About ──────────────────────────────────────────────────────────────────
  {
    key:   'about.intro.body',
    value: 'Tilak Global School is an English-medium, co-educational CBSE school offering classes from Play Group to Class XII, situated in Bindayaka (Bhutawali), Mukundpura Road, Jaipur.\n\nFollowing the NCERT/CBSE syllabus, the school takes a holistic and constructivist approach, offering equal educational and developmental opportunities in a stress-free, nurturing environment. Our experienced faculty, modern infrastructure, and activity-based learning ensure every student thrives academically, socially, and emotionally.',
  },
  {
    key:   'about.vision.text',
    value: 'To be a centre of excellence that empowers students with knowledge, values, and skills to become responsible global citizens.',
  },
  {
    key:   'about.mission.text',
    value: 'To provide a holistic, student-centred education that integrates academic excellence with character development, creativity, and life skills through experienced faculty, modern infrastructure, and a nurturing environment.',
  },
  {
    key:   'about.values.list',
    value: ['Integrity', 'Excellence', 'Creativity', 'Respect', 'Responsibility', 'Compassion'],
  },
  {
    key:   'about.director.message',
    value: 'At Tilak Global School, we are committed to creating an environment where every child is inspired to learn, explore, and excel. Our dedicated team of educators works tirelessly to ensure that every student receives personalised attention and guidance.\n\nOur vision is education with positive input, emphasising creativity and innovation, so every child can build strong character and meet a changing world with confidence.',
  },
  // NOTE: about.director.name kept as-is (CF-01 conflict unresolved)

  // ── Academics ──────────────────────────────────────────────────────────────
  {
    key:   'academics.kg.description',
    value: 'A safe, family-like environment where children develop social, emotional and early academic skills through play, activity, and creative exploration.',
  },
  {
    key:   'academics.primary.description',
    value: 'Qualified faculty guide students through foundational concepts using the NCERT curriculum with an activity-based, child-centred approach that makes learning engaging and meaningful.',
  },
  {
    key:   'academics.middle.description',
    value: 'Teachers use aligned strategies to develop analytical thinking, problem-solving, and collaborative skills, preparing students for the challenges of senior school.',
  },
  {
    key:   'academics.senior.description',
    value: 'Focused preparation for board examinations and competitive entrance tests, with dedicated career guidance and stream-specific support in Science, Commerce, and Humanities.',
  },

  // ── Admissions ─────────────────────────────────────────────────────────────
  {
    key:   'admissions.process.step1',
    value: 'Enquire — Fill the online enquiry form or visit the school office during office hours (8:00 AM – 2:00 PM).',
  },
  {
    key:   'admissions.process.step2',
    value: 'Apply — Complete the admission application form with all student and parent / guardian details.',
  },
  {
    key:   'admissions.process.step3',
    value: 'Interaction — Attend a brief interaction or assessment session at the school if required (Class I and above).',
  },
  {
    key:   'admissions.process.step4',
    value: 'Confirm — Submit original documents, pay the admission fee, and collect your admission kit to confirm your seat.',
  },
  {
    key:   'admissions.docs.list',
    value: [
      'Birth Certificate (original + photocopy)',
      'Previous School Transfer Certificate (TC)',
      'Previous Year Marksheet / Report Card',
      'Aadhaar Card — Child and Parent (photocopy)',
      '4 Passport-size Photographs',
      'Parent / Guardian ID Proof',
      'Address Proof (Aadhaar / Electricity Bill / Rent Agreement)',
      'Caste Certificate (if applicable)',
    ],
  },

  // ── Contact ─────────────────────────────────────────────────────────────────
  {
    key:   'contact.intro.text',
    value: 'We would love to hear from you. Reach out via phone, email or the form below. Our office is open Monday to Saturday, 8:00 AM to 2:00 PM.',
  },

  // ── Downloads ───────────────────────────────────────────────────────────────
  {
    key:   'downloads.intro.text',
    value: 'Download CBSE mandatory disclosures, school policies, fee structure, academic documents and admission forms below.',
  },
];

async function updateContentBlocks() {
  let updated = 0;
  let skipped = 0;
  for (const block of CMS_UPDATES) {
    const result = await Content.findOneAndUpdate(
      { key: block.key },
      {
        $set: {
          value:       block.value,
          status:      'published',
          hasDraft:    false,
          draftValue:  null,
          publishedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    if (result) { updated++; }
    else {
      console.warn(`  ⚠️  Key not found in DB, skipping: ${block.key}`);
      skipped++;
    }
  }
  console.log(`✅ CMS blocks: ${updated} updated, ${skipped} not found (run contentSeed.js first)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SITE SETTINGS — confirmed client data
// ─────────────────────────────────────────────────────────────────────────────
async function updateSiteSettings() {
  await SiteSettings.updateSingleton({
    schoolName:          'Tilak Global School',
    schoolSubtitle:      'Jaipur, Rajasthan',
    topBarTagline:       'CBSE Affiliated · Nursery to XII · English Medium',
    footerDescription:   'English-medium, co-educational CBSE school offering classes from Nursery to Class XII, Jaipur.',
    cbseAffiliationNo:   '1730870',
    cbseSchoolCode:      '11224',
    phone:               '9119112335',
    admissionsPhone:     '9119112335',
    email:               'schooltilak@gmail.com',
    address:             'Bindayaka (Bhutawali), Mukundpura Road, Jaipur - 302041',
    pinCode:             '302041',
    officeTimings:       '8:00 AM to 2:00 PM (Monday to Saturday)',
    whatsappNumber:      '9119112335',
    whatsappMessage:     'Hello, I would like to enquire about admission to Tilak Global School.',
    admissionSession:    '2026-27',
    admissionBannerText: 'Admissions Open for Session 2026-27',
    admissionsOpen:      true,
    // Director name: CF-01 unresolved — keeping default
    // mapEmbedUrl: CF-11 unresolved — keeping blank
    // socialLinks: CF-14 unresolved — keeping blank
  }, null); // null = seeded (no admin user ObjectId for this operation)
  console.log('✅ SiteSettings updated with confirmed client data.');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FAQs — confirmed questions from client documents
// ─────────────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    question: 'What is the CBSE Affiliation Number of Tilak Global School?',
    answer:   'Tilak Global School is affiliated with the Central Board of Secondary Education (CBSE), New Delhi. CBSE Affiliation No: 1730870 | School Code: 11224.',
    order:    1,
  },
  {
    question: 'Which classes are offered at Tilak Global School?',
    answer:   'We offer classes from Play Group (Pre-Nursery), Nursery, KG (Prep), and Class I to Class XII.',
    order:    2,
  },
  {
    question: 'What is the admission process?',
    answer:   'The admission process has four steps: (1) Enquire — fill the online enquiry form or visit the school office. (2) Apply — complete the admission application with student and parent details. (3) Interaction — attend a brief interaction or assessment session if required (Class I and above). (4) Confirm — submit original documents, pay the admission fee, and collect the admission kit.',
    order:    3,
  },
  {
    question: 'What documents are required for admission?',
    answer:   'Birth Certificate, previous school Transfer Certificate (TC), previous year marksheet/report card, Aadhaar card (child and parent), 4 passport-size photographs, parent ID proof, address proof, and caste certificate if applicable.',
    order:    4,
  },
  {
    question: 'Is transport facility available?',
    answer:   'Yes, school bus service is available. Transport charges are based on distance from the school. Please contact the school office for details.',
    order:    5,
  },
  {
    question: 'What are the office timings?',
    answer:   'The school office is open Monday to Saturday from 8:00 AM to 2:00 PM.',
    order:    6,
  },
  {
    question: 'How can I contact the school?',
    answer:   'You can reach us at: Phone/WhatsApp: 9119112335 | Landline: 0141-2945793 | Email: schooltilak@gmail.com | Address: Bindayaka (Bhutawali), Mukundpura Road, Jaipur - 302041.',
    order:    7,
  },
  {
    question: 'What medium of instruction does the school follow?',
    answer:   'Tilak Global School is an English-medium school following the CBSE/NCERT curriculum.',
    order:    8,
  },
];

async function upsertFaqs() {
  let upserted = 0;
  for (const faq of FAQS) {
    await Faq.findOneAndUpdate(
      { question: faq.question },
      { $set: { answer: faq.answer, order: faq.order, isActive: true } },
      { upsert: true, returnDocument: 'after' }
    );
    upserted++;
  }
  console.log(`✅ FAQs: ${upserted} upserted.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FEE ROWS — confirmed amounts from fee chart 2026-27
//    CF-04 (Class XI conflict) and CF-05 (bus rate) NOT seeded.
// ─────────────────────────────────────────────────────────────────────────────
const FEE_ROWS = [
  {
    classGroup:         'Play Group – Prep',
    admissionFee:       4000,
    tuitionFeePerMonth: 6800,
    otherCharges:       null,
    fullSessionTotal:   31200,
    notes:              'Annual/miscellaneous charges included in full session total.',
    order:              0,
  },
  {
    classGroup:         'Class I – II',
    admissionFee:       4500,
    tuitionFeePerMonth: 7500,
    otherCharges:       null,
    fullSessionTotal:   34500,
    notes:              '',
    order:              1,
  },
  {
    classGroup:         'Class III – V',
    admissionFee:       4500,
    tuitionFeePerMonth: 7500,
    otherCharges:       1200,
    fullSessionTotal:   35700,
    notes:              'Other charges include club fee ₹1,200.',
    order:              2,
  },
  {
    classGroup:         'Class VI – VIII',
    admissionFee:       5000,
    tuitionFeePerMonth: 8500,
    otherCharges:       null,
    fullSessionTotal:   40200,
    notes:              '',
    order:              3,
  },
  {
    classGroup:         'Class IX',
    admissionFee:       5500,
    tuitionFeePerMonth: 9500,
    otherCharges:       null,
    fullSessionTotal:   44700,
    notes:              '',
    order:              4,
  },
  {
    classGroup:         'Class X',
    admissionFee:       5500,
    tuitionFeePerMonth: 9500,
    otherCharges:       null,
    fullSessionTotal:   43500,
    notes:              '',
    order:              5,
  },
  // Class XI: SKIPPED — CF-04 conflict (two different totals in source document)
  // Class XII: SKIPPED — confirm with client after CF-04 resolution
];

async function upsertFeeRows() {
  let upserted = 0;
  for (const row of FEE_ROWS) {
    await FeeRow.findOneAndUpdate(
      { classGroup: row.classGroup },
      { $set: { ...row, isActive: true } },
      { upsert: true, returnDocument: 'after' }
    );
    upserted++;
  }
  console.log(`✅ Fee rows: ${upserted} upserted.`);
  console.log('  ⚠️  Class XI and XII skipped — CF-04 conflict pending client confirmation.');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS:          45000,
    });
    console.log('✅ Connected to MongoDB Atlas');
    console.log('🗄  Database:', mongoose.connection.name);
    console.log('');

    console.log('── 1. CMS Content Blocks ──────────────────');
    await updateContentBlocks();

    console.log('\n── 2. Site Settings ───────────────────────');
    await updateSiteSettings();

    console.log('\n── 3. FAQs ────────────────────────────────');
    await upsertFaqs();

    console.log('\n── 4. Fee Rows ────────────────────────────');
    await upsertFeeRows();

    console.log('\n🎉 Phase 5 seed complete!');
    console.log('\n⚠️  Conflicts still pending (do NOT publish):');
    console.log('   CF-01: Director name');
    console.log('   CF-02: Class XI/XII streams');
    console.log('   CF-04: Class XI fee totals');
    console.log('   CF-05: Bus rate per km');
    console.log('   CF-09: Principal name');
    console.log('   CF-10: Chairman name');
    console.log('   CF-11: Google Maps URL');
    console.log('   CF-14: Social media handles');
  } catch (err) {
    console.error('❌ Phase 5 seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from Atlas.');
  }
}

main();

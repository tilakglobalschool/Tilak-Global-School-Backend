// dotenv MUST be first
import 'dotenv/config';

import mongoose from 'mongoose';
import Content from '../models/Content.model.js';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set in .env');
  process.exit(1);
}
if (MONGO_URI.includes('127.0.0.1') || MONGO_URI.includes('localhost')) {
  console.error('❌ Localhost MongoDB is disabled. Use Atlas MONGO_URI.');
  process.exit(1);
}

const BLOCKS = [
  // ── Home ────────────────────────────────────────────────────────────────────
  { key: 'home.hero.title',         page: 'home', section: 'hero',      label: 'Hero Headline',           type: 'text',     value: 'A stress-free place where every child grows with character.' },
  { key: 'home.hero.subtitle',      page: 'home', section: 'hero',      label: 'Hero Sub-text',           type: 'text',     value: 'English-medium, CBSE school. Nursery to XII. Jaipur, Rajasthan.' },
  { key: 'home.hero.badge',         page: 'home', section: 'hero',      label: 'Admission Badge Text',    type: 'text',     value: 'Admissions Open · Session [to be confirmed]' },
  { key: 'home.welcome.title',      page: 'home', section: 'welcome',   label: 'Welcome Section Title',   type: 'text',     value: 'Welcome to Tilak Global School' },
  { key: 'home.welcome.body',       page: 'home', section: 'welcome',   label: 'Welcome Body Text',       type: 'richtext', value: 'Tilak Global School, established in 2016 as a venture of the Tilak Group, offers a holistic NCERT/CBSE curriculum in a nurturing, co-educational environment. From Nursery to Class XII, we are committed to building character, creativity and academic excellence.' },
  { key: 'home.director.quote',     page: 'home', section: 'director',  label: "Director's Short Quote",  type: 'text',     value: 'Our task is to make children aware of indigenous knowledge and prepare them to meet competition with creativity and innovation.' },
  { key: 'home.cta.title',          page: 'home', section: 'cta',       label: 'CTA Banner Title',        type: 'text',     value: 'Give your child the best start.' },
  { key: 'home.cta.subtitle',       page: 'home', section: 'cta',       label: 'CTA Banner Subtitle',     type: 'text',     value: 'Admissions open for session [to be confirmed]. Limited seats available.' },

  // ── About ────────────────────────────────────────────────────────────────────
  { key: 'about.intro.body',        page: 'about', section: 'intro',    label: 'Who We Are',              type: 'richtext', value: 'Established in 2016 as a venture of the Tilak Group (also running Tilak Public School, Triveni Nagar, Jaipur), Tilak Global School follows the NCERT/CBSE curriculum with a holistic and constructivist approach. We are a co-educational, English-medium school from Nursery to XII.' },
  { key: 'about.vision.text',       page: 'about', section: 'vision',   label: 'Vision Statement',        type: 'text',     value: 'Education with positive input that builds strong human behaviour, creativity and innovation.' },
  { key: 'about.mission.text',      page: 'about', section: 'mission',  label: 'Mission Statement',       type: 'text',     value: '[Mission statement — to be confirmed by school]' },
  { key: 'about.values.list',       page: 'about', section: 'values',   label: 'Core Values',             type: 'list',     value: ['Integrity', 'Respect', 'Curiosity', 'Excellence', 'Compassion'] },
  { key: 'about.director.message',  page: 'about', section: 'director', label: "Director's Full Message", type: 'richtext', value: 'Our task is to make children aware of indigenous knowledge and prepare them to meet competition with creativity and innovation. [Full message — to be confirmed by school]' },
  { key: 'about.director.name',     page: 'about', section: 'director', label: "Director Name",           type: 'text',     value: 'R. S. Tanwar' },
  { key: 'about.director.designation', page: 'about', section: 'director', label: 'Designation',          type: 'text',     value: 'Director' },

  // ── Academics ───────────────────────────────────────────────────────────────
  { key: 'academics.kg.description',      page: 'academics', section: 'stages', label: 'Kindergarten Description', type: 'text', value: 'A safe, family-like environment where children develop social, emotional and early academic skills through play and activity.' },
  { key: 'academics.primary.description', page: 'academics', section: 'stages', label: 'Primary Description',      type: 'text', value: 'Qualified faculty guide students through foundational concepts using the NCERT curriculum with an activity-based approach.' },
  { key: 'academics.middle.description',  page: 'academics', section: 'stages', label: 'Middle School Description', type: 'text', value: 'Strategies aligned by teachers to develop analytical thinking, problem-solving and collaborative skills.' },
  { key: 'academics.senior.description',  page: 'academics', section: 'stages', label: 'Senior School Description', type: 'text', value: 'Focused preparation for IIT, NEET, CPT and other competitive exams with dedicated career guidance.' },

  // ── Admissions ──────────────────────────────────────────────────────────────
  { key: 'admissions.process.step1', page: 'admissions', section: 'process', label: 'Step 1 Label', type: 'text', value: 'Enquire — Fill the online enquiry form or visit the school office.' },
  { key: 'admissions.process.step2', page: 'admissions', section: 'process', label: 'Step 2 Label', type: 'text', value: 'Apply — Complete the admission application with student and parent details.' },
  { key: 'admissions.process.step3', page: 'admissions', section: 'process', label: 'Step 3 Label', type: 'text', value: 'Interaction — Attend a brief interaction/assessment session if required.' },
  { key: 'admissions.process.step4', page: 'admissions', section: 'process', label: 'Step 4 Label', type: 'text', value: 'Confirm — Submit original documents and pay the admission fee to confirm your seat.' },
  { key: 'admissions.eligibility.note', page: 'admissions', section: 'eligibility', label: 'Eligibility Note', type: 'text', value: '[Minimum age requirements — to be confirmed by school]' },
  { key: 'admissions.docs.list', page: 'admissions', section: 'documents', label: 'Required Documents', type: 'list', value: ['Birth Certificate', 'Previous school TC', 'Aadhaar card (if applicable)', '4 passport-size photographs', 'Parent ID proof', 'Address proof'] },

  // ── Contact ──────────────────────────────────────────────────────────────────
  { key: 'contact.intro.text', page: 'contact', section: 'intro', label: 'Contact Intro Text', type: 'text', value: 'We would love to hear from you. Reach out via phone, email or the form below.' },

  // ── Downloads ────────────────────────────────────────────────────────────────
  { key: 'downloads.intro.text', page: 'downloads', section: 'intro', label: 'Downloads Page Intro', type: 'text', value: 'Download CBSE mandatory disclosures, school policies, certificates, academic documents and admission forms below.' },
];

async function main() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS:          45000,
    });

    console.log('✅ Connected to MongoDB Atlas!');
    console.log('🌐 Host:    ', mongoose.connection.host);
    console.log('🗄️  Database:', mongoose.connection.name);
    console.log('');

    let created = 0;
    let skipped = 0;

    for (const block of BLOCKS) {
      const existing = await Content.findOne({ key: block.key });
      if (existing) { skipped++; continue; }
      await Content.create({
        ...block,
        status:     'published',
        hasDraft:   false,
        draftValue: null,
      });
      created++;
    }

    console.log(`✅ Content blocks: ${created} created, ${skipped} already existed.`);
    console.log('🎉 Content seed complete — all blocks are in Atlas.');
  } catch (err) {
    console.error('❌ Content seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from Atlas.');
  }
}

main();

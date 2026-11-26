/**
 * uploadCurriculumImages.js
 * Uploads curriculum page images to Cloudinary.
 * Run: node src/seed/uploadCurriculumImages.js
 */
import 'dotenv/config';
import path from 'path';
import cloudinary from '../config/cloudinary.js';

const DIR = 'F:\\School_Project\\Tilak-Global-School-Frontend\\frontend\\public\\our_curriculum';

const images = [
  {
    file:     'Our cariculum.jpeg',
    publicId: 'tilak-global-school/curriculum/our-curriculum-hero',
    label:    'Curriculum Hero',
  },
  {
    file:     'Concept led learning.jpeg',
    publicId: 'tilak-global-school/curriculum/concept-led-learning',
    label:    'Concept-led Learning',
  },
  {
    file:     'Activity based learning.jpeg',
    publicId: 'tilak-global-school/curriculum/activity-based-learning',
    label:    'Activity-based Learning',
  },
  {
    file:     'Career Guidance.heic',
    publicId: 'tilak-global-school/curriculum/career-guidance',
    label:    'Career Guidance',
  },
];

async function uploadAll() {
  console.log('🚀 Uploading curriculum images...\n');
  const results = [];
  for (const img of images) {
    const localPath = path.join(DIR, img.file);
    console.log(`⬆️  [${img.label}]`);
    try {
      const result = await cloudinary.uploader.upload(localPath, {
        public_id:     img.publicId,
        overwrite:     true,
        resource_type: 'image',
        quality:       'auto:best',
        fetch_format:  'auto',
      });
      console.log(`   ✅ ${result.secure_url}\n`);
      results.push({ ...img, url: result.secure_url, ok: true });
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}\n`);
      results.push({ ...img, url: null, ok: false });
    }
  }
  console.log('━'.repeat(60));
  for (const r of results) console.log(`${r.label}: ${r.ok ? r.url : 'FAILED'}`);
  console.log('━'.repeat(60));
}

uploadAll().catch(e => { console.error(e); process.exit(1); });

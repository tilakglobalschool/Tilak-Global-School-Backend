/**
 * uploadFacilityImages.js
 * One-time script — uploads the 5 available facility images to Cloudinary
 * under tilak-global-school/facilities/.
 *
 * Run from backend root:
 *   node src/seed/uploadFacilityImages.js
 */
import 'dotenv/config';
import path from 'path';
import cloudinary from '../config/cloudinary.js';

const PUBLIC_DIR = 'F:\\School_Project\\Tilak-Global-School-Frontend\\frontend\\public\\facilities';

const images = [
  {
    file:     'laboratry.webp',
    publicId: 'tilak-global-school/facilities/laboratory',
    label:    'Laboratory',
  },
  {
    file:     'library.webp',
    publicId: 'tilak-global-school/facilities/library',
    label:    'Library',
  },
  {
    file:     'multi_purp_hall.webp',
    publicId: 'tilak-global-school/facilities/multi-purpose-hall',
    label:    'Multi Purpose Hall',
  },
  {
    file:     'smart_classroom.webp',
    publicId: 'tilak-global-school/facilities/smart-classrooms',
    label:    'Smart Classrooms',
  },
  {
    file:     'sport_ground.webp',
    publicId: 'tilak-global-school/facilities/sports',
    label:    'Sports',
  },
];

async function uploadAll() {
  console.log('🚀 Uploading facility images to Cloudinary…\n');
  const results = [];

  for (const img of images) {
    const localPath = path.join(PUBLIC_DIR, img.file);
    console.log(`⬆️  [${img.label}] ${img.file}`);
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

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Final URLs:\n');
  for (const r of results) {
    console.log(`  ${r.label}: ${r.ok ? r.url : 'FAILED'}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

uploadAll().catch(err => { console.error('Fatal:', err); process.exit(1); });

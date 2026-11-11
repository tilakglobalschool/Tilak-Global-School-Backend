/**
 * uploadWhyUsImages.js
 * One-time script — uploads the 4 "Why Choose Us" images to Cloudinary.
 *
 * Run from backend root:
 *   node src/seed/uploadWhyUsImages.js
 */
import 'dotenv/config';
import path from 'path';
import cloudinary from '../config/cloudinary.js';

const PUBLIC_DIR = 'F:\\School_Project\\Tilak-Global-School-Frontend\\frontend\\public\\why us images';

const images = [
  {
    file:     'necrt.webp',
    publicId: 'tilak-global-school/why-us/ncert_curriculum',
    alt:      'NCERT CBSE Curriculum at Tilak Global School',
  },
  {
    file:     'stress_free_env.webp',
    publicId: 'tilak-global-school/why-us/stress_free_environment',
    alt:      'Stress-free learning environment at Tilak Global School',
  },
  {
    file:     'tilak_legary.webp',
    publicId: 'tilak-global-school/why-us/tilak_legacy',
    alt:      'Tilak Group legacy and school building',
  },
  {
    file:     'result.webp',
    publicId: 'tilak-global-school/why-us/achievements_results',
    alt:      'Student achievements and results at Tilak Global School',
  },
];

async function uploadAll() {
  console.log('🚀 Uploading Why-Choose-Us images to Cloudinary…\n');

  const results = [];

  for (const img of images) {
    const localPath = path.join(PUBLIC_DIR, img.file);
    console.log(`⬆️  Uploading: ${img.file}`);
    try {
      const result = await cloudinary.uploader.upload(localPath, {
        public_id:     img.publicId,
        overwrite:     true,
        resource_type: 'image',
        quality:       'auto:good',
        fetch_format:  'auto',
      });
      console.log(`   ✅ ${result.secure_url}\n`);
      results.push({ ...img, url: result.secure_url });
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}\n`);
      results.push({ ...img, url: null });
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 URLs for home.js:\n');
  for (const r of results) {
    if (r.url) console.log(`  ${r.file}:\n    "${r.url}"\n`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

uploadAll().catch(err => { console.error('Fatal:', err); process.exit(1); });

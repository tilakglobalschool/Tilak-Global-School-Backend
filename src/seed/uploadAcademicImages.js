/**
 * uploadAcademicImages.js
 * One-time script — uploads the 4 academic stage images from the
 * frontend public folder to Cloudinary under the folder
 * "tilak-global-school/academic-stages".
 *
 * Run from the backend root:
 *   node src/seed/uploadAcademicImages.js
 *
 * Outputs Cloudinary secure_url for each image so you can paste them
 * into frontend/src/data/academics.js.
 */
import 'dotenv/config';
import path   from 'path';
import { fileURLToPath } from 'url';
import cloudinary from '../config/cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* Absolute path to the frontend public folder */
const PUBLIC_DIR = 'F:\\School_Project\\Tilak-Global-School-Frontend\\frontend\\public\\academic_stages';

const images = [
  {
    file:      'kinder_guarden.webp',
    publicId:  'tilak-global-school/academic-stages/kindergarten',
    alt:       'Young children in a Kindergarten classroom',
  },
  {
    file:      'primary_school.webp',
    publicId:  'tilak-global-school/academic-stages/primary_school',
    alt:       'Primary school students in class',
  },
  {
    file:      'middle_school.webp',
    publicId:  'tilak-global-school/academic-stages/middle_school',
    alt:       'Middle school students in a classroom',
  },
  {
    file:      'senior_school.webp',
    publicId:  'tilak-global-school/academic-stages/senior_school',
    alt:       'Senior school students studying',
  },
];

async function uploadAll() {
  console.log('🚀 Uploading academic stage images to Cloudinary…\n');
  console.log(`📁 Source folder: ${PUBLIC_DIR}\n`);

  const results = [];

  for (const img of images) {
    const localPath = path.join(PUBLIC_DIR, img.file);
    console.log(`⬆️  Uploading: ${img.file}`);

    try {
      const result = await cloudinary.uploader.upload(localPath, {
        public_id:    img.publicId,
        overwrite:    true,
        resource_type:'image',
        folder:       '',          // public_id already includes folder
        quality:      'auto:good',
        fetch_format: 'auto',
      });

      console.log(`   ✅ Done → ${result.secure_url}\n`);
      results.push({ ...img, url: result.secure_url });
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}\n`);
      results.push({ ...img, url: null, error: err.message });
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 COPY THESE URLs into frontend/src/data/academics.js:\n');
  for (const r of results) {
    if (r.url) {
      console.log(`  ${r.file.replace('.webp', '')}:`);
      console.log(`    src: "${r.url}"`);
      console.log(`    alt: "${r.alt}"\n`);
    }
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

uploadAll().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

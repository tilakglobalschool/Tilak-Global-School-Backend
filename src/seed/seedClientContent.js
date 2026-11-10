/**
 * seedClientContent.js — Tilak Global School
 *
 * Complete idempotent migration script.
 * Uploads all client-provided images to Cloudinary and populates MongoDB.
 *
 * Usage:
 *   node src/seed/seedClientContent.js              — full run
 *   node src/seed/seedClientContent.js --dry-run    — show what would happen, no uploads
 *   node src/seed/seedClientContent.js --only-settings
 *   node src/seed/seedClientContent.js --only-gallery
 *   node src/seed/seedClientContent.js --only-faqs
 *   node src/seed/seedClientContent.js --only-fees
 *
 * Safety:
 *   - Idempotent: safe to run multiple times
 *   - Uses Cloudinary public_id as stable key — never re-uploads existing assets
 *   - Never deletes existing DB records
 *   - Logs every action
 *   - Conflicts documented at bottom — NOT auto-resolved
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import path     from 'path';
import fs       from 'fs';
import { fileURLToPath } from 'url';

import cloudinary    from '../config/cloudinary.js';
import SiteSettings  from '../models/SiteSettings.model.js';
import GalleryImage  from '../models/GalleryImage.model.js';
import Faq           from '../models/Faq.model.js';
import FeeRow        from '../models/FeeRow.model.js';
import Content       from '../models/Content.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const DRY_RUN  = args.includes('--dry-run');
const ONLY     = args.find(a => a.startsWith('--only-'))?.replace('--only-', '') || null;

const BASE_DIR   = path.resolve(__dirname, '../../../Content-Files');
const IMAGES_DIR = path.join(BASE_DIR, 'Images');
const DIRECTOR_IMAGE = path.join(BASE_DIR, 'DirectorImage.png');

// ── Helpers ───────────────────────────────────────────────────────────────────
const log  = (msg)       => console.log(`  ${msg}`);
const ok   = (msg)       => console.log(`  ✅ ${msg}`);
const skip = (msg)       => console.log(`  ⏭  ${msg}`);
const warn = (msg)       => console.log(`  ⚠️  ${msg}`);
const fail = (msg, err)  => console.log(`  ❌ ${msg}: ${err?.message || err}`);
const sep  = (title)     => console.log(`\n${'─'.repeat(60)}\n${title}\n${'─'.repeat(60)}`);

const stats = {
  uploaded: 0, skipped: 0, failed: 0,
  dbCreated: 0, dbUpdated: 0, dbSkipped: 0,
};

/**
 * Upload a file to Cloudinary if it hasn't been uploaded yet.
 * Uses public_id as idempotent key — if it already exists, skips and returns cached URL.
 */
async function uploadIfNeeded(localPath, cloudinaryPublicId, options = {}) {
  if (DRY_RUN) {
    log(`[DRY RUN] Would upload: ${path.basename(localPath)} → ${cloudinaryPublicId}`);
    stats.skipped++;
    return { public_id: cloudinaryPublicId, secure_url: `https://res.cloudinary.com/h6erncmn/image/upload/${cloudinaryPublicId}` };
  }

  // Check if already exists on Cloudinary
  try {
    const existing = await cloudinary.api.resource(cloudinaryPublicId, {
      resource_type: options.resource_type || 'image',
    });
    skip(`Already on Cloudinary: ${path.basename(localPath)}`);
    stats.skipped++;
    return { public_id: existing.public_id, secure_url: existing.secure_url };
  } catch {
    // Not found — proceed with upload
  }

  try {
    const result = await cloudinary.uploader.upload(localPath, {
      public_id: cloudinaryPublicId,
      resource_type: options.resource_type || 'image',
      quality: options.quality || 'auto:good',
      fetch_format: options.resource_type === 'video' ? undefined : 'auto',
      ...options,
    });
    ok(`Uploaded: ${path.basename(localPath)} → ${result.secure_url}`);
    stats.uploaded++;
    return { public_id: result.public_id, secure_url: result.secure_url };
  } catch (err) {
    fail(`Upload failed: ${path.basename(localPath)}`, err);
    stats.failed++;
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: SITE SETTINGS + LOGO + DIRECTOR IMAGE
// ─────────────────────────────────────────────────────────────────────────────
async function seedSettings() {
  sep('1. SITE SETTINGS + LOGO + DIRECTOR IMAGE');

  // ── 1A. Upload School Logo ──
  log('Uploading school logo...');
  const logoPath = path.join(IMAGES_DIR, 'logo.jpeg');
  const logoResult = await uploadIfNeeded(logoPath, 'tilak-global-school/logo/school-logo', {
    folder: 'tilak-global-school/logo',
  });

  // ── 1B. Upload Director Image ──
  log('Uploading Director portrait...');
  const directorResult = await uploadIfNeeded(DIRECTOR_IMAGE, 'tilak-global-school/director/director-portrait', {
    folder: 'tilak-global-school/director',
  });

  // NOTE CF-01: Director name is unresolved (Abhay Tanwar vs R.S. Tanwar)
  // We update all fields EXCEPT directorName — keep existing value.

  if (!DRY_RUN) {
    const updates = {
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
      // Director info kept at existing value (CF-01 unresolved)
      directorDesignation: 'Director',
    };

    if (logoResult) {
      updates.logoUrl      = logoResult.secure_url;
      updates.logoPublicId = logoResult.public_id;
    }
    if (directorResult) {
      updates.directorPhotoUrl      = directorResult.secure_url;
      updates.directorPhotoPublicId = directorResult.public_id;
    }

    await SiteSettings.updateSingleton(updates, null);
    ok('SiteSettings updated');
    stats.dbUpdated++;
  } else {
    log('[DRY RUN] Would update SiteSettings with confirmed data');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: GALLERY IMAGES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full image manifest — derived from CLIENT_ASSET_MANIFEST.json and filenames.
 * Each entry:
 *   filename:    actual file in Content-Files/Images/
 *   publicId:    Cloudinary public_id (stable key for idempotency)
 *   caption:     human-readable title
 *   altText:     accessibility description
 *   category:    must match GalleryImage.model.js GALLERY_CATEGORIES
 *   albumName:   grouping within category
 *   order:       display order within category
 *   status:      'published' or 'draft'
 */
const GALLERY_MANIFEST = [
  // ── CAMPUS / SCHOOL BUILDING ─────────────────────────────────────────────
  {
    filename: 'school_building_front_view_with_flags_and_school_bus.webp',
    publicId:  'tilak-global-school/campus/school-building-front-view',
    caption:   'School Building Front View',
    altText:   'Tilak Global School building front view with national flags and school bus',
    category:  'Campus', albumName: 'School Building', order: 1, status: 'published',
  },
  {
    filename: 'school_main_gate_with_admission_open_banner.webp',
    publicId:  'tilak-global-school/campus/school-main-gate',
    caption:   'School Main Gate',
    altText:   'Tilak Global School main gate with Admissions Open 2026-27 banner',
    category:  'Campus', albumName: 'School Building', order: 2, status: 'published',
  },
  {
    filename: 'school_building_with_kids_playground_slide_and_swings.webp',
    publicId:  'tilak-global-school/campus/school-building-playground',
    caption:   'School Building with Kids Playground',
    altText:   'Tilak Global School building with colourful kids playground, slides and swings',
    category:  'Campus', albumName: 'School Building', order: 3, status: 'published',
  },

  // ── SPORTS GROUND ────────────────────────────────────────────────────────
  {
    filename: 'school_ground_aerial_view_basketball_court_and_volleyball_net.webp',
    publicId:  'tilak-global-school/campus/sports-ground-aerial-view',
    caption:   'Sports Ground – Aerial View',
    altText:   'Aerial view of Tilak Global School sports ground with basketball court and volleyball net',
    category:  'Campus', albumName: 'Sports Ground', order: 4, status: 'published',
  },
  {
    filename: 'school_ground_aerial_view_basketball_hoop_and_lawn.webp',
    publicId:  'tilak-global-school/campus/sports-ground-basketball-lawn',
    caption:   'Sports Ground – Basketball and Lawn',
    altText:   'Aerial shot of sports ground with basketball hoop and green lawn',
    category:  'Campus', albumName: 'Sports Ground', order: 5, status: 'published',
  },
  {
    filename: 'school_ground_aerial_view_volleyball_net_and_stage_side.webp',
    publicId:  'tilak-global-school/campus/sports-ground-volleyball-stage',
    caption:   'Sports Ground – Volleyball and Stage',
    altText:   'Aerial view of school ground with volleyball net and open-air stage',
    category:  'Campus', albumName: 'Sports Ground', order: 6, status: 'published',
  },
  {
    filename: 'school_ground_basketball_hoop_and_volleyball_net_ground_view.webp',
    publicId:  'tilak-global-school/campus/sports-ground-view',
    caption:   'Sports Ground – Ground View',
    altText:   'Ground view of school sports facilities with basketball hoop and volleyball net',
    category:  'Campus', albumName: 'Sports Ground', order: 7, status: 'published',
  },

  // ── OPEN STAGE ───────────────────────────────────────────────────────────
  {
    filename: 'school_open_stage_front_view_with_school_banner.webp',
    publicId:  'tilak-global-school/campus/open-stage-front',
    caption:   'Open Air Stage',
    altText:   'Tilak Global School open-air amphitheatre stage with school banner',
    category:  'Campus', albumName: 'Open Stage', order: 8, status: 'published',
  },
  {
    filename: 'school_open_stage_closer_view_music_lab_door.webp',
    publicId:  'tilak-global-school/campus/open-stage-music-lab',
    caption:   'Open Stage and Music Lab',
    altText:   'School open-air stage closer view with music lab door visible',
    category:  'Campus', albumName: 'Open Stage', order: 9, status: 'published',
  },

  // ── CLASSROOMS ───────────────────────────────────────────────────────────
  {
    filename: 'classroom_young_students_with_smartboard_and_wall_paintings.webp',
    publicId:  'tilak-global-school/classrooms/smart-classroom',
    caption:   'Smart Classroom with Interactive Board',
    altText:   'Young students in a smart classroom with interactive board and educational wall paintings',
    category:  'Classrooms', albumName: 'Smart Classrooms', order: 1, status: 'published',
  },
  {
    filename: 'classroom_young_students_writing_at_blue_desks_wide_view.webp',
    publicId:  'tilak-global-school/classrooms/classroom-wide-view',
    caption:   'Students in Classroom',
    altText:   'Wide view of classroom with students writing at blue desks',
    category:  'Classrooms', albumName: 'Classrooms', order: 2, status: 'published',
  },
  {
    filename: 'students-writing-exam-in-classroom-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/classrooms/exam-in-classroom',
    caption:   'Students Writing Examination',
    altText:   'Students writing an examination in a classroom at Tilak Global School',
    category:  'Classrooms', albumName: 'Examinations', order: 3, status: 'published',
  },

  // ── LIBRARY ──────────────────────────────────────────────────────────────
  {
    filename: 'school_library_students_reading_and_bookshelves.webp',
    publicId:  'tilak-global-school/facilities/library',
    caption:   'School Library',
    altText:   'Students reading in Tilak Global School library with tall bookshelves',
    category:  'Classrooms', albumName: 'Library', order: 4, status: 'published',
  },

  // ── LABS ─────────────────────────────────────────────────────────────────
  {
    filename: 'biology_lab_class12_practical_exam_students_with_microscopes.webp',
    publicId:  'tilak-global-school/facilities/biology-lab-microscopes',
    caption:   'Biology Lab – Class 12 Practical',
    altText:   'Class 12 students in biology practical exam with microscopes at Tilak Global School',
    category:  'Classrooms', albumName: 'Science Labs', order: 5, status: 'published',
  },
  {
    filename: 'biology_lab_practical_exam_students_around_table.webp',
    publicId:  'tilak-global-school/facilities/biology-lab-table',
    caption:   'Biology Lab – Practical Exam',
    altText:   'Students gathered around lab table during biology practical exam',
    category:  'Classrooms', albumName: 'Science Labs', order: 6, status: 'published',
  },
  {
    filename: 'chemistry_lab_students_titration_practical_wide_view.webp',
    publicId:  'tilak-global-school/facilities/chemistry-lab-titration',
    caption:   'Chemistry Lab – Titration Practical',
    altText:   'Students performing titration practical in chemistry lab',
    category:  'Classrooms', albumName: 'Science Labs', order: 7, status: 'published',
  },
  {
    filename: 'chemistry_lab_class12_practical_exam_students_at_work.webp',
    publicId:  'tilak-global-school/facilities/chemistry-lab-exam',
    caption:   'Chemistry Lab – Class 12 Practical',
    altText:   'Class 12 students at individual stations during chemistry practical exam',
    category:  'Classrooms', albumName: 'Science Labs', order: 8, status: 'published',
  },
  {
    filename: 'chemistry_lab_student_doing_titration_with_burette.webp',
    publicId:  'tilak-global-school/facilities/chemistry-lab-burette',
    caption:   'Chemistry Lab – Titration Close-up',
    altText:   'Student performing titration with burette in chemistry lab',
    category:  'Classrooms', albumName: 'Science Labs', order: 9, status: 'published',
  },
  {
    filename: 'physics_lab_students_practical_exam_electrical_experiment.webp',
    publicId:  'tilak-global-school/facilities/physics-lab-electrical',
    caption:   'Physics Lab – Electrical Experiment',
    altText:   'Students conducting electrical circuit experiments in physics practical',
    category:  'Classrooms', albumName: 'Science Labs', order: 10, status: 'published',
  },
  {
    filename: 'physics_lab_students_practical_exam_group_experiments.webp',
    publicId:  'tilak-global-school/facilities/physics-lab-group',
    caption:   'Physics Lab – Group Experiments',
    altText:   'Group of students conducting various physics experiments in lab',
    category:  'Classrooms', albumName: 'Science Labs', order: 11, status: 'published',
  },
  {
    filename: 'computer_lab_rows_of_desks_with_whiteboard.webp',
    publicId:  'tilak-global-school/facilities/computer-lab',
    caption:   'Computer Lab',
    altText:   'Computer lab with rows of workstations and whiteboard at Tilak Global School',
    category:  'Classrooms', albumName: 'Computer Lab', order: 12, status: 'published',
  },
  {
    filename: 'computer_lab_desks_and_monitors_rear_view.webp',
    publicId:  'tilak-global-school/facilities/computer-lab-rear',
    caption:   'Computer Lab – Rear View',
    altText:   'Rear view of computer lab showing rows of monitors and desks',
    category:  'Classrooms', albumName: 'Computer Lab', order: 13, status: 'published',
  },

  // ── SPORTS ───────────────────────────────────────────────────────────────
  {
    filename: 'karate-demonstration-students-power-in-action-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/sports/karate-demonstration',
    caption:   'Karate Demonstration',
    altText:   'Students demonstrating powerful karate techniques at Tilak Global School',
    category:  'Sports', albumName: 'Karate', order: 1, status: 'published',
  },
  {
    filename: 'karate-students-gold-medals-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/sports/karate-gold-medals',
    caption:   'Karate Students – Gold Medals',
    altText:   'Karate students proudly displaying gold medals won at competition',
    category:  'Sports', albumName: 'Karate', order: 2, status: 'published',
  },
  {
    filename: 'school-cricket-team-with-principal-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/sports/cricket-team',
    caption:   'School Cricket Team',
    altText:   'School cricket team posing with the Principal for a group photo',
    category:  'Sports', albumName: 'Cricket', order: 3, status: 'published',
  },
  {
    filename: 'students-swimming-pool-activity-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/sports/swimming-pool',
    caption:   'Swimming Pool Activity',
    altText:   'Students participating in swimming pool activity at Tilak Global School',
    category:  'Sports', albumName: 'Swimming', order: 4, status: 'published',
  },
  {
    filename: 'students-victory-sign-group-photo-school-ground-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/sports/students-victory-photo',
    caption:   'Students Victory Group Photo',
    altText:   'Students making victory signs in a group photo on school ground',
    category:  'Sports', albumName: 'School Ground', order: 5, status: 'published',
  },

  // ── ANNUAL DAY ───────────────────────────────────────────────────────────
  {
    filename: 'annual_day_kathak_dance_group_performance.webp',
    publicId:  'tilak-global-school/events/annual-day-kathak-dance',
    caption:   'Kathak Dance – Annual Day',
    altText:   'Students performing Kathak classical dance on stage at Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 1, status: 'published',
  },
  {
    filename: 'annual_day_academic_excellence_first_prize_girl_student_trophy.webp',
    publicId:  'tilak-global-school/events/annual-day-first-prize-girl',
    caption:   'Academic Excellence Prize – Annual Day',
    altText:   'Girl student receiving first prize trophy for academic excellence at Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 2, status: 'published',
  },
  {
    filename: 'annual_day_academic_excellence_first_prize_trophy_presentation.webp',
    publicId:  'tilak-global-school/events/annual-day-trophy-presentation',
    caption:   'Trophy Presentation – Annual Day',
    altText:   'Trophy presentation ceremony for academic excellence at Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 3, status: 'published',
  },
  {
    filename: 'annual_day_boy_singing_on_stage_with_mic.webp',
    publicId:  'tilak-global-school/events/annual-day-singing',
    caption:   'Singing Performance – Annual Day',
    altText:   'Boy student singing on stage with microphone at Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 4, status: 'published',
  },
  {
    filename: 'annual_day_chief_guest_and_guests_walking_on_carpet_with_head_girl.webp',
    publicId:  'tilak-global-school/events/annual-day-chief-guest-arrival',
    caption:   'Chief Guest Arrival – Annual Day',
    altText:   'Chief guest and guests walking on red carpet escorted by head girl at Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 5, status: 'published',
  },
  {
    filename: 'annual_day_chief_guest_and_management_seated_on_sofa.webp',
    publicId:  'tilak-global-school/events/annual-day-chief-guest-seated',
    caption:   'Chief Guest with Management – Annual Day',
    altText:   'Chief guest and school management seated at Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 6, status: 'published',
  },
  {
    filename: 'annual_day_chief_guest_speech_at_marigold_podium.webp',
    publicId:  'tilak-global-school/events/annual-day-chief-guest-speech',
    caption:   'Chief Guest Speech – Annual Day',
    altText:   'Chief guest delivering speech at marigold-decorated podium during Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 7, status: 'published',
  },
  {
    filename: 'annual_day_guests_and_parents_seated_audience.webp',
    publicId:  'tilak-global-school/events/annual-day-audience',
    caption:   'Audience – Annual Day',
    altText:   'Guests and parents seated as audience at Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 8, status: 'published',
  },
  {
    filename: 'annual_day_karate_performance_students_on_stage.webp',
    publicId:  'tilak-global-school/events/annual-day-karate-stage',
    caption:   'Karate Stage Performance – Annual Day',
    altText:   'Students performing karate demonstration on stage at Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 9, status: 'published',
  },
  {
    filename: 'annual_day_krishna_bhajan_students_singing_with_tabla_harmonium.webp',
    publicId:  'tilak-global-school/events/annual-day-krishna-bhajan',
    caption:   'Krishna Bhajan – Annual Day',
    altText:   'Students singing Krishna bhajan with tabla and harmonium at Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 10, status: 'published',
  },
  {
    filename: 'annual_day_lata_mangeshkar_tribute_girls_dance.webp',
    publicId:  'tilak-global-school/events/annual-day-lata-tribute',
    caption:   'Lata Mangeshkar Tribute Dance – Annual Day',
    altText:   'Girls performing Lata Mangeshkar tribute dance at Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 11, status: 'published',
  },
  {
    filename: 'annual_day_legends_of_india_sports_tribute_kids_dance.webp',
    publicId:  'tilak-global-school/events/annual-day-legends-dance',
    caption:   'Legends of India Sports Tribute – Annual Day',
    altText:   'Kids performing Legends of India sports tribute dance at Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 12, status: 'published',
  },
  {
    filename: 'annual_day_raj_kapoor_tribute_kids_dance.webp',
    publicId:  'tilak-global-school/events/annual-day-raj-kapoor-tribute',
    caption:   'Raj Kapoor Tribute Dance – Annual Day',
    altText:   'Kids performing Raj Kapoor tribute dance at Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 13, status: 'published',
  },
  {
    filename: 'annual_day_shiva_theme_dance_with_tridents.webp',
    publicId:  'tilak-global-school/events/annual-day-shiva-dance',
    caption:   'Shiva Theme Dance – Annual Day',
    altText:   'Students performing Shiva-themed dance holding tridents at Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 14, status: 'published',
  },
  {
    filename: 'school_entrance_balloon_arch_annual_day_welcome.webp',
    publicId:  'tilak-global-school/events/annual-day-balloon-arch',
    caption:   'Annual Day Entrance Decoration',
    altText:   'School entrance decorated with colourful balloon arch for Annual Day',
    category:  'Annual Day', albumName: 'Annual Day', order: 15, status: 'published',
  },
  {
    filename: 'school_carnival_balloons_bouncy_castles.webp',
    publicId:  'tilak-global-school/events/school-carnival',
    caption:   'School Carnival',
    altText:   'School carnival with colourful balloons and bouncy castles',
    category:  'Annual Day', albumName: 'Events', order: 16, status: 'published',
  },
  {
    filename: 'chairman_felicitating_students_marigold_garlands.webp',
    publicId:  'tilak-global-school/events/chairman-felicitating-students',
    caption:   'Chairman Felicitating Students',
    altText:   'Chairman felicitating students with marigold garlands at school ceremony',
    category:  'Annual Day', albumName: 'Annual Day', order: 17, status: 'published',
  },
  {
    filename: 'farewell_function_group_photo_on_stage.webp',
    publicId:  'tilak-global-school/events/farewell-group-photo',
    caption:   'Farewell Function Group Photo',
    altText:   'Group photo of students and staff on stage during farewell function',
    category:  'Annual Day', albumName: 'Events', order: 18, status: 'published',
  },
  {
    filename: 'prize-distribution-first-prize-trophy-chief-guest-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/prize-distribution',
    caption:   'Prize Distribution by Chief Guest',
    altText:   'First prize trophy distribution ceremony with chief guest',
    category:  'Annual Day', albumName: 'Annual Day', order: 19, status: 'published',
  },

  // ── JANMASHTAMI ──────────────────────────────────────────────────────────
  {
    filename: 'janmashtami_celebration_kids_in_krishna_costumes_on_stage_with_podium.webp',
    publicId:  'tilak-global-school/events/janmashtami-krishna-stage',
    caption:   'Krishna Costumes – Janmashtami',
    altText:   'Kids dressed as Krishna on stage during Janmashtami celebration',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 1, status: 'published',
  },
  {
    filename: 'janmashtami_kids_costume_polaroid_collage.webp',
    publicId:  'tilak-global-school/events/janmashtami-costume-collage',
    caption:   'Costume Collage – Janmashtami',
    altText:   'Polaroid-style collage of kids in Krishna/Radha costumes for Janmashtami',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 2, status: 'published',
  },
  {
    filename: 'janmashtami_kids_dance_radha_krishna_costumes_stage_view_1.webp',
    publicId:  'tilak-global-school/events/janmashtami-radha-krishna-dance-1',
    caption:   'Radha Krishna Dance – Janmashtami',
    altText:   'Kids dancing in Radha-Krishna costumes on stage at Janmashtami',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 3, status: 'published',
  },
  {
    filename: 'janmashtami_kids_dance_radha_krishna_costumes_stage_view_2.webp',
    publicId:  'tilak-global-school/events/janmashtami-radha-krishna-dance-2',
    caption:   'Radha Krishna Dance View 2 – Janmashtami',
    altText:   'Kids in Radha-Krishna costumes on stage at Janmashtami view 2',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 4, status: 'published',
  },
  {
    filename: 'janmashtami_kids_krishna_radha_costumes_group.webp',
    publicId:  'tilak-global-school/events/janmashtami-krishna-group',
    caption:   'Krishna Radha Group – Janmashtami',
    altText:   'Group photo of kids in Krishna and Radha costumes at Janmashtami',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 5, status: 'published',
  },
  {
    filename: 'janmashtami_krishna_radha_costume_kids_collage.webp',
    publicId:  'tilak-global-school/events/janmashtami-costumes-collage',
    caption:   'Costumes Collage – Janmashtami',
    altText:   'Collage of kids in Krishna and Radha fancy dress at Janmashtami',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 6, status: 'published',
  },
  {
    filename: 'janmashtami_stage_performance_kids_dance.webp',
    publicId:  'tilak-global-school/events/janmashtami-stage-dance',
    caption:   'Stage Dance – Janmashtami',
    altText:   'Kids stage dance performance during Janmashtami celebration',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 7, status: 'published',
  },
  {
    filename: 'janmashtami-celebration-mahabharat-skit-narration-students-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/janmashtami-mahabharat-narration',
    caption:   'Mahabharat Skit Narration – Janmashtami',
    altText:   'Students performing Mahabharat skit narration on stage at Janmashtami',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 8, status: 'published',
  },
  {
    filename: 'janmashtami-celebration-mahabharat-skit-students-performance-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/janmashtami-mahabharat-skit',
    caption:   'Mahabharat Skit – Janmashtami',
    altText:   'Students performing Mahabharat skit on stage at Janmashtami',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 9, status: 'published',
  },
  {
    filename: 'janmashtami-celebration-student-cast-group-photo-stage-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/janmashtami-cast-group-photo',
    caption:   'Cast Group Photo – Janmashtami',
    altText:   'Group photo of student cast on stage after Janmashtami skit',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 10, status: 'published',
  },
  {
    filename: 'janmashtami-celebration-students-group-dance-performance-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/janmashtami-group-dance',
    caption:   'Group Dance – Janmashtami',
    altText:   'Students performing group dance on stage during Janmashtami',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 11, status: 'published',
  },
  {
    filename: 'guests-and-students-audience-janmashtami-celebration-1-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/janmashtami-audience-1',
    caption:   'Audience – Janmashtami',
    altText:   'Guests and students seated as audience at Janmashtami celebration',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 12, status: 'published',
  },
  {
    filename: 'guests-and-students-audience-janmashtami-celebration-2-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/janmashtami-audience-2',
    caption:   'Audience View 2 – Janmashtami',
    altText:   'Audience at Janmashtami celebration view 2',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 13, status: 'published',
  },
  {
    filename: 'krishna-radha-fancy-dress-kids-with-guest-janmashtami-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/janmashtami-kids-with-guest',
    caption:   'Kids with Guest – Janmashtami',
    altText:   'Kids in Krishna and Radha fancy dress posing with a guest at Janmashtami',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 14, status: 'published',
  },
  {
    filename: 'krishna-radha-fancy-dress-students-teacher-group-photo-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/janmashtami-students-teacher-photo',
    caption:   'Students and Teacher Photo – Janmashtami',
    altText:   'Students and teacher group photo in Krishna-Radha fancy dress at Janmashtami',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 15, status: 'published',
  },
  {
    filename: 'little-krishna-fancy-dress-janmashtami-celebration-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/janmashtami-little-krishna',
    caption:   'Little Krishna – Janmashtami',
    altText:   'Young child dressed as Little Krishna at Janmashtami celebration',
    category:  'Janmashtami', albumName: 'Janmashtami', order: 16, status: 'published',
  },

  // ── INDEPENDENCE DAY ─────────────────────────────────────────────────────
  {
    filename: 'independence-day-80th-celebration-student-speech-podium-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/independence-day-speech',
    caption:   '80th Independence Day – Student Speech',
    altText:   'Student delivering speech at podium during 80th Independence Day celebration',
    category:  'Independence Day', albumName: 'Independence Day', order: 1, status: 'published',
  },
  {
    filename: 'independence-day-fancy-dress-freedom-fighters-students-1-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/independence-day-fancy-dress-1',
    caption:   'Freedom Fighters Fancy Dress – Independence Day',
    altText:   'Students dressed as freedom fighters at Independence Day',
    category:  'Independence Day', albumName: 'Independence Day', order: 2, status: 'published',
  },
  {
    filename: 'independence-day-fancy-dress-freedom-fighters-students-2-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/independence-day-fancy-dress-2',
    caption:   'Freedom Fighters Fancy Dress Group 2',
    altText:   'Second group of students in freedom fighter costumes at Independence Day',
    category:  'Independence Day', albumName: 'Independence Day', order: 3, status: 'published',
  },
  {
    filename: 'independence-day-freedom-fighters-skit-students-raised-fists-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/independence-day-skit-fists',
    caption:   'Freedom Fighter Skit – Raised Fists',
    altText:   'Students in freedom fighter skit with raised fists on Independence Day',
    category:  'Independence Day', albumName: 'Independence Day', order: 4, status: 'published',
  },
  {
    filename: 'independence-day-freedom-fighters-skit-students-salute-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/independence-day-skit-salute',
    caption:   'Freedom Fighter Skit – Salute',
    altText:   'Students in freedom fighter costumes saluting on Independence Day',
    category:  'Independence Day', albumName: 'Independence Day', order: 5, status: 'published',
  },
  {
    filename: 'flag-hoisting-ceremony-students-teachers-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/flag-hoisting-ceremony',
    caption:   'Flag Hoisting Ceremony',
    altText:   'Flag hoisting ceremony with students and teachers at Tilak Global School',
    category:  'Independence Day', albumName: 'Independence Day', order: 6, status: 'published',
  },
  {
    filename: 'gandhi-jayanti-jai-jawan-jai-kisan-students-fancy-dress-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/gandhi-jayanti-fancy-dress',
    caption:   'Gandhi Jayanti – Fancy Dress',
    altText:   'Students in Jai Jawan Jai Kisan themed fancy dress for Gandhi Jayanti',
    category:  'Independence Day', albumName: 'National Events', order: 7, status: 'published',
  },

  // ── BLOOD DONATION CAMP ──────────────────────────────────────────────────
  {
    filename: 'blood-donation-camp-army-officer-felicitation-1-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/blood-donation-army-felicitation-1',
    caption:   'Army Officer Felicitation – Blood Donation Camp',
    altText:   'Army officer being felicitated at school blood donation camp',
    category:  'Blood Donation Camp', albumName: 'Blood Donation Camp', order: 1, status: 'published',
  },
  {
    filename: 'blood-donation-camp-army-officer-felicitation-2-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/blood-donation-army-felicitation-2',
    caption:   'Army Felicitation 2 – Blood Donation Camp',
    altText:   'Army officer felicitation photo 2 at blood donation camp',
    category:  'Blood Donation Camp', albumName: 'Blood Donation Camp', order: 2, status: 'published',
  },
  {
    filename: 'blood-donation-camp-doctors-health-check-registration-table-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/blood-donation-doctors-registration',
    caption:   'Doctors at Registration – Blood Donation',
    altText:   'Doctors at registration table during blood donation camp at Tilak Global School',
    category:  'Blood Donation Camp', albumName: 'Blood Donation Camp', order: 3, status: 'published',
  },
  {
    filename: 'blood-donation-camp-donors-beds-medical-team-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/blood-donation-donors-beds',
    caption:   'Donors and Medical Team – Blood Donation',
    altText:   'Donors on donation beds with medical team at school blood donation camp',
    category:  'Blood Donation Camp', albumName: 'Blood Donation Camp', order: 4, status: 'published',
  },
  {
    filename: 'blood-donation-camp-guests-felicitation-memento-1-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/blood-donation-guest-memento-1',
    caption:   'Guest Felicitation – Blood Donation',
    altText:   'Guest being felicitated with memento at blood donation camp',
    category:  'Blood Donation Camp', albumName: 'Blood Donation Camp', order: 5, status: 'published',
  },
  {
    filename: 'blood-donation-camp-guests-felicitation-memento-2-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/blood-donation-guest-memento-2',
    caption:   'Guest Felicitation 2 – Blood Donation',
    altText:   'Guest receiving memento at blood donation camp',
    category:  'Blood Donation Camp', albumName: 'Blood Donation Camp', order: 6, status: 'published',
  },
  {
    filename: 'blood-donation-camp-student-receiving-gift-from-guest-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/blood-donation-student-gift',
    caption:   'Student Gift – Blood Donation Camp',
    altText:   'Student receiving gift from guest at blood donation camp',
    category:  'Blood Donation Camp', albumName: 'Blood Donation Camp', order: 7, status: 'published',
  },

  // ── SCIENCE EXHIBITION ───────────────────────────────────────────────────
  {
    filename: 'science-working-model-teacher-students-science-fair-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/science-fair-working-model',
    caption:   'Science Fair – Working Model',
    altText:   'Teacher and students at a working science model during school science fair',
    category:  'Science Exhibition', albumName: 'Science Exhibition', order: 1, status: 'published',
  },
  {
    filename: 'school-exhibition-students-parents-visiting-stalls-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/science-exhibition-stalls',
    caption:   'Parents Visiting Exhibition Stalls',
    altText:   'Students and parents visiting exhibition stalls at school science fair',
    category:  'Science Exhibition', albumName: 'Science Exhibition', order: 2, status: 'published',
  },
  {
    filename: 'addition-subtraction-maths-model-student-exhibition-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/science-exhibition-maths-model',
    caption:   'Maths Model – Exhibition',
    altText:   'Student presenting addition/subtraction maths model at school exhibition',
    category:  'Science Exhibition', albumName: 'Science Exhibition', order: 3, status: 'published',
  },
  {
    filename: 'english-vocabulary-village-model-exhibition-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/science-exhibition-vocabulary-village',
    caption:   'English Vocabulary Village – Exhibition',
    altText:   'English Vocabulary Village model at school exhibition',
    category:  'Science Exhibition', albumName: 'Science Exhibition', order: 4, status: 'published',
  },
  {
    filename: 'how-to-run-electricity-in-house-science-model-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/science-exhibition-electricity-model',
    caption:   'Home Electricity Science Model',
    altText:   'Student-made science model showing how electricity runs in a house',
    category:  'Science Exhibition', albumName: 'Science Exhibition', order: 5, status: 'published',
  },
  {
    filename: 'human-skeleton-cotton-buds-science-fair-model-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/science-exhibition-skeleton-model',
    caption:   'Human Skeleton Cotton Bud Model',
    altText:   'Human skeleton model made from cotton buds at school science fair',
    category:  'Science Exhibition', albumName: 'Science Exhibition', order: 6, status: 'published',
  },
  {
    filename: 'magnetic-dancing-doll-science-model-students-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/science-exhibition-magnetic-doll',
    caption:   'Magnetic Dancing Doll Science Model',
    altText:   'Students with magnetic dancing doll science model at school exhibition',
    category:  'Science Exhibition', albumName: 'Science Exhibition', order: 7, status: 'published',
  },
  {
    filename: 'place-value-maths-working-model-student-exhibition-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/science-exhibition-place-value',
    caption:   'Place Value Maths Model',
    altText:   'Student presenting place value maths model at school exhibition',
    category:  'Science Exhibition', albumName: 'Science Exhibition', order: 8, status: 'published',
  },
  {
    filename: 'parts-of-speech-preposition-english-exhibition-parents-visit-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/science-exhibition-english-parts',
    caption:   'English Exhibition – Parts of Speech',
    altText:   'English parts of speech exhibition stall with parents visiting',
    category:  'Science Exhibition', albumName: 'Science Exhibition', order: 9, status: 'published',
  },
  {
    filename: 'anti-corruption-awareness-poster-making-student-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/anti-corruption-poster-making',
    caption:   'Anti-Corruption Awareness Poster Making',
    altText:   'Student making anti-corruption awareness poster at school',
    category:  'Science Exhibition', albumName: 'Science Exhibition', order: 10, status: 'published',
  },
  {
    filename: 'welcome-to-science-corner-signboard-decoration-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/science-corner-signboard',
    caption:   'Science Corner Signboard',
    altText:   'Welcome to Science Corner decorated signboard at school exhibition',
    category:  'Science Exhibition', albumName: 'Science Exhibition', order: 11, status: 'published',
  },
  {
    filename: 'welcome-to-world-of-english-fancy-dress-students-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/world-of-english-exhibition',
    caption:   'World of English Exhibition',
    altText:   'Students in fancy dress at World of English exhibition',
    category:  'Science Exhibition', albumName: 'Science Exhibition', order: 12, status: 'published',
  },

  // ── ART AND CRAFT ─────────────────────────────────────────────────────────
  {
    filename: 'art-and-craft-activity-students-making-paper-cardboard-crafts-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/art-craft-paper-cardboard',
    caption:   'Art and Craft – Paper Crafts',
    altText:   'Students making paper and cardboard crafts during art and craft activity',
    category:  'Art and Craft', albumName: 'Art and Craft', order: 1, status: 'published',
  },
  {
    filename: 'friday-fun-activity-tie-dye-handkerchief-art-and-craft-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/tie-dye-handkerchief',
    caption:   'Tie-Dye Handkerchief – Friday Fun',
    altText:   'Students doing tie-dye handkerchief craft during Friday Fun Activity',
    category:  'Art and Craft', albumName: 'Art and Craft', order: 2, status: 'published',
  },
  {
    filename: 'handmade-envelopes-and-gift-bags-craft-activity-students-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/handmade-envelopes-bags',
    caption:   'Handmade Envelopes and Gift Bags',
    altText:   'Students creating handmade envelopes and gift bags during craft activity',
    category:  'Art and Craft', albumName: 'Art and Craft', order: 3, status: 'published',
  },
  {
    filename: 'poster-making-competition-students-on-floor-hall-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/poster-making-hall',
    caption:   'Poster Making Competition',
    altText:   'Students sitting on floor making posters during competition',
    category:  'Art and Craft', albumName: 'Art and Craft', order: 4, status: 'published',
  },
  {
    filename: 'poster-making-competition-students-working-together-1-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/poster-making-group-1',
    caption:   'Poster Making – Group Work',
    altText:   'Students working together on poster making competition',
    category:  'Art and Craft', albumName: 'Art and Craft', order: 5, status: 'published',
  },
  {
    filename: 'poster-making-competition-students-working-together-2-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/poster-making-group-2',
    caption:   'Poster Making – Group Work 2',
    altText:   'Students working together on poster making competition 2',
    category:  'Art and Craft', albumName: 'Art and Craft', order: 6, status: 'published',
  },
  {
    filename: 'rakhi-making-activity-friday-fun-students-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/rakhi-making-friday-fun',
    caption:   'Rakhi Making – Friday Fun',
    altText:   'Students making Rakhis during Friday Fun activity session',
    category:  'Art and Craft', albumName: 'Raksha Bandhan', order: 7, status: 'published',
  },
  {
    filename: 'rakhi_making_activity_nursery_kids_collage.webp',
    publicId:  'tilak-global-school/activities/rakhi-making-nursery',
    caption:   'Rakhi Making – Nursery Kids',
    altText:   'Nursery kids collage of Rakhi making activity',
    category:  'Art and Craft', albumName: 'Raksha Bandhan', order: 8, status: 'published',
  },
  {
    filename: 'handmade-rakhis-made-by-students-display-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/handmade-rakhis-display',
    caption:   'Handmade Rakhis Display',
    altText:   'Display of handmade Rakhis created by students',
    category:  'Art and Craft', albumName: 'Raksha Bandhan', order: 9, status: 'published',
  },
  {
    filename: 'handmade-rakhis-tied-on-wrists-students-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/rakhis-tied-on-wrists',
    caption:   'Students Tying Rakhis',
    altText:   'Students tying handmade Rakhis on each other at Tilak Global School',
    category:  'Art and Craft', albumName: 'Raksha Bandhan', order: 10, status: 'published',
  },
  {
    filename: 'students-craft-activity-colour-paper-classroom-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/colour-paper-craft',
    caption:   'Colour Paper Craft Activity',
    altText:   'Students doing colour paper craft activity in classroom',
    category:  'Art and Craft', albumName: 'Art and Craft', order: 11, status: 'published',
  },
  {
    filename: 'two_kids_craft_activity_on_school_lawn.webp',
    publicId:  'tilak-global-school/activities/kids-craft-on-lawn',
    caption:   'Kids Craft on School Lawn',
    altText:   'Two young kids doing a craft activity on the school lawn',
    category:  'Art and Craft', albumName: 'Art and Craft', order: 12, status: 'published',
  },
  {
    filename: 'students_dance_class_with_instructor_near_stage.webp',
    publicId:  'tilak-global-school/activities/dance-class-instructor',
    caption:   'Dance Class with Instructor',
    altText:   'Students in dance class with instructor near the school open stage',
    category:  'Art and Craft', albumName: 'Dance', order: 13, status: 'published',
  },
  {
    filename: 'students_standing_in_line_dance_practice_hall.webp',
    publicId:  'tilak-global-school/activities/dance-practice-formation',
    caption:   'Dance Practice Formation',
    altText:   'Students standing in formation during dance practice in school hall',
    category:  'Art and Craft', albumName: 'Dance', order: 14, status: 'published',
  },
  {
    filename: 'classical-dance-performance-girl-students-stage-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/classical-dance-stage',
    caption:   'Classical Dance Performance',
    altText:   'Girl students performing classical dance on stage at school event',
    category:  'Art and Craft', albumName: 'Dance', order: 15, status: 'published',
  },
  {
    filename: 'shiv-tandav-dance-performance-students-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/shiv-tandav-dance',
    caption:   'Shiv Tandav Dance',
    altText:   'Students performing Shiv Tandav dance at school cultural event',
    category:  'Art and Craft', albumName: 'Dance', order: 16, status: 'published',
  },

  // ── SARASWATI PUJA ───────────────────────────────────────────────────────
  {
    filename: 'saraswati_idol_marigold_garland_puja_thali.webp',
    publicId:  'tilak-global-school/events/saraswati-puja-idol',
    caption:   'Saraswati Idol – Puja',
    altText:   'Saraswati idol with marigold garland and puja thali at Tilak Global School',
    category:  'Saraswati Puja', albumName: 'Saraswati Puja', order: 1, status: 'published',
  },
  {
    filename: 'saraswati_puja_aarti_by_management_and_staff.webp',
    publicId:  'tilak-global-school/events/saraswati-puja-aarti',
    caption:   'Saraswati Puja Aarti',
    altText:   'School management and staff performing Saraswati Puja aarti',
    category:  'Saraswati Puja', albumName: 'Saraswati Puja', order: 2, status: 'published',
  },
  {
    filename: 'saraswati_puja_staff_group_in_hall.webp',
    publicId:  'tilak-global-school/events/saraswati-puja-staff-group',
    caption:   'Staff Group – Saraswati Puja',
    altText:   'Staff group photo in school hall during Saraswati Puja',
    category:  'Saraswati Puja', albumName: 'Saraswati Puja', order: 3, status: 'published',
  },
  {
    filename: 'saraswati-vandana-students-devotional-singing-music-performance-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/saraswati-vandana-singing',
    caption:   'Saraswati Vandana Singing',
    altText:   'Students performing Saraswati Vandana devotional singing and music',
    category:  'Saraswati Puja', albumName: 'Saraswati Puja', order: 4, status: 'published',
  },

  // ── TEACHERS DAY ─────────────────────────────────────────────────────────
  {
    filename: 'teachers-day-celebration-portrait-presentation-ceremony-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/teachers-day-portrait-ceremony',
    caption:   'Teachers Day – Portrait Ceremony',
    altText:   'Portrait presentation ceremony at Teachers Day celebration',
    category:  'Teachers Day', albumName: "Teachers' Day", order: 1, status: 'published',
  },
  {
    filename: 'teachers-day-certificate-of-appreciation-felicitation-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/teachers-day-certificate',
    caption:   'Certificate of Appreciation – Teachers Day',
    altText:   'Teachers being felicitated with certificates of appreciation on Teachers Day',
    category:  'Teachers Day', albumName: "Teachers' Day", order: 2, status: 'published',
  },
  {
    filename: 'teachers-and-staff-group-photo-school-event-stage-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/teachers-staff-group-photo',
    caption:   'Teachers and Staff Group Photo',
    altText:   'Teachers and staff group photo on stage at school event',
    category:  'Teachers Day', albumName: "Teachers' Day", order: 3, status: 'published',
  },
  {
    filename: 'teachers-and-students-group-photo-stage-school-event-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/teachers-students-group-photo',
    caption:   'Teachers and Students Group Photo',
    altText:   'Teachers and students group photo together on stage at school event',
    category:  'Teachers Day', albumName: "Teachers' Day", order: 4, status: 'published',
  },

  // ── EDUCATIONAL VISITS ───────────────────────────────────────────────────
  {
    filename: 'students-educational-visit-group-photo-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/educational-visit-group-photo',
    caption:   'Educational Visit – Group Photo',
    altText:   'Students group photo during educational visit',
    category:  'Educational Visits', albumName: 'Educational Visits', order: 1, status: 'published',
  },
  {
    filename: 'students-jaipur-dairy-educational-visit-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/jaipur-dairy-visit',
    caption:   'Jaipur Dairy Educational Visit',
    altText:   'Students visiting Jaipur Dairy during educational excursion',
    category:  'Educational Visits', albumName: 'Educational Visits', order: 2, status: 'published',
  },
  {
    filename: 'students-army-unit-visit-gift-presentation-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/activities/army-unit-visit',
    caption:   'Army Unit Educational Visit',
    altText:   'Students visiting army unit and presenting gifts to army personnel',
    category:  'Educational Visits', albumName: 'Educational Visits', order: 3, status: 'published',
  },

  // ── OTHER EVENTS ─────────────────────────────────────────────────────────
  {
    filename: 'menstrual-hygiene-awareness-session-girls-raising-booklets-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/hygiene-awareness-booklets',
    caption:   'Menstrual Hygiene Awareness Session',
    altText:   'Girl students raising hygiene awareness booklets at health session',
    category:  'Activities', albumName: 'Health Awareness', order: 1, status: 'published',
  },
  {
    filename: 'menstrual-hygiene-awareness-session-pad-struggles-presentation-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/hygiene-awareness-presentation',
    caption:   'Hygiene Awareness – Presentation',
    altText:   'Presentation during menstrual hygiene awareness session at school',
    category:  'Activities', albumName: 'Health Awareness', order: 2, status: 'published',
  },
  {
    filename: 'menstrual-hygiene-awareness-session-speaker-girl-students-seated-tilak-global-school-jaipur.webp',
    publicId:  'tilak-global-school/events/hygiene-awareness-speaker',
    caption:   'Hygiene Awareness – Speaker',
    altText:   'Speaker addressing seated girl students during hygiene awareness session',
    category:  'Activities', albumName: 'Health Awareness', order: 3, status: 'published',
  },
  {
    filename: 'plantation_activity_kids_planting_sapling_with_staff_member.webp',
    publicId:  'tilak-global-school/activities/plantation-sapling',
    caption:   'Plantation Activity',
    altText:   'Kids planting a sapling with staff member during plantation activity',
    category:  'Activities', albumName: 'Plantation', order: 4, status: 'published',
  },
  {
    filename: 'plantation_activity_two_kids_holding_plant_near_flower_bed.webp',
    publicId:  'tilak-global-school/activities/plantation-flower-bed',
    caption:   'Plantation Activity – Flower Bed',
    altText:   'Two kids holding a plant near school flower bed during plantation activity',
    category:  'Activities', albumName: 'Plantation', order: 5, status: 'published',
  },
  {
    filename: 'two_kids_hugging_tree_in_school_garden.webp',
    publicId:  'tilak-global-school/activities/kids-hugging-tree',
    caption:   'Kids Hugging Tree – School Garden',
    altText:   'Two young students hugging a tree in the school garden',
    category:  'Activities', albumName: 'Plantation', order: 6, status: 'published',
  },
  {
    filename: 'two_kids_sharing_flowering_plant_garden.webp',
    publicId:  'tilak-global-school/activities/kids-flowering-plant',
    caption:   'Kids with Flowering Plant – School Garden',
    altText:   'Two kids sharing a flowering plant in the school garden',
    category:  'Activities', albumName: 'Plantation', order: 7, status: 'published',
  },
  {
    filename: 'two_kids_smelling_flower_with_potted_plant_garden.webp',
    publicId:  'tilak-global-school/activities/kids-smelling-flower',
    caption:   'Kids Smelling Flowers – School Garden',
    altText:   'Two kids smelling a flower near potted plants in school garden',
    category:  'Activities', albumName: 'Plantation', order: 8, status: 'published',
  },
  {
    filename: 'pool_party_kids_in_inflatable_pool_with_playground.webp',
    publicId:  'tilak-global-school/activities/pool-party-kids',
    caption:   'School Pool Party',
    altText:   'Kids playing in inflatable pool with playground in background',
    category:  'Activities', albumName: 'Pool Party', order: 9, status: 'published',
  },
  {
    filename: 'pool_party_photo_frame_kids_collage.webp',
    publicId:  'tilak-global-school/activities/pool-party-collage',
    caption:   'Pool Party Photo Collage',
    altText:   'Collage of kids at school pool party in decorative photo frame',
    category:  'Activities', albumName: 'Pool Party', order: 10, status: 'published',
  },
  {
    filename: 'pool_party_photo_frame_kids_posing_closeup.webp',
    publicId:  'tilak-global-school/activities/pool-party-posing',
    caption:   'Kids Posing – Pool Party',
    altText:   'Kids posing in decorative photo frame at pool party',
    category:  'Activities', albumName: 'Pool Party', order: 11, status: 'published',
  },
  {
    filename: 'pool_party_photo_frame_kids_posing_with_frame.webp',
    publicId:  'tilak-global-school/activities/pool-party-frame',
    caption:   'Pool Party – Photo Frame',
    altText:   'Kids holding and posing with decorative photo frame at pool party',
    category:  'Activities', albumName: 'Pool Party', order: 12, status: 'published',
  },
  {
    filename: 'childrens_day_photo_frame_two_kids.webp',
    publicId:  'tilak-global-school/activities/childrens-day-frame',
    caption:   "Children's Day Celebration",
    altText:   "Two kids posing in decorative photo frame on Children's Day",
    category:  'Activities', albumName: "Children's Day", order: 13, status: 'published',
  },
  {
    filename: 'management_and_staff_group_photo_on_stage.webp',
    publicId:  'tilak-global-school/events/management-staff-group-photo',
    caption:   'Management and Staff Group Photo',
    altText:   'School management and staff group photo on stage at an event',
    category:  'Activities', albumName: 'School Events', order: 14, status: 'published',
  },
  {
    filename: 'tilak_global_family_staff_group_photo_on_stage.webp',
    publicId:  'tilak-global-school/events/tilak-global-family-staff-photo',
    caption:   'Tilak Global School Family – Staff Photo',
    altText:   'Large group photo of Tilak Global School family on stage',
    category:  'Activities', albumName: 'School Events', order: 15, status: 'published',
  },
  {
    filename: 'chief_guest_gift_presentation_with_management_in_office.webp',
    publicId:  'tilak-global-school/events/chief-guest-gift-presentation',
    caption:   'Chief Guest Gift Presentation',
    altText:   'Chief guest receiving gift presentation from management in school office',
    category:  'Activities', albumName: 'School Events', order: 16, status: 'published',
  },
  {
    filename: 'three_girl_students_with_marigold_garlands_in_principal_office.webp',
    publicId:  'tilak-global-school/events/students-garlands-principal-office',
    caption:   'Students Felicitated in Principal Office',
    altText:   'Three girl students with marigold garlands in the principal office',
    category:  'Activities', albumName: 'School Events', order: 17, status: 'published',
  },
  {
    filename: 'handmade-rakhi-designs-students-video-tilak-global-school-jaipur-poster.webp',
    publicId:  'tilak-global-school/activities/rakhi-video-poster',
    caption:   'Rakhi Designs Video Poster',
    altText:   'Poster thumbnail for Rakhi designs video by students',
    category:  'Art and Craft', albumName: 'Raksha Bandhan', order: 20, status: 'published',
  },
];

async function seedGallery() {
  sep('2. GALLERY IMAGES');
  log(`Total images to process: ${GALLERY_MANIFEST.length}`);

  for (const item of GALLERY_MANIFEST) {
    const localPath = path.join(IMAGES_DIR, item.filename);

    if (!fs.existsSync(localPath)) {
      warn(`File not found, skipping: ${item.filename}`);
      stats.failed++;
      continue;
    }

    // Upload to Cloudinary (idempotent)
    const uploadResult = await uploadIfNeeded(localPath, item.publicId, {
      folder: item.publicId.split('/').slice(0, -1).join('/'),
      quality: 'auto:good',
    });

    if (!uploadResult && !DRY_RUN) continue;

    if (DRY_RUN) continue;

    // Upsert in MongoDB using publicId as stable key
    const existing = await GalleryImage.findOne({ cloudinaryPublicId: item.publicId });
    if (existing) {
      // Update if URL changed (e.g. re-upload)
      await GalleryImage.findByIdAndUpdate(existing._id, {
        imageUrl:               uploadResult.secure_url,
        cloudinaryPublicId:     uploadResult.public_id,
        cloudinaryResourceType: 'image',
        caption:                item.caption,
        altText:                item.altText,
        category:               item.category,
        albumName:              item.albumName,
        order:                  item.order,
        status:                 item.status,
      });
      skip(`DB already exists, updated: ${item.caption}`);
      stats.dbUpdated++;
    } else {
      await GalleryImage.create({
        imageUrl:               uploadResult.secure_url,
        cloudinaryPublicId:     uploadResult.public_id,
        cloudinaryResourceType: 'image',
        caption:                item.caption,
        altText:                item.altText,
        category:               item.category,
        albumName:              item.albumName,
        order:                  item.order,
        status:                 item.status,
      });
      ok(`DB record created: ${item.caption} (${item.category})`);
      stats.dbCreated++;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: FAQs (using existing phase5Seed data — just ensure they're current)
// ─────────────────────────────────────────────────────────────────────────────
async function seedFaqs() {
  sep('3. FAQs');

  const FAQS = [
    { question: 'What is the CBSE Affiliation Number of Tilak Global School?', answer: 'Tilak Global School is affiliated with CBSE, New Delhi. Affiliation No: 1730870 | School Code: 11224.', order: 1 },
    { question: 'Which classes are offered at Tilak Global School?', answer: 'We offer classes from Play Group (Pre-Nursery), Nursery, KG (Prep), and Class I to Class XII.', order: 2 },
    { question: 'What is the admission process?', answer: 'Four steps: (1) Enquire — fill online form or visit office. (2) Apply — complete admission form. (3) Interaction — brief assessment if required (Class I+). (4) Confirm — submit documents and pay fees.', order: 3 },
    { question: 'What documents are required for admission?', answer: 'Birth Certificate, previous TC, previous marksheet, Aadhaar card (child and parent), 4 passport photos, parent ID proof, address proof, caste certificate (if applicable).', order: 4 },
    { question: 'Is transport facility available?', answer: 'Yes, school bus service is available. Transport charges are based on distance. Please contact the school office for details.', order: 5 },
    { question: 'What are the office timings?', answer: 'The school office is open Monday to Saturday from 8:00 AM to 2:00 PM.', order: 6 },
    { question: 'How can I contact the school?', answer: 'Phone/WhatsApp: 9119112335 | Landline: 0141-2945793 | Email: schooltilak@gmail.com | Address: Bindayaka (Bhutawali), Mukundpura Road, Jaipur - 302041.', order: 7 },
    { question: 'What medium of instruction does the school follow?', answer: 'Tilak Global School is an English-medium school following the CBSE/NCERT curriculum.', order: 8 },
  ];

  for (const faq of FAQS) {
    if (DRY_RUN) { log(`[DRY RUN] Would upsert FAQ: ${faq.question.substring(0, 60)}...`); continue; }

    const existing = await Faq.findOne({ question: faq.question });
    if (existing) {
      await Faq.findByIdAndUpdate(existing._id, { answer: faq.answer, order: faq.order, isActive: true });
      skip(`FAQ exists, updated: ${faq.question.substring(0, 50)}...`);
      stats.dbUpdated++;
    } else {
      await Faq.create({ ...faq, isActive: true });
      ok(`FAQ created: ${faq.question.substring(0, 50)}...`);
      stats.dbCreated++;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: FEE ROWS — confirmed amounts from fee chart 2026-27
// ─────────────────────────────────────────────────────────────────────────────
async function seedFees() {
  sep('4. FEE STRUCTURE 2026-27');
  warn('CF-04: Class XI totals are conflicting — skipping Class XI.');
  warn('CF-05: Bus per-km rate is conflicting — not seeded.');

  const FEE_ROWS = [
    { classGroup: 'Play Group – Prep', admissionFee: 4000,  tuitionFeePerMonth: 6800,  otherCharges: null, fullSessionTotal: 31200, notes: '', order: 0 },
    { classGroup: 'Class I – II',      admissionFee: 4500,  tuitionFeePerMonth: 7500,  otherCharges: null, fullSessionTotal: 34500, notes: '', order: 1 },
    { classGroup: 'Class III – V',     admissionFee: 4500,  tuitionFeePerMonth: 7500,  otherCharges: 1200, fullSessionTotal: 35700, notes: 'Other charges include club fee ₹1,200.', order: 2 },
    { classGroup: 'Class VI – VIII',   admissionFee: 5000,  tuitionFeePerMonth: 8500,  otherCharges: null, fullSessionTotal: 40200, notes: '', order: 3 },
    { classGroup: 'Class IX',          admissionFee: 5500,  tuitionFeePerMonth: 9500,  otherCharges: null, fullSessionTotal: 44700, notes: '', order: 4 },
    { classGroup: 'Class X',           admissionFee: 5500,  tuitionFeePerMonth: 9500,  otherCharges: null, fullSessionTotal: 43500, notes: '', order: 5 },
    // Class XI/XII: SKIPPED — CF-04 conflict pending client confirmation
  ];

  for (const row of FEE_ROWS) {
    if (DRY_RUN) { log(`[DRY RUN] Would upsert: ${row.classGroup}`); continue; }
    await FeeRow.findOneAndUpdate(
      { classGroup: row.classGroup },
      { $set: { ...row, isActive: true } },
      { upsert: true, returnDocument: 'after' }
    );
    ok(`Fee row upserted: ${row.classGroup}`);
    stats.dbUpdated++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: CMS CONTENT BLOCKS
// ─────────────────────────────────────────────────────────────────────────────
async function seedContent() {
  sep('5. CMS CONTENT BLOCKS');

  const BLOCKS = [
    // Home
    { key: 'home.hero.title',    value: 'Welcome to Tilak Global School' },
    { key: 'home.hero.subtitle', value: 'A CBSE Affiliated English-Medium School in Jaipur — Nursery to Class XII. Nurturing Curious Minds, Building Future Leaders.' },
    { key: 'home.hero.badge',    value: 'Admissions Open · Session 2026-27' },
    { key: 'home.welcome.title', value: 'Welcome to Tilak Global School' },
    { key: 'home.welcome.body',  value: "Welcome to Tilak Global School, where every child's potential is nurtured with care, creativity, and commitment. Situated in Jaipur, our school is a CBSE-affiliated institution dedicated to providing quality education from Play Group to Class XII.\n\nAt Tilak Global School, we believe education is not just about academics — it's about building well-rounded individuals. Our experienced faculty, modern infrastructure, and holistic approach ensure that every student thrives — academically, socially, and emotionally." },
    { key: 'home.cta.title',     value: 'Give your child the best start.' },
    { key: 'home.cta.subtitle',  value: 'Admissions open for session 2026-27. Limited seats available. Contact us today.' },
    // About
    { key: 'about.intro.body',   value: "Tilak Global School is an English-medium, co-educational CBSE school offering classes from Play Group to Class XII, situated in Bindayaka (Bhutawali), Mukundpura Road, Jaipur.\n\nFollowing the NCERT/CBSE syllabus, the school takes a holistic and constructivist approach, offering equal educational and developmental opportunities in a stress-free, nurturing environment." },
    { key: 'about.vision.text',  value: 'To be a centre of excellence that empowers students with knowledge, values, and skills to become responsible global citizens.' },
    { key: 'about.mission.text', value: 'To provide a holistic, student-centred education that integrates academic excellence with character development, creativity, and life skills through experienced faculty, modern infrastructure, and a nurturing environment.' },
    { key: 'about.values.list',  value: ['Integrity', 'Excellence', 'Creativity', 'Respect', 'Responsibility', 'Compassion'] },
    { key: 'about.director.message', value: "At Tilak Global School, we are committed to creating an environment where every child is inspired to learn, explore, and excel. Our dedicated team of educators works tirelessly to ensure that every student receives personalised attention and guidance.\n\nOur vision is education with positive input, emphasising creativity and innovation, so every child can build strong character and meet a changing world with confidence." },
    // Academics
    { key: 'academics.kg.description',      value: 'A safe, family-like environment where children develop social, emotional and early academic skills through play, activity, and creative exploration.' },
    { key: 'academics.primary.description', value: 'Qualified faculty guide students through foundational concepts using the NCERT curriculum with an activity-based, child-centred approach.' },
    { key: 'academics.middle.description',  value: 'Teachers use aligned strategies to develop analytical thinking, problem-solving, and collaborative skills, preparing students for the challenges of senior school.' },
    { key: 'academics.senior.description',  value: 'Focused preparation for board examinations and competitive entrance tests, with dedicated career guidance and stream-specific support in Science, Commerce, and Humanities.' },
    // Admissions
    { key: 'admissions.process.step1', value: 'Enquire — Fill the online enquiry form or visit the school office during office hours (8:00 AM – 2:00 PM).' },
    { key: 'admissions.process.step2', value: 'Apply — Complete the admission application form with all student and parent / guardian details.' },
    { key: 'admissions.process.step3', value: 'Interaction — Attend a brief interaction or assessment session at the school if required (Class I and above).' },
    { key: 'admissions.process.step4', value: 'Confirm — Submit original documents, pay the admission fee, and collect your admission kit to confirm your seat.' },
    { key: 'admissions.docs.list',     value: ['Birth Certificate (original + photocopy)', 'Previous School Transfer Certificate (TC)', 'Previous Year Marksheet / Report Card', 'Aadhaar Card — Child and Parent (photocopy)', '4 Passport-size Photographs', 'Parent / Guardian ID Proof', 'Address Proof', 'Caste Certificate (if applicable)'] },
    { key: 'contact.intro.text', value: 'We would love to hear from you. Reach out via phone, email or the form below. Our office is open Monday to Saturday, 8:00 AM to 2:00 PM.' },
    { key: 'downloads.intro.text', value: 'Download CBSE mandatory disclosures, school policies, fee structure, academic documents and admission forms below.' },
  ];

  for (const block of BLOCKS) {
    if (DRY_RUN) { log(`[DRY RUN] Would update: ${block.key}`); continue; }
    const result = await Content.findOneAndUpdate(
      { key: block.key },
      { $set: { value: block.value, status: 'published', hasDraft: false, draftValue: null, publishedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (result) { ok(`CMS updated: ${block.key}`); stats.dbUpdated++; }
    else { warn(`CMS key not found (run seed:content first): ${block.key}`); }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: CHAIRMAN + DIRECTOR PHOTO (goes to gallery — not in SiteSettings)
// ─────────────────────────────────────────────────────────────────────────────
async function seedManagementPhotos() {
  sep('6. MANAGEMENT PHOTOS (Chairman + Director)');

  const managementPhotos = [
    {
      filename: 'chairman_and_director_tilak_global_school_backdrop.webp',
      publicId:  'tilak-global-school/campus/chairman-and-director',
      caption:   'Chairman and Director – Tilak Global School',
      altText:   'Chairman and Director of Tilak Global School in front of school logo backdrop',
      category:  'Activities',
      albumName: 'Management',
      order:     1,
      status:    'published',
      note:      'CF-10: Chairman name pending | CF-01: Director name pending',
    },
  ];

  for (const item of managementPhotos) {
    const localPath = path.join(IMAGES_DIR, item.filename);
    if (!fs.existsSync(localPath)) { warn(`File not found: ${item.filename}`); continue; }

    warn(`Note — ${item.note}`);
    const uploadResult = await uploadIfNeeded(localPath, item.publicId, { folder: 'tilak-global-school/campus' });
    if (!uploadResult || DRY_RUN) continue;

    const existing = await GalleryImage.findOne({ cloudinaryPublicId: item.publicId });
    if (!existing) {
      await GalleryImage.create({
        imageUrl: uploadResult.secure_url, cloudinaryPublicId: uploadResult.public_id,
        cloudinaryResourceType: 'image', caption: item.caption, altText: item.altText,
        category: item.category, albumName: item.albumName, order: item.order, status: item.status,
      });
      ok(`DB record created: ${item.caption}`);
      stats.dbCreated++;
    } else {
      skip(`Already in DB: ${item.caption}`);
      stats.dbSkipped++;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) console.log('\n🔍 DRY RUN MODE — no uploads or DB changes will happen\n');

  console.log('═'.repeat(60));
  console.log('  TILAK GLOBAL SCHOOL — CLIENT CONTENT MIGRATION');
  console.log('  seedClientContent.js');
  console.log('═'.repeat(60));

  // Connect to Atlas
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('\n✅ MongoDB Atlas connected:', mongoose.connection.name);

  const startTime = Date.now();

  try {
    if (!ONLY || ONLY === 'settings')    await seedSettings();
    if (!ONLY || ONLY === 'gallery')     await seedGallery();
    if (!ONLY || ONLY === 'gallery')     await seedManagementPhotos();
    if (!ONLY || ONLY === 'faqs')        await seedFaqs();
    if (!ONLY || ONLY === 'fees')        await seedFees();
    if (!ONLY || ONLY === 'content')     await seedContent();
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ── Final Report ───────────────────────────────────────────────────────
  sep('MIGRATION SUMMARY');
  console.log(`  Duration:         ${elapsed}s`);
  console.log(`  Images uploaded:  ${stats.uploaded}`);
  console.log(`  Images skipped:   ${stats.skipped} (already on Cloudinary)`);
  console.log(`  Upload failures:  ${stats.failed}`);
  console.log(`  DB records created:  ${stats.dbCreated}`);
  console.log(`  DB records updated:  ${stats.dbUpdated}`);
  console.log(`  DB records skipped:  ${stats.dbSkipped}`);

  console.log('\n⚠️  PENDING CONFIRMATIONS (not seeded):');
  console.log('   CF-01: Director name (Abhay Tanwar vs R.S. Tanwar)');
  console.log('   CF-02: Class XI/XII streams (Science+Commerce+Humanities vs Arts+Commerce)');
  console.log('   CF-04: Class XI fee totals (two conflicting values)');
  console.log('   CF-05: Bus per-km rate (₹250 vs ₹150)');
  console.log('   CF-09: Principal full name');
  console.log('   CF-10: Chairman full name');
  console.log('   CF-11: Google Maps embed URL');
  console.log('   CF-14: Social media handles');

  console.log('\n🎉 Migration complete!\n');

  await mongoose.disconnect();
}

main();

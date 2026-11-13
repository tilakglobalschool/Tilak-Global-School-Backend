/**
 * Multer upload middleware — Cloudinary storage with local disk fallback
 *
 * When CLOUDINARY_API_KEY is set → uploads go to Cloudinary.
 * When CLOUDINARY_API_KEY is missing → falls back to local /uploads/media/ folder.
 * This allows local development without Cloudinary credentials.
 */
import multer                      from 'multer';
import { CloudinaryStorage }       from 'multer-storage-cloudinary';
import cloudinary                  from '../config/cloudinary.js';
import { MAX_FILE_SIZE_MB, CLOUDINARY_API_KEY, UPLOAD_DIR } from '../config/env.js';
import path                        from 'path';
import fs                          from 'fs';

// ── MIME type allowlists ─────────────────────────────────────────────────────
const IMAGE_MIMES    = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MEDIA_MIMES  = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
const VIDEO_MIMES  = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

// ── MIME filter factory ───────────────────────────────────────────────────────
function makeFilter(allowedMimes) {
  return function (req, file, cb) {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `File type not allowed: ${file.mimetype}. Allowed: ${allowedMimes.join(', ')}`
      ));
    }
  };
}

const maxSize = (MAX_FILE_SIZE_MB || 10) * 1024 * 1024;

// ── Check if Cloudinary is configured ────────────────────────────────────────
const cloudinaryEnabled = !!(CLOUDINARY_API_KEY && CLOUDINARY_API_KEY.trim());

// ── Local disk storage factory (fallback when Cloudinary not configured) ─────
function makeLocalStorage(subFolder) {
  const dir = path.join(UPLOAD_DIR, subFolder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    destination_path: dir,
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname) || '.jpg';
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, name);
    },
  });
}

// When using local disk, patch req.file so controller sees .path and .filename
// matching the same interface as multer-storage-cloudinary.
function patchLocalFile(subFolder) {
  return (req, res, next) => {
    if (req.file && req.file.path && req.file.path.includes(UPLOAD_DIR)) {
      // Convert absolute path → relative URL  /uploads/<subFolder>/<filename>
      req.file.path     = `/uploads/${subFolder}/${req.file.filename}`;
      // filename acts as publicId for local files
    }
    next();
  };
}

// ── CloudinaryStorage factory ─────────────────────────────────────────────────
function makeCloudinaryStorage(folder, resourceType = 'image') {
  return new CloudinaryStorage({
    cloudinary,
    params: (req, file) => ({
      folder,
      resource_type: resourceType,
      public_id:     undefined,
      ...(resourceType === 'image' && {
        quality:      'auto:good',
        fetch_format: 'auto',
        flags:        'strip_profile',
      }),
    }),
  });
}

// ── Storage selector ──────────────────────────────────────────────────────────
function makeStorage(cloudinaryFolder, localSubFolder, resourceType = 'image') {
  if (cloudinaryEnabled) {
    return makeCloudinaryStorage(cloudinaryFolder, resourceType);
  }
  return makeLocalStorage(localSubFolder);
}

// ── Upload handlers ───────────────────────────────────────────────────────────

export const uploadImage = multer({
  storage:    makeStorage('tilak-global-school/gallery', 'gallery'),
  fileFilter: makeFilter(IMAGE_MIMES),
  limits:     { fileSize: maxSize },
}).single('image');

export const uploadNewsImage = multer({
  storage:    makeStorage('tilak-global-school/news', 'news'),
  fileFilter: makeFilter(IMAGE_MIMES),
  limits:     { fileSize: maxSize },
}).single('image');

export const uploadDocument = multer({
  storage:    cloudinaryEnabled
    ? makeCloudinaryStorage('tilak-global-school/documents', 'raw')
    : makeLocalStorage('documents'),
  fileFilter: makeFilter(DOCUMENT_MIMES),
  limits:     { fileSize: maxSize },
}).single('file');

export const uploadMedia = multer({
  storage:    makeStorage('tilak-global-school/media', 'media'),
  fileFilter: makeFilter(MEDIA_MIMES),
  limits:     { fileSize: maxSize },
}).single('media');

export const uploadVideo = multer({
  storage:    cloudinaryEnabled
    ? makeCloudinaryStorage('tilak-global-school/videos', 'video')
    : makeLocalStorage('videos'),
  fileFilter: makeFilter(VIDEO_MIMES),
  limits:     { fileSize: 100 * 1024 * 1024 },
}).single('video');

// Patch middleware for local storage (noop when Cloudinary is active)
export const patchMediaFile    = cloudinaryEnabled ? (req, res, next) => next() : patchLocalFile('media');
export const patchGalleryFile  = cloudinaryEnabled ? (req, res, next) => next() : patchLocalFile('gallery');
export const patchNewsFile     = cloudinaryEnabled ? (req, res, next) => next() : patchLocalFile('news');
export const patchDocumentFile = cloudinaryEnabled ? (req, res, next) => next() : patchLocalFile('documents');

/**
 * Error handler — place immediately after any upload middleware.
 */
export function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? `File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB || 10} MB.`
      : err.message;
    return res.status(400).json({ success: false, message: msg });
  }
  next(err);
}

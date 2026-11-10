/**
 * Multer upload middleware — Cloudinary storage
 *
 * All files are uploaded directly to Cloudinary (no local disk dependency).
 * Render's ephemeral filesystem is not used for permanent storage.
 *
 * Security:
 *   - File type validated by MIME (not extension)
 *   - File size capped by MAX_FILE_SIZE_MB env var
 *   - Client-supplied filenames are ignored (Cloudinary generates public_id)
 *   - API secret never reaches the browser
 *
 * Cloudinary folder structure:
 *   tilak-global-school/gallery      — gallery images
 *   tilak-global-school/news         — news/event featured images
 *   tilak-global-school/documents    — PDF / Word / Excel downloads
 *   tilak-global-school/media        — logo, favicon, director photo
 *   tilak-global-school/videos       — MP4 videos (resource_type: video)
 *
 * Exports:
 *   uploadImage       — gallery images (jpg, png, webp)
 *   uploadDocument    — downloadable files (pdf, doc, docx, xls, xlsx)
 *   uploadMedia       — logo/favicon/director photo (jpg, png, svg, webp)
 *   uploadNewsImage   — news/event featured images (jpg, png, webp)
 *   uploadVideo       — video files (mp4)
 *   handleUploadError — error-handler middleware (place after upload)
 *
 * Backward compatibility:
 *   Existing records with /uploads/* URLs continue to work.
 *   The /uploads static route in app.js still serves legacy files.
 */
import multer                      from 'multer';
import { CloudinaryStorage }       from 'multer-storage-cloudinary';
import cloudinary                  from '../config/cloudinary.js';
import { MAX_FILE_SIZE_MB }        from '../config/env.js';

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

// ── CloudinaryStorage factory ─────────────────────────────────────────────────
/**
 * @param {string} folder      — Cloudinary folder path
 * @param {string} resourceType — 'image' | 'raw' | 'video'
 * @param {string[]} [formats] — allowed formats (optional, Cloudinary default = all)
 */
function makeCloudinaryStorage(folder, resourceType = 'image', formats) {
  return new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
      const params = {
        folder,
        resource_type: resourceType,
        // Use original filename base (sanitised) for readability; Cloudinary appends version
        public_id: undefined, // let Cloudinary auto-generate
        // For images: preserve quality, strip metadata
        ...(resourceType === 'image' && {
          quality:          'auto:good',
          fetch_format:     'auto',
          flags:            'strip_profile',
        }),
      };
      if (formats && formats.length) {
        params.format = formats;
      }
      return params;
    },
  });
}

// ── Upload handlers ───────────────────────────────────────────────────────────

export const uploadImage = multer({
  storage:    makeCloudinaryStorage('tilak-global-school/gallery', 'image'),
  fileFilter: makeFilter(IMAGE_MIMES),
  limits:     { fileSize: maxSize },
}).single('image');

export const uploadNewsImage = multer({
  storage:    makeCloudinaryStorage('tilak-global-school/news', 'image'),
  fileFilter: makeFilter(IMAGE_MIMES),
  limits:     { fileSize: maxSize },
}).single('image');

export const uploadDocument = multer({
  storage:    makeCloudinaryStorage('tilak-global-school/documents', 'raw'),
  fileFilter: makeFilter(DOCUMENT_MIMES),
  limits:     { fileSize: maxSize },
}).single('file');

export const uploadMedia = multer({
  storage:    makeCloudinaryStorage('tilak-global-school/media', 'image'),
  fileFilter: makeFilter(MEDIA_MIMES),
  limits:     { fileSize: maxSize },
}).single('media');

export const uploadVideo = multer({
  storage:    makeCloudinaryStorage('tilak-global-school/videos', 'video'),
  fileFilter: makeFilter(VIDEO_MIMES),
  limits:     { fileSize: 100 * 1024 * 1024 }, // 100 MB for videos
}).single('video');

/**
 * Error handler — place immediately after any upload middleware.
 * Converts MulterError → clean JSON 400 response.
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

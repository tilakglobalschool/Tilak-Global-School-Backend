/**
 * Site Settings Controller
 *
 * Public:
 *   GET /api/settings               — safe public fields only
 *
 * Admin:
 *   GET  /api/admin/settings        — full settings document
 *   PUT  /api/admin/settings        — update any field(s)
 *   POST /api/admin/settings/logo           — upload logo image (Cloudinary)
 *   POST /api/admin/settings/favicon        — upload favicon image (Cloudinary)
 *   POST /api/admin/settings/director-photo — upload director portrait (Cloudinary)
 */
import path         from 'path';
import fs           from 'fs';
import SiteSettings from '../models/SiteSettings.model.js';
import cloudinary   from '../config/cloudinary.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity }  from '../utils/activityLogger.js';
import { sendSuccess }  from '../utils/response.js';
import { UPLOAD_DIR }   from '../config/env.js';

// Fields safe to expose on the public endpoint
const PUBLIC_FIELDS = [
  'schoolName', 'schoolSubtitle', 'topBarTagline', 'footerDescription',
  'phone', 'admissionsPhone', 'email', 'admissionsEmail',
  'address', 'pinCode', 'officeTimings',
  'whatsappNumber', 'whatsappMessage', 'mapEmbedUrl',
  'admissionSession', 'admissionBannerText', 'admissionsOpen',
  'directorName', 'directorDesignation', 'directorMessage', 'directorPhotoUrl',
  'logoUrl', 'faviconUrl', 'socialLinks', 'brandColors',
  'cbseAffiliationNo', 'cbseSchoolCode',
];

// ── Helper: delete from Cloudinary (non-blocking) ────────────────────────────
async function deleteCloudinaryAsset(publicId, resourceType = 'image') {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn('[Settings] Cloudinary delete failed for:', publicId, err?.message);
  }
}

// ── Helper: delete legacy local file (backward compat) ───────────────────────
function deleteLocalFile(relativeUrl) {
  if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) return;
  try {
    const relativeFile = relativeUrl.replace(/^\/uploads\//, '');
    const absPath      = path.join(UPLOAD_DIR, relativeFile);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  } catch {
    console.warn('[Settings] Could not delete local file:', relativeUrl);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC  GET /api/settings
// ─────────────────────────────────────────────────────────────────────────────
export const getPublicSettings = asyncHandler(async (req, res) => {
  const doc = await SiteSettings.getSingleton();

  const settings = {};
  for (const field of PUBLIC_FIELDS) {
    settings[field] = doc[field];
  }

  return sendSuccess(res, {
    message: 'Settings retrieved.',
    data:    { settings },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/settings
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.getSingleton();
  return sendSuccess(res, { message: 'Settings retrieved.', data: { settings } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PUT /api/admin/settings
// ─────────────────────────────────────────────────────────────────────────────
export const updateSettings = asyncHandler(async (req, res) => {
  // Strip file URL fields — those only go through dedicated upload endpoints
  const {
    logoUrl, faviconUrl, directorPhotoUrl,
    logoPublicId, faviconPublicId, directorPhotoPublicId,
    ...safeUpdates
  } = req.body;

  const settings = await SiteSettings.updateSingleton(safeUpdates, req.admin.id);

  await logActivity({
    admin:       req.admin,
    action:      'update',
    module:      'settings',
    targetLabel: 'Site Settings',
    detail:      `Updated fields: ${Object.keys(safeUpdates).join(', ')}`,
  });

  return sendSuccess(res, {
    message: 'Settings updated successfully.',
    data:    { settings },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper — handle media file upload via Cloudinary
// ─────────────────────────────────────────────────────────────────────────────
async function handleMediaUpload(req, res, urlField, publicIdField, logDetail) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  // multer-storage-cloudinary: req.file.path = secure_url, req.file.filename = public_id
  const newUrl      = req.file.path;
  const newPublicId = req.file.filename;

  // Delete old Cloudinary asset or legacy local file
  const current   = await SiteSettings.getSingleton();
  const oldPublicId = current[publicIdField];
  const oldUrl      = current[urlField];

  if (oldPublicId) {
    await deleteCloudinaryAsset(oldPublicId, 'image');
  } else if (oldUrl && oldUrl.startsWith('/uploads/')) {
    deleteLocalFile(oldUrl);
  }

  const settings = await SiteSettings.updateSingleton(
    {
      [urlField]:      newUrl,
      [publicIdField]: newPublicId,
    },
    req.admin.id
  );

  await logActivity({
    admin:       req.admin,
    action:      'upload',
    module:      'settings',
    targetLabel: 'Site Settings',
    detail:      `${logDetail}: ${newPublicId}`,
  });

  return sendSuccess(res, {
    message: `${logDetail} successfully.`,
    data:    { url: newUrl, settings },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  POST /api/admin/settings/logo
// ─────────────────────────────────────────────────────────────────────────────
export const uploadLogo = asyncHandler(async (req, res) => {
  return handleMediaUpload(req, res, 'logoUrl', 'logoPublicId', 'Logo uploaded');
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  POST /api/admin/settings/favicon
// ─────────────────────────────────────────────────────────────────────────────
export const uploadFavicon = asyncHandler(async (req, res) => {
  return handleMediaUpload(req, res, 'faviconUrl', 'faviconPublicId', 'Favicon uploaded');
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  POST /api/admin/settings/director-photo
// ─────────────────────────────────────────────────────────────────────────────
export const uploadDirectorPhoto = asyncHandler(async (req, res) => {
  return handleMediaUpload(req, res, 'directorPhotoUrl', 'directorPhotoPublicId', 'Director photo uploaded');
});

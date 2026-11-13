/**
 * Site settings routes
 *
 * ── Public ───────────────────────────────────────────────────────────────────
 * GET /api/settings           — safe public fields (phone, email, address,
 *                               timings, WhatsApp, mapUrl, socialLinks,
 *                               schoolName, admissionSession, admissionsOpen,
 *                               directorName, directorMessage, directorPhotoUrl)
 *
 * ── Admin (/api/admin/settings) ──────────────────────────────────────────────
 * GET  /api/admin/settings                    — full settings document
 * PUT  /api/admin/settings                    — update text/contact fields
 * POST /api/admin/settings/logo               — upload logo (multipart)
 * POST /api/admin/settings/favicon            — upload favicon (multipart)
 * POST /api/admin/settings/director-photo     — upload director photo (multipart)
 */
import { Router } from 'express';
import {
  getPublicSettings, getAdminSettings, updateSettings,
  uploadLogo, uploadFavicon, uploadDirectorPhoto,
} from '../controllers/settings.controller.js';
import { authenticate }      from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/role.middleware.js';
import { validate }          from '../middleware/validate.middleware.js';
import { uploadMedia, patchMediaFile, handleUploadError } from '../middleware/upload.middleware.js';
import { updateSettingsSchema } from '../validators/settings.validators.js';

// ── Public router ─────────────────────────────────────────────────────────────
export const publicSettingsRouter = Router();
publicSettingsRouter.get('/', getPublicSettings);

// ── Admin router ──────────────────────────────────────────────────────────────
export const adminSettingsRouter = Router();

adminSettingsRouter.use(authenticate);

adminSettingsRouter.get('/',
  requirePermission('settings', 'view'),
  getAdminSettings
);

adminSettingsRouter.put('/',
  requirePermission('settings', 'edit'),
  validate(updateSettingsSchema),
  updateSettings
);

adminSettingsRouter.post('/logo',
  requirePermission('settings', 'edit'),
  uploadMedia,
  handleUploadError,
  patchMediaFile,
  uploadLogo
);

adminSettingsRouter.post('/favicon',
  requirePermission('settings', 'edit'),
  uploadMedia,
  handleUploadError,
  patchMediaFile,
  uploadFavicon
);

adminSettingsRouter.post('/director-photo',
  requirePermission('settings', 'edit'),
  uploadMedia,
  handleUploadError,
  patchMediaFile,
  uploadDirectorPhoto
);

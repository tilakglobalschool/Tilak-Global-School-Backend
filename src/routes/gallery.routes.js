/**
 * Gallery routes
 *
 * ── Public ───────────────────────────────────────────────────────────────────
 * GET /api/gallery                — published images
 *   ?category=  Campus | Classrooms | Sports | Events | Activities | all
 *   ?page=      pagination
 *   ?limit=     (default 20, max 50)
 *
 * ── Admin (/api/admin/gallery) ───────────────────────────────────────────────
 * GET    /api/admin/gallery         — all images with filters
 * POST   /api/admin/gallery         — upload image + create record (multipart/form-data)
 * GET    /api/admin/gallery/:id     — single image detail
 * PUT    /api/admin/gallery/:id     — update caption, category, order, status
 * DELETE /api/admin/gallery/:id     — delete record + file
 */
import { Router } from 'express';
import {
  getPublicGallery, listGallery, uploadGallery,
  getGalleryItem, updateGallery, deleteGallery,
} from '../controllers/gallery.controller.js';
import { authenticate }        from '../middleware/auth.middleware.js';
import { requirePermission }   from '../middleware/role.middleware.js';
import { validate }            from '../middleware/validate.middleware.js';
import { uploadImage, handleUploadError } from '../middleware/upload.middleware.js';
import { createGallerySchema, updateGallerySchema, galleryQuerySchema } from '../validators/gallery.validators.js';

// ── Public router ─────────────────────────────────────────────────────────────
export const publicGalleryRouter = Router();

publicGalleryRouter.get('/',
  validate(galleryQuerySchema, 'query'),
  getPublicGallery
);

// ── Admin router ──────────────────────────────────────────────────────────────
export const adminGalleryRouter = Router();

adminGalleryRouter.use(authenticate);

adminGalleryRouter.get('/',
  requirePermission('gallery', 'view'),
  validate(galleryQuerySchema, 'query'),
  listGallery
);

adminGalleryRouter.post('/',
  requirePermission('gallery', 'edit'),
  uploadImage,
  handleUploadError,
  validate(createGallerySchema),
  uploadGallery
);

adminGalleryRouter.get('/:id',
  requirePermission('gallery', 'view'),
  getGalleryItem
);

adminGalleryRouter.put('/:id',
  requirePermission('gallery', 'edit'),
  uploadImage,
  handleUploadError,
  validate(updateGallerySchema),
  updateGallery
);

adminGalleryRouter.delete('/:id',
  requirePermission('gallery', 'delete'),
  deleteGallery
);

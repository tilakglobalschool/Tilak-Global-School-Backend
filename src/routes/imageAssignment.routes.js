/**
 * Image Assignment Routes
 *
 * Public:
 *   GET /api/section-images                          — all active assignments grouped by section
 *
 * Admin (/api/admin/image-assignments):
 *   GET    /registry                                 — slot registry for dropdowns
 *   GET    /                                         — all assignments
 *   PUT    /                                         — assign/replace image for a slot
 *   DELETE /:sectionKey/:slotKey                     — remove one assignment
 *   GET    /media/:mediaId/usages                    — where is this image used
 */
import { Router } from 'express';
import {
  getPublicSectionImages,
  getRegistry,
  listAssignments,
  assignImage,
  removeAssignment,
  getMediaUsages,
} from '../controllers/imageAssignment.controller.js';
import { authenticate }      from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/role.middleware.js';

// ── Public router ─────────────────────────────────────────────────────────────
export const publicSectionImagesRouter = Router();

publicSectionImagesRouter.get('/', getPublicSectionImages);

// ── Admin router ──────────────────────────────────────────────────────────────
export const adminImageAssignmentRouter = Router();

adminImageAssignmentRouter.use(authenticate);
adminImageAssignmentRouter.use(requirePermission('gallery', 'view'));

adminImageAssignmentRouter.get('/registry',  getRegistry);
adminImageAssignmentRouter.get('/',          listAssignments);
adminImageAssignmentRouter.put('/',          requirePermission('gallery', 'edit'), assignImage);
adminImageAssignmentRouter.delete('/:sectionKey/:slotKey', requirePermission('gallery', 'delete'), removeAssignment);
adminImageAssignmentRouter.get('/media/:mediaId/usages', getMediaUsages);

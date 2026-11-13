/**
 * News & Events routes
 *
 * ── Public ───────────────────────────────────────────────────────────────────
 * GET /api/news               — published posts (?category=News|Event|Notice&limit=)
 * GET /api/news/featured      — single featured event/news
 * GET /api/news/:slug         — single published post by slug
 *
 * ── Admin (/api/admin/news) ──────────────────────────────────────────────────
 * GET    /api/admin/news                       — all posts (incl. drafts) + filters
 * POST   /api/admin/news                       — create post (with optional image upload)
 * GET    /api/admin/news/:id                   — single post by id
 * PUT    /api/admin/news/:id                   — update post
 * PATCH  /api/admin/news/:id/publish           — publish
 * PATCH  /api/admin/news/:id/unpublish         — unpublish
 * PATCH  /api/admin/news/:id/featured          — set as featured
 * DELETE /api/admin/news/:id                   — delete post
 */
import { Router } from 'express';
import {
  getPublicNews, getFeatured, getNewsBySlug,
  listNews, createNews, getNewsById,
  updateNews, publishNews, unpublishNews,
  setFeatured, deleteNews,
} from '../controllers/news.controller.js';
import { authenticate }        from '../middleware/auth.middleware.js';
import { requirePermission }   from '../middleware/role.middleware.js';
import { validate }            from '../middleware/validate.middleware.js';
import { uploadNewsImage, patchNewsFile, handleUploadError } from '../middleware/upload.middleware.js';
import { createNewsSchema, updateNewsSchema, newsQuerySchema } from '../validators/news.validators.js';

// ── Public router ─────────────────────────────────────────────────────────────
export const publicNewsRouter = Router();

// NOTE: /featured must be declared BEFORE /:slug to avoid slug match
publicNewsRouter.get('/featured',   getFeatured);
publicNewsRouter.get('/',           validate(newsQuerySchema, 'query'), getPublicNews);
publicNewsRouter.get('/:slug',      getNewsBySlug);

// ── Admin router ──────────────────────────────────────────────────────────────
export const adminNewsRouter = Router();

adminNewsRouter.use(authenticate);

adminNewsRouter.get('/',
  requirePermission('news', 'view'),
  validate(newsQuerySchema, 'query'),
  listNews
);

adminNewsRouter.post('/',
  requirePermission('news', 'edit'),
  uploadNewsImage,
  handleUploadError,
  patchNewsFile,
  validate(createNewsSchema),
  createNews
);

adminNewsRouter.get('/:id',
  requirePermission('news', 'view'),
  getNewsById
);

adminNewsRouter.put('/:id',
  requirePermission('news', 'edit'),
  uploadNewsImage,
  handleUploadError,
  patchNewsFile,
  validate(updateNewsSchema),
  updateNews
);

adminNewsRouter.patch('/:id/publish',
  requirePermission('news', 'publish'),
  publishNews
);

adminNewsRouter.patch('/:id/unpublish',
  requirePermission('news', 'publish'),
  unpublishNews
);

adminNewsRouter.patch('/:id/featured',
  requirePermission('news', 'edit'),
  setFeatured
);

adminNewsRouter.delete('/:id',
  requirePermission('news', 'delete'),
  deleteNews
);

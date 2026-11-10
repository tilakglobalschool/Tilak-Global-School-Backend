/**
 * News & Events Controller
 *
 * Public:
 *   GET /api/news                      - published posts
 *   GET /api/news/featured             - single featured post
 *   GET /api/news/:slug                - single published post by slug
 *
 * Admin:
 *   GET    /api/admin/news             - all posts (incl. drafts) + filters
 *   POST   /api/admin/news             - create post (supports image upload via Cloudinary)
 *   GET    /api/admin/news/:id         - single post by id
 *   PUT    /api/admin/news/:id         - update post (supports image replacement)
 *   PATCH  /api/admin/news/:id/publish    - publish
 *   PATCH  /api/admin/news/:id/unpublish  - unpublish
 *   PATCH  /api/admin/news/:id/featured   - set as featured (unsets all others)
 *   DELETE /api/admin/news/:id         - delete post + Cloudinary asset
 */
import path from 'path';
import fs   from 'fs';
import NewsPost          from '../models/NewsPost.model.js';
import cloudinary        from '../config/cloudinary.js';
import { asyncHandler }  from '../utils/asyncHandler.js';
import { AppError }      from '../utils/AppError.js';
import { logActivity }   from '../utils/activityLogger.js';
import { sendSuccess, sendError, paginationMeta } from '../utils/response.js';
import { UPLOAD_DIR }    from '../config/env.js';

// ── Helper: delete from Cloudinary (non-blocking) ────────────────────────────
async function deleteCloudinaryAsset(publicId, resourceType = 'image') {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn('[News] Cloudinary delete failed for:', publicId, err?.message);
  }
}

// ── Helper: delete legacy local file (backward compat) ───────────────────────
function deleteLocalFile(relativeUrl) {
  if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) return;
  try {
    const filename = relativeUrl.replace('/uploads/', '');
    const absPath  = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  } catch {
    console.warn('[News] Could not delete local file:', relativeUrl);
  }
}

// ── Helper: resolve image info from multer-storage-cloudinary ────────────────
function resolveUploadedFile(file) {
  return {
    imageUrl:           file.path,     // Cloudinary secure_url
    cloudinaryPublicId: file.filename, // Cloudinary public_id
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC  GET /api/news
// ─────────────────────────────────────────────────────────────────────────────
export const getPublicNews = asyncHandler(async (req, res) => {
  const q     = req.validatedQuery || req.query;
  const page  = Number(q.page)  || 1;
  const limit = Math.min(50, Number(q.limit) || 10);
  const skip  = (page - 1) * limit;

  const filter = { status: 'published' };
  if (q.category && q.category !== 'all') filter.category = q.category;

  const [posts, total] = await Promise.all([
    NewsPost.find(filter)
      .select('title slug category date summary imageUrl isFeatured publishedAt')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    NewsPost.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'News retrieved.',
    data:    { posts },
    meta:    paginationMeta(page, limit, total),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC  GET /api/news/featured
// ─────────────────────────────────────────────────────────────────────────────
export const getFeatured = asyncHandler(async (req, res) => {
  const post = await NewsPost.findOne({ isFeatured: true, status: 'published' })
    .select('title slug category date summary body imageUrl publishedAt')
    .lean();

  return sendSuccess(res, {
    message: post ? 'Featured post retrieved.' : 'No featured post set.',
    data:    { post: post ?? null },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC  GET /api/news/:slug
// ─────────────────────────────────────────────────────────────────────────────
export const getNewsBySlug = asyncHandler(async (req, res) => {
  const post = await NewsPost.findOne({
    slug:   req.params.slug,
    status: 'published',
  }).lean();

  if (!post) throw new AppError('Post not found.', 404);

  return sendSuccess(res, { message: 'Post retrieved.', data: { post } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/news
// ─────────────────────────────────────────────────────────────────────────────
export const listNews = asyncHandler(async (req, res) => {
  const q     = req.validatedQuery || req.query;
  const page  = Number(q.page)  || 1;
  const limit = Math.min(50, Number(q.limit) || 10);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (q.category && q.category !== 'all') filter.category = q.category;
  if (q.status   && q.status   !== 'all') filter.status   = q.status;
  if (q.search   && q.search.trim()) {
    const re = new RegExp(q.search.trim(), 'i');
    filter.$or = [{ title: re }, { summary: re }];
  }

  const [posts, total] = await Promise.all([
    NewsPost.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    NewsPost.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'News list retrieved.',
    data:    { posts },
    meta:    paginationMeta(page, limit, total),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  POST /api/admin/news  (supports multipart/form-data for image upload)
// ─────────────────────────────────────────────────────────────────────────────
export const createNews = asyncHandler(async (req, res) => {
  const { title, category, date, summary, body, status } = req.body;

  const slug = await NewsPost.uniqueSlug(title);

  // Image from Cloudinary upload (if provided)
  let imageUrl           = '';
  let cloudinaryPublicId = '';

  if (req.file) {
    const resolved     = resolveUploadedFile(req.file);
    imageUrl           = resolved.imageUrl;
    cloudinaryPublicId = resolved.cloudinaryPublicId;
  }

  const post = await NewsPost.create({
    title,
    slug,
    category,
    date:              new Date(date),
    summary:           summary  ?? '',
    body:              body     ?? '',
    imageUrl,
    cloudinaryPublicId,
    status:            status   ?? 'draft',
    createdBy:         req.admin.id,
    publishedAt:       (status === 'published') ? new Date() : null,
  });

  await logActivity({
    admin:       req.admin,
    action:      'create',
    module:      'news',
    targetId:    post._id.toString(),
    targetLabel: post.title,
    detail:      `Created ${post.category} post: "${post.title}"`,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message:    'Post created.',
    data:       { post },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/news/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getNewsById = asyncHandler(async (req, res) => {
  const post = await NewsPost.findById(req.params.id).lean();
  if (!post) throw new AppError('Post not found.', 404);

  return sendSuccess(res, { message: 'Post retrieved.', data: { post } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PUT /api/admin/news/:id  (supports image replacement)
// ─────────────────────────────────────────────────────────────────────────────
export const updateNews = asyncHandler(async (req, res) => {
  const post = await NewsPost.findById(req.params.id);
  if (!post) throw new AppError('Post not found.', 404);

  const fields  = ['title', 'category', 'date', 'summary', 'body', 'status', 'isFeatured'];
  const changes = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      post[f] = f === 'date' ? new Date(req.body[f]) : req.body[f];
      changes.push(f);
    }
  }

  // Handle new image upload — delete old asset first
  if (req.file) {
    if (post.cloudinaryPublicId) {
      await deleteCloudinaryAsset(post.cloudinaryPublicId);
    } else if (post.imageUrl) {
      deleteLocalFile(post.imageUrl);
    }
    const resolved         = resolveUploadedFile(req.file);
    post.imageUrl           = resolved.imageUrl;
    post.cloudinaryPublicId = resolved.cloudinaryPublicId;
    changes.push('imageUrl');
  }

  // Regenerate slug if title changed
  if (req.body.title && req.body.title !== post.title) {
    post.slug = await NewsPost.uniqueSlug(req.body.title);
    changes.push('slug');
  }

  // Auto-set publishedAt when publishing
  if (req.body.status === 'published' && !post.publishedAt) {
    post.publishedAt = new Date();
  }

  if (changes.length === 0) {
    return sendSuccess(res, { message: 'No changes.', data: { post } });
  }

  await post.save();

  await logActivity({
    admin:       req.admin,
    action:      'update',
    module:      'news',
    targetId:    post._id.toString(),
    targetLabel: post.title,
    detail:      `Updated: ${changes.join(', ')}`,
  });

  return sendSuccess(res, { message: 'Post updated.', data: { post } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PATCH /api/admin/news/:id/publish
// ─────────────────────────────────────────────────────────────────────────────
export const publishNews = asyncHandler(async (req, res) => {
  const post = await NewsPost.findById(req.params.id);
  if (!post) throw new AppError('Post not found.', 404);

  if (post.status === 'published') {
    return sendError(res, { statusCode: 400, message: 'Post is already published.' });
  }

  post.status      = 'published';
  post.publishedAt = new Date();
  await post.save();

  await logActivity({
    admin: req.admin, action: 'publish', module: 'news',
    targetId: post._id.toString(), targetLabel: post.title,
    detail: `Published: "${post.title}"`,
  });

  return sendSuccess(res, { message: 'Post published.', data: { post } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PATCH /api/admin/news/:id/unpublish
// ─────────────────────────────────────────────────────────────────────────────
export const unpublishNews = asyncHandler(async (req, res) => {
  const post = await NewsPost.findById(req.params.id);
  if (!post) throw new AppError('Post not found.', 404);

  if (post.status === 'draft') {
    return sendError(res, { statusCode: 400, message: 'Post is already unpublished.' });
  }

  post.status = 'draft';
  await post.save();

  await logActivity({
    admin: req.admin, action: 'unpublish', module: 'news',
    targetId: post._id.toString(), targetLabel: post.title,
    detail: `Unpublished: "${post.title}"`,
  });

  return sendSuccess(res, { message: 'Post unpublished.', data: { post } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PATCH /api/admin/news/:id/featured
// ─────────────────────────────────────────────────────────────────────────────
export const setFeatured = asyncHandler(async (req, res) => {
  const post = await NewsPost.findById(req.params.id);
  if (!post) throw new AppError('Post not found.', 404);

  if (post.isFeatured) {
    return sendError(res, { statusCode: 400, message: 'Post is already set as featured.' });
  }

  await NewsPost.updateMany({ isFeatured: true }, { $set: { isFeatured: false } });

  post.isFeatured = true;
  if (post.status === 'draft') {
    post.status      = 'published';
    post.publishedAt = new Date();
  }
  await post.save();

  await logActivity({
    admin: req.admin, action: 'update', module: 'news',
    targetId: post._id.toString(), targetLabel: post.title,
    detail: `Set as featured: "${post.title}"`,
  });

  return sendSuccess(res, { message: 'Featured post set.', data: { post } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  DELETE /api/admin/news/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteNews = asyncHandler(async (req, res) => {
  const post = await NewsPost.findById(req.params.id);
  if (!post) throw new AppError('Post not found.', 404);

  // Delete from Cloudinary or legacy disk
  if (post.cloudinaryPublicId) {
    await deleteCloudinaryAsset(post.cloudinaryPublicId);
  } else if (post.imageUrl) {
    deleteLocalFile(post.imageUrl);
  }

  await NewsPost.findByIdAndDelete(req.params.id);

  await logActivity({
    admin: req.admin, action: 'delete', module: 'news',
    targetId: post._id.toString(), targetLabel: post.title,
    detail: `Deleted: "${post.title}" (Cloudinary: ${post.cloudinaryPublicId || 'legacy'})`,
  });

  return sendSuccess(res, { message: 'Post deleted.' });
});

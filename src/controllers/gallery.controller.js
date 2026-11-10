/**
 * Gallery Controller
 *
 * Public:
 *   GET /api/gallery                  - published images (?category=&page=&limit=)
 *
 * Admin:
 *   GET    /api/admin/gallery          - all images with filters
 *   POST   /api/admin/gallery          - upload image (Cloudinary) + create record
 *   GET    /api/admin/gallery/:id      - single image detail
 *   PUT    /api/admin/gallery/:id      - update caption/category/altText/order/status
 *   DELETE /api/admin/gallery/:id      - delete record + Cloudinary asset
 */
import path from 'path';
import fs   from 'fs';
import GalleryImage        from '../models/GalleryImage.model.js';
import cloudinary          from '../config/cloudinary.js';
import { asyncHandler }    from '../utils/asyncHandler.js';
import { AppError }        from '../utils/AppError.js';
import { logActivity }     from '../utils/activityLogger.js';
import { sendSuccess, paginationMeta } from '../utils/response.js';
import { UPLOAD_DIR }      from '../config/env.js';

// ── Helper: delete asset from Cloudinary (non-blocking) ──────────────────────
async function deleteCloudinaryAsset(publicId, resourceType = 'image') {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn('[Gallery] Cloudinary delete failed for:', publicId, err?.message);
  }
}

// ── Helper: delete legacy local file safely (backward compat) ────────────────
function deleteLocalFile(relativeUrl) {
  if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) return;
  try {
    const filename = relativeUrl.replace('/uploads/', '');
    const absPath  = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  } catch {
    console.warn('[Gallery] Could not delete local file:', relativeUrl);
  }
}

// ── Helper: resolve Cloudinary file info from multer-storage-cloudinary ──────
// multer-storage-cloudinary sets req.file.path  = secure_url
//                                  req.file.filename = public_id
function resolveUploadedFile(file) {
  return {
    imageUrl:               file.path,          // Cloudinary secure_url
    cloudinaryPublicId:     file.filename,      // Cloudinary public_id
    cloudinaryResourceType: 'image',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC  GET /api/gallery
// ─────────────────────────────────────────────────────────────────────────────
export const getPublicGallery = asyncHandler(async (req, res) => {
  const q      = req.validatedQuery || req.query;
  const page   = Number(q.page)  || 1;
  const limit  = Math.min(50, Number(q.limit) || 20);
  const skip   = (page - 1) * limit;

  const filter = { status: 'published' };
  if (q.category && q.category !== 'all') filter.category = q.category;

  const [images, total] = await Promise.all([
    GalleryImage.find(filter)
      .select('imageUrl thumbnailUrl caption altText category albumName order createdAt')
      .sort({ category: 1, order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    GalleryImage.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Gallery retrieved.',
    data:    { images },
    meta:    paginationMeta(page, limit, total),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/gallery
// ─────────────────────────────────────────────────────────────────────────────
export const listGallery = asyncHandler(async (req, res) => {
  const q     = req.validatedQuery || req.query;
  const page  = Number(q.page)  || 1;
  const limit = Math.min(100, Number(q.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (q.category && q.category !== 'all') filter.category = q.category;
  if (q.status   && q.status   !== 'all') filter.status   = q.status;

  const [images, total] = await Promise.all([
    GalleryImage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    GalleryImage.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Gallery list retrieved.',
    data:    { images },
    meta:    paginationMeta(page, limit, total),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  POST /api/admin/gallery  (multipart/form-data)
// ─────────────────────────────────────────────────────────────────────────────
export const uploadGallery = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Image file is required.' });
  }

  const { imageUrl, cloudinaryPublicId, cloudinaryResourceType } = resolveUploadedFile(req.file);
  const { caption, altText, category, albumName, order, status } = req.body;

  const image = await GalleryImage.create({
    imageUrl,
    cloudinaryPublicId,
    cloudinaryResourceType,
    caption:    caption    ?? '',
    altText:    altText    ?? '',
    category,
    albumName:  albumName  ?? '',
    order:      Number(order) || 0,
    status:     status     ?? 'published',
    uploadedBy: req.admin.id,
  });

  await logActivity({
    admin:       req.admin,
    action:      'upload',
    module:      'gallery',
    targetId:    image._id.toString(),
    targetLabel: `${category} - ${caption || cloudinaryPublicId}`,
    detail:      `Gallery image uploaded to Cloudinary: ${cloudinaryPublicId}`,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message:    'Image uploaded successfully.',
    data:       { image },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/gallery/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getGalleryItem = asyncHandler(async (req, res) => {
  const image = await GalleryImage.findById(req.params.id).lean();
  if (!image) throw new AppError('Gallery image not found.', 404);

  return sendSuccess(res, { message: 'Gallery image retrieved.', data: { image } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PUT /api/admin/gallery/:id
// ─────────────────────────────────────────────────────────────────────────────
export const updateGallery = asyncHandler(async (req, res) => {
  const image = await GalleryImage.findById(req.params.id);
  if (!image) throw new AppError('Gallery image not found.', 404);

  const fields  = ['caption', 'altText', 'category', 'albumName', 'order', 'status'];
  const changes = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      image[f] = req.body[f];
      changes.push(f);
    }
  }

  // Optional image replacement — delete old Cloudinary asset, upload new
  if (req.file) {
    if (image.cloudinaryPublicId) {
      await deleteCloudinaryAsset(image.cloudinaryPublicId, image.cloudinaryResourceType || 'image');
    } else {
      deleteLocalFile(image.imageUrl);
    }
    const resolved = resolveUploadedFile(req.file);
    image.imageUrl               = resolved.imageUrl;
    image.cloudinaryPublicId     = resolved.cloudinaryPublicId;
    image.cloudinaryResourceType = resolved.cloudinaryResourceType;
    changes.push('imageUrl');
  }

  if (changes.length === 0) {
    return sendSuccess(res, { message: 'No changes.', data: { image } });
  }

  await image.save();

  await logActivity({
    admin:       req.admin,
    action:      'update',
    module:      'gallery',
    targetId:    image._id.toString(),
    targetLabel: image.caption || image.imageUrl,
    detail:      `Updated: ${changes.join(', ')}`,
  });

  return sendSuccess(res, { message: 'Gallery image updated.', data: { image } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  DELETE /api/admin/gallery/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteGallery = asyncHandler(async (req, res) => {
  const image = await GalleryImage.findById(req.params.id);
  if (!image) throw new AppError('Gallery image not found.', 404);

  // Delete from Cloudinary if public_id available, else clean up legacy disk file
  if (image.cloudinaryPublicId) {
    await deleteCloudinaryAsset(image.cloudinaryPublicId, image.cloudinaryResourceType || 'image');
    if (image.thumbnailUrl && image.thumbnailUrl !== image.imageUrl) {
      // Thumbnail may be a Cloudinary transformation — typically same public_id, skip
    }
  } else {
    deleteLocalFile(image.imageUrl);
    if (image.thumbnailUrl) deleteLocalFile(image.thumbnailUrl);
  }

  await GalleryImage.findByIdAndDelete(req.params.id);

  await logActivity({
    admin:       req.admin,
    action:      'delete',
    module:      'gallery',
    targetId:    req.params.id,
    targetLabel: image.caption || image.imageUrl,
    detail:      `Gallery image deleted (Cloudinary: ${image.cloudinaryPublicId || 'legacy'})`,
  });

  return sendSuccess(res, { message: 'Gallery image deleted.' });
});

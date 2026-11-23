/**
 * Image Assignment Controller
 *
 * Public:
 *   GET /api/section-images          — all active assignments grouped by section
 *
 * Admin:
 *   GET  /api/admin/image-assignments/registry    — slot registry for dropdowns
 *   GET  /api/admin/image-assignments             — all assignments (with media)
 *   PUT  /api/admin/image-assignments             — assign/replace (upsert)
 *   DELETE /api/admin/image-assignments/:sectionKey/:slotKey — remove assignment
 *   GET  /api/admin/image-assignments/media/:mediaId/usages  — where is this image used
 */
import GalleryImage    from '../models/GalleryImage.model.js';
import ImageAssignment from '../models/ImageAssignment.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError }     from '../utils/AppError.js';
import { logActivity }  from '../utils/activityLogger.js';
import { sendSuccess }  from '../utils/response.js';
import { isValidSlot, getRegistryForAdmin } from '../config/imageSlots.js';

// ── PUBLIC ────────────────────────────────────────────────────────────────────
/**
 * GET /api/section-images
 * Returns all active assignments grouped as:
 * { sectionKey: { slotKey: { imageUrl, altText, objectPosition } } }
 */
export const getPublicSectionImages = asyncHandler(async (req, res) => {
  // Fetch all assignments, populate only needed media fields
  const assignments = await ImageAssignment.find({})
    .populate({
      path:   'mediaId',
      select: 'imageUrl altText caption status',
      match:  { status: 'published' },   // only active images
    })
    .lean();

  // Build grouped map — skip slots whose media is inactive/deleted
  const result = {};
  for (const a of assignments) {
    if (!a.mediaId) continue;            // image was deactivated or deleted
    if (!result[a.sectionKey]) result[a.sectionKey] = {};
    result[a.sectionKey][a.slotKey] = {
      imageUrl:       a.mediaId.imageUrl,
      alt:            a.mediaId.altText || a.mediaId.caption || '',
      objectPosition: a.objectPosition || 'center',
      mediaId:        a.mediaId._id,
    };
  }

  return sendSuccess(res, {
    message: 'Section images retrieved.',
    data:    { sections: result },
  });
});

// ── ADMIN ─────────────────────────────────────────────────────────────────────

/** GET /api/admin/image-assignments/registry */
export const getRegistry = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: 'Image slot registry retrieved.',
    data:    { registry: getRegistryForAdmin() },
  });
});

/** GET /api/admin/image-assignments — all assignments with media details */
export const listAssignments = asyncHandler(async (req, res) => {
  const assignments = await ImageAssignment.find({})
    .populate('mediaId', 'imageUrl altText caption status cloudinaryPublicId')
    .sort({ sectionKey: 1, slotKey: 1 })
    .lean();

  return sendSuccess(res, {
    message: 'Assignments retrieved.',
    data:    { assignments },
  });
});

/**
 * PUT /api/admin/image-assignments
 * Body: { sectionKey, slotKey, mediaId, objectPosition? }
 * Atomically upserts — creates or replaces existing assignment for that slot.
 */
export const assignImage = asyncHandler(async (req, res) => {
  const { sectionKey, slotKey, mediaId, objectPosition = 'center' } = req.body;

  // 1. Validate slot exists in registry
  if (!isValidSlot(sectionKey, slotKey)) {
    throw new AppError(`Invalid section/slot: ${sectionKey}.${slotKey}`, 422);
  }

  // 2. Validate media exists and is published
  const media = await GalleryImage.findById(mediaId).lean();
  if (!media) throw new AppError('Image not found.', 404);
  if (media.status !== 'published') {
    throw new AppError('Only published (active) images can be assigned to website sections.', 422);
  }

  // 3. Upsert — compound unique index ensures only one record per section+slot
  const assignment = await ImageAssignment.findOneAndUpdate(
    { sectionKey, slotKey },
    {
      $set: {
        mediaId,
        objectPosition: objectPosition.trim() || 'center',
        assignedBy:     req.admin.id,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  await logActivity({
    admin:       req.admin,
    action:      'update',
    module:      'gallery',
    targetId:    assignment._id.toString(),
    targetLabel: `${sectionKey}.${slotKey}`,
    detail:      `Assigned image ${mediaId} to ${sectionKey}.${slotKey}`,
  });

  return sendSuccess(res, {
    statusCode: 200,
    message:    `Image assigned to ${sectionKey} → ${slotKey}.`,
    data:       { assignment },
  });
});

/**
 * DELETE /api/admin/image-assignments/:sectionKey/:slotKey
 */
export const removeAssignment = asyncHandler(async (req, res) => {
  const { sectionKey, slotKey } = req.params;

  if (!isValidSlot(sectionKey, slotKey)) {
    throw new AppError(`Invalid section/slot: ${sectionKey}.${slotKey}`, 422);
  }

  const deleted = await ImageAssignment.findOneAndDelete({ sectionKey, slotKey });
  if (!deleted) throw new AppError('No assignment found for that slot.', 404);

  await logActivity({
    admin:       req.admin,
    action:      'delete',
    module:      'gallery',
    targetId:    deleted._id.toString(),
    targetLabel: `${sectionKey}.${slotKey}`,
    detail:      `Removed image assignment from ${sectionKey}.${slotKey}`,
  });

  return sendSuccess(res, { message: 'Assignment removed.' });
});

/**
 * GET /api/admin/image-assignments/media/:mediaId/usages
 * Returns all slots where a given image is currently assigned.
 */
export const getMediaUsages = asyncHandler(async (req, res) => {
  const { mediaId } = req.params;

  const usages = await ImageAssignment.find({ mediaId })
    .select('sectionKey slotKey objectPosition createdAt')
    .lean();

  return sendSuccess(res, {
    message: 'Media usages retrieved.',
    data:    { usages },
  });
});

/**
 * Fee Structure Controller
 *
 * Public:
 *   GET /api/fees           - all active fee rows ordered by display order
 *
 * Admin:
 *   GET    /api/admin/fees       - all fee rows (incl. inactive)
 *   POST   /api/admin/fees       - create fee row
 *   PUT    /api/admin/fees/:id   - update fee row
 *   DELETE /api/admin/fees/:id   - delete fee row
 *
 * IMPORTANT: Fee amounts default to null. Never invent amounts.
 * School fills via admin panel.
 */
import FeeRow        from '../models/FeeRow.model.js';
import { asyncHandler }  from '../utils/asyncHandler.js';
import { AppError }      from '../utils/AppError.js';
import { logActivity }   from '../utils/activityLogger.js';
import { sendSuccess, sendError } from '../utils/response.js';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC  GET /api/fees
// ─────────────────────────────────────────────────────────────────────────────
export const getPublicFees = asyncHandler(async (req, res) => {
  const fees = await FeeRow.find({ isActive: true })
    .select('classGroup admissionFee tuitionFeePerMonth otherCharges fullSessionTotal notes order')
    .sort({ order: 1 })
    .lean();

  return sendSuccess(res, {
    message: 'Fee structure retrieved.',
    data:    { fees },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/fees
// ─────────────────────────────────────────────────────────────────────────────
export const listFees = asyncHandler(async (req, res) => {
  const fees = await FeeRow.find({})
    .sort({ order: 1 })
    .lean();

  return sendSuccess(res, {
    message: 'Fee rows retrieved.',
    data:    { fees, total: fees.length },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  POST /api/admin/fees
// ─────────────────────────────────────────────────────────────────────────────
export const createFee = asyncHandler(async (req, res) => {
  const { classGroup, admissionFee, tuitionFeePerTerm, otherCharges, notes, order, isActive } = req.body;

  const existing = await FeeRow.findOne({ classGroup });
  if (existing) {
    return sendError(res, {
      statusCode: 409,
      message:    `A fee row for class group '${classGroup}' already exists.`,
    });
  }

  const fee = await FeeRow.create({
    classGroup,
    admissionFee:       admissionFee       ?? null,
    tuitionFeePerMonth: req.body.tuitionFeePerMonth ?? null,
    otherCharges:       otherCharges       ?? null,
    fullSessionTotal:   req.body.fullSessionTotal ?? null,
    notes:              notes              ?? '',
    order:              order              ?? 0,
    isActive:           isActive           ?? true,
    updatedBy: req.admin.id,
  });

  await logActivity({
    admin:       req.admin,
    action:      'create',
    module:      'fees',
    targetId:    fee._id.toString(),
    targetLabel: fee.classGroup,
    detail:      `Created fee row for: ${fee.classGroup}`,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message:    'Fee row created.',
    data:       { fee },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PUT /api/admin/fees/:id
// ─────────────────────────────────────────────────────────────────────────────
export const updateFee = asyncHandler(async (req, res) => {
  const fee = await FeeRow.findById(req.params.id);
  if (!fee) throw new AppError('Fee row not found.', 404);

  const fields  = ['admissionFee', 'tuitionFeePerMonth', 'otherCharges', 'fullSessionTotal', 'notes', 'order', 'isActive'];
  const changes = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      fee[f] = req.body[f];
      changes.push(f);
    }
  }

  if (changes.length === 0) {
    return sendSuccess(res, { message: 'No changes.', data: { fee } });
  }

  fee.updatedBy = req.admin.id;
  await fee.save();

  await logActivity({
    admin:       req.admin,
    action:      'update',
    module:      'fees',
    targetId:    fee._id.toString(),
    targetLabel: fee.classGroup,
    detail:      `Updated ${fee.classGroup}: ${changes.join(', ')}`,
  });

  return sendSuccess(res, { message: 'Fee row updated.', data: { fee } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  DELETE /api/admin/fees/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteFee = asyncHandler(async (req, res) => {
  const fee = await FeeRow.findById(req.params.id);
  if (!fee) throw new AppError('Fee row not found.', 404);

  await FeeRow.findByIdAndDelete(req.params.id);

  await logActivity({
    admin:       req.admin,
    action:      'delete',
    module:      'fees',
    targetId:    req.params.id,
    targetLabel: fee.classGroup,
    detail:      `Deleted fee row: ${fee.classGroup}`,
  });

  return sendSuccess(res, { message: `Fee row for '${fee.classGroup}' deleted.` });
});

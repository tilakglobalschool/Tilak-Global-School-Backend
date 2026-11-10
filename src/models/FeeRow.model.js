import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * FeeRow — one row in the fee structure table.
 *
 * classGroup is a free-form string (no enum) so the admin can create rows
 * matching the actual 8-row fee chart: Play Group–Prep, I–II, III–V, VI–VIII,
 * IX, X, XI (multiple stream rows), XII, etc. — without schema migrations.
 *
 * IMPORTANT: Fee amounts default to null — never invent amounts.
 * School fills via admin panel after client confirmation.
 */
const feeRowSchema = new Schema(
  {
    // Free-form class label — e.g. "Play Group – Prep", "I – II", "IX", "XI (Science)"
    classGroup: {
      type:      String,
      required:  [true, 'Class group label is required'],
      trim:      true,
      maxlength: [100, 'Class group label must be 100 characters or less'],
    },

    // All fee amounts default to null — school fills via admin panel.
    admissionFee: {
      type:    Number,
      default: null,
      min:     [0, 'Admission fee cannot be negative'],
    },

    // Monthly tuition fee
    tuitionFeePerMonth: {
      type:    Number,
      default: null,
      min:     [0, 'Tuition fee cannot be negative'],
    },

    // Any additional charges (club fee, lab fee, etc.)
    otherCharges: {
      type:    Number,
      default: null,
      min:     [0, 'Other charges cannot be negative'],
    },

    // Full session total (optional — admin can fill if provided by school)
    fullSessionTotal: {
      type:    Number,
      default: null,
      min:     [0, 'Full session total cannot be negative'],
    },

    // Optional note (e.g. "includes lab fee", "per term", stream name for XI/XII)
    notes: {
      type:      String,
      trim:      true,
      maxlength: [500, 'Notes must be 500 characters or less'],
      default:   '',
    },

    // Controls display order in fee table
    order: {
      type:    Number,
      default: 0,
    },

    isActive: {
      type:    Boolean,
      default: true,
    },

    updatedBy: {
      type:    Schema.Types.ObjectId,
      ref:     'AdminUser',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
feeRowSchema.index({ isActive: 1, order: 1 });

const FeeRow = model('FeeRow', feeRowSchema);
export default FeeRow;

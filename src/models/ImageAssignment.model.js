/**
 * ImageAssignment model
 *
 * Links an uploaded GalleryImage to a specific website section + slot.
 * Compound unique index on { sectionKey, slotKey } ensures one active
 * assignment per slot at a time — upsert replaces old assignment atomically.
 *
 * The same GalleryImage (_id) may be assigned to multiple different slots.
 */
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const imageAssignmentSchema = new Schema(
  {
    sectionKey: {
      type:     String,
      required: [true, 'sectionKey is required'],
      trim:     true,
    },
    slotKey: {
      type:     String,
      required: [true, 'slotKey is required'],
      trim:     true,
    },
    // Reference to the GalleryImage being assigned
    mediaId: {
      type:     Schema.Types.ObjectId,
      ref:      'GalleryImage',
      required: [true, 'mediaId is required'],
    },
    // CSS object-position value e.g. 'center', 'top', 'center 20%'
    objectPosition: {
      type:    String,
      default: 'center',
      trim:    true,
    },
    assignedBy: {
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

// One assignment per section+slot — upsert will replace old one
imageAssignmentSchema.index({ sectionKey: 1, slotKey: 1 }, { unique: true });
// Speed up lookups by mediaId (for "find all usages of this image")
imageAssignmentSchema.index({ mediaId: 1 });

const ImageAssignment = model('ImageAssignment', imageAssignmentSchema);
export default ImageAssignment;

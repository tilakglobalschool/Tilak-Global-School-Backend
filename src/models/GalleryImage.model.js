import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Gallery categories.
 * Expanded from 5 to 14 to match the actual client event taxonomy
 * (from CLIENT_ASSET_MANIFEST.json — C37).
 */
export const GALLERY_CATEGORIES = [
  'Campus',
  'Classrooms',
  'Sports',
  'Events',
  'Activities',
  'Annual Day',
  'Janmashtami',
  'Independence Day',
  'Blood Donation Camp',
  'Science Exhibition',
  'Art and Craft',
  'Saraswati Puja',
  'Teachers Day',
  'Educational Visits',
];

const galleryImageSchema = new Schema(
  {
    // ── URL fields (Cloudinary secure_url or legacy /uploads/* path) ──────────
    imageUrl: {
      type:     String,
      required: [true, 'Image URL is required'],
      trim:     true,
    },

    thumbnailUrl: {
      type:    String,
      default: '',
      trim:    true,
    },

    // ── Cloudinary metadata (populated on new uploads) ───────────────────────
    // Kept optional so existing legacy records with /uploads/* URLs continue to work.
    cloudinaryPublicId: {
      type:    String,
      default: '',
      trim:    true,
    },

    // resource_type stored to support correct Cloudinary deletion
    cloudinaryResourceType: {
      type:    String,
      enum:    ['image', 'video', 'raw', ''],
      default: 'image',
    },

    // ── Descriptive fields ───────────────────────────────────────────────────
    caption: {
      type:      String,
      trim:      true,
      maxlength: [120, 'Caption must be 120 characters or less'],
      default:   '',
    },

    altText: {
      type:      String,
      trim:      true,
      maxlength: [300, 'Alt text must be 300 characters or less'],
      default:   '',
    },

    category: {
      type: String,
      enum: {
        values:  GALLERY_CATEGORIES,
        message: '{VALUE} is not a valid gallery category',
      },
      required: [true, 'Category is required'],
    },

    albumName: {
      type:      String,
      trim:      true,
      maxlength: [150, 'Album name must be 150 characters or less'],
      default:   '',
    },

    // Controls display sequence within category
    order: {
      type:    Number,
      default: 0,
    },

    status: {
      type: String,
      enum: {
        values:  ['published', 'draft'],
        message: '{VALUE} is not a valid status',
      },
      default: 'published',
    },

    uploadedBy: {
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
galleryImageSchema.index({ category: 1 });
galleryImageSchema.index({ status: 1 });
galleryImageSchema.index({ status: 1, category: 1, order: 1 }); // public listing
galleryImageSchema.index({ cloudinaryPublicId: 1 }, { sparse: true });

const GalleryImage = model('GalleryImage', galleryImageSchema);
export default GalleryImage;

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const NEWS_CATEGORIES = ['News', 'Event', 'Notice'];

const newsPostSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [300, 'Title must be 300 characters or less'],
    },

    // URL-friendly slug, auto-generated from title on create
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },

    category: {
      type: String,
      enum: {
        values: NEWS_CATEGORIES,
        message: '{VALUE} is not a valid category',
      },
      required: [true, 'Category is required'],
    },

    // The actual date of the event/news (not the created date)
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },

    // Short preview text (1–2 sentences)
    summary: {
      type: String,
      trim: true,
      maxlength: [500, 'Summary must be 500 characters or less'],
      default: '',
    },

    // Full content (rich text / markdown)
    body: {
      type: String,
      default: '',
    },

    imageUrl: {
      type:    String,
      default: '',
      trim:    true,
    },

    // ── Cloudinary metadata (populated on new uploads) ───────────────────────
    // Optional — legacy records without these fields continue to work.
    cloudinaryPublicId: {
      type:    String,
      default: '',
      trim:    true,
    },

    // Only one post should be featured at a time
    // Business rule enforced in controller: unset all others before setting this
    isFeatured: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: {
        values: ['draft', 'published'],
        message: '{VALUE} is not a valid status',
      },
      default: 'draft',
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Indexes — slug unique already declared in field def above ────────────────
// Only secondary indexes here
newsPostSchema.index({ status: 1 });
newsPostSchema.index({ category: 1 });
newsPostSchema.index({ isFeatured: 1 });
newsPostSchema.index({ date: -1 });
newsPostSchema.index({ status: 1, date: -1 }); // public published list sorted by date

// ── Slug generation helper (static) ──────────────────────────────────────────
newsPostSchema.statics.generateSlug = function (title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Generate a unique slug, appending a number suffix if a collision exists.
 * @param {string} title
 * @returns {Promise<string>}
 */
newsPostSchema.statics.uniqueSlug = async function (title) {
  const base = this.generateSlug(title);
  let slug = base;
  let count = 1;
  while (await this.exists({ slug })) {
    slug = `${base}-${count}`;
    count++;
  }
  return slug;
};

const NewsPost = model('NewsPost', newsPostSchema);
export default NewsPost;

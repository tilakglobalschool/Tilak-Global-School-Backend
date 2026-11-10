import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * SiteSettings — singleton collection.
 * Only ONE document ever exists (_id is always 'site_settings').
 * Use SiteSettings.getSingleton() to read, SiteSettings.updateSingleton() to write.
 */
const siteSettingsSchema = new Schema(
  {
    // Fixed ID so there is always exactly one document
    _id: {
      type: String,
      default: 'site_settings',
    },

    // ── School identity ─────────────────────────────────────────────────────
    schoolName: {
      type: String,
      default: 'Tilak Global School',
      trim: true,
    },
    schoolSubtitle: {
      type: String,
      default: 'Jaipur, Rajasthan',
      trim: true,
    },
    logoUrl: {
      type: String,
      default: '',
    },
    faviconUrl: {
      type: String,
      default: '',
    },
    cbseAffiliationNo: {
      type: String,
      default: '',
      trim: true,
    },
    cbseSchoolCode: {
      type: String,
      default: '',
      trim: true,
    },
    topBarTagline: {
      type: String,
      default: 'CBSE Affiliated · Nursery to XII · English Medium',
      trim: true,
    },
    footerDescription: {
      type: String,
      default: 'English-medium, co-educational CBSE school, Nursery to XII, Jaipur.',
      trim: true,
    },

    // ── Contact information ─────────────────────────────────────────────────
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    admissionsPhone: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    admissionsEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      default: 'Bindayaka, Mukandpura Road, Jaipur, Rajasthan',
      trim: true,
    },
    pinCode: {
      type: String,
      default: '',
      trim: true,
    },
    officeTimings: {
      type: String,
      default: '',
      trim: true,
    },
    whatsappNumber: {
      type: String,
      default: '',
      trim: true,
    },
    whatsappMessage: {
      type: String,
      default: 'Hello, I would like to enquire about admission.',
      trim: true,
    },
    mapEmbedUrl: {
      type: String,
      default: '',
    },

    // ── Admission banner ────────────────────────────────────────────────────
    admissionSession: {
      type: String,
      default: '',
      trim: true,
    },
    admissionBannerText: {
      type: String,
      default: 'Admissions Open',
      trim: true,
    },
    admissionsOpen: {
      type: Boolean,
      default: true,
    },

    // ── Director / Principal ────────────────────────────────────────────────
    directorName: {
      type: String,
      default: 'R. S. Tanwar',
      trim: true,
    },
    directorDesignation: {
      type: String,
      default: 'Director',
      trim: true,
    },
    directorMessage: {
      type: String,
      default: '',
    },
    directorPhotoUrl: {
      type: String,
      default: '',
    },
    // Cloudinary public IDs for media files (for replacement/deletion support)
    logoPublicId: {
      type: String,
      default: '',
      trim: true,
    },
    faviconPublicId: {
      type: String,
      default: '',
      trim: true,
    },
    directorPhotoPublicId: {
      type: String,
      default: '',
      trim: true,
    },

    // ── Social media links ──────────────────────────────────────────────────
    socialLinks: {
      facebook:  { type: String, default: '' },
      instagram: { type: String, default: '' },
      youtube:   { type: String, default: '' },
      other:     { type: String, default: '' },
    },

    // ── Brand colours (optional) ────────────────────────────────────────────
    brandColors: {
      primary:   { type: String, default: '#0F2A5C' },
      secondary: { type: String, default: '#C9A24A' },
    },

    // ── Privacy / consent text ──────────────────────────────────────────────
    privacyPolicyText: {
      type: String,
      default: '',
    },

    // ── Audit ───────────────────────────────────────────────────────────────
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
    },
  },
  {
    // Only updatedAt is useful for a singleton
    timestamps: { createdAt: false, updatedAt: 'updatedAt' },
    versionKey: false,
    // Allow the fixed string _id
    _id: false,
  }
);

// ── Static helpers ────────────────────────────────────────────────────────────

/**
 * Get the singleton settings document (creates it with defaults if missing).
 */
siteSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findById('site_settings');
  if (!doc) {
    doc = await this.create({ _id: 'site_settings' });
  }
  return doc;
};

/**
 * Update the singleton settings document.
 * @param {object} updates - fields to update
 * @param {string} updatedByUserId - admin user ObjectId
 */
siteSettingsSchema.statics.updateSingleton = async function (updates, updatedByUserId) {
  const doc = await this.findByIdAndUpdate(
    'site_settings',
    { ...updates, updatedBy: updatedByUserId, updatedAt: new Date() },
    { returnDocument: 'after', upsert: true, runValidators: true }
  );
  return doc;
};

const SiteSettings = model('SiteSettings', siteSettingsSchema);
export default SiteSettings;

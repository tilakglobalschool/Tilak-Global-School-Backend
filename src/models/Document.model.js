import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const DOCUMENT_CATEGORIES = [
  'Disclosure',   // CBSE mandatory disclosures
  'Notice',       // Notices and announcements
  'Academic',     // Academic resources (syllabus, reading list, question papers)
  'Policy',       // Safety, anti-bullying, privacy policies
  'Certificate',  // CBSE affiliation certificate, fire safety certificate
  'Form',         // Admission form, TC request form, fee payment form
  'Timetable',    // Class timetables
  'Syllabus',     // Syllabus documents
  'Calendar',     // Academic calendar, holiday list
  'Results',      // Exam datesheets, board exam instructions
];

export const DOCUMENT_PAGE_LIST = [
  'academics', 'admissions', 'news', 'results', 'downloads',
];

export const DOCUMENT_FILE_TYPES = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX'];

const documentSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [300, 'Title must be 300 characters or less'],
    },

    category: {
      type: String,
      enum: {
        values: DOCUMENT_CATEGORIES,
        message: '{VALUE} is not a valid document category',
      },
      required: [true, 'Category is required'],
    },

    // Which public page(s) this document appears on
    page: {
      type: String,
      enum: {
        values: DOCUMENT_PAGE_LIST,
        message: '{VALUE} is not a valid page',
      },
      required: [true, 'Page is required'],
    },

    fileUrl: {
      type:     String,
      required: [true, 'File URL is required'],
      trim:     true,
    },

    // ── Cloudinary metadata (populated on new uploads) ───────────────────────
    // Optional — legacy records without these fields continue to work.
    cloudinaryPublicId: {
      type:    String,
      default: '',
      trim:    true,
    },

    cloudinaryResourceType: {
      type:    String,
      enum:    ['image', 'video', 'raw', ''],
      default: 'raw',
    },

    fileType: {
      type: String,
      enum: {
        values: DOCUMENT_FILE_TYPES,
        message: '{VALUE} is not a valid file type',
      },
      required: [true, 'File type is required'],
    },

    // File size in kilobytes, stored at upload time
    fileSizeKb: {
      type: Number,
      default: null,
    },

    // Date the document was officially issued (not upload date)
    issueDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: {
        values: ['published', 'draft'],
        message: '{VALUE} is not a valid status',
      },
      default: 'published',
    },

    uploadedBy: {
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

// ── Indexes ───────────────────────────────────────────────────────────────────
documentSchema.index({ category: 1 });
documentSchema.index({ page: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ page: 1, category: 1, status: 1 }); // grouped public listing

const Document = model('Document', documentSchema);
export default Document;

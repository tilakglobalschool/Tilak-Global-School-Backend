/**
 * Documents (notices & downloads) routes
 *
 * ── Public ───────────────────────────────────────────────────────────────────
 * GET /api/documents              — published documents
 *   ?category=  Disclosure|Notice|Academic|Policy|Certificate|Form|…|all
 *   ?docPage=   academics|admissions|news|results|downloads|all
 *   ?page=      pagination
 *   ?limit=     (default 20)
 *
 * ── Admin (/api/admin/documents) ─────────────────────────────────────────────
 * GET    /api/admin/documents          — all docs with filters
 * POST   /api/admin/documents          — upload file + create record (multipart)
 * GET    /api/admin/documents/:id      — single doc
 * PUT    /api/admin/documents/:id      — update metadata (and optionally replace file)
 * DELETE /api/admin/documents/:id      — delete record + file
 */
import { Router } from 'express';
import {
  getPublicDocuments, listDocuments, uploadDocument,
  getDocumentById, updateDocument, deleteDocument,
} from '../controllers/document.controller.js';
import { authenticate }        from '../middleware/auth.middleware.js';
import { requirePermission }   from '../middleware/role.middleware.js';
import { validate }            from '../middleware/validate.middleware.js';
import { uploadDocument as uploadDocMiddleware, patchDocumentFile, handleUploadError } from '../middleware/upload.middleware.js';
import { createDocumentSchema, updateDocumentSchema, documentQuerySchema } from '../validators/document.validators.js';

// ── Public router ─────────────────────────────────────────────────────────────
export const publicDocumentRouter = Router();

publicDocumentRouter.get('/',
  validate(documentQuerySchema, 'query'),
  getPublicDocuments
);

// ── Admin router ──────────────────────────────────────────────────────────────
export const adminDocumentRouter = Router();

adminDocumentRouter.use(authenticate);

adminDocumentRouter.get('/',
  requirePermission('documents', 'view'),
  validate(documentQuerySchema, 'query'),
  listDocuments
);

adminDocumentRouter.post('/',
  requirePermission('documents', 'edit'),
  uploadDocMiddleware,
  handleUploadError,
  patchDocumentFile,
  validate(createDocumentSchema),
  uploadDocument
);

adminDocumentRouter.get('/:id',
  requirePermission('documents', 'view'),
  getDocumentById
);

adminDocumentRouter.put('/:id',
  requirePermission('documents', 'edit'),
  uploadDocMiddleware,
  handleUploadError,
  patchDocumentFile,
  validate(updateDocumentSchema),
  updateDocument
);

adminDocumentRouter.delete('/:id',
  requirePermission('documents', 'delete'),
  deleteDocument
);

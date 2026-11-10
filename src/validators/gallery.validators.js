import { z } from 'zod';
import { GALLERY_CATEGORIES } from '../models/GalleryImage.model.js';

// FormData always sends strings — use z.coerce for numeric fields
export const createGallerySchema = z.object({
  caption:   z.string().max(120).trim().optional().default(''),
  altText:   z.string().max(300).trim().optional().default(''),
  category:  z.enum(GALLERY_CATEGORIES, { errorMap: () => ({ message: 'Invalid gallery category' }) }),
  albumName: z.string().max(150).trim().optional().default(''),
  order:     z.coerce.number().int().optional().default(0),
  status:    z.enum(['published', 'draft']).optional().default('published'),
});

export const updateGallerySchema = createGallerySchema.partial();

export const galleryQuerySchema = z.object({
  page:     z.string().optional().transform(v => parseInt(v) || 1),
  limit:    z.string().optional().transform(v => Math.min(100, parseInt(v) || 20)),
  category: z.enum([...GALLERY_CATEGORIES, 'all']).optional().default('all'),
  status:   z.enum(['published', 'draft', 'all']).optional().default('all'),
});

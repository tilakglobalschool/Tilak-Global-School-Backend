/**
 * Cloudinary configuration — Tilak Global School
 *
 * Reads credentials exclusively from environment variables.
 * API secret is NEVER hardcoded and NEVER logged.
 *
 * Usage:
 *   import cloudinary from '../config/cloudinary.js';
 *   const result = await cloudinary.uploader.upload(filePath, { ... });
 *   await cloudinary.uploader.destroy(publicId, { ... });
 */
import { v2 as cloudinary } from 'cloudinary';
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from './env.js';

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key:    CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure:     true,          // always use https
});

export default cloudinary;

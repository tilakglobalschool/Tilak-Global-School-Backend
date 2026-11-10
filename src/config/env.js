import dotenv from 'dotenv';
import path   from 'path';

dotenv.config();

// ── MONGO_URI validation — localhost/127.0.0.1 is NEVER allowed ──────────────
// Atlas URI is always required. Local MongoDB is disabled.
const rawMongoUri = process.env.MONGO_URI;

if (!rawMongoUri) {
  throw new Error(
    '❌ MONGO_URI is not set in .env — Atlas connection string is required.'
  );
}

if (rawMongoUri.includes('127.0.0.1') || rawMongoUri.includes('localhost')) {
  throw new Error(
    '❌ Localhost MongoDB is disabled. Please provide Atlas MONGO_URI in .env'
  );
}

// ── JWT validation in production ──────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_secret_change_in_production') {
    throw new Error('❌ JWT_SECRET must be set to a strong secret in production.');
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────
export const PORT         = process.env.PORT         || 5000;
export const NODE_ENV     = process.env.NODE_ENV     || 'development';
export const MONGO_URI    = rawMongoUri;

export const CLIENT_URL   = process.env.CLIENT_URL   || 'http://localhost:3000,http://localhost:3001';

export const JWT_SECRET     = process.env.JWT_SECRET     || 'dev_secret_change_in_production';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const COOKIE_DOMAIN  = process.env.COOKIE_DOMAIN  || '';

export const UPLOAD_DIR       = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
export const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 10;

export const RENDER_URL = process.env.RENDER_URL || 'https://api.tilakglobalschool.com';

// ── Cloudinary (required for file uploads) ────────────────────────────────────
// API secret must be set via environment variable — NEVER hardcoded.
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
export const CLOUDINARY_API_KEY    = process.env.CLOUDINARY_API_KEY    || '';
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

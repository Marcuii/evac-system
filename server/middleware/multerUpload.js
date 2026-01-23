/**
 * @fileoverview Multer Upload Middleware - Floor Map Image Handling
 * @description Configures Multer for handling floor map image uploads.
 *              Manages file storage, naming, validation, and size limits.
 * 
 * @requires multer - Multipart form data handling
 * @requires path - Path utilities for file extensions
 * @requires fs - File system for directory creation
 * @requires dotenv - Environment variable loading
 * 
 * @env {string} FLOOR_MAPS_DIR - Directory for uploaded floor maps
 *                                Default: './temp_frames/floor_maps'
 * @env {number} MAX_UPLOAD_SIZE_MB - Maximum file size in megabytes
 *                                    Default: 10
 * @env {string} ALLOWED_IMAGE_TYPES - Comma-separated allowed extensions
 *                                     Default: 'jpeg,jpg,png,gif,webp'
 * 
 * @example
 * // Usage in route files:
 * import multerUpload from '../middleware/multerUpload.js';
 * router.post('/floors', multerUpload.single('mapImage'), createFloor);
 * 
 * @module middleware/multerUpload
 * @author Marcelino Saad
 * @version 1.0.0
 */

import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/* ============================================
 * CONFIGURATION
 * ============================================ */

/** @constant {string} Directory path for storing uploaded floor maps */
const FLOOR_MAPS_DIR = process.env.FLOOR_MAPS_DIR || "./temp_frames/floor_maps";

/** @constant {number} Maximum upload size in megabytes */
const MAX_UPLOAD_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || "10", 10);

/** @constant {string} Allowed image file extensions (comma-separated) */
const ALLOWED_IMAGE_TYPES = process.env.ALLOWED_IMAGE_TYPES || "jpeg,jpg,png,gif,webp";

/* ============================================
 * STORAGE CONFIGURATION
 * ============================================ */

/**
 * Multer disk storage configuration
 * - Creates upload directory if it doesn't exist
 * - Names files using floor ID for easy identification
 */
const storage = multer.diskStorage({
  /**
   * Determines upload destination directory
   * @param {Request} req - Express request
   * @param {Express.Multer.File} file - Uploaded file info
   * @param {Function} cb - Callback(error, destination)
   */
  destination: (req, file, cb) => {
    // Ensure directory exists (create recursively if needed)
    if (!fs.existsSync(FLOOR_MAPS_DIR)) {
      fs.mkdirSync(FLOOR_MAPS_DIR, { recursive: true });
    }
    cb(null, FLOOR_MAPS_DIR);
  },
  
  /**
   * Generates filename for uploaded file
   * Format: {floorId}.{extension}
   * @param {Request} req - Express request (contains floor ID in body)
   * @param {Express.Multer.File} file - Uploaded file info
   * @param {Function} cb - Callback(error, filename)
   */
  filename: (req, file, cb) => {
    const floorId = req.body.id || `FLOOR_${Date.now()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${floorId}${ext}`);
  }
});

/* ============================================
 * FILE FILTER
 * ============================================ */

/**
 * Validates uploaded file type
 * Checks both file extension and MIME type for security
 * 
 * @param {Request} req - Express request
 * @param {Express.Multer.File} file - Uploaded file to validate
 * @param {Function} cb - Callback(error, acceptFile)
 */
const fileFilter = (req, file, cb) => {
  // Build regex from allowed types (e.g., /jpeg|jpg|png|gif|webp/)
  const allowedTypesRegex = new RegExp(ALLOWED_IMAGE_TYPES.split(',').join('|'));
  
  // Check file extension
  const extname = allowedTypesRegex.test(path.extname(file.originalname).toLowerCase());
  
  // Check MIME type
  const mimetype = allowedTypesRegex.test(file.mimetype);
  
  if (mimetype && extname) {
    cb(null, true); // Accept file
  } else {
    cb(new Error(`Only image files are allowed (${ALLOWED_IMAGE_TYPES})`));
  }
};

/* ============================================
 * MULTER INSTANCE
 * ============================================ */

/**
 * Configured Multer instance for floor map uploads
 * 
 * @constant {multer.Multer}
 * @property {multer.StorageEngine} storage - Disk storage configuration
 * @property {Function} fileFilter - File type validation function
 * @property {Object} limits - Upload constraints
 * @property {number} limits.fileSize - Max file size in bytes
 */
const multerUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_SIZE_MB * 1024 * 1024 // Convert MB to bytes
  }
});

export default multerUpload;

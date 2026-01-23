/**
 * @fileoverview Cloudinary Configuration
 * @description Configures Cloudinary SDK for cloud image storage and management.
 *              Used for storing floor map images and camera capture frames.
 * 
 * @requires cloudinary - Cloudinary Node.js SDK
 * @requires dotenv - Environment variable loader
 * 
 * @env {string} CLOUDINARY_CLOUD_NAME - Cloudinary account cloud name
 * @env {string} CLOUDINARY_API_KEY - Cloudinary API key for authentication
 * @env {string} CLOUDINARY_API_SECRET - Cloudinary API secret for secure access
 * 
 * @example
 * // Usage in other modules:
 * import cloudinary from './config/cloudinary.js';
 * const result = await cloudinary.uploader.upload(filePath, options);
 * 
 * @module config/cloudinary
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Configure Cloudinary with credentials from environment variables.
 * This setup enables secure image uploads, transformations, and delivery.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

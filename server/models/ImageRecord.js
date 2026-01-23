/**
 * @fileoverview ImageRecord Model - Camera Capture Storage
 * @description Stores metadata and AI analysis results for each camera capture.
 *              Each record represents a single frame captured from an RTSP camera,
 *              including storage paths and hazard detection results.
 * 
 * @requires mongoose - MongoDB ODM
 * 
 * @example
 * // Creating a new record after capture:
 * const record = await ImageRecord.create({
 *   cameraId: 'CAM_HALL_01',
 *   edgeId: 'E1',
 *   floorId: 'floor_1',
 *   localPath: '/local_storage/2026/01/22/floor_1/CAM_HALL_01/frame.jpg',
 *   cloudUrl: 'https://res.cloudinary.com/...',
 *   aiResult: { peopleCount: 5, fireProb: 0.0, smokeProb: 0.1 }
 * });
 * 
 * @module models/ImageRecord
 * @author Marcelino Saad
 * @version 1.0.0
 */

import mongoose from "mongoose";

/**
 * ImageRecord Schema - Camera capture metadata and AI results
 * 
 * @description
 * Tracks every camera capture with:
 * - Source identification (camera, edge, floor)
 * - Storage locations (local filesystem and cloud)
 * - AI analysis results (people count, fire/smoke probability)
 * - Processing status for async AI pipeline
 */
const ImageRecordSchema = new mongoose.Schema({
  // ─────────────────────────────────────────
  // SOURCE IDENTIFICATION
  // ─────────────────────────────────────────
  /** @type {string} Camera that captured this frame */
  cameraId: String,
  
  /** @type {string} Edge being monitored by this camera */
  edgeId: String,
  
  /** @type {string} Floor this camera belongs to */
  floorId: String,
  
  // ─────────────────────────────────────────
  // STORAGE PATHS
  // ─────────────────────────────────────────
  /** @type {string} Relative path in local_storage (for serving via /images endpoint) */
  localPath: String,
  
  /** @type {string} Cloudinary URL (null if cloud upload failed) */
  cloudUrl: String,
  
  // ─────────────────────────────────────────
  // TIMESTAMPS & STATUS
  // ─────────────────────────────────────────
  /** @type {Date} When this frame was captured */
  timestamp: { type: Date, default: Date.now },
  
  /** @type {boolean} Whether AI analysis has been completed */
  processed: { type: Boolean, default: false },
  
  // ─────────────────────────────────────────
  // AI ANALYSIS RESULTS
  // ─────────────────────────────────────────
  /**
   * Results from AI hazard detection
   * - peopleCount: Number of people detected in frame
   * - fireProb: Probability of fire (0.0 - 1.0)
   * - smokeProb: Probability of smoke (0.0 - 1.0)
   */
  aiResult: {
    peopleCount: { type: Number, default: 0 },
    fireProb: { type: Number, default: 0 },
    smokeProb: { type: Number, default: 0 }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

export default mongoose.model("ImageRecord", ImageRecordSchema);

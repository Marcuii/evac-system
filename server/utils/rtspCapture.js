/**
 * @fileoverview RTSP Frame Capture Utility
 * @description Captures single frames from RTSP camera streams using FFmpeg.
 *              Used by the periodic job to get images for AI analysis.
 * 
 * @requires fluent-ffmpeg - FFmpeg wrapper for Node.js
 * @requires fs - File system operations
 * @requires path - Path manipulation
 * 
 * @env TEMP_FRAMES_DIR - Directory for temporary frame storage (default: ./temp_frames)
 * 
 * @module utils/rtspCapture
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @exports captureFrameFromRtsp - Capture single frame from RTSP stream
 */

import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

/* ============================================================
 * CONFIGURATION
 * ============================================================ */

/** @constant {string} DEFAULT_TEMP_FRAMES_DIR - Default directory for captured frames */
const DEFAULT_TEMP_FRAMES_DIR = process.env.TEMP_FRAMES_DIR || "./temp_frames";

/* ============================================================
 * FRAME CAPTURE FUNCTION
 * ============================================================ */

/**
 * Captures a single frame from an RTSP camera stream.
 * 
 * @async
 * @function captureFrameFromRtsp
 * @param {string} rtspUrl - Full RTSP URL of the camera stream
 * @param {string} floorId - Floor identifier for filename
 * @param {string} cameraId - Camera identifier for filename
 * @param {string} [outDir=DEFAULT_TEMP_FRAMES_DIR] - Output directory
 * @returns {Promise<Object>} Capture result
 * @returns {string} returns.localPath - Absolute path to captured image
 * @returns {string} returns.cameraId - Camera ID for reference
 * 
 * @description
 * Uses FFmpeg to:
 * 1. Connect to RTSP stream
 * 2. Capture exactly 1 frame
 * 3. Save as JPEG with timestamp-based filename
 * 
 * Filename format: {timestamp}-{floorId}-{cameraId}.jpg
 * 
 * @example
 * const { localPath, cameraId } = await captureFrameFromRtsp(
 *   'rtsp://192.168.1.100:554/stream',
 *   'floor_1',
 *   'CAM_01'
 * );
 * // localPath: './temp_frames/1705312800000-floor_1-CAM_01.jpg'
 * 
 * @throws {Error} FFmpeg errors (connection timeout, invalid stream, etc.)
 */
export const captureFrameFromRtsp = (rtspUrl, floorId, cameraId, outDir = DEFAULT_TEMP_FRAMES_DIR) => {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    
    // Generate unique filename with timestamp
    const filename = `${Date.now()}-${floorId}-${cameraId}.jpg`;
    const outPath = path.join(outDir, filename);

    // Use FFmpeg to capture single frame
    ffmpeg(rtspUrl)
      .frames(1)              // Capture exactly 1 frame
      .outputOptions("-y")    // Overwrite existing file
      .output(outPath)
      .on("end", () => resolve({ localPath: outPath, cameraId }))
      .on("error", (err) => reject(err))
      .run();
  });
};

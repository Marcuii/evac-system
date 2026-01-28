/**
 * @fileoverview Local AI Integration Utility
 * @description Sends camera images to local AI service for hazard detection.
 *              Local AI runs on-premises for low latency and privacy.
 * 
 * @requires axios - HTTP client for API requests
 * 
 * @env LOCAL_AI_ENDPOINT - URL of local AI service (e.g., http://localhost:5000/analyze)
 * @env LOCAL_AI_TIMEOUT_MS - Request timeout in milliseconds (default: 15000)
 * 
 * @module utils/ai/sendToLocalAI
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @exports callLocalAI - Send image to local AI for analysis
 */

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/* ============================================================
 * CONFIGURATION
 * ============================================================ */

/** @constant {number} LOCAL_AI_TIMEOUT - Request timeout in milliseconds */
const LOCAL_AI_TIMEOUT = parseInt(process.env.LOCAL_AI_TIMEOUT_MS || "15000", 10);

/* ============================================================
 * LOCAL AI FUNCTION
 * ============================================================ */

/**
 * Sends an image to the local AI service for hazard analysis.
 * 
 * @async
 * @function callLocalAI
 * @param {Object} params - Request parameters
 * @param {string} params.localPath - Absolute path to the image file
 * @param {string} params.cameraId - Camera identifier for tracking
 * @param {string} params.edgeId - Edge ID this camera monitors
 * @returns {Promise<Object|null>} AI analysis result or null on failure
 * @returns {number} returns.peopleCount - Number of people detected
 * @returns {number} returns.fireProb - Fire detection probability (0-1)
 * @returns {number} returns.smokeProb - Smoke detection probability (0-1)
 * 
 * @description
 * Expected AI response format:
 * {
 *   "peopleCount": 5,
 *   "fireProb": 0.0,
 *   "smokeProb": 0.1
 * }
 * 
 * Returns null if:
 * - LOCAL_AI_ENDPOINT is not configured
 * - Request times out
 * - AI service returns an error
 * 
 * @note Errors are logged but not thrown (graceful degradation)
 */
export const callLocalAI = async ({ localPath, cameraId, edgeId }) => {
  const endpoint = process.env.LOCAL_AI_ENDPOINT;
  
  // Skip if endpoint not configured
  if (!endpoint) return null;
  
  try {
    const resp = await axios.post(
      endpoint,
      { imageUrl: localPath, cameraId, edgeId },
      { 
        timeout: LOCAL_AI_TIMEOUT,
        headers: {
          "Authorization": `Bearer ${process.env.AI_API_KEY}`
        }
      }
    );
    return resp.data;
  } catch (err) {
    // Log error but don't throw (allows cloud AI fallback)
    console.error("Local AI error:", err.message);
    return null;
  }
};

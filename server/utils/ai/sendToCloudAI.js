/**
 * @fileoverview Cloud AI Integration Utility
 * @description Sends camera images to cloud AI service for hazard detection.
 *              Cloud AI provides more accurate results but with higher latency.
 * 
 * @requires axios - HTTP client for API requests
 * 
 * @env CLOUD_AI_ENDPOINT - URL of cloud AI service (e.g., Azure ML endpoint)
 * @env CLOUD_AI_TIMEOUT_MS - Request timeout in milliseconds (default: 25000)
 * 
 * @module utils/ai/sendToCloudAI
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @exports callCloudAI - Send image URL to cloud AI for analysis
 */

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/* ============================================================
 * CONFIGURATION
 * ============================================================ */

/** @constant {number} CLOUD_AI_TIMEOUT - Request timeout in milliseconds */
const CLOUD_AI_TIMEOUT = parseInt(process.env.CLOUD_AI_TIMEOUT_MS || "25000", 10);

/* ============================================================
 * CLOUD AI FUNCTION
 * ============================================================ */

/**
 * Sends an image URL to the cloud AI service for hazard analysis.
 * 
 * @async
 * @function callCloudAI
 * @param {Object} params - Request parameters
 * @param {string} params.cloudUrl - Public URL of the uploaded image (Cloudinary)
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
 * - CLOUD_AI_ENDPOINT is not configured
 * - Request times out (longer timeout for cloud)
 * - AI service returns an error
 * 
 * @note Cloud AI results are prioritized over local AI in data fusion
 * @note Uses publicly accessible Cloudinary URL for image transfer
 */
export const callCloudAI = async ({ cloudUrl, cameraId, edgeId }) => {
  const endpoint = process.env.CLOUD_AI_ENDPOINT;
  
  // Skip if endpoint not configured
  if (!endpoint) return null;
  
  try {
    const resp = await axios.post(
      endpoint,
      { imageUrl: cloudUrl, cameraId, edgeId },
      { 
        timeout: CLOUD_AI_TIMEOUT,
        headers: {
          "Authorization": `Bearer ${process.env.AI_API_KEY}`
        }
      }
    );
    return resp.data;
  } catch (err) {
    // Log error but don't throw (allows local AI fallback)
    console.error("Cloud AI error:", err.message);
    return null;
  }
};

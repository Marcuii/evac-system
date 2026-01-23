/**
 * @fileoverview Mock RTSP Camera Capture Routes
 * @description Simulates RTSP camera capture endpoints for testing
 * 
 * @module routes/rtsp
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Test images directory
const TEST_IMAGES_DIR = path.join(__dirname, '..', 'test-images');

/**
 * Get list of available camera IDs from test-images folder
 */
function getAvailableCameras() {
  try {
    const files = fs.readdirSync(TEST_IMAGES_DIR);
    return files
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
      .map(f => path.basename(f, path.extname(f)));
  } catch {
    return [];
  }
}

/**
 * Find image file for a camera ID (supports multiple extensions)
 */
function findCameraImage(cameraId) {
  const extensions = ['.png', '.jpg', '.jpeg'];
  
  for (const ext of extensions) {
    const filePath = path.join(TEST_IMAGES_DIR, `${cameraId}${ext}`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  
  return null;
}

/**
 * RTSP Camera Capture Endpoint
 * GET /api/rtsp/capture?cameraId=<id>&time=<timestamp>
 * 
 * Returns a test image for the specified camera
 */
router.get('/capture', async (req, res) => {
  try {
    const { cameraId, time } = req.query;

    if (!cameraId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'cameraId is required'
      });
    }

    const timestamp = time || new Date().toISOString();
    console.log(`📸 RTSP Capture - Camera: ${cameraId}, Time: ${timestamp}`);

    // Find the camera image
    const imagePath = findCameraImage(cameraId);

    if (!imagePath) {
      const available = getAvailableCameras();
      return res.status(404).json({
        success: false,
        error: 'Camera image not found',
        message: `No test image for ${cameraId}`,
        availableCameras: available
      });
    }

    // Read and send the image
    const imageBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

    res.set({
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length,
      'X-Camera-ID': cameraId,
      'X-Timestamp': timestamp,
      'Cache-Control': 'no-cache'
    });

    res.send(imageBuffer);

  } catch (error) {
    console.error('❌ RTSP capture error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to capture image',
      message: error.message
    });
  }
});

/**
 * Get available cameras list
 * GET /api/rtsp/cameras
 */
router.get('/cameras', (req, res) => {
  const cameras = getAvailableCameras();
  
  res.json({
    success: true,
    count: cameras.length,
    cameras: cameras.map(id => ({
      id,
      captureUrl: `/api/rtsp/capture?cameraId=${id}`
    }))
  });
});

/**
 * Get camera status (simulated)
 * GET /api/rtsp/status/:cameraId
 */
router.get('/status/:cameraId', (req, res) => {
  const { cameraId } = req.params;
  const imagePath = findCameraImage(cameraId);
  
  if (!imagePath) {
    return res.status(404).json({
      success: false,
      error: 'Camera not found',
      availableCameras: getAvailableCameras()
    });
  }

  res.json({
    success: true,
    data: {
      cameraId,
      status: 'online',
      resolution: '640x480',
      fps: 30,
      protocol: 'RTSP (Simulated)',
      lastCapture: new Date().toISOString()
    }
  });
});

module.exports = router;

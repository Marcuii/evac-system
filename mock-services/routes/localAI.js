/**
 * @fileoverview Mock Local AI Analysis Routes
 * @description Simulates edge-device AI analysis for testing
 * 
 * @module routes/localAI
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

// Simulated processing delay (ms)
const PROCESSING_DELAY = 1000;

/**
 * Local AI Analysis Endpoint
 * POST /api/local-ai/analyze
 * 
 * Simulates edge AI analysis returning people count, fire/smoke probabilities
 */
router.post('/analyze', (req, res) => {
  try {
    const { imageUrl, cameraId, edgeId } = req.body;

    if (!imageUrl || !cameraId || !edgeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'imageUrl, cameraId, and edgeId are required'
      });
    }

    console.log(`🤖 Local AI - Camera: ${cameraId}, Edge: ${edgeId}`);

    // Simulate processing delay
    setTimeout(() => {
      const response = {
        success: true,
        cameraId,
        edgeId,
        peopleCount: Math.floor(Math.random() * 15),
        fireProb: parseFloat((Math.random() * 0.3).toFixed(2)),
        smokeProb: parseFloat((Math.random() * 0.4).toFixed(2)),
        aiModel: 'local-edge-detector-v1',
        confidence: parseFloat((Math.random() * 0.3 + 0.7).toFixed(2)),
        processingTime: PROCESSING_DELAY
      };

      console.log(`   ✅ People: ${response.peopleCount}, Fire: ${response.fireProb}, Smoke: ${response.smokeProb}`);
      res.json(response);
    }, PROCESSING_DELAY);

  } catch (error) {
    console.error('❌ Local AI error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * Local AI Status Endpoint
 * GET /api/local-ai/status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      model: 'local-edge-detector-v1',
      status: 'online',
      type: 'Edge AI (Simulated)',
      avgLatency: `${PROCESSING_DELAY}ms`
    }
  });
});

module.exports = router;
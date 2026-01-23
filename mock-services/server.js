/**
 * @fileoverview EES Mock Services Server
 * @description Simulation server for RTSP cameras and AI endpoints
 * 
 * This server provides mock endpoints for testing the EES backend
 * without requiring real cameras or AI services.
 * 
 * @author Marcelino Saad
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const rtspRoutes = require('./routes/rtsp');
const localAIRoutes = require('./routes/localAI');
const cloudAIRoutes = require('./routes/cloudAI');

const app = express();
const PORT = process.env.PORT || 3090;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/rtsp', rtspRoutes);
app.use('/api/local-ai', localAIRoutes);
app.use('/api/cloud-ai', cloudAIRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ees-mock-services',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API documentation
app.get('/', (req, res) => {
  res.json({
    service: 'EES Mock Services',
    version: '1.0.0',
    description: 'Simulation server for RTSP cameras and AI analysis',
    endpoints: {
      health: 'GET /health',
      rtsp: {
        capture: 'GET /api/rtsp/capture?cameraId=<id>',
        cameras: 'GET /api/rtsp/cameras',
        status: 'GET /api/rtsp/status/:cameraId'
      },
      localAI: {
        analyze: 'POST /api/local-ai/analyze',
        status: 'GET /api/local-ai/status'
      },
      cloudAI: {
        analyze: 'POST /api/cloud-ai/analyze',
        status: 'GET /api/cloud-ai/status'
      }
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║           EES Mock Services Server                   ║
║      Emergency Evacuation System - Test Server       ║
╠══════════════════════════════════════════════════════╣
║  Server:     http://localhost:${PORT}                   ║
║  Health:     http://localhost:${PORT}/health            ║
╠══════════════════════════════════════════════════════╣
║  Endpoints:                                          ║
║    📸 RTSP:     /api/rtsp/capture?cameraId=<id>      ║
║    🤖 Local AI: POST /api/local-ai/analyze           ║
║    ☁️  Cloud AI: POST /api/cloud-ai/analyze           ║
╚══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;

# EES Mock Services

Mock simulation server for the Emergency Evacuation System (EES). Provides simulated RTSP camera captures and AI analysis endpoints for development and testing.

## Overview

This server simulates external dependencies that the main EES backend relies on:

| Service | Description | Endpoint |
|---------|-------------|----------|
| **RTSP Cameras** | Returns test images for camera captures | `/api/rtsp/capture` |
| **Local AI** | Simulates edge-device AI analysis (~1s latency) | `/api/local-ai/analyze` |
| **Cloud AI** | Simulates cloud AI analysis (~3s latency) | `/api/cloud-ai/analyze` |

## Quick Start

```bash
# Install dependencies
npm install

# Start server (port 3090)
npm start

# Development mode with auto-reload
npm run dev
```

## API Endpoints

### Health Check

```bash
GET /health
```

### RTSP Camera Simulation

```bash
# Capture image from camera
GET /api/rtsp/capture?cameraId=<camera_id>

# List available cameras
GET /api/rtsp/cameras

# Get camera status
GET /api/rtsp/status/:cameraId
```

**Example:**
```bash
curl "http://localhost:3090/api/rtsp/capture?cameraId=CAM_CORRIDOR_1" --output frame.png
```

### Local AI Analysis

```bash
POST /api/local-ai/analyze
Content-Type: application/json

{
  "imageUrl": "/path/to/image.png",
  "cameraId": "CAM_CORRIDOR_1",
  "edgeId": "E1"
}
```

**Response:**
```json
{
  "success": true,
  "cameraId": "CAM_CORRIDOR_1",
  "edgeId": "E1",
  "peopleCount": 5,
  "fireProb": 0.12,
  "smokeProb": 0.08,
  "aiModel": "local-edge-detector-v1",
  "confidence": 0.85,
  "processingTime": 1000
}
```

### Cloud AI Analysis

```bash
POST /api/cloud-ai/analyze
Content-Type: application/json

{
  "imageUrl": "/path/to/image.png",
  "cameraId": "CAM_CORRIDOR_1",
  "edgeId": "E1"
}
```

**Response:** Same format as Local AI, with higher confidence and longer processing time.

## Test Images

Place camera images in the `test-images/` folder. The filename (without extension) becomes the camera ID.

**Current cameras:**
- `CAM_CORRIDOR_1` - `CAM_CORRIDOR_4`
- `CAM_EAST_EXIT`, `CAM_WEST_EXIT`
- `CAM_LAB_101`, `CAM_LAB_104`

**Adding custom images:**
```bash
# Add your own camera images
cp your-camera-frame.png test-images/YOUR_CAMERA_ID.png
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3090` | Server port |

## Integration with EES Backend

Configure the main EES server `.env` to use mock endpoints:

```env
RTSP_TEMPLATE=http://localhost:3090/api/rtsp/capture?cameraId={cameraId}
LOCAL_AI_ENDPOINT=http://localhost:3090/api/local-ai/analyze
CLOUD_AI_ENDPOINT=http://localhost:3090/api/cloud-ai/analyze
```

## Project Structure

```
mock-services/
├── server.js           # Express server entry point
├── package.json        # Dependencies
├── routes/
│   ├── rtsp.js         # Camera capture simulation
│   ├── localAI.js      # Local AI simulation
│   └── cloudAI.js      # Cloud AI simulation
└── test-images/        # Camera test images
    ├── CAM_CORRIDOR_1.png
    ├── CAM_CORRIDOR_2.png
    └── ...
```

## Notes

- **Not for production** - This is a testing/development tool only
- AI responses are randomly generated within realistic ranges
- Processing delays simulate real-world latency
- No database or external dependencies required

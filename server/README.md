<p align="center">
  <h1 align="center">🚨 EES Backend Server</h1>
  <p align="center">
    <strong>Emergency Evacuation System - AI-Powered Real-Time Routing Backend</strong>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
    <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node">
    <img src="https://img.shields.io/badge/express-5.1.0-lightgrey" alt="Express">
    <img src="https://img.shields.io/badge/license-ISC-green" alt="License">
  </p>
</p>

---

## 📋 Overview

The **EES Backend Server** is the core component of the Emergency Evacuation System. It processes real-time CCTV feeds through AI analysis to detect hazards (fire, smoke, crowd density), computes optimal evacuation routes using Dijkstra's algorithm, and broadcasts routes to display screens via Socket.IO with USRP radio fallback.

### System Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CAPTURE CYCLE (Every 30 seconds)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ RTSP Capture │───▶│ Local + Cloud│───▶│   Dijkstra   │                  │
│  │  (Cameras)   │    │  AI Analysis │    │  Pathfinding │                  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘                  │
│                                                  │                          │
│                    ┌─────────────────────────────┴─────────────────────┐   │
│                    │                                                   │   │
│                    ▼                                                   ▼   │
│           ┌──────────────┐                                   ┌──────────┐ │
│           │  Socket.IO   │  (Primary - Active Connections)   │   USRP   │ │
│           │  Broadcast   │                                   │  Radio   │ │
│           └──────────────┘                                   └──────────┘ │
│                    │                                               │       │
│                    ▼                                               ▼       │
│           ┌─────────────────────────────────────────────────────────────┐ │
│           │              Screen Displays (Evacuation Routes)            │ │
│           └─────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **AI Hazard Detection** | Parallel local + cloud AI analysis for fire, smoke, and people density |
| **Dynamic Routing** | Dijkstra's algorithm with hazard-weighted edges and threshold penalties |
| **Real-time Broadcasting** | Socket.IO room-based targeted updates per floor |
| **Radio Fallback** | USRP/GNU Radio OFDM transmission when network is unavailable |
| **Auto Camera Management** | Auto-disable cameras after consecutive failures |
| **Cloud Sync** | Periodic MongoDB Atlas synchronization |
| **Production Security** | Helmet, rate limiting, NoSQL sanitization, CORS |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.0.0
- **MongoDB** (local or Atlas)
- **Cloudinary** account (for image storage)
- **FFmpeg** (for RTSP capture)

### Installation

```bash
# Clone and navigate
git clone <repository-url>
cd evac-system/server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start server
npm start          # Production
npm run dev        # Development (with auto-reload)
```

### Verify Installation

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "service": "evac-backend",
  "version": "1.0.0",
  "database": { "status": "connected" }
}
```

---

## 📁 Project Structure

```
backend-server/
├── server.js                    # Application entry point
├── package.json                 # Dependencies & scripts
├── .env.example                 # Environment template
│
├── config/
│   ├── cloudinary.js            # Cloudinary SDK setup
│   └── db.local.js              # MongoDB connection
│
├── controllers/
│   ├── floors/                  # Floor CRUD + status management
│   ├── records/                 # Image record retrieval
│   └── routes/                  # Computed route retrieval
│
├── middleware/
│   ├── adminAuth.js             # x-admin-auth header validation
│   ├── errorHandler.js          # Global error handling
│   ├── multerUpload.js          # File upload (10MB limit)
│   ├── requestLogger.js         # Request ID tracking
│   └── security.js              # Helmet, rate limit, sanitization
│
├── models/
│   ├── FloorMap.js              # Floor, nodes, edges, cameras, screens
│   ├── ImageRecord.js           # Camera capture records
│   └── Route.js                 # Computed evacuation routes
│
├── routes/
│   ├── floorRoutes.js           # /api/floors/*
│   ├── recordRoutes.js          # /api/records/*
│   └── routeRoutes.js           # /api/routes/*
│
├── sockets/
│   └── routeSocket.js           # Socket.IO event handlers
│
├── utils/
│   ├── ai/                      # AI service integrations
│   │   ├── sendToLocalAI.js     # Local AI (file path input)
│   │   └── sendToCloudAI.js     # Cloud AI (Cloudinary URL input)
│   ├── storage/                 # Image storage utilities
│   ├── validators/              # Input validation
│   ├── dijkstra.js              # Pathfinding algorithm
│   ├── periodicJob.js           # Capture cycle orchestrator
│   ├── rtspCapture.js           # RTSP frame capture (FFmpeg)
│   ├── usrpSender.js            # USRP transmission wrapper
│   ├── tx_ofdm.py               # GNU Radio OFDM TX script
│   ├── cloudSync.js             # MongoDB Atlas sync
│   └── logger.js                # Winston logging
│
├── local_storage/               # Permanent image storage
├── temp_frames/                 # Temporary captures
└── logs/                        # Application logs
```

---

## 📖 API Reference

### Health Endpoints (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Basic health check |
| `GET` | `/health` | Detailed status (DB, memory, uptime) |
| `GET` | `/ready` | Kubernetes readiness probe |

### Floor Management (Admin Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/floors` | List all floors |
| `GET` | `/api/floors/:id` | Get single floor |
| `POST` | `/api/floors` | Create floor (multipart/form-data) |
| `PATCH` | `/api/floors/:id` | Update floor |
| `DELETE` | `/api/floors/:id` | Delete floor |
| `GET` | `/api/floors/system/status` | System-wide status overview |
| `PUT` | `/api/floors/:id/status` | Update floor status |
| `PUT` | `/api/floors/:id/cameras/:camId/status` | Update camera status |
| `PUT` | `/api/floors/:id/screens/:screenId/status` | Update screen status |
| `POST` | `/api/floors/:id/cameras/reset` | Reset floor cameras |
| `POST` | `/api/floors/system/cameras/reset` | Reset ALL cameras globally |
| `POST` | `/api/floors/system/bulk-update` | Bulk status updates |

### Routes (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/routes?floorId=xxx` | Get route history for floor |
| `GET` | `/api/routes/latest?floorId=xxx` | Get latest computed route |

### Records (Admin Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/records?floorId=xxx&startDate=xxx&endDate=xxx` | Query image records |
| `GET` | `/api/records/latest?floorId=xxx` | Get latest record |

### Settings (Admin Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get current system settings |
| `PUT` | `/api/settings` | Update system settings |
| `POST` | `/api/settings/sync` | Manually trigger cloud sync |

#### Settings Payload
```json
{
  "cloudSync": {
    "enabled": true,
    "intervalHours": 12
  },
  "cloudProcessing": {
    "enabled": true,
    "disabledReason": null
  }
}
```

#### Cloud Settings Features

**Cloud Processing (`cloudProcessing`)**
- When **enabled**: Images are uploaded to Cloudinary and processed by both local and cloud AI
- When **disabled**: Only local storage and local AI analysis are used (useful for offline mode)

**Cloud Sync (`cloudSync`)**
- When **enabled**: Local MongoDB is periodically synced to cloud MongoDB Atlas
- `intervalHours`: Time between automatic sync operations (1-168 hours)
- Use `POST /api/settings/sync` to trigger an immediate manual sync

### Authentication

All admin endpoints require the `x-admin-auth` header:

```bash
curl -X GET http://localhost:3000/api/floors \
  -H "x-admin-auth: your-admin-token"
```

---

## 🔌 Socket.IO Events

### Connection & Registration

```javascript
const socket = io('http://localhost:3000');

// Register for a specific floor
socket.emit('register_floor', { floorId: 'floor_1' });

// Listen for confirmation
socket.on('registration_confirmed', (data) => {
  console.log(`Registered for floor: ${data.floorId}`);
});
```

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `register_floor` | `{ floorId: string }` | Subscribe to floor updates |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `registration_confirmed` | `{ floorId, message }` | Registration success |
| `registration_error` | `{ error }` | Registration failed |
| `route_update_<floorId>` | Route payload | Floor-specific update |
| `route_update` | Route payload | Global broadcast (legacy) |

### Route Payload Structure

```javascript
{
  floorId: "floor_1",
  floorName: "Ground Floor",
  routes: [
    {
      startNode: "N1",
      exitNode: "EXIT_A",
      path: ["N1", "N2", "N3", "EXIT_A"],
      edges: ["E1", "E2", "E3"],
      distance: 45.5,
      distanceMeters: 12.3,
      hazardLevel: "safe",
      exceedsThresholds: false,
      hazardDetails: [...]
    }
  ],
  emergency: false,
  overallHazardLevel: "safe",
  timestamp: "2026-01-22T12:00:00.000Z",
  totalRoutes: 3
}
```

---

## ⚙️ Configuration

### Essential Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
LOCAL_MONGO_URI=mongodb://127.0.0.1:27017/evac_local

# Authentication (CHANGE IN PRODUCTION!)
ADMIN_AUTH_TOKEN=your-secure-token

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# AI Endpoints
LOCAL_AI_ENDPOINT=http://localhost:3090/api/local-ai/analyze
CLOUD_AI_ENDPOINT=http://localhost:3090/api/cloud-ai/analyze

# RTSP Capture
RTSP_TEMPLATE=http://localhost:3090/api/rtsp/capture?cameraId={cameraId}
CAPTURE_INTERVAL_SEC=30
```

See [.env.example](.env.example) for the complete list of 40+ configuration options.

---

## 🧠 AI Integration

The system calls both local and cloud AI services in parallel:

### Request Format (Both)
```json
{
  "imageUrl": "path/or/url/to/image.jpg",
  "cameraId": "CAM_01",
  "edgeId": "E1"
}
```

### Response Format
```json
{
  "peopleCount": 5,
  "fireProb": 0.0,
  "smokeProb": 0.1
}
```

### Fusion Logic
- Cloud AI results take precedence when available
- Falls back to local AI if cloud fails
- Defaults to safe values (0) if both fail

---

## 📡 USRP Radio Fallback

When no Socket.IO clients are connected to a floor, routes are transmitted via USRP radio.

### Trigger Condition
```javascript
// USRP activates when floor has NO active socket connections
const shouldUseUSRP = !activeFloorIds.includes(floor.id);
```

### Technical Specs

| Parameter | Value |
|-----------|-------|
| Frequency | 2.4 GHz |
| Sample Rate | 2 Msps |
| TX Gain | 140 |
| Modulation | OFDM (BPSK header, 16-QAM payload) |
| FFT Length | 64 |

### Data Format
```
================================================================================
{"routes":[...],"floorId":"floor_1","timestamp":"..."}
================================================================================
[33000 padding characters for transmission buffer]
```

---

## 🗄️ Database Schemas

### FloorMap
```javascript
{
  id: String,                    // Unique identifier
  name: String,                  // Display name
  status: 'active'|'disabled'|'maintenance',
  mapImage: { url, localUrl, widthMeters, heightMeters },
  nodes: [{ id, x, y, label, type }],
  edges: [{ id, from, to, staticWeight, thresholds... }],
  cameras: [{ id, edgeId, rtspUrl, status, failureCount... }],
  screens: [{ id, nodeId, name, status... }],
  exitPoints: [String]
}
```

### ImageRecord
```javascript
{
  cameraId: String,
  edgeId: String,
  floorId: String,
  localPath: String,
  cloudUrl: String,
  timestamp: Date,
  aiResult: { peopleCount, fireProb, smokeProb }
}
```

### Route
```javascript
{
  floorId: String,
  computedAt: Date,
  routes: [{ startNode, exitNode, path, distance, hazardLevel... }],
  emergency: Boolean,
  overallHazardLevel: String
}
```

---

## 🛠️ Technologies

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js ≥18.0.0 |
| **Framework** | Express.js 5.1.0 |
| **Database** | MongoDB + Mongoose 8.x |
| **Real-time** | Socket.IO 4.8.x |
| **Security** | Helmet, express-rate-limit, hpp |
| **Logging** | Winston |
| **Media** | FFmpeg (RTSP), Cloudinary |
| **Radio** | GNU Radio + UHD (USRP) |

---

## 📚 Additional Documentation

| Document | Description |
|----------|-------------|
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Complete API reference with examples |
| [USRP_SYSTEM.md](./USRP_SYSTEM.md) | USRP radio fallback technical details |

---

## 👨‍💻 Author

**Marcelino Saad**

---

## 📄 License

ISC License

---

<p align="center">
  <sub>Built for safer emergency evacuations 🏢🚨</sub>
</p>

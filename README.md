<p align="center">
  <img src="https://img.shields.io/badge/🚨-Emergency%20Evacuation%20System-red?style=for-the-badge" alt="EES">
</p>

<h1 align="center">🏢 Emergency Evacuation System</h1>

<p align="center">
  <strong>AI-Powered Real-Time Building Evacuation Routing System</strong>
</p>

<p align="center">
  <em>Graduation Project - Computer Engineering</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square" alt="Node">
  <img src="https://img.shields.io/badge/react-19.x-61DAFB?style=flat-square" alt="React">
  <img src="https://img.shields.io/badge/express-5.x-lightgrey?style=flat-square" alt="Express">
  <img src="https://img.shields.io/badge/mongodb-8.x-47A248?style=flat-square" alt="MongoDB">
  <img src="https://img.shields.io/badge/socket.io-4.x-010101?style=flat-square" alt="Socket.IO">
  <img src="https://img.shields.io/badge/license-ISC-green?style=flat-square" alt="License">
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-modules">Modules</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-documentation">Documentation</a>
</p>

---

## 📋 Overview

The **Emergency Evacuation System (EES)** is a comprehensive full-stack solution designed to provide **real-time, AI-assisted evacuation routing** for buildings during emergencies. The system continuously monitors building corridors through CCTV cameras, analyzes footage using AI to detect hazards (fire, smoke, crowd density), computes optimal evacuation routes using **Dijkstra's algorithm** with dynamic edge weights, and broadcasts personalized routes to display screens throughout the building.

### 🎯 Problem Statement

During building emergencies, occupants often lack real-time information about safe evacuation routes. Traditional static evacuation signs cannot adapt to dynamic hazards like spreading fires, smoke-filled corridors, or overcrowded pathways. This system addresses these challenges by providing:

- **Real-time hazard detection** through AI-powered camera analysis
- **Dynamic route computation** that adapts to changing conditions
- **Multi-channel communication** ensuring route delivery even during network failures

### ✨ Key Capabilities

| Capability | Description |
|------------|-------------|
| 🤖 **AI Hazard Detection** | Real-time fire, smoke, and crowd density analysis from CCTV feeds |
| 🗺️ **Dynamic Pathfinding** | Dijkstra's algorithm with hazard-weighted edges and threshold penalties |
| 📡 **Dual Communication** | Socket.IO (primary) + USRP/SDR radio transmission (fallback) |
| 🖥️ **Admin Dashboard** | Web-based floor management, monitoring, and configuration |
| 📺 **Floor Screens** | Production displays showing evacuation routes with visual guidance |
| ☁️ **Cloud Integration** | MongoDB Atlas sync + Cloudinary image storage |
| 🔄 **Offline Mode** | Continue local AI analysis when cloud services are unavailable |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           EMERGENCY EVACUATION SYSTEM                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐           │
│  │  CCTV Cameras   │    │   AI Services   │    │    MongoDB      │           │
│  │  (RTSP Feeds)   │    │  (Local/Cloud)  │    │   (Database)    │           │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘           │
│           │                      │                      │                    │
│           ▼                      ▼                      ▼                    │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                          BACKEND SERVER (server/)                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │  RTSP    │  │    AI    │  │ Dijkstra │  │Socket.IO │  │   USRP   │  │  │
│  │  │ Capture  │─▶│ Analysis │─▶│ Routing  │─▶│ REST API │  │ Fallback │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └────┬─────┘  └────┬─────┘  │  │
│  └─────────────────────────────────────────────────┼─────────────┼────────┘  │
│                                                    │             │           │
│           ┌────────────────────────────────────────│             │           │
│           │                                        │─────────────┘           │
│           ▼                                        ▼                         │
│  ┌─────────────────┐                    ┌─────────────────────────────────┐  │
│  │ Admin Dashboard │                    │      Building Floor Screens     │  │
│  │    (admin/)     │                    │          (screens/)             │  │
│  │  - Floor Mgmt   │                    │  ┌───────┐ ┌───────┐ ┌───────┐  │  │
│  │  - Monitoring   │                    │  │Floor 1│ │Floor 2│ │Floor 3│  │  │
│  │  - Settings     │                    │  └───────┘ └───────┘ └───────┘  │  │
│  └─────────────────┘                    └─────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Pipeline

```
Every Capture Cycle (configurable interval):
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
│   RTSP     │──▶│   Local    │──▶│  Dijkstra  │──▶│  Socket.IO │──▶│   Screen   │
│  Capture   │   │ AI + Cloud │   │  Routing   │   │  Broadcast │   │  Display   │
│  (FFmpeg)  │   │AI Analysis │   │ (Weighted) │   │  (Rooms)   │   │  Update    │
└────────────┘   └────────────┘   └────────────┘   └────────────┘   └────────────┘
                       │                                  │
                       ▼                                  ▼
              ┌────────────────┐                ┌────────────────┐
              │    Cloudinary  │                │  USRP Radio    │
              │    (Storage)   │                │  (Fallback)    │
              └────────────────┘                └────────────────┘
```

---

## 📁 Project Structure

```
evac-system/
├── server/                 # Backend API Server (Express + MongoDB)
│   ├── controllers/        # Request handlers
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route definitions
│   ├── sockets/            # Socket.IO event handlers
│   ├── utils/              # Utilities (AI, Dijkstra, RTSP, USRP)
│   └── middleware/         # Auth, security, logging
│
├── admin/                  # Admin Dashboard (React + Vite)
│   ├── src/
│   │   ├── pages/          # Dashboard, Floors, Routes, Settings
│   │   ├── components/     # Reusable UI components
│   │   ├── store/          # Redux state management
│   │   └── services/       # API service layer
│   └── public/
│
├── screens/                # Floor Display Screens (React + Vite)
│   ├── src/
│   │   ├── pages/          # LandingPage (controller), ScreenPage
│   │   ├── components/     # Route display, floor map
│   │   └── store/          # Redux + USRP service
│   ├── usrp-bridge.js      # USRP/GNU Radio bridge service
│   └── rx_ofdm.py          # GNU Radio OFDM receiver
│
├── mock-services/          # Development Mock Server
│   ├── routes/             # Mock RTSP, Local AI, Cloud AI
│   └── test-images/        # Sample camera images
│
├── setup.sh                # Install all dependencies
├── start-server.sh         # Start backend server
├── start-admin.sh          # Start admin dashboard
├── start-screens.sh        # Start screen displays
├── start-mock.sh           # Start mock services
└── README.md               # This file
```

---

## 🔧 Modules

### 🖥️ Backend Server (`server/`)

The core backend handling all system logic.

| Component | Description |
|-----------|-------------|
| **REST API** | Floor management, routes, records, settings endpoints |
| **Socket.IO** | Real-time route broadcasting to floor screens |
| **Periodic Job** | RTSP Capture → AI Analysis → Dijkstra → Broadcast pipeline |
| **USRP Sender** | GNU Radio OFDM fallback transmission |
| **Cloud Sync** | Configurable MongoDB Atlas synchronization |
| **Settings API** | Dynamic cloud sync/processing configuration |

**Technologies:** Express 5.x, MongoDB 8.x, Mongoose, Socket.IO 4.x, Winston, Helmet

**Port:** `3000`

📖 [Server Documentation](./server/README.md) | [API Reference](./server/API_DOCUMENTATION.md)

---

### 📊 Admin Dashboard (`admin/`)

Web interface for system administrators.

| Feature | Description |
|---------|-------------|
| **Dashboard** | System overview, health monitoring, quick stats |
| **Floor Management** | Create, edit, delete floor maps with visual editor |
| **Graph Editor** | Visual node/edge editor for evacuation paths |
| **Camera Management** | Monitor and configure RTSP cameras |
| **Route Viewer** | View computed evacuation routes with hazard levels |
| **Settings** | Configure cloud sync, cloud processing, API connection |

**Technologies:** React 19, Redux Toolkit, TailwindCSS, Vite, Lucide Icons

**Port:** `3030`

📖 [Admin Documentation](./admin/README.md)

---

### 📺 Floor Screens (`screens/`)

Production displays showing evacuation routes to building occupants.

| Feature | Description |
|---------|-------------|
| **Route Display** | Visual evacuation path with directional guidance |
| **Real-time Updates** | Socket.IO connection for live route changes |
| **USRP Fallback** | Automatic switch to radio when network fails |
| **Multi-Screen Sync** | BroadcastChannel for same-device screens |
| **Hazard Indicators** | Visual warnings for fire/smoke/crowd levels |

**Technologies:** React 19, Redux Toolkit, Socket.IO Client, GNU Radio

**Port:** `3060` (screens) | `3062` (USRP bridge)

📖 [Screens Documentation](./screens/README.md)

---

### 🧪 Mock Services (`mock-services/`)

Development server simulating external hardware for testing.

| Service | Endpoint | Description |
|---------|----------|-------------|
| **RTSP Simulation** | `/api/rtsp/capture` | Returns test camera images |
| **Local AI** | `/api/local-ai/analyze` | Simulated edge AI (~1s latency) |
| **Cloud AI** | `/api/cloud-ai/analyze` | Simulated cloud AI (~3s latency) |

**Port:** `3090`

📖 [Mock Services Documentation](./mock-services/README.md)

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | ≥ 18.0.0 | Runtime environment |
| **MongoDB** | 6.x+ | Database |
| **FFmpeg** | Latest | RTSP camera capture |
| **GNU Radio** | 3.10+ | USRP radio transmission (optional) |

### Installation

```bash
# Clone the repository
git clone https://github.com/marcelinosaad/evac-system.git
cd evac-system

# Install all dependencies (all modules)
chmod +x setup.sh && ./setup.sh

# Or install manually per module:
cd server && npm install && cd ..
cd admin && npm install && cd ..
cd screens && npm install && cd ..
cd mock-services && npm install && cd ..
```

### Configuration

```bash
# Copy environment template
cp server/.env.example server/.env

# Edit configuration
nano server/.env
```

**Key Configuration:**
```env
# Server
PORT=3000
LOCAL_MONGO_URI=mongodb://127.0.0.1:27017/evac_local

# Admin Authentication
ADMIN_AUTH_TOKEN=your-secure-token

# AI Endpoints (use mock-services for development)
LOCAL_AI_ENDPOINT=http://localhost:3090/api/local-ai/analyze
CLOUD_AI_ENDPOINT=http://localhost:3090/api/cloud-ai/analyze

# RTSP Template
RTSP_TEMPLATE=http://localhost:3090/api/rtsp/capture?cameraId={cameraId}

# Cloudinary (optional for development)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Running the System

Open 4 terminal windows:

| Terminal | Command | Service | URL |
|----------|---------|---------|-----|
| 1 | `./start-server.sh` | Backend API | http://localhost:3000 |
| 2 | `./start-admin.sh` | Admin Dashboard | http://localhost:3030 |
| 3 | `./start-screens.sh` | Floor Screens | http://localhost:3060 |
| 4 | `./start-mock.sh` | Mock Services | http://localhost:3090 |

### Verify Installation

```bash
# Check backend health
curl http://localhost:3000/health

# Expected response:
{
  "success": true,
  "service": "evac-backend",
  "version": "1.0.0",
  "database": { "status": "connected" }
}
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [server/README.md](./server/README.md) | Backend server overview |
| [server/API_DOCUMENTATION.md](./server/API_DOCUMENTATION.md) | Complete REST API reference |
| [server/USRP_SYSTEM.md](./server/USRP_SYSTEM.md) | USRP radio fallback system |
| [server/FLOOR_UPLOAD_GUIDE.md](./server/FLOOR_UPLOAD_GUIDE.md) | Floor map creation guide |
| [admin/README.md](./admin/README.md) | Admin dashboard guide |
| [screens/README.md](./screens/README.md) | Screen display documentation |
| [screens/SCREEN_SYNC_GUIDE.md](./screens/SCREEN_SYNC_GUIDE.md) | Multi-screen synchronization |
| [mock-services/README.md](./mock-services/README.md) | Mock services for development |

---

## 🛠️ Technologies

| Layer | Technologies |
|-------|--------------|
| **Backend** | Node.js 18+, Express 5.x, MongoDB 8.x, Mongoose, Socket.IO 4.x |
| **Frontend** | React 19, Vite 6.x, Redux Toolkit, TailwindCSS 3.x |
| **Security** | Helmet, Rate Limiting, NoSQL Sanitization, CORS |
| **Media** | FFmpeg (RTSP capture), Cloudinary (cloud storage) |
| **Radio** | GNU Radio 3.10+, UHD, USRP B200/B210 (SDR) |
| **Logging** | Winston (file + console logging) |
| **AI** | Custom AI endpoints (people counting, fire/smoke detection) |

---

## 🔐 Security Features

- **Admin Authentication** - Token-based API protection (`x-admin-auth` header)
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **NoSQL Injection Prevention** - Query sanitization middleware
- **XSS Protection** - Helmet security headers
- **CORS** - Configurable cross-origin resource sharing
- **Input Validation** - Express-validator on all endpoints

---

## 📊 System Workflow

### 1. Floor Setup (Admin)
1. Create floor map in Admin Dashboard
2. Define nodes (rooms, corridors, exits)
3. Connect nodes with edges (paths)
4. Configure cameras on edges
5. Set hazard thresholds per edge

### 2. Real-time Operation
1. Periodic job captures frames from cameras
2. Frames sent to Local AI (fast) + Cloud AI (accurate)
3. AI results update edge weights
4. Dijkstra computes optimal routes from each node to exits
5. Routes broadcast via Socket.IO to floor screens
6. If network fails, USRP radio transmits routes

### 3. Screen Display
1. Screens connect to backend via Socket.IO
2. Receive route updates for their floor
3. Display visual evacuation path
4. Show hazard warnings and distance info
5. Auto-switch to USRP receiver if socket disconnects

---

## 👨‍💻 Author

**Marcelino Saad**  
Computer Engineering - Graduation Project

---

## 📄 License

This project is licensed under the **ISC License**.

---

<p align="center">
  <sub>Built for safer emergency evacuations 🏢🚨</sub>
</p>

<p align="center">
  <sub>© 2026 Emergency Evacuation System</sub>
</p>

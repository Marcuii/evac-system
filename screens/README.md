# 🚨 Emergency Evacuation Screens

A React-based multi-screen display system for the Emergency Evacuation System. Displays evacuation routes received via WebSocket from the backend server, with USRP radio fallback (using `rx_ofdm.py`) when server connection fails.

## Features

- **Multi-Screen Architecture**: Controller page manages connections, screen pages display routes
- **Dual Data Sources**: Automatically switches between Socket.IO and USRP based on connectivity  
- **Auto USRP Fallback**: After 5 failed reconnect attempts, automatically starts USRP radio receiver
- **Same-Device Sync**: BroadcastChannel API for instant screen sync on same device
- **Network Screen Relay**: Socket.IO relay for screens on network devices
- **Real-time Updates**: SSE stream from USRP Bridge for instant data updates
- **Redux State Management**: Centralized state with Redux Toolkit
- **Modern UI**: Built with TailwindCSS and Lucide icons

## Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        CONTROLLER (LandingPage)                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────────────┐   │
│  │ Config Form │  │  Floor Info  │  │     USRP Controls              │   │
│  │  - Server   │  │  - Map Data  │  │  - Start/Stop Loop             │   │
│  │  - Floor ID │  │  - Screens   │  │  - Bridge Status               │   │
│  │  - Token    │  │  - Cameras   │  │  - Test Offline                │   │
│  └─────────────┘  └──────────────┘  └────────────────────────────────┘   │
│                            │                                              │
│              ┌─────────────┴─────────────┐                               │
│              │       Redux Store         │                               │
│              │  config | connection |    │                               │
│              │  route | log              │                               │
│              └─────────────┬─────────────┘                               │
│                            │                                              │
│    ┌───────────────────────┼────────────────────────────────┐            │
│    │                       │                                │            │
│  Socket.IO            USRP Service              Internal Relay           │
│  (Backend)            (SSE + REST)              (to screens)             │
│    │                       │                        │                    │
└────│───────────────────────│────────────────────────│────────────────────┘
     │                       │                        │
     ▼                       ▼                        ▼
┌────────────┐      ┌─────────────────┐      ┌──────────────────┐
│  Backend   │      │  USRP Bridge    │      │  Screen Pages    │
│  Server    │      │  (port 3062)    │      │  (via relay)     │
│            │      │       │         │      │                  │
│ - Socket   │      │  ┌────▼─────┐   │      │ ┌─────────────┐  │
│ - REST     │      │  │rx_ofdm.py│   │      │ │ Screen N1   │  │
│            │      │  │(GNU Radio│   │      │ │ Screen N2   │  │
│            │      │  └────┬─────┘   │      │ │ Screen N3   │  │
│            │      │       │         │      │ └─────────────┘  │
│            │      │  ┌────▼─────┐   │      │                  │
│            │      │  │data_rx.json │      └──────────────────┘
│            │      │  └──────────┘   │
└────────────┘      └─────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
cd screens
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
```

### 3. Run Development Server

**Option A: Socket Mode Only (for testing with backend)**
```bash
npm run dev
```

**Option B: With USRP Bridge (for USRP mode)**
```bash
# Terminal 1: Start USRP Bridge
npm run bridge

# Terminal 2: Start React dev server  
npm run dev
```

**Option C: Both at once**
```bash
npm run dev:all
```

### 4. Open in Browser

- **Controller**: http://localhost:3060/
- **Screen**: http://localhost:3060/screen/{screenId}

## How It Works

### Controller Mode (LandingPage)

1. Enter backend server URL, Floor ID, and Admin Token
2. Click "Initialize" to fetch floor data and connect socket
3. Routes received via WebSocket are automatically relayed to:
   - Same-device screens via BroadcastChannel (instant)
   - Network screens via internal Socket.IO relay
4. If socket disconnects, heartbeat reconnection starts
5. After 5 failed attempts, USRP fallback is auto-started

### Screen Mode (ScreenPage)

1. Screen pages receive route updates from controller
2. Same device: Uses BroadcastChannel (fastest)
3. Network device: Connects to USRP Bridge relay socket
4. Displays floor map with highlighted evacuation route
5. Shows distance, hazard level, and step-by-step directions

### USRP Fallback Mode

When socket connection fails after MAX_RECONNECT_ATTEMPTS:

1. Controller automatically starts USRP loop receiver
2. Bridge starts `rx_ofdm.py` (GNU Radio OFDM receiver)
3. Bridge watches `data_rx.json` for updates
4. Data is streamed to controller via SSE
5. Controller relays routes to all screen pages

## USRP Bridge Service

The USRP Bridge is a Node.js service that provides:

- **USRP Control**: Spawns/stops `rx_ofdm.py` 
- **Data Streaming**: SSE for real-time USRP data
- **Screen Relay**: Socket.IO relay for network screens
- **Status Monitoring**: Health endpoints for bridge status

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | Bridge and rx_ofdm.py status |
| POST | `/start` | Start rx_ofdm.py (once) |
| POST | `/start-loop` | Start rx_ofdm.py in loop mode |
| POST | `/stop` | Stop rx_ofdm.py |
| GET | `/data` | Get latest USRP data |
| GET | `/events` | SSE stream for real-time updates |
| WS | `/` | Socket.IO relay for screens |

### Manual Control

```bash
# Check status
curl http://localhost:3062/status

# Start rx_ofdm.py loop
curl -X POST http://localhost:3062/start-loop

# Stop rx_ofdm.py
curl -X POST http://localhost:3062/stop

# Get latest data
curl http://localhost:3062/data
```

## Data Format

Route data format:

```json
{
  "routes": [
    {
      "startNode": "N1",
      "exitNode": "Exit-A",
      "path": ["N1", "N2", "N3", "Exit-A"],
      "distance": 15.5,
      "hazardLevel": "low"
    }
  ],
  "emergency": false,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "floorId": "floor_1",
  "floorData": { /* floor map data */ }
}
```

From USRP (`data_rx.json`), the data is padded:
```
================================================================
{"routes":[...],"timestamp":"..."}
================================================================
```

The parser automatically strips the padding lines.

## Configuration

### Environment Variables (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_DEFAULT_SERVER_URL` | `http://localhost:3000` | Backend server URL |
| `VITE_DEFAULT_SCREEN_ID` | `N1` | Default screen ID for testing |
| `VITE_USRP_BRIDGE_PORT` | `3062` | USRP Bridge port |
| `VITE_MAX_RECONNECT_ATTEMPTS` | `5` | Reconnect attempts before USRP fallback |
| `VITE_RECONNECT_DELAY` | `3000` | Delay between reconnect attempts (ms) |
| `VITE_SERVER_CHECK_INTERVAL` | `10000` | Server health check interval (ms) |
| `VITE_BRIDGE_CHECK_INTERVAL` | `15000` | Bridge status check interval (ms) |
| `VITE_MAX_LOG_ENTRIES` | `200` | Maximum log entries to keep |
| `VITE_BROADCAST_CHANNEL_NAME` | `ees-evacuation-channel` | BroadcastChannel name |

### Redux Store Slices

| Slice | Purpose |
|-------|---------|
| `config` | Server URL, Floor ID, Admin Token, Floor Data |
| `connection` | Connection status, USRP mode, Data source |
| `route` | Current route data, Emergency status |
| `log` | Debug log messages |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (port 3060) |
| `npm run bridge` | Start USRP Bridge (port 3062) |
| `npm run dev:all` | Start both Bridge and Vite |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Tech Stack

- **React 19** - UI library
- **Redux Toolkit** - State management
- **TailwindCSS** - Styling
- **Vite 7** - Build tool
- **Socket.IO Client** - WebSocket connection
- **Lucide React** - Icons

## File Structure

```
screens/
├── .env                    # Environment variables
├── .env.example            # Example env file
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── rx_ofdm.py              # GNU Radio USRP receiver script
├── usrp-bridge.js          # USRP Bridge service (spawns rx_ofdm.py + relay)
├── data_rx.json            # Output from rx_ofdm.py (created at runtime)
├── src/
│   ├── main.jsx            # Entry point (React 19 createRoot)
│   ├── App.jsx             # Main app with React Router
│   ├── index.css           # Global styles + TailwindCSS
│   ├── config/
│   │   └── index.js        # Centralized configuration module
│   ├── components/
│   │   ├── ui/             # Reusable UI components (Button, Card, etc.)
│   │   │   ├── index.jsx
│   │   │   └── StatusIndicators.jsx
│   │   └── FloorMapVisualization.jsx  # SVG floor map renderer
│   ├── pages/
│   │   ├── index.js        # Page exports
│   │   ├── LandingPage.jsx # Controller dashboard
│   │   └── ScreenPage.jsx  # Individual screen display
│   ├── services/
│   │   ├── broadcastService.js  # BroadcastChannel for same-device sync
│   │   ├── floorService.js      # Floor API calls
│   │   └── usrpService.js       # USRP Bridge + Socket relay client
│   ├── store/
│   │   ├── index.js        # Redux store configuration
│   │   └── slices/         # Redux slices
│   │       ├── configSlice.js
│   │       ├── connectionSlice.js
│   │       ├── routeSlice.js
│   │       └── logSlice.js
│   └── utils/
│       └── helpers.js      # Utility functions
├── public/
└── README.md
```

## Troubleshooting

### Socket Connection Issues

1. Ensure backend server is running on the specified URL
2. Check if the port is correct (default: 3000)
3. Verify CORS is enabled on the backend

### USRP Bridge Not Starting

1. Ensure `rx_ofdm.py` is in the screen-simulator directory
2. Check if Python3 and GNU Radio are installed
3. Verify USRP hardware is connected

### No Data Appearing

1. Check the Debug Panel for log messages
2. Verify the Screen ID matches a node in your floor map
3. Ensure `data_rx.json` is being generated by `rx_ofdm.py`

## License

MIT

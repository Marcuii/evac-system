# Screen Synchronization Guide

This guide explains how to set up multiple physical screens that display evacuation routes, synchronized from a single controller laptop - supporting both same-device and network screens.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONTROLLER LAPTOP (Per Floor)                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Landing Page (Controller)                        │   │
│  │                                                                     │   │
│  │  Socket.IO ◄──────── Backend Server                                │   │
│  │      │                    OR                                        │   │
│  │  USRP SSE  ◄──────── rx_ofdm.py (Radio Fallback)                   │   │
│  │      │                                                              │   │
│  │      └──────────────────┬───────────────────────────────┐          │   │
│  │                         │                               │          │   │
│  │              BroadcastChannel              Socket.IO Relay         │   │
│  │              (Same Device)                 (Network Devices)       │   │
│  │                    │                              │                │   │
│  └────────────────────│──────────────────────────────│────────────────┘   │
│                       │                              │                     │
│            ┌──────────┴──────────┐                   │                     │
│            ▼          ▼          ▼                   │                     │
│        ┌──────┐  ┌──────┐  ┌──────┐                 │                     │
│        │ N1   │  │ N2   │  │ N3   │  (Same-device)  │                     │
│        │Screen│  │Screen│  │Screen│                 │                     │
│        └──────┘  └──────┘  └──────┘                 │                     │
│            │          │          │                   │                     │
│            ▼          ▼          ▼                   │                     │
│       ┌─────────┐┌─────────┐┌─────────┐            │                     │
│       │Monitor 1││Monitor 2││Monitor 3│            │                     │
│       └─────────┘└─────────┘└─────────┘            │                     │
└────────────────────────────────────────────────────│─────────────────────┘
                                                     │
                                    Network (LAN/WiFi)
                                                     │
┌────────────────────────────────────────────────────│─────────────────────┐
│                    NETWORK SCREENS (Other Devices)  │                     │
│                                                     ▼                     │
│            ┌──────────────────────────────────────────────────┐          │
│            │              USRP Bridge Relay                   │          │
│            │              (port 3062 on controller)           │          │
│            └────────────────┬─────────────────────────────────┘          │
│                             │                                             │
│            ┌────────────────┼────────────────┐                           │
│            ▼                ▼                ▼                           │
│        ┌──────┐        ┌──────┐        ┌──────┐                         │
│        │ N4   │        │ N5   │        │ N6   │  (Network screens)      │
│        │Screen│        │Screen│        │Screen│                         │
│        └──────┘        └──────┘        └──────┘                         │
│            │                │                │                           │
│       Tablet 1         Laptop 2         Pi Display                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## How It Works

### Same-Device Screens (BroadcastChannel)
1. **Instant Sync**: Uses browser's BroadcastChannel API (no network hop)
2. **Same Origin**: Must be from same localhost origin
3. **Best For**: Multiple monitors connected to one laptop

### Network Screens (Socket Relay)
1. **Relay Connection**: Screens connect to USRP Bridge socket (port 3062)
2. **Controller Broadcasts**: Controller pushes routes via internal relay
3. **Best For**: Tablets, Raspberry Pi displays, other laptops on same network

## Setup Instructions

### Step 1: Start the USRP Bridge (Required for Network Screens)

```bash
cd screens
node usrp-bridge.js
```

The bridge serves two purposes:
- USRP radio data relay (when in fallback mode)
- Socket relay for network screens (always active)

### Step 2: Start the React Dev Server

```bash
npm run dev
# Opens on http://localhost:3060
```

### Step 3: Initialize the Controller

1. Open the landing page: `http://<your-ip>:3060`
2. Enter **Floor ID**, **Server URL**, and **Admin Token**
3. Click **Initialize** to connect

### Step 4: Open Screen Windows

**Option A: Same-Device Screens**
- Click individual screen cards OR "Open All" button
- Screens sync instantly via BroadcastChannel

**Option B: Network Screens**
- On other devices, open: `http://<controller-ip>:3060/screen/N1`
- Replace `N1` with the screen's node ID
- Screen auto-connects to relay socket

## Communication Flow

```
Backend Server ───────────────────────┐
                                      │
        │ Socket.IO (floor-routes)    │
        ▼                             │
┌───────────────────────┐             │
│   Controller          │◄────────────┘
│   (LandingPage)       │
│                       │
│   • Receives data     │
│   • Updates Redux     │
│   • Relays to screens │
└───────────┬───────────┘
            │
    ┌───────┴───────────────────┐
    │                           │
    │ BroadcastChannel      Socket.IO Relay
    │ (Same Device)         (Network)
    │                           │
┌───▼───┐              ┌────────▼────────┐
│Screen │              │  USRP Bridge    │
│  N1   │              │  (port 3062)    │
│(local)│              │        │        │
└───────┘              │   ┌────┴────┐   │
                       │   ▼         ▼   │
                       │ Screen   Screen │
                       │   N2       N3   │
                       │(network)(network)│
                       └─────────────────┘
```

## Technical Details

### BroadcastChannel API (Same-Device)

For screens running on the same laptop as the controller:

**Advantages:**
- Zero latency (no network)
- Same-origin security
- No server required

**Message Types:**
| Type | Sender | Purpose |
|------|--------|---------|
| `ROUTE_UPDATE` | Controller | New route data |
| `REQUEST_DATA` | Screen | Request current data |
| `connection_status` | Controller | Backend connection state |

### Socket Relay (Network Screens)

For screens on tablets, other laptops, Raspberry Pi:

**Flow:**
1. Screen connects to `http://<controller-ip>:3062`
2. Screen emits `screen:join` with screenId
3. Controller broadcasts via `controller:broadcast`
4. Screen receives on `route:update` event

**Advantages:**
- Works across devices on same network
- Auto-reconnect on disconnect
- Controller status notifications

### Service Imports

```javascript
// Controller (LandingPage)
import { 
  connectAsController,
  broadcastToScreens,
  broadcastConnectionStatus 
} from '../services/usrpService';

import { 
  initBroadcast, 
  broadcastRouteData,
  broadcastMessage 
} from '../services/broadcastService';

// Screen (ScreenPage)
import { 
  connectAsScreen,
  disconnectRelay 
} from '../services/usrpService';

import { 
  initBroadcast, 
  onRouteUpdate,
  onConnectionStatus 
} from '../services/broadcastService';
```

## Troubleshooting

### Same-Device Screens Not Updating

1. **Check LIVE indicator**: Each screen shows "LOCAL" badge when receiving broadcasts
2. **Same origin**: Ensure all windows are from same localhost URL
3. **Check console**: Look for `[Broadcast]` logs in browser DevTools

### Network Screens Not Connecting

1. **USRP Bridge running?**: Must run `node usrp-bridge.js` first
2. **Check firewall**: Port 3062 must be open on controller
3. **Correct IP?**: Use controller's network IP, not localhost
4. **Check console**: Look for `[Screen] Mode: NETWORK` message

### Popup Blocker

If "Open All Screens" doesn't work:
1. Browser may block popups
2. Click the popup-blocked icon in address bar
3. Allow popups from localhost/your-ip

### Controller Disconnected Banner

When screens show "Controller Disconnected":
1. Controller lost connection to backend
2. Screens will show last known route
3. Will auto-update when controller reconnects

## Data Sources Priority

| Source | Use Case | Description |
|--------|----------|-------------|
| Socket.IO | Primary | Real-time from backend server |
| USRP | Fallback | RF data when server offline |
| localStorage | Backup | Persisted on page refresh |

## Best Practices

1. **One Controller**: Only one LandingPage per floor should be "controller"
2. **USRP Bridge Always**: Run bridge even if not using USRP (needed for network relay)
3. **Fullscreen Mode**: Use F11 on screen devices for clean display
4. **Stable Network**: For network screens, use stable WiFi/LAN
5. **Browser Support**: Use Chrome or Firefox for best compatibility
6. **Controller Laptop**: Keep LandingPage open and visible for monitoring

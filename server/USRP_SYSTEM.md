# 📡 USRP Radio Fallback System

Technical documentation for the USRP (Universal Software Radio Peripheral) fallback transmission system.

---

## Overview

The USRP system provides emergency communication when network connectivity is unavailable. When Socket.IO clients are not connected to a floor, the system automatically transmits evacuation routes via radio frequency using GNU Radio and USRP hardware.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USRP Transmission Pipeline                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │ periodicJob  │───▶│ usrpSender   │───▶│     results.json         │  │
│  │ (Node.js)    │    │ (Node.js)    │    │ (Padded JSON data)       │  │
│  └──────────────┘    └──────────────┘    └────────────┬─────────────┘  │
│                                                       │                 │
│                                                       ▼                 │
│                                          ┌──────────────────────────┐  │
│                                          │     tx_ofdm.py         │  │
│                                          │   (GNU Radio Script)     │  │
│                                          └────────────┬─────────────┘  │
│                                                       │                 │
│                                                       ▼                 │
│                                          ┌──────────────────────────┐  │
│                                          │     USRP Hardware        │  │
│                                          │   (OFDM Transmission)    │  │
│                                          └────────────┬─────────────┘  │
│                                                       │                 │
│                                                       ▼                 │
│                                          ┌──────────────────────────┐  │
│                                          │    Radio Receivers       │  │
│                                          │   (Screen Displays)      │  │
│                                          └──────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Trigger Conditions

USRP transmission activates when:

```javascript
// In periodicJob.js
const activeFloorIds = getActiveFloorIds(); // Floors with Socket.IO connections
const floorHasActiveConnections = activeFloorIds.includes(floor.id);

// USRP triggers ONLY when no sockets are connected for that floor
const shouldUseUSRP = !floorHasActiveConnections;
```

### Scenarios

| Scenario | Socket.IO | USRP | Notes |
|----------|-----------|------|-------|
| Normal operation | ✅ Active | ❌ Inactive | Network healthy |
| Network failure | ❌ No clients | ✅ Active | All screens offline |
| Partial failure | ✅ Some clients | ✅ Active for offline floors | Mixed mode |

---

## Technical Specifications

### Radio Parameters (tx_ofdm.py)

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Center Frequency** | 2.4 GHz | ISM band |
| **Sample Rate** | 2,000,000 sps | 2 Msps |
| **TX Gain** | 140 | Transmission gain |
| **FFT Length** | 64 | OFDM FFT size |
| **Occupied Carriers** | 48 | Data subcarriers |
| **Header Modulation** | BPSK | Robust for synchronization |
| **Payload Modulation** | 16-QAM | Higher throughput |
| **USRP Serial** | 3180E01 | Target device |

### Modulation Scheme

```
OFDM Frame Structure:
┌────────────────────────────────────────────────────────────────┐
│  Preamble  │  Header (BPSK)  │      Payload (16-QAM)         │
│  (Sync)    │  (8 symbols)    │     (Variable length)          │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Format

### results.json Structure

```
================================================================================
{
  "routes": [
    {
      "startNode": "N1",
      "exitNode": "EXIT_A",
      "path": ["N1", "N2", "N3", "EXIT_A"],
      "hazardLevel": "safe"
    }
  ],
  "floorId": "floor_1",
  "floorName": "Ground Floor",
  "emergency": false,
  "overallHazardLevel": "safe",
  "timestamp": "2026-01-22T12:00:00.000Z",
  "totalRoutes": 3
}
================================================================================
[... 33000 padding characters ...]
```

### Padding Purpose

| Padding | Length | Purpose |
|---------|--------|---------|
| **Leading** | 80 chars | Prevents data loss during TX ramp-up |
| **Trailing** | 33000 chars | Buffer for transmission end, receiver sync |

The padding uses `=` characters which are easy to detect and strip on the receiver side.

---

## Node.js Components

### usrpSender.js

```javascript
// Main functions
export async function sendViaUSRP(routeData) {
  // 1. Create padded JSON file
  const paddedContent = createPaddedContent(routeData);
  await fs.writeFile(RESULTS_FILE, paddedContent);
  
  // 2. Spawn Python USRP script
  const pythonProcess = spawn('python3', ['tx_ofdm.py'], {
    env: {
      ...process.env,
      UHD_IMAGES_DIR: process.env.USRP_UHD_IMAGES_DIR,
      LD_PRELOAD: process.env.USRP_LD_PRELOAD
    }
  });
  
  // 3. Wait for completion with timeout
  return await waitForProcess(pythonProcess, TIMEOUT_MS);
}

function createPaddedContent(data) {
  const json = JSON.stringify(data);
  const leadingPad = '='.repeat(PADDING_LENGTH);
  const trailingPad = '='.repeat(PADDING_LENGTH_EXTRA);
  return `${leadingPad}\n${json}\n${trailingPad}`;
}
```

### periodicJob.js Integration

```javascript
// After computing routes for a floor
const activeFloorIds = getActiveFloorIds();

if (!activeFloorIds.includes(floor.id)) {
  // No Socket.IO clients - use USRP
  logger.info(`📡 Transmitting via USRP for floor ${floor.id}`);
  await sendViaUSRP({
    routes: computedRoutes,
    floorId: floor.id,
    floorName: floor.name,
    emergency: hasEmergency,
    overallHazardLevel: hazardLevel,
    timestamp: new Date().toISOString(),
    totalRoutes: computedRoutes.length
  });
} else {
  // Socket.IO clients connected - use WebSocket
  io.to(`floor_${floor.id}`).emit(`route_update_${floor.id}`, routePayload);
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USRP_TX_DATA_FILE` | `./utils/results.json` | Output file path |
| `USRP_PADDING_LENGTH` | `80` | Leading padding characters |
| `USRP_PADDING_LENGTH_EXTRA` | `33000` | Trailing padding characters |
| `USRP_TRANSMISSION_TIMEOUT_MS` | `30000` | Script timeout (30s) |
| `USRP_UHD_IMAGES_DIR` | `/usr/share/uhd/images` | UHD firmware path |
| `USRP_LD_PRELOAD` | `/usr/lib/x86_64-linux-gnu/libpthread.so.0` | Library preload |

---

## Hardware Requirements

### Transmitter (Server Side)

- **USRP Device**: B200, B210, N210, or similar
- **Connection**: USB 3.0 (B-series) or Gigabit Ethernet (N-series)
- **Software**:
  - GNU Radio 3.8+
  - UHD drivers
  - Python 3.8+

### Receiver (Screen Side)

- **USRP Device**: Any compatible receiver (can be simpler model)
- **Antenna**: Appropriate for 2.4 GHz
- **Software**: GNU Radio receiver flowgraph (not included)

---

## Installation

### 1. Install GNU Radio & UHD

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install gnuradio uhd-host python3-numpy

# Download UHD firmware
sudo uhd_images_downloader
```

### 2. Verify USRP Connection

```bash
uhd_find_devices
uhd_usrp_probe
```

### 3. Test Transmission

```bash
cd /path/to/backend-server/utils

# Create test data
echo '{"test": "data"}' > results.json

# Run transmission
python3 tx_ofdm.py
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `No devices found` | USRP not connected | Check USB/Ethernet connection |
| `UHD firmware missing` | Images not downloaded | Run `uhd_images_downloader` |
| `Permission denied` | USB permissions | Add user to `usrp` group or use sudo |
| `Timeout exceeded` | Script hung | Check USRP_TRANSMISSION_TIMEOUT_MS |
| `LD_PRELOAD error` | Library path wrong | Update USRP_LD_PRELOAD path |

### Logs

USRP transmission events are logged:

```
2026-01-22T12:00:00.000Z [info] 📡 Transmitting via USRP for floor floor_1
2026-01-22T12:00:02.500Z [info] ✓ USRP transmission complete (2.5s)
```

Or on failure:

```
2026-01-22T12:00:30.000Z [error] ✗ USRP transmission failed: Timeout exceeded
```

---

## Receiver Implementation

> ⚠️ **Note:** Receiver implementation is not included in this repository.

### Requirements for Receiver

1. **Frequency**: Tune to 2.4 GHz
2. **Demodulation**: OFDM with BPSK header, 16-QAM payload
3. **Data extraction**: Strip `=` padding, parse JSON
4. **Display**: Show evacuation route from parsed data

### Example Receiver Logic (Pseudocode)

```python
# GNU Radio receiver flowgraph output
received_data = demodulate_ofdm(rf_signal)

# Extract JSON from padded data
lines = received_data.split('\n')
json_lines = [l for l in lines if not l.startswith('=') and l.strip()]
json_data = ''.join(json_lines)

# Parse and display
route_info = json.loads(json_data)
display_evacuation_route(route_info['routes'])
```

---

## Safety & Compliance

### Regulatory Considerations

- 2.4 GHz is an **ISM band** (license-free in most countries)
- Ensure compliance with local regulations for:
  - Maximum transmit power
  - Duty cycle limits
  - Interference requirements

### Emergency Use

This system is designed for **emergency situations** where normal network communication has failed. It should:

- Only activate when network is unavailable
- Transmit only essential evacuation data
- Be tested regularly to ensure functionality

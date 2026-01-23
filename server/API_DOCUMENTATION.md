# 📖 API Documentation

Complete API reference for the EES Backend Server.

---

## Table of Contents

- [Authentication](#authentication)
- [Health Endpoints](#health-endpoints)
- [Settings Endpoints](#settings-endpoints)
- [Floor Management](#floor-management)
- [Route Endpoints](#route-endpoints)
- [Record Endpoints](#record-endpoints)
- [Error Responses](#error-responses)

---

## Authentication

All admin endpoints require the `x-admin-auth` header.

### Header Format
```
x-admin-auth: your-admin-token
```

### Configuration
Set your token in `.env`:
```env
ADMIN_AUTH_TOKEN=your-secure-admin-token
```

### Unauthorized Response (403)
```json
{
  "status": 403,
  "data": {
    "data": null,
    "message": "Admin access required"
  }
}
```

---

## Health Endpoints

### GET /

Basic health check for load balancers.

**Auth Required:** No

**Response:**
```json
{
  "ok": true,
  "service": "evac-backend",
  "version": "1.0.0"
}
```

---

### GET /health

Detailed health check with system metrics.

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-01-22T12:00:00.000Z",
  "service": "evac-backend",
  "version": "1.0.0",
  "uptime": 12345.67,
  "environment": "development",
  "memory": {
    "used": 85,
    "total": 120,
    "unit": "MB"
  },
  "database": {
    "status": "connected",
    "name": "evac_local"
  }
}
```

---

### GET /ready

Kubernetes readiness probe.

**Auth Required:** No

**Success Response (200):**
```json
{
  "ready": true
}
```

**Failure Response (503):**
```json
{
  "ready": false,
  "reason": "Database disconnected"
}
```

---

## Settings Endpoints

System settings for cloud sync and cloud processing configuration.

### GET /api/settings

Retrieve current system settings.

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "data": {
    "cloudSync": {
      "enabled": true,
      "intervalHours": 12,
      "lastSyncAt": "2026-01-24T10:00:00.000Z",
      "lastSyncStatus": "success"
    },
    "cloudProcessing": {
      "enabled": true,
      "disabledReason": null,
      "disabledAt": null
    }
  }
}
```

---

### PUT /api/settings

Update system settings.

**Auth Required:** Yes

**Request Body:**
```json
{
  "cloudSync": {
    "enabled": true,
    "intervalHours": 6
  },
  "cloudProcessing": {
    "enabled": false,
    "disabledReason": "No internet connection"
  }
}
```

**Validation Rules:**
- `cloudSync.intervalHours`: Must be between 1 and 168 (1 week)
- All fields are optional - only provided fields will be updated

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "cloudSync": {
      "enabled": true,
      "intervalHours": 6,
      "lastSyncAt": "2026-01-24T10:00:00.000Z",
      "lastSyncStatus": "success"
    },
    "cloudProcessing": {
      "enabled": false,
      "disabledReason": "No internet connection",
      "disabledAt": "2026-01-24T12:00:00.000Z"
    }
  }
}
```

**Notes:**
- When `cloudSync.intervalHours` is changed, the sync scheduler automatically reschedules
- When `cloudProcessing.enabled` is set to `false`, the periodic job skips cloud upload and cloud AI (local AI continues)

---

### POST /api/settings/sync

Manually trigger a cloud sync operation.

**Auth Required:** Yes

**Response (Success):**
```json
{
  "success": true,
  "message": "Cloud sync triggered successfully",
  "data": {
    "syncedAt": "2026-01-24T12:30:00.000Z"
  }
}
```

**Response (Sync Disabled):**
```json
{
  "success": false,
  "message": "Cloud sync is disabled"
}
```

**Response (No Cloud URI):**
```json
{
  "success": false,
  "message": "Cloud MongoDB URI not configured"
}
```

---

## Floor Management

### GET /api/floors

Retrieve all floor maps.

**Auth Required:** Yes

**Response:**
```json
{
  "status": 200,
  "data": {
    "data": [
      {
        "id": "floor_1",
        "name": "Ground Floor",
        "status": "active",
        "mapImage": {
          "url": "https://res.cloudinary.com/...",
          "localUrl": "/images/floor_maps/floor_1.jpg",
          "widthMeters": 50,
          "heightMeters": 30
        },
        "nodes": [...],
        "edges": [...],
        "cameras": [...],
        "screens": [...],
        "exitPoints": ["EXIT_A", "EXIT_B"]
      }
    ],
    "count": 1,
    "message": "Floors retrieved successfully"
  }
}
```

---

### GET /api/floors/:id

Retrieve a single floor by ID.

**Auth Required:** Yes

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Floor ID |

**Response:**
```json
{
  "status": 200,
  "data": {
    "data": {
      "id": "floor_1",
      "name": "Ground Floor",
      ...
    },
    "message": "Floor retrieved successfully"
  }
}
```

**Error (404):**
```json
{
  "status": 404,
  "data": {
    "data": null,
    "message": "Floor not found"
  }
}
```

---

### POST /api/floors

Create a new floor map.

**Auth Required:** Yes

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique floor identifier |
| `name` | string | Yes | Display name |
| `mapImage` | file | No | Floor plan image (jpeg, png, gif, webp) |
| `nodes` | JSON string | Yes | Array of graph nodes |
| `edges` | JSON string | Yes | Array of graph edges |
| `cameras` | JSON string | No | Array of camera configurations |
| `screens` | JSON string | No | Array of screen configurations |
| `exitPoints` | JSON string | Yes | Array of exit node IDs |
| `widthMeters` | number | No | Real-world width in meters |
| `heightMeters` | number | No | Real-world height in meters |

**Node Structure:**
```json
{
  "id": "N1",
  "x": 100,
  "y": 200,
  "label": "Main Entrance",
  "type": "entrance"
}
```
Node types: `room`, `hall`, `door`, `entrance`, `exit`, `junction`

**Edge Structure:**
```json
{
  "id": "E1",
  "from": "N1",
  "to": "N2",
  "staticWeight": 1.0,
  "peopleThreshold": 10,
  "fireThreshold": 0.7,
  "smokeThreshold": 0.6
}
```

**Camera Structure:**
```json
{
  "id": "CAM_01",
  "edgeId": "E1",
  "rtspUrl": "rtsp://192.168.1.100:554/stream",
  "status": "active"
}
```

**Screen Structure:**
```json
{
  "id": "SCREEN_01",
  "nodeId": "N1",
  "name": "Lobby Display",
  "status": "active"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/floors \
  -H "x-admin-auth: your-token" \
  -F "id=floor_1" \
  -F "name=Ground Floor" \
  -F "mapImage=@./floorplan.png" \
  -F 'nodes=[{"id":"N1","x":100,"y":200,"label":"Entrance","type":"entrance"},{"id":"N2","x":200,"y":200,"label":"Exit","type":"exit"}]' \
  -F 'edges=[{"id":"E1","from":"N1","to":"N2","staticWeight":1}]' \
  -F 'exitPoints=["N2"]' \
  -F "widthMeters=50" \
  -F "heightMeters=30"
```

**Success Response (201):**
```json
{
  "status": 201,
  "data": {
    "data": { ... },
    "message": "Floor created successfully"
  }
}
```

---

### PATCH /api/floors/:id

Update an existing floor.

**Auth Required:** Yes

**Content-Type:** `multipart/form-data`

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Floor ID |

**Form Fields:** Same as POST (all optional)

**Response:**
```json
{
  "status": 200,
  "data": {
    "data": { ... },
    "message": "Floor updated successfully"
  }
}
```

---

### DELETE /api/floors/:id

Delete a floor and all associated data.

**Auth Required:** Yes

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Floor ID |

**Response:**
```json
{
  "status": 200,
  "data": {
    "data": null,
    "message": "Floor deleted successfully"
  }
}
```

---

### GET /api/floors/system/status

Get system-wide status overview.

**Auth Required:** Yes

**Response:**
```json
{
  "status": 200,
  "data": {
    "data": {
      "totalFloors": 3,
      "activeFloors": 2,
      "disabledFloors": 1,
      "totalCameras": 15,
      "activeCameras": 12,
      "errorCameras": 2,
      "disabledCameras": 1,
      "totalScreens": 10,
      "activeScreens": 8
    },
    "message": "System status retrieved"
  }
}
```

---

### PUT /api/floors/:id/status

Update floor status.

**Auth Required:** Yes

**Body:**
```json
{
  "status": "disabled",
  "reason": "Maintenance scheduled"
}
```

**Valid Status Values:** `active`, `disabled`, `maintenance`

---

### PUT /api/floors/:id/cameras/:camId/status

Update camera status.

**Auth Required:** Yes

**Body:**
```json
{
  "status": "disabled",
  "reason": "Camera offline for repair"
}
```

**Valid Status Values:** `active`, `disabled`, `maintenance`, `error`

---

### PUT /api/floors/:id/screens/:screenId/status

Update screen status.

**Auth Required:** Yes

**Body:**
```json
{
  "status": "maintenance",
  "reason": "Display replacement"
}
```

**Valid Status Values:** `active`, `disabled`, `maintenance`

---

### POST /api/floors/:id/cameras/reset

Reset all cameras on a specific floor.

**Auth Required:** Yes

Resets failure counts and sets camera status to `active`.

**Response:**
```json
{
  "status": 200,
  "data": {
    "data": { "resetCount": 5 },
    "message": "5 cameras reset successfully"
  }
}
```

---

### POST /api/floors/system/cameras/reset

Reset ALL cameras across all floors.

**Auth Required:** Yes

---

### POST /api/floors/system/bulk-update

Bulk update multiple items.

**Auth Required:** Yes

**Body:**
```json
{
  "updates": [
    { "floorId": "floor_1", "status": "active" },
    { "floorId": "floor_2", "cameraId": "CAM_01", "status": "disabled" }
  ]
}
```

---

## Route Endpoints

### GET /api/routes

Get route history for a floor.

**Auth Required:** No

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `floorId` | string | Yes | Floor ID |

**Response:**
```json
{
  "status": 200,
  "data": {
    "data": [
      {
        "floorId": "floor_1",
        "computedAt": "2026-01-22T12:00:00.000Z",
        "routes": [
          {
            "startNode": "N1",
            "exitNode": "EXIT_A",
            "path": ["N1", "N2", "N3", "EXIT_A"],
            "edges": ["E1", "E2", "E3"],
            "distance": 45.5,
            "distanceMeters": 12.3,
            "hazardLevel": "safe",
            "exceedsThresholds": false,
            "hazardDetails": [
              {
                "edgeId": "E1",
                "people": 3,
                "fire": 0.0,
                "smoke": 0.1,
                "thresholdRatio": 0.3,
                "distanceMeters": 4.5
              }
            ]
          }
        ],
        "emergency": false,
        "overallHazardLevel": "safe"
      }
    ],
    "message": "Routes retrieved successfully"
  }
}
```

---

### GET /api/routes/latest

Get the most recent computed route for a floor.

**Auth Required:** No

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `floorId` | string | Yes | Floor ID |

---

## Record Endpoints

### GET /api/records

Query image capture records.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `floorId` | string | No | Filter by floor |
| `cameraId` | string | No | Filter by camera |
| `startDate` | ISO date | No | Start of date range |
| `endDate` | ISO date | No | End of date range |
| `limit` | number | No | Max results (default: 100) |

**Response:**
```json
{
  "status": 200,
  "data": {
    "data": [
      {
        "cameraId": "CAM_01",
        "edgeId": "E1",
        "floorId": "floor_1",
        "localPath": "/images/2026/01/22/CAM_01_120000.jpg",
        "cloudUrl": "https://res.cloudinary.com/...",
        "timestamp": "2026-01-22T12:00:00.000Z",
        "processed": true,
        "aiResult": {
          "peopleCount": 5,
          "fireProb": 0.0,
          "smokeProb": 0.1
        }
      }
    ],
    "message": "Records retrieved successfully"
  }
}
```

---

### GET /api/records/latest

Get the most recent record for a floor.

**Auth Required:** Yes

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `floorId` | string | Yes | Floor ID |

---

## Error Responses

### Standard Error Format

```json
{
  "status": 400,
  "data": {
    "data": null,
    "message": "Error description",
    "errors": ["Validation error 1", "Validation error 2"]
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 403 | Forbidden - Authentication required |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP
- **Headers included:**
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

**Rate Limit Exceeded Response (429):**
```json
{
  "status": 429,
  "data": {
    "data": null,
    "message": "Too many requests, please try again later"
  }
}
```

---

## Postman Collection

### Import Steps

1. Open Postman
2. Click **Import**
3. Create a new collection with the endpoints above
4. Set collection variable `baseUrl` = `http://localhost:3000`
5. Set collection variable `adminToken` = your admin token
6. Use `{{baseUrl}}` and `{{adminToken}}` in requests

### Pre-request Script (for collection)

```javascript
pm.request.headers.add({
    key: "x-admin-auth",
    value: pm.collectionVariables.get("adminToken")
});
```

# Floor Map Upload Guide - Postman

## Endpoint
```
POST http://localhost:3000/api/floors
```

## Request Type
**multipart/form-data** (for file upload)

## Headers
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```
(Note: Check your admin authentication implementation for the correct token format)

---

## Form-Data Fields

### 1. **mapImage** (File)
- **Type:** File
- **Required:** Optional
- **Accepted formats:** jpeg, jpg, png, gif, webp
- **Max size:** 10MB
- **Description:** The floor plan/map image to upload

### 2. **id** (Text)
- **Type:** String
- **Required:** Yes
- **Example:** `FLOOR_001`
- **Description:** Unique identifier for the floor

### 3. **name** (Text)
- **Type:** String
- **Required:** Yes
- **Example:** `Ground Floor - Main Building`
- **Description:** Human-readable floor name

### 4. **nodes** (Text - JSON String)
- **Type:** JSON String
- **Required:** Yes
- **Example:**
```json
[
  { "id": "N1", "x": 50, "y": 100, "label": "Main Entrance", "type": "entrance" },
  { "id": "N2", "x": 150, "y": 100, "label": "Lobby", "type": "junction" },
  { "id": "N3", "x": 250, "y": 100, "label": "Exit A", "type": "exit" }
]
```

### 5. **edges** (Text - JSON String)
- **Type:** JSON String
- **Required:** Yes
- **Example:**
```json
[
  {
    "id": "E1",
    "from": "N1",
    "to": "N2",
    "staticWeight": 1,
    "peopleThreshold": 10,
    "fireThreshold": 0.7,
    "smokeThreshold": 0.6
  },
  {
    "id": "E2",
    "from": "N2",
    "to": "N3",
    "staticWeight": 1.2,
    "peopleThreshold": 8,
    "fireThreshold": 0.7,
    "smokeThreshold": 0.6
  }
]
```

### 6. **cameraToEdge** (Text - JSON String)
- **Type:** JSON String
- **Required:** Optional
- **Example:**
```json
{
  "CAM001": "E1",
  "CAM002": "E2"
}
```

### 7. **startPoints** (Text - JSON String)
- **Type:** JSON String
- **Required:** Optional
- **Example:**
```json
["N1", "N2"]
```

### 8. **exitPoints** (Text - JSON String)
- **Type:** JSON String
- **Required:** Yes
- **Example:**
```json
["N3"]
```

### 9. **widthMeters** (Text)
- **Type:** Number
- **Required:** Optional (but recommended for accurate distance calculation)
- **Example:** `50.5`
- **Description:** Real-world width of the floor in meters

### 10. **heightMeters** (Text)
- **Type:** Number
- **Required:** Optional (but recommended for accurate distance calculation)
- **Example:** `30.2`
- **Description:** Real-world height of the floor in meters

> **Note:** Providing `widthMeters` and `heightMeters` enables accurate real-world distance calculations and evacuation time estimates. The system will convert pixel coordinates to meters using these dimensions.

---

## Postman Setup Steps

### Step 1: Create New Request
1. Click **New** → **HTTP Request**
2. Set method to **POST**
3. Enter URL: `http://localhost:3000/api/floors`

### Step 2: Set Headers
Go to **Headers** tab and add:
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

### Step 3: Configure Body
1. Go to **Body** tab
2. Select **form-data**
3. Add the following fields:

| Key | Type | Value |
|-----|------|-------|
| `mapImage` | File | [Select your floor plan image] |
| `id` | Text | `FLOOR_001` |
| `name` | Text | `Ground Floor - Main Building` |
| `nodes` | Text | `[{"id":"N1","x":50,"y":100,"label":"Main Entrance","type":"entrance"},{"id":"N2","x":150,"y":100,"label":"Lobby","type":"junction"},{"id":"N3","x":250,"y":100,"label":"Exit A","type":"exit"}]` |
| `edges` | Text | `[{"id":"E1","from":"N1","to":"N2","staticWeight":1,"peopleThreshold":10,"fireThreshold":0.7,"smokeThreshold":0.6},{"id":"E2","from":"N2","to":"N3","staticWeight":1.2,"peopleThreshold":8,"fireThreshold":0.7,"smokeThreshold":0.6}]` |
| `cameraToEdge` | Text | `{"CAM001":"E1","CAM002":"E2"}` |
| `startPoints` | Text | `["N1"]` |
| `exitPoints` | Text | `["N3"]` |
| `widthMeters` | Text | `50.5` |
| `heightMeters` | Text | `30.2` |

### Step 4: Send Request
Click **Send**

---

## Expected Response

### Success (201 Created)
```json
{
  "status": 201,
  "data": {
    "floor": {
      "_id": "674523a1b5e9c7d8a1234567",
      "id": "FLOOR_001",
      "name": "Ground Floor - Main Building",
      "mapImage": {
        "url": "https://res.cloudinary.com/your-cloud/image/upload/v1732627362/floor_maps/FLOOR_001.jpg",
        "cloudinaryId": "floor_maps/FLOOR_001",
        "widthPixels": 1920,
        "heightPixels": 1080,
        "widthMeters": 50.5,
        "heightMeters": 30.2
      },
      "nodes": [...],
      "edges": [...],
      "cameraToEdge": {...},
      "startPoints": ["N1"],
      "exitPoints": ["N3"],
      "createdAt": "2025-11-26T10:30:00.000Z",
      "updatedAt": "2025-11-26T10:30:00.000Z",
      "__v": 0
    },
    "message": "Floor created successfully"
  }
}
```

### Error: Missing Fields (400 Bad Request)
```json
{
  "status": 400,
  "data": {
    "data": null,
    "message": "Missing required fields: id, name, edges, nodes"
  }
}
```

### Error: Duplicate Floor ID (409 Conflict)
```json
{
  "status": 409,
  "data": {
    "data": null,
    "message": "Floor with ID 'FLOOR_001' already exists"
  }
}
```

### Error: Invalid Image Format (400 Bad Request)
```json
{
  "status": 400,
  "data": {
    "data": null,
    "message": "Only image files are allowed (jpeg, jpg, png, gif, webp)"
  }
}
```

---

## Testing Without Image Upload

If you want to test without uploading an image, simply:
1. Remove the `mapImage` field from form-data
2. Keep all other fields the same
3. The floor will be created without map image metadata

---

## Response Details

### mapImage Object
When an image is uploaded successfully, you'll receive:

```json
"mapImage": {
  "url": "https://res.cloudinary.com/.../FLOOR_001.jpg",
  "cloudinaryId": "floor_maps/FLOOR_001",
  "widthPixels": 1920,
  "heightPixels": 1080,
  "widthMeters": 50.5,
  "heightMeters": 30.2
}
```

- **url**: Direct Cloudinary URL to access the image
- **cloudinaryId**: Cloudinary public ID for management
- **widthPixels**: Image width in pixels (auto-detected)
- **heightPixels**: Image height in pixels (auto-detected)
- **widthMeters**: Real-world floor width in meters (user-provided)
- **heightMeters**: Real-world floor height in meters (user-provided)

#### Scale Calculation
When real-world dimensions are provided, the system calculates:
- **Pixels per meter**: `widthPixels / widthMeters` (X-axis), `heightPixels / heightMeters` (Y-axis)
- **Meters per pixel**: `widthMeters / widthPixels` (X-axis), `heightMeters / heightPixels` (Y-axis)

This enables accurate distance calculations between nodes in meters.

---

## cURL Example

```bash
curl -X POST http://localhost:3000/api/floors \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "mapImage=@/path/to/floor-plan.jpg" \
  -F "id=FLOOR_001" \
  -F "name=Ground Floor - Main Building" \
  -F 'nodes=[{"id":"N1","x":50,"y":100,"label":"Main Entrance","type":"entrance"},{"id":"N2","x":150,"y":100,"label":"Lobby","type":"junction"},{"id":"N3","x":250,"y":100,"label":"Exit A","type":"exit"}]' \
  -F 'edges=[{"id":"E1","from":"N1","to":"N2","staticWeight":1,"peopleThreshold":10,"fireThreshold":0.7,"smokeThreshold":0.6},{"id":"E2","from":"N2","to":"N3","staticWeight":1.2,"peopleThreshold":8,"fireThreshold":0.7,"smokeThreshold":0.6}]' \
  -F 'cameraToEdge={"CAM001":"E1","CAM002":"E2"}' \
  -F 'startPoints=["N1"]' \
  -F 'exitPoints=["N3"]' \
  -F 'widthMeters=50.5' \
  -F 'heightMeters=30.2'
```

---

## File Upload Specifications

### Storage Flow
1. **Upload** → Temporary storage: `./temp_uploads/floor_maps/`
2. **Process** → Extract dimensions & upload to Cloudinary
3. **Cleanup** → Remove temporary file
4. **Save** → Store metadata in MongoDB

### Cloudinary Folder Structure
```
floor_maps/
  └── FLOOR_001.jpg
  └── FLOOR_002.png
  └── FLOOR_003.jpg
```

### Image Dimension Detection
The system automatically detects image dimensions using:
1. **Primary method**: ImageMagick `identify` command (if available)
2. **Fallback method**: File buffer parsing (PNG, JPEG, GIF)
3. **Last resort**: Cloudinary metadata (width/height from upload response)

---

## Troubleshooting

### Issue: "Only image files are allowed"
**Solution**: Ensure your file has a valid image extension (.jpg, .jpeg, .png, .gif, .webp)

### Issue: "File too large"
**Solution**: Max file size is 10MB. Compress your image or reduce resolution

### Issue: Image dimensions not detected
**Solution**: 
- Install ImageMagick: `sudo apt install imagemagick` (Linux) or `brew install imagemagick` (Mac)
- System will fallback to buffer parsing or Cloudinary metadata

### Issue: "Floor with ID already exists"
**Solution**: Use a unique floor ID or delete the existing floor first

---

## Notes

- **Authentication Required**: All floor creation requests require admin authentication
- **Automatic Cleanup**: Temporary files are automatically deleted after processing
- **Unique IDs**: Floor IDs must be unique across the system
- **JSON Formatting**: Make sure JSON strings are properly formatted (no trailing commas)
- **Image Optimization**: Consider optimizing images before upload for better performance

---

**Your floor map upload system is now ready! 🎉**

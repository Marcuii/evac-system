# EES Admin Dashboard

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2.0-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Redux_Toolkit-2.11.2-764ABC?style=flat-square&logo=redux" alt="Redux Toolkit">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4.17-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Vite-6.3.5-646CFF?style=flat-square&logo=vite" alt="Vite">
</p>

A modern React-based admin dashboard for the Emergency Evacuation System (EES). Built with React, Redux Toolkit, Tailwind CSS, and Vite.

## Features

- **Dashboard**: Real-time system overview with statistics and health monitoring
- **Floor Management**: CRUD operations for floor maps with nodes, edges, and cameras
- **Route Management**: View and compute evacuation routes with hazard detection
- **Camera Management**: Monitor camera status across all floors
- **Records Management**: View AI detection records with filtering and pagination
- **Settings**: Configure API connection and system preferences

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI Framework |
| Redux Toolkit | 2.11.2 | State Management |
| React Router | 7.12.0 | Client-side Routing |
| Tailwind CSS | 3.4.17 | Styling |
| Vite | 6.3.5 | Build Tool |
| Lucide React | 0.512.0 | Icons |

## Project Structure

```
admin/
├── public/                    # Static assets
│   └── favicon.svg           # App icon
├── src/
│   ├── components/           # Reusable components
│   │   ├── layout/          # Layout components (Sidebar, Header)
│   │   └── ui/              # UI primitives (Button, Input, Card, etc.)
│   ├── config/              # Configuration constants
│   ├── hooks/               # Custom React hooks
│   │   └── useImageWithFallback.js
│   ├── pages/               # Page components
│   │   ├── Dashboard.jsx    # Main dashboard
│   │   ├── FloorsPage.jsx   # Floor listing
│   │   ├── FloorFormPage.jsx # Create/edit floor
│   │   ├── FloorDetailPage.jsx # Floor details view
│   │   ├── RoutesPage.jsx   # Route management
│   │   ├── CamerasPage.jsx  # Camera monitoring
│   │   ├── RecordsPage.jsx  # Detection records
│   │   └── SettingsPage.jsx # App settings
│   ├── services/            # API service layer
│   │   ├── api.js          # Base API client
│   │   ├── floorService.js  # Floor API operations
│   │   ├── routeService.js  # Route API operations
│   │   └── recordService.js # Record API operations
│   ├── store/               # Redux store
│   │   ├── index.js        # Store configuration
│   │   └── slices/         # Redux slices
│   │       ├── authSlice.js
│   │       ├── floorsSlice.js
│   │       ├── routesSlice.js
│   │       ├── recordsSlice.js
│   │       └── uiSlice.js
│   ├── utils/               # Utility functions
│   │   └── helpers.js       # Common helpers & image utilities
│   ├── App.jsx              # Root component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── .env                     # Environment variables (not committed)
├── .env.example             # Environment template
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── eslint.config.js
```

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- EES Backend Server running on port 3000

### Installation

```bash
# Navigate to admin directory
cd admin

# Install dependencies
npm install

# Start development server
npm run dev
```

Or use the start script from the project root:

```bash
./start-admin.sh
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3030 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Configuration

### Environment Variables

Create a `.env` file in the admin directory (see `.env.example`):

```env
# Server Configuration
VITE_PORT=3030

# API Configuration
VITE_API_URL=http://localhost:3000
VITE_API_TIMEOUT=30000

# Application Settings
VITE_APP_NAME=EES Admin Dashboard
VITE_APP_VERSION=1.0.0
VITE_REFRESH_INTERVAL=30000
VITE_TOAST_DURATION=4000

# Related Services URLs
VITE_SCREENS_URL=http://localhost:3060
VITE_MOCK_SERVICES_URL=http://localhost:3090
```

### API Configuration

The admin dashboard connects to the EES backend server. Configure the connection in Settings or via environment variables:

- **Default API URL**: `http://localhost:3000`
- **Authentication**: Uses `x-admin-auth` header for protected endpoints
- **Port**: Admin dashboard runs on port `3030`

## Pages Overview

### Dashboard

- System statistics (floors, cameras, routes)
- Server health status
- Quick action buttons
- Recent floors list

### Floor Management

- Grid/list view of all floors
- Create new floors with map upload
- Edit floor configuration (nodes, edges, cameras)
- Delete floors with confirmation

### Route Management

- View computed evacuation routes
- Filter routes by floor
- Compute new routes
- View route details (path, weight, distance, hazards)

### Camera Management

- Monitor all cameras across floors
- Filter by floor
- View camera status (online/offline)

### Records Management

- View AI detection records
- Filter by type, floor, status, date
- Pagination support
- View detection images

### Settings

- Configure API server URL
- Set admin authentication token
- **Cloud Processing**: Enable/disable Cloudinary uploads and Cloud AI (for offline mode)
- **Cloud Sync**: Enable/disable and configure periodic MongoDB Atlas synchronization
- Trigger manual cloud sync
- Test connection
- View system information

## API Integration

The dashboard integrates with these backend endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/api/floors` | GET/POST | List/create floors |
| `/api/floors/:id` | GET/PUT/DELETE | Floor CRUD |
| `/api/routes` | GET | Get routes |
| `/api/routes/compute` | POST | Compute routes |
| `/api/records` | GET | Get detection records |
| `/api/settings` | GET/PUT | System settings (cloud sync, cloud processing) |
| `/api/settings/sync` | POST | Trigger manual cloud sync |

## Cloud Settings

The Settings page provides control over two critical cloud features:

### Cloud Processing
Controls whether images are uploaded to Cloudinary and processed by Cloud AI during each capture cycle.

- **Enabled (default)**: Full pipeline - local storage + Cloudinary upload + local AI + cloud AI
- **Disabled**: Local-only mode - local storage + local AI only (useful when backend has no internet)

### Cloud Database Sync
Controls periodic synchronization of local MongoDB to cloud MongoDB Atlas.

- **Enable/Disable**: Toggle the sync scheduler
- **Interval**: Configure sync frequency (1-168 hours)
- **Manual Sync**: Trigger an immediate sync operation
- **Sync Status**: View last sync time, status, and duration

## Styling

The dashboard uses a custom Tailwind CSS configuration matching the screens app:

### Color Palette

- **Primary**: `#667eea` (Purple/Blue)
- **Success**: `#22c55e` (Green)
- **Warning**: `#f59e0b` (Amber)
- **Danger**: `#ef4444` (Red)
- **Sidebar**: `#1e293b` (Slate)

### Components

All UI components follow a consistent design system:
- Cards with subtle shadows and rounded corners
- Buttons with hover and active states
- Form inputs with validation states
- Badges for status indicators
- Modals for confirmations
- Toast notifications

## Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

ISC License - See LICENSE file for details.

---

## 👨‍💻 Author

**Marcelino Saad** - Graduation Project 2026

---

<p align="center">
  <sub>Part of the Emergency Evacuation System (EES) Project 🏢🚨</sub>
</p>

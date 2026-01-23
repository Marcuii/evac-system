/**
 * @fileoverview Dashboard Page
 * @description Main dashboard page showing system overview, statistics,
 *              and quick actions for the EES Admin Dashboard.
 *
 * @module pages/Dashboard
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Camera, 
  Monitor, 
  AlertTriangle,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Zap,
  Cloud,
  CloudOff,
  Upload
} from 'lucide-react';
import { Card, Badge, Button, Spinner } from '../components/ui';
import { cn, getHazardColor, formatRelativeTime } from '../utils/helpers';
import { fetchFloors, fetchSystemStatus, selectFloorsList, selectFloorsLoading, selectSystemStatus } from '../store/slices/floorsSlice';
import { fetchLatestRoutes, selectLatestRoutes } from '../store/slices/routesSlice';
import { checkServerHealth, selectServerHealth } from '../store/slices/authSlice';
import { ROUTES } from '../config';
import { getSettings } from '../services/settingsService';

/* ============================================================
 * STAT CARD COMPONENT
 * ============================================================ */

function StatCard({ icon: Icon, label, value, subValue, variant = 'default', onClick }) {
  const variants = {
    default: 'bg-white',
    primary: 'bg-primary-50 border-primary-100',
    success: 'bg-success-50 border-success-100',
    warning: 'bg-warning-50 border-warning-100',
    danger: 'bg-danger-50 border-danger-100',
  };

  const iconVariants = {
    default: 'text-gray-400 bg-gray-100',
    primary: 'text-primary-600 bg-primary-100',
    success: 'text-success-600 bg-success-100',
    warning: 'text-warning-600 bg-warning-100',
    danger: 'text-danger-600 bg-danger-100',
  };

  return (
    <div 
      className={cn(
        'p-6 rounded-xl border shadow-sm transition-all',
        variants[variant],
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={cn('p-3 rounded-lg', iconVariants[variant])}>
          <Icon className="w-6 h-6" />
        </div>
        {onClick && (
          <ArrowRight className="w-5 h-5 text-gray-400" />
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-500 mt-1">{label}</p>
        {subValue && (
          <p className="text-xs text-gray-400 mt-1">{subValue}</p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * HEALTH STATUS COMPONENT
 * ============================================================ */

function HealthStatus({ label, status, lastChecked, customLabel, icon: CustomIcon }) {
  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-success-500', label: 'Online' },
    enabled: { icon: CheckCircle, color: 'text-success-500', label: 'Enabled' },
    disabled: { icon: XCircle, color: 'text-gray-400', label: 'Disabled' },
    unhealthy: { icon: XCircle, color: 'text-danger-500', label: 'Error' },
    offline: { icon: XCircle, color: 'text-danger-500', label: 'Offline' },
    unknown: { icon: Clock, color: 'text-gray-400', label: 'Checking...' },
  };

  const config = statusConfig[status] || statusConfig.unknown;
  const Icon = CustomIcon || config.icon;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4', config.color)} />
        <span className={cn('text-sm font-medium', config.color)}>
          {customLabel || config.label}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
 * QUICK ACTION COMPONENT
 * ============================================================ */

function QuickAction({ icon: Icon, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-4 p-4 w-full text-left rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group"
    >
      <div className="p-2 rounded-lg bg-primary-100 text-primary-600 group-hover:bg-primary-200 transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </button>
  );
}

/* ============================================================
 * DASHBOARD PAGE COMPONENT
 * ============================================================ */

export function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const floors = useSelector(selectFloorsList);
  const loading = useSelector(selectFloorsLoading);
  const systemStatus = useSelector(selectSystemStatus);
  const serverHealth = useSelector(selectServerHealth);
  const latestRoutes = useSelector(selectLatestRoutes);

  // Cloud settings state
  const [cloudSettings, setCloudSettings] = useState(null);

  // Fetch cloud settings
  const fetchCloudSettings = useCallback(async () => {
    try {
      const result = await getSettings();
      if (result.success && result.data) {
        setCloudSettings(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch cloud settings:', err);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    dispatch(fetchFloors());
    dispatch(fetchSystemStatus());
    dispatch(checkServerHealth());
    fetchCloudSettings();
  }, [dispatch, fetchCloudSettings]);

  // Fetch latest routes for first floor
  useEffect(() => {
    if (floors.length > 0) {
      dispatch(fetchLatestRoutes(floors[0].id));
    }
  }, [dispatch, floors]);

  const handleRefresh = () => {
    dispatch(fetchFloors());
    dispatch(fetchSystemStatus());
    dispatch(checkServerHealth());
    fetchCloudSettings();
  };

  // Calculate statistics
  // Handle both server formats: cameras array (new) or cameraToEdge object (legacy)
  const stats = {
    totalFloors: floors.length,
    activeFloors: floors.filter(f => f.status === 'active' || !f.status).length,
    totalCameras: floors.reduce((sum, f) => {
      if (Array.isArray(f.cameras)) return sum + f.cameras.length;
      if (f.cameraToEdge) return sum + Object.keys(f.cameraToEdge).length;
      return sum;
    }, 0),
    totalScreens: floors.reduce((sum, f) => {
      if (Array.isArray(f.screens)) return sum + f.screens.length;
      if (f.startPoints) return sum + (Array.isArray(f.startPoints) ? f.startPoints.length : 0);
      return sum;
    }, 0),
  };

  const hazardLevel = latestRoutes?.overallHazardLevel || 'safe';
  const isEmergency = latestRoutes?.emergency === true;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">System overview and quick actions</p>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className={cn('w-4 h-4', loading.list && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Emergency Alert */}
      {isEmergency && (
        <div className="p-4 bg-danger-100 border border-danger-200 rounded-xl flex items-center gap-4 animate-pulse">
          <div className="p-2 bg-danger-500 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-danger-800">Emergency Mode Active</p>
            <p className="text-sm text-danger-600">
              Fire or smoke detected. Evacuation routes are being computed.
            </p>
          </div>
          <Button variant="danger" onClick={() => navigate(ROUTES.ROUTES)}>
            View Routes
          </Button>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Building2}
          label="Total Floors"
          value={stats.totalFloors}
          subValue={`${stats.activeFloors} active`}
          variant="primary"
          onClick={() => navigate(ROUTES.FLOORS)}
        />
        <StatCard
          icon={Camera}
          label="Cameras"
          value={stats.totalCameras}
          subValue={systemStatus?.activeCameras ? `${systemStatus.activeCameras} active` : undefined}
          variant="success"
          onClick={() => navigate(ROUTES.CAMERAS)}
        />
        <StatCard
          icon={Monitor}
          label="Screens"
          value={stats.totalScreens}
          subValue={systemStatus?.activeScreens ? `${systemStatus.activeScreens} connected` : undefined}
          variant="default"
        />
        <StatCard
          icon={AlertTriangle}
          label="Hazard Level"
          value={hazardLevel.toUpperCase()}
          subValue={isEmergency ? 'EMERGENCY' : 'Normal operation'}
          variant={hazardLevel === 'safe' ? 'success' : hazardLevel === 'high' || hazardLevel === 'critical' ? 'danger' : 'warning'}
          onClick={() => navigate(ROUTES.ROUTES)}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <Card title="System Health" className="lg:col-span-1">
          <div className="p-4">
            <HealthStatus 
              label="Backend Server" 
              status={serverHealth.status} 
              lastChecked={serverHealth.lastChecked}
            />
            <HealthStatus 
              label="Database" 
              status={serverHealth.status === 'healthy' ? 'healthy' : 'unknown'}
            />
            <HealthStatus 
              label="Cloud Processing" 
              status={cloudSettings?.cloudProcessing?.enabled ? 'enabled' : 'disabled'}
              icon={cloudSettings?.cloudProcessing?.enabled ? Upload : CloudOff}
              customLabel={cloudSettings?.cloudProcessing?.enabled ? 'Active' : 'Disabled'}
            />
            <HealthStatus 
              label="Cloud Sync" 
              status={cloudSettings?.cloudSync?.enabled ? 'enabled' : 'disabled'}
              icon={cloudSettings?.cloudSync?.enabled ? Cloud : CloudOff}
              customLabel={cloudSettings?.cloudSync?.enabled 
                ? `Every ${cloudSettings?.cloudSync?.intervalHours}h` 
                : 'Disabled'}
            />
            
            {serverHealth.lastChecked && (
              <p className="text-xs text-gray-400 mt-4 text-center">
                Last checked: {formatRelativeTime(serverHealth.lastChecked)}
              </p>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions" className="lg:col-span-2">
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickAction
              icon={Building2}
              label="Add New Floor"
              description="Create a new floor map with nodes and edges"
              onClick={() => navigate(ROUTES.FLOOR_NEW)}
            />
            <QuickAction
              icon={Activity}
              label="View Live Routes"
              description="Monitor real-time evacuation routes"
              onClick={() => navigate(ROUTES.ROUTES)}
            />
            <QuickAction
              icon={Camera}
              label="Camera Status"
              description="Check and manage camera feeds"
              onClick={() => navigate(ROUTES.CAMERAS)}
            />
            <QuickAction
              icon={Zap}
              label="View Records"
              description="Browse AI detection history"
              onClick={() => navigate(ROUTES.RECORDS)}
            />
          </div>
        </Card>
      </div>

      {/* Recent Floors */}
      <Card 
        title="Recent Floors" 
        action={
          <Button variant="ghost" size="small" onClick={() => navigate(ROUTES.FLOORS)}>
            View All
          </Button>
        }
      >
        {loading.list ? (
          <div className="p-8 flex justify-center">
            <Spinner size="large" />
          </div>
        ) : floors.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No floors configured yet.</p>
            <Button 
              variant="primary" 
              className="mt-4"
              onClick={() => navigate(ROUTES.FLOOR_NEW)}
            >
              Add Your First Floor
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {floors.slice(0, 5).map((floor) => (
              <div
                key={floor.id}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/floors/${floor.id}`)}
              >
                <div className="w-16 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {floor.mapImage?.url || floor.mapImage?.localUrl ? (
                    <img
                      src={floor.mapImage.url || floor.mapImage.localUrl}
                      alt={floor.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{floor.name}</p>
                  <p className="text-sm text-gray-500">
                    {floor.nodes?.length || 0} nodes • {floor.edges?.length || 0} edges
                  </p>
                </div>
                <Badge 
                  variant={floor.status === 'active' || !floor.status ? 'success' : 'default'}
                  dot
                >
                  {floor.status || 'active'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default Dashboard;

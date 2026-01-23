/**
 * @fileoverview Routes Management Page
 * @description Page for viewing and computing evacuation routes.
 *
 * @module pages/RoutesPage
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Route as RouteIcon,
  RefreshCw,
  Building2,
  MapPin,
  DoorOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Card, Button, Select, Badge, Spinner } from '../components/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { cn, formatRelativeTime } from '../utils/helpers';
import {
  fetchRoutes,
  computeRoutes,
  selectRoutesList,
  selectRoutesLoading,
  selectRoutesError,
  selectRoutesLastComputed,
} from '../store/slices/routesSlice';
import {
  fetchFloors,
  selectFloorsList,
} from '../store/slices/floorsSlice';
import { showSuccess, showError } from '../store/slices/uiSlice';

/* ============================================================
 * ROUTE CARD COMPONENT
 * Full-width horizontal layout for better readability
 * ============================================================ */

function RouteCard({ route }) {
  const pathLength = route.path?.length || 0;
  // Use API fields: hazardLevel and exceedsThresholds
  const hasHazards = route.exceedsThresholds || route.hazardLevel === 'high' || route.hazardLevel === 'critical';
  const hazardLevel = route.hazardLevel || 'safe';

  // Get hazard variant color based on level
  const getHazardVariant = () => {
    switch (hazardLevel) {
      case 'critical': return 'danger';
      case 'high': return 'danger';
      case 'moderate': return 'warning';
      default: return 'success';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 card-hover">
      {/* Main content - horizontal layout */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Route Info */}
        <div className="flex items-center gap-3 lg:min-w-[200px]">
          <div className="p-2 bg-primary-50 rounded-lg">
            <RouteIcon className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">From: {route.startNode}</p>
            <p className="text-sm text-gray-500">To: {route.exitNode}</p>
          </div>
        </div>

        {/* Path - takes most space */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-1">Path ({pathLength} nodes):</p>
          <div className="flex flex-wrap items-center gap-1">
            {route.path?.slice(0, 8).map((node, i) => (
              <span key={i} className="flex items-center">
                <span className="px-2 py-0.5 bg-gray-100 rounded text-sm font-mono">
                  {node}
                </span>
                {i < Math.min(route.path.length - 1, 7) && (
                  <span className="text-gray-400 mx-1">→</span>
                )}
              </span>
            ))}
            {pathLength > 8 && (
              <span className="text-sm text-gray-400">...+{pathLength - 8} more</span>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-6 lg:gap-8">
          <div className="text-center">
            <p className="text-xs text-gray-500">Weight</p>
            <p className="font-semibold text-gray-900">
              {route.distance?.toFixed(2) || 'N/A'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Distance</p>
            <p className="font-semibold text-gray-900">
              {route.distanceMeters ? `${route.distanceMeters.toFixed(1)}m` : 'N/A'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Est. Time</p>
            <p className="font-semibold text-gray-900">
              {route.distanceMeters ? `${Math.round(route.distanceMeters / 1.4)}s` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="lg:min-w-[100px] lg:text-right">
          <Badge variant={getHazardVariant()} dot>
            {hazardLevel.charAt(0).toUpperCase() + hazardLevel.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Hazard Details - shown below if present */}
      {route.hazardDetails && route.hazardDetails.length > 0 && hasHazards && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          {route.hazardDetails.filter(h => h.fire > 0.5).length > 0 && (
            <span className="px-2 py-1 bg-danger-50 text-danger-600 rounded text-xs font-medium">
              🔥 Fire
            </span>
          )}
          {route.hazardDetails.filter(h => h.smoke > 0.5).length > 0 && (
            <span className="px-2 py-1 bg-warning-50 text-warning-600 rounded text-xs font-medium">
              💨 Smoke
            </span>
          )}
          {route.hazardDetails.filter(h => h.people > 5).length > 0 && (
            <span className="px-2 py-1 bg-primary-50 text-primary-600 rounded text-xs font-medium">
              👥 Crowd
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * ROUTES PAGE COMPONENT
 * ============================================================ */

export function RoutesPage() {
  const dispatch = useDispatch();
  
  const routes = useSelector(selectRoutesList);
  const floors = useSelector(selectFloorsList);
  const loading = useSelector(selectRoutesLoading);
  const lastComputed = useSelector(selectRoutesLastComputed);

  const [selectedFloor, setSelectedFloor] = useState('');

  useEffect(() => {
    dispatch(fetchFloors());
  }, [dispatch]);

  useEffect(() => {
    if (selectedFloor) {
      dispatch(fetchRoutes(selectedFloor));
    }
  }, [dispatch, selectedFloor]);

  // Auto-select first floor
  useEffect(() => {
    if (floors.length > 0 && !selectedFloor) {
      setSelectedFloor(floors[0].id);
    }
  }, [floors, selectedFloor]);

  const handleRefresh = () => {
    if (selectedFloor) {
      dispatch(fetchRoutes(selectedFloor));
    }
  };

  const handleCompute = async () => {
    if (!selectedFloor) {
      dispatch(showError('Please select a floor first'));
      return;
    }

    try {
      await dispatch(computeRoutes(selectedFloor)).unwrap();
      dispatch(showSuccess('Routes computed successfully'));
    } catch (err) {
      dispatch(showError(err || 'Failed to compute routes'));
    }
  };

  // Memoized floor options for select dropdown
  const floorOptions = useMemo(() => 
    floors.map(f => ({ value: f.id, label: f.name })), 
    [floors]
  );

  // Group routes by start node - memoized for performance
  const routesByStart = useMemo(() => 
    routes.reduce((acc, route) => {
      const key = route.startNode;
      if (!acc[key]) acc[key] = [];
      acc[key].push(route);
      return acc;
    }, {}),
    [routes]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Route Management</h1>
          <p className="text-gray-500 mt-1">
            View and compute evacuation routes for each floor
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <div className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <Select
              options={floorOptions}
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              placeholder="Select a floor"
              icon={<Building2 className="w-4 h-4" />}
            />
          </div>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={!selectedFloor || loading.list}
          >
            <RefreshCw className={cn('w-4 h-4', loading.list && 'animate-spin')} />
            Refresh
          </Button>

          {lastComputed && (
            <div className="flex items-center gap-2 text-sm text-gray-500 ml-auto">
              <Clock className="w-4 h-4" />
              Last computed: {formatRelativeTime(lastComputed)}
            </div>
          )}
        </div>
      </Card>

      {/* Content */}
      {!selectedFloor ? (
        <Card>
          <EmptyState
            icon={<Building2 className="w-16 h-16" />}
            title="Select a Floor"
            description="Choose a floor from the dropdown to view its evacuation routes."
          />
        </Card>
      ) : loading.list ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : routes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<RouteIcon className="w-16 h-16" />}
            title="No Routes Available"
            description="Routes haven't been computed for this floor yet. Click 'Compute Routes' to generate evacuation paths."
            actionLabel="Compute Routes"
            onAction={handleCompute}
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(routesByStart).map(([startNode, nodeRoutes]) => (
            <div key={startNode}>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  From: {startNode}
                </h2>
                <Badge variant="default">{nodeRoutes.length} routes</Badge>
              </div>
              <div className="space-y-3">
                {nodeRoutes.map((route, index) => (
                  <RouteCard key={`${route.startNode}-${route.exitNode}-${index}`} route={route} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {routes.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Route Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <RouteIcon className="w-6 h-6 text-primary-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{routes.length}</p>
                <p className="text-sm text-gray-500">Total Routes</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-success-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {routes.filter(r => !r.exceedsThresholds && r.hazardLevel !== 'high' && r.hazardLevel !== 'critical' && r.hazardLevel !== 'moderate').length}
                </p>
                <p className="text-sm text-gray-500">Clear Routes</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-warning-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {routes.filter(r => r.exceedsThresholds || r.hazardLevel === 'high' || r.hazardLevel === 'critical' || r.hazardLevel === 'moderate').length}
                </p>
                <p className="text-sm text-gray-500">With Hazards</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <DoorOpen className="w-6 h-6 text-danger-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(routes.map(r => r.exitNode)).size}
                </p>
                <p className="text-sm text-gray-500">Exit Points</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default RoutesPage;

/**
 * @fileoverview Cameras Management Page
 * @description Page for viewing camera status across all floors.
 *
 * @module pages/CamerasPage
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Camera,
  RefreshCw,
  Video,
  VideoOff,
  Building2,
  Signal,
  Wifi,
  WifiOff,
  RotateCcw,
  Settings,
} from 'lucide-react';
import { Card, Button, Select, Badge, Spinner } from '../components/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../utils/helpers';
import {
  fetchFloors,
  selectFloorsList,
  selectFloorsLoading,
  updateCameraStatus,
  resetFloorCameras,
} from '../store/slices/floorsSlice';
import { showSuccess, showError } from '../store/slices/uiSlice';

/* ============================================================
 * CAMERA CARD COMPONENT
 * ============================================================ */

function CameraCard({ cameraId, edgeId, floorId, status = 'active', onStatusChange }) {
  const isOnline = status === 'active' || status === 'online';

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'disabled', label: 'Disabled' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'error', label: 'Error' },
  ];

  return (
    <div className={cn(
      'bg-white rounded-xl border p-4 card-hover',
      isOnline ? 'border-gray-100' : 'border-danger-200 bg-danger-50/30'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-2 rounded-lg',
            isOnline ? 'bg-success-50' : 'bg-danger-50'
          )}>
            {isOnline ? (
              <Video className="w-4 h-4 text-success-600" />
            ) : (
              <VideoOff className="w-4 h-4 text-danger-600" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{cameraId}</p>
            <p className="text-sm text-gray-500">Edge: {edgeId}</p>
          </div>
        </div>
        <Badge variant={isOnline ? 'success' : 'danger'} dot>
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      {/* Status Control */}
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">Camera Status</label>
        <Select
          options={statusOptions}
          value={status}
          onChange={(e) => onStatusChange(floorId, cameraId, e.target.value)}
          icon={<Settings className="w-3 h-3" />}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1 text-gray-500">
          <Signal className="w-4 h-4" />
          <span>{isOnline ? 'Connected' : 'Disconnected'}</span>
        </div>
        <span className="text-gray-400">{isOnline ? 'RTSP' : '--'}</span>
      </div>
    </div>
  );
}

/* ============================================================
 * CAMERAS PAGE COMPONENT
 * ============================================================ */

export function CamerasPage() {
  const dispatch = useDispatch();
  
  const floors = useSelector(selectFloorsList);
  const loading = useSelector(selectFloorsLoading);

  const [selectedFloor, setSelectedFloor] = useState('all');
  const [resettingFloor, setResettingFloor] = useState(null);

  useEffect(() => {
    dispatch(fetchFloors());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchFloors());
  };

  const handleStatusChange = async (floorId, cameraId, newStatus) => {
    try {
      await dispatch(updateCameraStatus({ 
        floorId, 
        cameraId, 
        status: newStatus,
        reason: `Admin changed status to ${newStatus}`
      })).unwrap();
      dispatch(showSuccess(`Camera ${cameraId} status updated to ${newStatus}`));
      dispatch(fetchFloors()); // Refresh to get updated status
    } catch (err) {
      dispatch(showError(err || 'Failed to update camera status'));
    }
  };

  const handleResetFloorCameras = async (floorId, floorName) => {
    setResettingFloor(floorId);
    try {
      await dispatch(resetFloorCameras(floorId)).unwrap();
      dispatch(showSuccess(`All cameras on ${floorName} have been reset`));
      dispatch(fetchFloors()); // Refresh to get updated status
    } catch (err) {
      dispatch(showError(err || 'Failed to reset cameras'));
    } finally {
      setResettingFloor(null);
    }
  };

  // Get all cameras from all floors or filtered by selected floor - memoized
  const cameras = useMemo(() => {
    const result = [];
    const floorsToShow = selectedFloor === 'all' 
      ? floors 
      : floors.filter(f => f.id === selectedFloor);

    floorsToShow.forEach(floor => {
      // New format: cameras array
      if (Array.isArray(floor.cameras) && floor.cameras.length > 0) {
        floor.cameras.forEach(cam => {
          result.push({
            cameraId: cam.id,
            edgeId: cam.edgeId,
            floorId: floor.id,
            floorName: floor.name,
            status: cam.status || 'active',
            rtspUrl: cam.rtspUrl,
          });
        });
      }
      // Legacy format: cameraToEdge object
      else if (floor.cameraToEdge) {
        Object.entries(floor.cameraToEdge).forEach(([cameraId, edgeId]) => {
          result.push({
            cameraId,
            edgeId,
            floorId: floor.id,
            floorName: floor.name,
            status: 'active',
          });
        });
      }
    });
    return result;
  }, [floors, selectedFloor]);

  // Memoized floor options and counts
  const floorOptions = useMemo(() => [
    { value: 'all', label: 'All Floors' },
    ...floors.map(f => ({ value: f.id, label: f.name })),
  ], [floors]);

  const { onlineCount, offlineCount } = useMemo(() => ({
    onlineCount: cameras.filter(c => c.status === 'active' || c.status === 'online').length,
    offlineCount: cameras.length - cameras.filter(c => c.status === 'active' || c.status === 'online').length,
  }), [cameras]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Camera Management</h1>
          <p className="text-gray-500 mt-1">
            Monitor camera status and connections across all floors
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <Camera className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{cameras.length}</p>
              <p className="text-sm text-gray-500">Total Cameras</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-50 rounded-lg">
              <Wifi className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success-600">{onlineCount}</p>
              <p className="text-sm text-gray-500">Online</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-danger-50 rounded-lg">
              <WifiOff className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-danger-600">{offlineCount}</p>
              <p className="text-sm text-gray-500">Offline</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-full sm:w-64">
          <Select
            options={floorOptions}
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            icon={<Building2 className="w-4 h-4" />}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading.list}
          >
            <RefreshCw className={cn('w-4 h-4', loading.list && 'animate-spin')} />
            Refresh
          </Button>
          {cameras.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                if (selectedFloor === 'all') {
                  // Reset all cameras on all floors
                  floors.forEach(floor => {
                    if ((Array.isArray(floor.cameras) && floor.cameras.length > 0) || 
                        (floor.cameraToEdge && Object.keys(floor.cameraToEdge).length > 0)) {
                      handleResetFloorCameras(floor.id, floor.name);
                    }
                  });
                } else {
                  const floor = floors.find(f => f.id === selectedFloor);
                  handleResetFloorCameras(selectedFloor, floor?.name || selectedFloor);
                }
              }}
              disabled={resettingFloor !== null}
            >
              <RotateCcw className={cn('w-4 h-4', resettingFloor && 'animate-spin')} />
              Reset All Cameras
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading.list ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : cameras.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Camera className="w-16 h-16" />}
            title="No Cameras Found"
            description={
              selectedFloor === 'all'
                ? 'No cameras have been configured for any floor yet.'
                : 'No cameras have been configured for this floor.'
            }
          />
        </Card>
      ) : (
        <>
          {/* Group by floor when showing all floors */}
          {selectedFloor === 'all' ? (
            <div className="space-y-8">
              {floors.filter(f => 
                (Array.isArray(f.cameras) && f.cameras.length > 0) || 
                (f.cameraToEdge && Object.keys(f.cameraToEdge).length > 0)
              ).map((floor) => {
                // Get cameras for this floor
                const floorCameras = cameras.filter(c => c.floorId === floor.id);
                return (
                  <div key={floor.id}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        <h2 className="text-lg font-semibold text-gray-900">{floor.name}</h2>
                        <Badge variant="default">
                          {floorCameras.length} cameras
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetFloorCameras(floor.id, floor.name)}
                        disabled={resettingFloor === floor.id}
                      >
                        <RotateCcw className={cn('w-4 h-4', resettingFloor === floor.id && 'animate-spin')} />
                        Reset All
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {floorCameras.map((camera) => (
                        <CameraCard
                          key={`${camera.floorId}-${camera.cameraId}`}
                          cameraId={camera.cameraId}
                          edgeId={camera.edgeId}
                          floorId={camera.floorId}
                          status={camera.status}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cameras.map((camera) => (
                <CameraCard
                  key={`${camera.floorId}-${camera.cameraId}`}
                  cameraId={camera.cameraId}
                  edgeId={camera.edgeId}
                  floorId={camera.floorId}
                  status={camera.status}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CamerasPage;

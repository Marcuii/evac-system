/**
 * @fileoverview Floor Detail Page
 * @description Detailed view of a single floor with map visualization.
 *
 * @module pages/FloorDetailPage
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  GitBranch,
  Camera,
  DoorOpen,
  MonitorSmartphone,
} from 'lucide-react';
import { Card, Button, Badge, Spinner } from '../components/ui';
import {
  fetchFloorById,
  selectCurrentFloor,
  selectFloorsLoading,
} from '../store/slices/floorsSlice';
import { ROUTES } from '../config';
import { getFloorImageUrl, getFloorImageFallback } from '../utils/helpers';

/* ============================================================
 * INFO CARD COMPONENT
 * ============================================================ */

function InfoCard({ icon: Icon, label, value, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * FLOOR DETAIL PAGE COMPONENT
 * ============================================================ */

export function FloorDetailPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();

  const floor = useSelector(selectCurrentFloor);
  const loading = useSelector(selectFloorsLoading);
  
  // Image error state (must be before conditional returns for hooks rules)
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchFloorById(id));
    }
  }, [dispatch, id]);
  
  // Reset image error state when floor changes
  useEffect(() => {
    setImgError(false);
  }, [floor?.id]);

  if (loading.single) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="large" />
      </div>
    );
  }

  if (!floor) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Floor not found</h2>
        <p className="text-gray-500 mt-2">The requested floor does not exist.</p>
        <Button variant="primary" className="mt-4" onClick={() => navigate(ROUTES.FLOORS)}>
          Back to Floors
        </Button>
      </div>
    );
  }

  const cameraCount = floor.cameraToEdge ? Object.keys(floor.cameraToEdge).length : 0;

  // Image URL - local first, fallback to cloud
  const primaryImageUrl = getFloorImageUrl(floor.id, floor.mapImage);
  const fallbackImageUrl = getFloorImageFallback(floor.mapImage);
  const imageUrl = imgError ? fallbackImageUrl : primaryImageUrl;

  const handleImageError = () => {
    if (!imgError && fallbackImageUrl) {
      setImgError(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(ROUTES.FLOORS)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{floor.name}</h1>
              <Badge variant="success" dot>Active</Badge>
            </div>
            <p className="text-gray-500 mt-1">Floor ID: {floor.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/floors/${floor.id}/edit`)}>
            <Edit className="w-4 h-4" /> Edit
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <InfoCard icon={MapPin} label="Nodes" value={floor.nodes?.length || 0} color="primary" />
        <InfoCard icon={GitBranch} label="Edges" value={floor.edges?.length || 0} color="success" />
        <InfoCard icon={Camera} label="Cameras" value={cameraCount} color="warning" />
        <InfoCard icon={DoorOpen} label="Exits" value={floor.exitPoints?.length || 0} color="danger" />
        <InfoCard icon={MonitorSmartphone} label="Screens" value={floor.startPoints?.length || 0} color="primary" />
      </div>

      {/* Map Image */}
      <Card title="Floor Map">
        <div className="p-6">
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt={floor.name}
                className="w-full max-h-[500px] object-contain rounded-lg border border-gray-200"
                onError={handleImageError}
              />
              {floor.mapImage?.widthMeters && floor.mapImage?.heightMeters && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Dimensions: {floor.mapImage.widthMeters}m × {floor.mapImage.heightMeters}m
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
              <p className="text-gray-500">No map image available</p>
            </div>
          )}
        </div>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nodes */}
        <Card title={`Nodes (${floor.nodes?.length || 0})`}>
          <div className="p-6 max-h-80 overflow-y-auto">
            {floor.nodes?.length > 0 ? (
              <div className="space-y-2">
                {floor.nodes.map((node) => (
                  <div key={node.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{node.id}</p>
                        <p className="text-sm text-gray-500">{node.label || 'No label'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{node.type}</Badge>
                      <span className="text-sm text-gray-500">({node.x}, {node.y})</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No nodes defined</p>
            )}
          </div>
        </Card>

        {/* Edges */}
        <Card title={`Edges (${floor.edges?.length || 0})`}>
          <div className="p-6 max-h-80 overflow-y-auto">
            {floor.edges?.length > 0 ? (
              <div className="space-y-2">
                {floor.edges.map((edge) => (
                  <div key={edge.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <GitBranch className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{edge.id}</p>
                        <p className="text-sm text-gray-500">{edge.from} → {edge.to}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Weight: {edge.staticWeight}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No edges defined</p>
            )}
          </div>
        </Card>
      </div>

      {/* Camera Mappings & Points */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cameras */}
        <Card title={`Cameras (${cameraCount})`}>
          <div className="p-6 max-h-60 overflow-y-auto">
            {cameraCount > 0 ? (
              <div className="space-y-2">
                {Object.entries(floor.cameraToEdge).map(([cameraId, edgeId]) => (
                  <div key={cameraId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{cameraId}</span>
                    </div>
                    <Badge variant="default">{edgeId}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No cameras mapped</p>
            )}
          </div>
        </Card>

        {/* Start Points */}
        <Card title={`Start Points (${floor.startPoints?.length || 0})`}>
          <div className="p-6">
            {floor.startPoints?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {floor.startPoints.map((point) => (
                  <Badge key={point} variant="primary">{point}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No start points defined</p>
            )}
          </div>
        </Card>

        {/* Exit Points */}
        <Card title={`Exit Points (${floor.exitPoints?.length || 0})`}>
          <div className="p-6">
            {floor.exitPoints?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {floor.exitPoints.map((point) => (
                  <Badge key={point} variant="danger">{point}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No exit points defined</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default FloorDetailPage;

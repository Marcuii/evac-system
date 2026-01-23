/**
 * @fileoverview Floors List Page
 * @description Floor management page for listing, searching, and managing floors.
 *
 * @module pages/FloorsPage
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Camera,
  MapPin,
  Grid,
  List,
} from 'lucide-react';
import { Card, Button, Input, Badge, Spinner } from '../components/ui';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { cn, getFloorImageUrl, getFloorImageFallback, getCameraCount, getScreenCount } from '../utils/helpers';
import {
  fetchFloors,
  deleteFloor,
  selectFloorsList,
  selectFloorsLoading,
  selectFloorsError,
} from '../store/slices/floorsSlice';
import { showSuccess, showError } from '../store/slices/uiSlice';
import { ROUTES } from '../config';

/* ============================================================
 * FLOOR CARD COMPONENT
 * ============================================================ */

function FloorCard({ floor, onView, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Use helper functions for counts
  const cameraCount = getCameraCount(floor);
  const screenCount = getScreenCount(floor);

  // Get image URL - local first, fallback to cloud
  const primaryImageUrl = getFloorImageUrl(floor.id, floor.mapImage);
  const fallbackImageUrl = getFloorImageFallback(floor.mapImage);
  const imageUrl = imgError ? fallbackImageUrl : primaryImageUrl;

  const handleImageError = () => {
    if (!imgError && fallbackImageUrl) {
      setImgError(true);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden card-hover">
      {/* Image */}
      <div className="aspect-map bg-gray-100 relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={floor.name}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-16 h-16 text-gray-300" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <Badge
            variant={floor.status === 'active' || !floor.status ? 'success' : floor.status === 'maintenance' ? 'warning' : 'default'}
            dot
          >
            {floor.status || 'active'}
          </Badge>
        </div>

        {/* Actions Menu */}
        <div className="absolute top-3 right-3">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                  <button
                    onClick={() => { setShowMenu(false); onView(); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" /> View Details
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onEdit(); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onDelete(); }}
                    className="w-full px-4 py-2 text-left text-sm text-danger-600 hover:bg-danger-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{floor.name}</h3>
        <p className="text-sm text-gray-500 mb-3">ID: {floor.id}</p>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{floor.nodes?.length || 0} nodes</span>
          </div>
          <div className="flex items-center gap-1">
            <Camera className="w-4 h-4 text-gray-400" />
            <span>{cameraCount} cameras</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <Button 
          variant="ghost" 
          size="small" 
          className="w-full"
          onClick={onView}
        >
          View Floor
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
 * FLOOR ROW COMPONENT (List View)
 * ============================================================ */

function FloorRow({ floor, onView, onEdit, onDelete }) {
  const [imgError, setImgError] = useState(false);

  // Use helper functions for counts
  const cameraCount = getCameraCount(floor);

  // Get image URL - local first, fallback to cloud
  const primaryImageUrl = getFloorImageUrl(floor.id, floor.mapImage);
  const fallbackImageUrl = getFloorImageFallback(floor.mapImage);
  const imageUrl = imgError ? fallbackImageUrl : primaryImageUrl;

  const handleImageError = () => {
    if (!imgError && fallbackImageUrl) {
      setImgError(true);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
      {/* Thumbnail */}
      <div className="w-20 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={floor.name}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 truncate">{floor.name}</h3>
          <Badge
            variant={floor.status === 'active' || !floor.status ? 'success' : 'default'}
            dot
          >
            {floor.status || 'active'}
          </Badge>
        </div>
        <p className="text-sm text-gray-500">
          {floor.nodes?.length || 0} nodes • {floor.edges?.length || 0} edges • {cameraCount} cameras
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="small" onClick={onView}>
          <Eye className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="small" onClick={onEdit}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="small" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-danger-500" />
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
 * FLOORS PAGE COMPONENT
 * ============================================================ */

export function FloorsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const floors = useSelector(selectFloorsList);
  const loading = useSelector(selectFloorsLoading);
  const error = useSelector(selectFloorsError);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [floorToDelete, setFloorToDelete] = useState(null);

  useEffect(() => {
    dispatch(fetchFloors());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchFloors());
  };

  const handleDelete = (floor) => {
    setFloorToDelete(floor);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!floorToDelete) return;
    
    try {
      await dispatch(deleteFloor(floorToDelete.id)).unwrap();
      dispatch(showSuccess(`Floor "${floorToDelete.name}" deleted successfully`));
      setDeleteModalOpen(false);
      setFloorToDelete(null);
    } catch (err) {
      dispatch(showError(err || 'Failed to delete floor'));
    }
  };

  // Filter floors by search query - memoized for performance
  const filteredFloors = useMemo(() => 
    floors.filter(floor =>
      floor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      floor.id.toLowerCase().includes(searchQuery.toLowerCase())
    ), [floors, searchQuery]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Floor Management</h1>
          <p className="text-gray-500 mt-1">
            Manage floor maps, nodes, and camera configurations
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate(ROUTES.FLOOR_NEW)}>
          <Plus className="w-4 h-4" />
          Add Floor
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search floors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="small"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="small"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
        
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className={cn('w-4 h-4', loading.list && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {loading.list ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : filteredFloors.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 className="w-16 h-16" />}
            title={searchQuery ? 'No floors found' : 'No floors yet'}
            description={
              searchQuery
                ? 'Try adjusting your search query.'
                : 'Get started by adding your first floor map.'
            }
            actionLabel={!searchQuery ? 'Add Floor' : undefined}
            onAction={!searchQuery ? () => navigate(ROUTES.FLOOR_NEW) : undefined}
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFloors.map((floor) => (
            <FloorCard
              key={floor.id}
              floor={floor}
              onView={() => navigate(`/floors/${floor.id}`)}
              onEdit={() => navigate(`/floors/${floor.id}/edit`)}
              onDelete={() => handleDelete(floor)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFloors.map((floor) => (
            <FloorRow
              key={floor.id}
              floor={floor}
              onView={() => navigate(`/floors/${floor.id}`)}
              onEdit={() => navigate(`/floors/${floor.id}/edit`)}
              onDelete={() => handleDelete(floor)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Floor"
        message={`Are you sure you want to delete "${floorToDelete?.name}"? This will remove all nodes, edges, and camera configurations. This action cannot be undone.`}
        confirmText="Delete"
        loading={loading.delete}
      />
    </div>
  );
}

export default FloorsPage;

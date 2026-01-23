/**
 * @fileoverview Records Management Page
 * @description Page for viewing AI detection records with filtering and pagination.
 *
 * @module pages/RecordsPage
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  FileText,
  RefreshCw,
  Filter,
  Camera,
  Building2,
  Flame,
  Wind,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, Button, Input, Select, Badge, Spinner } from '../components/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { cn, formatDate, formatRelativeTime, getRecordImageUrl } from '../utils/helpers';
import {
  fetchRecords,
  selectRecordsList,
  selectRecordsLoading,
  selectRecordsPagination,
  selectRecordsFilters,
  setFilters,
} from '../store/slices/recordsSlice';
import {
  fetchFloors,
  selectFloorsList,
} from '../store/slices/floorsSlice';
import { DETECTION_TYPES, RECORD_STATUS } from '../config';

/* ============================================================
 * RECORD ROW COMPONENT
 * ============================================================ */

function RecordRow({ record }) {
  // Extract AI results - server sends aiResult object with peopleCount, fireProb, smokeProb
  const aiResult = record.aiResult || {};
  const peopleCount = aiResult.peopleCount ?? 0;
  const fireProb = aiResult.fireProb ?? 0;
  const smokeProb = aiResult.smokeProb ?? 0;
  
  // Determine primary detection type based on highest probability
  const maxProb = Math.max(fireProb, smokeProb);
  const detectionType = fireProb >= smokeProb ? 'fire' : 'smoke';
  
  // Check for hazards (probability > 0.5 is considered detected)
  const hasFireHazard = fireProb >= 0.5;
  const hasSmokeHazard = smokeProb >= 0.5;
  const hasHazard = hasFireHazard || hasSmokeHazard;
  
  // Image URL - use local server path first
  const imageUrl = getRecordImageUrl(record);

  return (
    <tr className="hover:bg-gray-50">
      {/* Detection Summary */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {hasFireHazard && (
            <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
              <Flame className="w-4 h-4" />
            </div>
          )}
          {hasSmokeHazard && (
            <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
              <Wind className="w-4 h-4" />
            </div>
          )}
          {!hasHazard && (
            <div className="p-1.5 rounded-lg bg-green-100 text-green-600">
              <FileText className="w-4 h-4" />
            </div>
          )}
          <span className="font-medium text-sm">
            {hasHazard ? (hasFireHazard && hasSmokeHazard ? 'Fire & Smoke' : hasFireHazard ? 'Fire' : 'Smoke') : 'Clear'}
          </span>
        </div>
      </td>
      
      {/* Fire / Smoke Probabilities */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Flame className="w-3 h-3 text-red-500" />
            <Badge variant={fireProb >= 0.7 ? 'danger' : fireProb >= 0.4 ? 'warning' : 'success'} size="small">
              {(fireProb * 100).toFixed(0)}%
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="w-3 h-3 text-orange-500" />
            <Badge variant={smokeProb >= 0.7 ? 'danger' : smokeProb >= 0.4 ? 'warning' : 'success'} size="small">
              {(smokeProb * 100).toFixed(0)}%
            </Badge>
          </div>
        </div>
      </td>
      
      {/* People Count */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1 text-gray-600">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="font-medium">{peopleCount}</span>
        </div>
      </td>
      
      {/* Camera */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1 text-gray-600">
          <Camera className="w-4 h-4 text-gray-400" />
          <span>{record.cameraId || '-'}</span>
        </div>
      </td>
      
      {/* Edge Device */}
      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
        {record.edgeId || '-'}
      </td>
      
      {/* Processed Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge variant={record.processed ? 'success' : 'warning'}>
          {record.processed ? 'Processed' : 'Pending'}
        </Badge>
      </td>
      
      {/* Timestamp */}
      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
        <span title={formatDate(record.timestamp)}>
          {formatRelativeTime(record.timestamp)}
        </span>
      </td>
      
      {/* Image */}
      <td className="px-4 py-3 whitespace-nowrap">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Detection"
            className="w-12 h-8 object-cover rounded cursor-pointer hover:opacity-75"
            onClick={() => window.open(imageUrl, '_blank')}
          />
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
    </tr>
  );
}

/* ============================================================
 * RECORDS PAGE COMPONENT
 * ============================================================ */

export function RecordsPage() {
  const dispatch = useDispatch();
  
  const records = useSelector(selectRecordsList);
  const floors = useSelector(selectFloorsList);
  const loading = useSelector(selectRecordsLoading);
  const pagination = useSelector(selectRecordsPagination);
  const filters = useSelector(selectRecordsFilters);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [localFilters, setLocalFilters] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    dispatch(fetchFloors());
  }, [dispatch]);

  // Fetch records when floor is selected, page changes, or filters change
  useEffect(() => {
    if (selectedFloorId) {
      dispatch(fetchRecords({ 
        ...filters,
        floorId: selectedFloorId,
        page: currentPage,
        limit: 20,
      }));
    }
  }, [dispatch, selectedFloorId, filters, currentPage]);

  // Auto-select first floor when floors load
  useEffect(() => {
    if (floors.length > 0 && !selectedFloorId) {
      setSelectedFloorId(floors[0].id);
    }
  }, [floors, selectedFloorId]);

  const handleFloorChange = (floorId) => {
    setSelectedFloorId(floorId);
    setCurrentPage(1); // Reset to first page when floor changes
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRefresh = () => {
    if (selectedFloorId) {
      dispatch(fetchRecords({ 
        ...filters,
        floorId: selectedFloorId,
        page: currentPage,
        limit: 20,
      }));
    }
  };

  const handleApplyFilters = () => {
    const activeFilters = {};
    Object.entries(localFilters).forEach(([key, value]) => {
      if (value) activeFilters[key] = value;
    });
    dispatch(setFilters(activeFilters));
    setCurrentPage(1); // Reset to first page when filters change
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setLocalFilters({
      type: '',
      status: '',
      startDate: '',
      endDate: '',
    });
    dispatch(setFilters({}));
    setCurrentPage(1); // Reset to first page
  };

  // Memoized values for performance
  const activeFilterCount = useMemo(() => 
    Object.values(filters).filter(Boolean).length, 
    [filters]
  );

  const floorOptions = useMemo(() => 
    floors.map(f => ({ value: f.id, label: f.name })), 
    [floors]
  );

  const typeOptions = [
    { value: '', label: 'All Types' },
    ...DETECTION_TYPES.map(t => ({ value: t.value, label: t.label })),
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...RECORD_STATUS.map(s => ({ value: s.value, label: s.label })),
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detection Records</h1>
          <p className="text-gray-500 mt-1">
            View AI detection history and manage records
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Floor Selector (Required) */}
        <div className="min-w-[200px]">
          <Select
            options={floorOptions}
            value={selectedFloorId}
            onChange={(e) => handleFloorChange(e.target.value)}
            placeholder="Select a floor"
            icon={<Building2 className="w-4 h-4" />}
          />
        </div>

        <Button
          variant={showFilters ? 'primary' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="primary" className="ml-1">{activeFilterCount}</Badge>
          )}
        </Button>
        
        {activeFilterCount > 0 && (
          <Button variant="ghost" onClick={handleClearFilters}>
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {pagination.total > 0 ? `${pagination.total.toLocaleString()} total records` : 'No records'}
          </span>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading.list || !selectedFloorId}
          >
            <RefreshCw className={cn('w-4 h-4', loading.list && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Select
                label="Detection Type"
                options={typeOptions}
                value={localFilters.type}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, type: e.target.value }))}
              />
              <Select
                label="Status"
                options={statusOptions}
                value={localFilters.status}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, status: e.target.value }))}
              />
              <Input
                label="From Date"
                type="date"
                value={localFilters.startDate}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
              <Input
                label="To Date"
                type="date"
                value={localFilters.endDate}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
              <Button variant="ghost" onClick={handleClearFilters}>
                Clear All
              </Button>
              <Button variant="primary" onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Content */}
      {!selectedFloorId ? (
        <Card>
          <EmptyState
            icon={<Building2 className="w-16 h-16" />}
            title="Select a Floor"
            description="Choose a floor from the dropdown to view detection records."
          />
        </Card>
      ) : loading.list && records.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="w-16 h-16" />}
            title="No Records Found"
            description={
              activeFilterCount > 0
                ? 'No records match your current filters. Try adjusting or clearing filters.'
                : 'No detection records available yet.'
            }
            actionLabel={activeFilterCount > 0 ? 'Clear Filters' : undefined}
            onAction={activeFilterCount > 0 ? handleClearFilters : undefined}
          />
        </Card>
      ) : (
        <>
          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Detection</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Fire/Smoke</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">People</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Camera</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Edge</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Image</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((record, index) => (
                    <RecordRow key={record._id || record.id || index} record={record} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {records.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total.toLocaleString()} records
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="small"
                disabled={!pagination.hasPrevPage && pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              {/* Page number buttons */}
              <div className="flex items-center gap-1">
                {pagination.totalPages > 1 && Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? 'primary' : 'ghost'}
                      size="small"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              {/* Page indicator for single page */}
              {pagination.totalPages <= 1 && (
                <span className="px-3 py-1 text-sm text-gray-500">
                  Page {pagination.page} of {Math.max(1, pagination.totalPages)}
                </span>
              )}
              
              <Button
                variant="outline"
                size="small"
                disabled={!pagination.hasNextPage && pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RecordsPage;

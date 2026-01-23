/**
 * @fileoverview Table Component
 * @description Reusable table component with sorting, pagination, and loading states.
 *
 * @module components/ui/Table
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { cn } from '../../utils/helpers';
import { Spinner } from './index';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

/**
 * Table component with responsive design and loading states
 *
 * @param {Object} props - Component props
 * @param {Array} props.columns - Column definitions [{ key, label, sortable, render }]
 * @param {Array} props.data - Table data array
 * @param {boolean} [props.loading=false] - Loading state
 * @param {string} [props.emptyMessage='No data available'] - Empty state message
 * @param {Function} [props.onRowClick] - Row click handler
 * @param {string} [props.sortKey] - Current sort key
 * @param {string} [props.sortDirection] - Sort direction: 'asc' | 'desc'
 * @param {Function} [props.onSort] - Sort handler
 * @returns {JSX.Element} Table element
 *
 * @example
 * <Table 
 *   columns={[
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'status', label: 'Status', render: (value) => <Badge>{value}</Badge> }
 *   ]}
 *   data={floors}
 * />
 */
export function Table({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  sortKey,
  sortDirection,
  onSort,
  className = '',
}) {
  const handleSort = (key) => {
    if (!onSort) return;
    
    if (sortKey === key) {
      onSort(key, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(key, 'asc');
    }
  };

  const renderSortIcon = (column) => {
    if (!column.sortable) return null;
    
    if (sortKey !== column.key) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-primary-500" />
      : <ChevronDown className="w-4 h-4 text-primary-500" />;
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full table-striped">
        {/* Header */}
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 text-left text-sm font-semibold text-gray-700',
                  column.sortable && 'cursor-pointer select-none hover:bg-gray-100 transition-colors',
                  column.className
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {renderSortIcon(column)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        
        {/* Body */}
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Spinner size="large" />
                  <p className="text-gray-500">Loading data...</p>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row.id || row._id || rowIndex}
                className={cn(
                  'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td 
                    key={column.key} 
                    className={cn('px-4 py-3 text-sm text-gray-700', column.cellClassName)}
                  >
                    {column.render 
                      ? column.render(row[column.key], row) 
                      : row[column.key] ?? '-'
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Pagination component for table navigation
 *
 * @param {Object} props - Component props
 * @param {number} props.currentPage - Current page (1-indexed)
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.totalItems - Total number of items
 * @param {number} props.pageSize - Items per page
 * @param {Function} props.onPageChange - Page change handler
 * @returns {JSX.Element} Pagination controls
 */
export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
      <p className="text-sm text-gray-600">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{totalItems}</span> results
      </p>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'w-8 h-8 text-sm font-medium rounded-lg transition-colors',
                  currentPage === pageNum
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Table;

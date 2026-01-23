/**
 * @fileoverview Empty State Component
 * @description Reusable empty state component for when no data is available.
 *
 * @module components/ui/EmptyState
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { cn } from '../../utils/helpers';
import { Button } from './index';

/**
 * Empty state component for empty lists/tables
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.icon - Icon to display
 * @param {string} props.title - Title text
 * @param {string} [props.description] - Description text
 * @param {string} [props.actionLabel] - Action button label
 * @param {Function} [props.onAction] - Action button handler
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Empty state element
 *
 * @example
 * <EmptyState 
 *   icon={<Building className="w-12 h-12" />}
 *   title="No floors yet"
 *   description="Get started by adding your first floor map."
 *   actionLabel="Add Floor"
 *   onAction={() => navigate('/floors/new')}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {icon && (
        <div className="text-gray-300 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-6 max-w-md">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Error state component for failed data loading
 *
 * @param {Object} props - Component props
 * @param {string} [props.title='Something went wrong'] - Title text
 * @param {string} [props.message] - Error message
 * @param {Function} [props.onRetry] - Retry handler
 * @returns {JSX.Element} Error state element
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading data. Please try again.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-danger-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-danger-500\" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

export default EmptyState;

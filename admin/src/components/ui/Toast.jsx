/**
 * @fileoverview Toast Notification Component
 * @description Toast notification system for success, error, warning, and info messages.
 *
 * @module components/ui/Toast
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../utils/helpers';

/**
 * Individual Toast component
 *
 * @param {Object} props - Component props
 * @param {string} props.id - Toast ID
 * @param {string} props.message - Toast message
 * @param {string} [props.type='info'] - Toast type: 'success', 'error', 'warning', 'info'
 * @param {Function} props.onClose - Close handler
 * @param {number} [props.duration=4000] - Auto-close duration in ms (0 to disable)
 * @returns {JSX.Element} Toast element
 */
export function Toast({
  id,
  message,
  type = 'info',
  onClose,
  duration = 4000,
}) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    success: 'bg-success-50 border-success-200 text-success-800',
    error: 'bg-danger-50 border-danger-200 text-danger-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    info: 'bg-primary-50 border-primary-200 text-primary-800',
  };

  const iconStyles = {
    success: 'text-success-500',
    error: 'text-danger-500',
    warning: 'text-warning-500',
    info: 'text-primary-500',
  };

  const Icon = icons[type] || Info;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 border rounded-lg shadow-lg animate-slide-in max-w-md',
        styles[type]
      )}
      role="alert"
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconStyles[type])} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Toast container component
 * Renders multiple toasts in a fixed position
 *
 * @param {Object} props - Component props
 * @param {Array} props.toasts - Array of toast objects
 * @param {Function} props.onClose - Close handler
 * @param {string} [props.position='top-right'] - Position on screen
 * @returns {JSX.Element} Toast container
 */
export function ToastContainer({
  toasts,
  onClose,
  position = 'top-right',
}) {
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  if (toasts.length === 0) return null;

  return (
    <div 
      className={cn('fixed z-50 flex flex-col gap-2', positions[position])}
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

/**
 * Hook for managing toast notifications
 * @returns {Object} Toast management functions
 */
export function useToast() {
  // This will be implemented with Redux
  return {
    toast: () => {},
    success: () => {},
    error: () => {},
    warning: () => {},
    info: () => {},
  };
}

export default Toast;

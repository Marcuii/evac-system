/**
 * @fileoverview Modal Component
 * @description Reusable modal/dialog component with animation and accessibility.
 *
 * @module components/ui/Modal
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { Button } from './index';

/**
 * Modal component for dialogs and overlays
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Modal visibility state
 * @param {Function} props.onClose - Close handler
 * @param {string} [props.title] - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} [props.size='default'] - Modal size: 'small', 'default', 'large', 'xl', 'full'
 * @param {boolean} [props.showClose=true] - Show close button
 * @param {React.ReactNode} [props.footer] - Footer content
 * @returns {JSX.Element|null} Modal element or null if closed
 *
 * @example
 * <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Edit Floor">
 *   <p>Modal content here</p>
 * </Modal>
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'default',
  showClose = true,
  footer,
  className = '',
}) {
  // Handle escape key
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizes = {
    small: 'max-w-md',
    default: 'max-w-lg',
    large: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={cn(
          'relative w-full bg-white rounded-xl shadow-2xl animate-slide-in',
          sizes[size],
          className
        )}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            {title && (
              <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
                {title}
              </h2>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Confirmation modal for delete/destructive actions
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onConfirm - Confirm handler
 * @param {string} [props.title='Confirm Action'] - Modal title
 * @param {string} [props.message] - Confirmation message
 * @param {string} [props.confirmText='Confirm'] - Confirm button text
 * @param {string} [props.variant='danger'] - Button variant
 * @param {boolean} [props.loading=false] - Loading state
 * @returns {JSX.Element|null} Confirmation modal
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to continue? This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-gray-600">{message}</p>
    </Modal>
  );
}

export default Modal;

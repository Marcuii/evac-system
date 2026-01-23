/**
 * @fileoverview UI Component Library
 * @description Reusable UI components with consistent styling and variants.
 *              Built with Tailwind CSS and designed for the EES application.
 *
 * @module components/ui
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @exports Button - Multi-variant button component
 * @exports Input - Form input with label and error handling
 * @exports Card - Container card with shadow
 * @exports Badge - Status badge component
 */

import { cn } from '../../utils/helpers';

/* ============================================================
 * BUTTON COMPONENT
 * ============================================================ */

/**
 * Button component with multiple variants and sizes
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} [props.variant='primary'] - Button variant: 'primary', 'danger', 'success', 'outline', 'ghost'
 * @param {string} [props.size='default'] - Button size: 'small', 'default', 'large'
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {Function} [props.onClick] - Click handler
 * @returns {JSX.Element} Button element
 *
 * @example
 * <Button variant="primary" onClick={handleClick}>Save</Button>
 * <Button variant="danger" size="small">Delete</Button>
 */
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'default',
  disabled = false,
  className = '',
  onClick,
  ...props 
}) {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 hover:shadow-lg hover:shadow-primary-500/30 hover:-translate-y-0.5',
    danger: 'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-500 hover:shadow-lg hover:shadow-danger-500/30 hover:-translate-y-0.5',
    success: 'bg-success-500 text-white hover:bg-success-600 focus:ring-success-500 hover:shadow-lg hover:shadow-success-500/30 hover:-translate-y-0.5',
    outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
  };
  
  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2.5 text-base',
    large: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        disabled && 'hover:transform-none hover:shadow-none',
        className
      )}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

/* ============================================================
 * INPUT COMPONENT
 * ============================================================ */

/**
 * Form input component with label and error support
 *
 * @param {Object} props - Component props
 * @param {string} [props.label] - Input label text
 * @param {string} [props.hint] - Helper text shown below input
 * @param {string} [props.error] - Error message (replaces hint when present)
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Input with label and messages
 *
 * @example
 * <Input label="Server URL" hint="Enter the backend server address" />
 * <Input label="Email" error="Invalid email format" />
 */
export function Input({
  label,
  hint,
  error,
  className = '',
  ...props
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base transition-colors duration-200',
          'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20',
          className
        )}
        {...props}
      />
      {hint && !error && (
        <p className="text-sm text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="text-sm text-danger-500">{error}</p>
      )}
    </div>
  );
}

/* ============================================================
 * CARD COMPONENT
 * ============================================================ */

/**
 * Card container component with shadow
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Card container element
 *
 * @example
 * <Card className="p-6">
 *   <h2>Card Title</h2>
 *   <p>Card content</p>
 * </Card>
 */
export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-lg shadow-black/5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ============================================================
 * BADGE COMPONENT
 * ============================================================ */

/**
 * Badge component for status indicators
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Badge content
 * @param {string} [props.variant='default'] - Badge variant: 'default', 'primary', 'success', 'warning', 'danger'
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Badge element
 *
 * @example
 * <Badge variant="success">Connected</Badge>
 * <Badge variant="danger">Offline</Badge>
 */
export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    danger: 'bg-danger-100 text-danger-700',
  };
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

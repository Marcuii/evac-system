/**
 * @fileoverview UI Component Library - Core Components
 * @description Reusable UI components with consistent styling and variants.
 *              Built with Tailwind CSS and designed for the EES Admin Dashboard.
 *
 * @module components/ui
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @exports Button - Multi-variant button component
 * @exports Input - Form input with label and error handling
 * @exports Select - Dropdown select component
 * @exports Textarea - Multi-line text input
 * @exports Card - Container card with shadow
 * @exports Badge - Status badge component
 * @exports Spinner - Loading spinner
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
 * @param {string} [props.variant='primary'] - Button variant
 * @param {string} [props.size='default'] - Button size
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.loading=false] - Loading state
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {Function} [props.onClick] - Click handler
 * @returns {JSX.Element} Button element
 *
 * @example
 * <Button variant="primary" onClick={handleClick}>Save</Button>
 * <Button variant="danger" size="small" loading>Deleting...</Button>
 */
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'default',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button',
  ...props 
}) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 hover:shadow-lg hover:shadow-primary-500/30 hover:-translate-y-0.5',
    danger: 'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-500 hover:shadow-lg hover:shadow-danger-500/30 hover:-translate-y-0.5',
    success: 'bg-success-500 text-white hover:bg-success-600 focus:ring-success-500 hover:shadow-lg hover:shadow-success-500/30 hover:-translate-y-0.5',
    warning: 'bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-500 hover:shadow-lg hover:shadow-warning-500/30 hover:-translate-y-0.5',
    outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
    'outline-primary': 'border-2 border-primary-500 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
    'outline-danger': 'border-2 border-danger-500 text-danger-600 hover:bg-danger-50 focus:ring-danger-500',
  };
  
  const sizes = {
    small: 'px-3 py-1.5 text-sm gap-1.5',
    default: 'px-4 py-2.5 text-base gap-2',
    large: 'px-6 py-3 text-lg gap-2.5',
  };
  
  return (
    <button
      type={type}
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        (disabled || loading) && 'hover:transform-none hover:shadow-none',
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
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
 * @param {string} [props.error] - Error message
 * @param {React.ReactNode} [props.icon] - Icon to display in input
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
  icon,
  className = '',
  id,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base transition-colors duration-200',
            'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            'placeholder:text-gray-400',
            error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20',
            icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {hint && !error && (
        <p className="text-sm text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="text-sm text-danger-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

/* ============================================================
 * SELECT COMPONENT
 * ============================================================ */

/**
 * Dropdown select component with label support
 *
 * @param {Object} props - Component props
 * @param {string} [props.label] - Select label text
 * @param {Array} props.options - Array of { value, label } options
 * @param {string} [props.error] - Error message
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Select with label
 *
 * @example
 * <Select label="Status" options={[{ value: 'active', label: 'Active' }]} />
 */
export function Select({
  label,
  options = [],
  error,
  className = '',
  placeholder = 'Select...',
  id,
  ...props
}) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base transition-colors duration-200',
          'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          'bg-white cursor-pointer',
          error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-danger-500">{error}</p>
      )}
    </div>
  );
}

/* ============================================================
 * TEXTAREA COMPONENT
 * ============================================================ */

/**
 * Multi-line text input component
 *
 * @param {Object} props - Component props
 * @param {string} [props.label] - Textarea label text
 * @param {string} [props.hint] - Helper text
 * @param {string} [props.error] - Error message
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Textarea with label
 */
export function Textarea({
  label,
  hint,
  error,
  className = '',
  rows = 4,
  id,
  ...props
}) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={cn(
          'w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base transition-colors duration-200',
          'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          'placeholder:text-gray-400 resize-none',
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
 * @param {string} [props.title] - Card title
 * @param {React.ReactNode} [props.action] - Action element in header
 * @param {boolean} [props.hoverable=false] - Enable hover effect
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Card container element
 *
 * @example
 * <Card title="Statistics" action={<Button>Refresh</Button>}>
 *   <p>Card content</p>
 * </Card>
 */
export function Card({ 
  children, 
  title, 
  action, 
  hoverable = false, 
  className = '', 
  ...props 
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-lg shadow-black/5 overflow-hidden',
        hoverable && 'card-hover cursor-pointer',
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
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
 * @param {string} [props.variant='default'] - Badge variant
 * @param {boolean} [props.dot=false] - Show status dot
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Badge element
 *
 * @example
 * <Badge variant="success" dot>Connected</Badge>
 * <Badge variant="danger">Offline</Badge>
 */
export function Badge({ 
  children, 
  variant = 'default', 
  dot = false, 
  className = '' 
}) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    danger: 'bg-danger-100 text-danger-700',
  };
  
  const dotColors = {
    default: 'bg-gray-500',
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
  };
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span className={cn('w-2 h-2 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

/* ============================================================
 * SPINNER COMPONENT
 * ============================================================ */

/**
 * Loading spinner component
 *
 * @param {Object} props - Component props
 * @param {string} [props.size='default'] - Spinner size
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Spinner element
 */
export function Spinner({ size = 'default', className = '' }) {
  const sizes = {
    small: 'h-4 w-4',
    default: 'h-6 w-6',
    large: 'h-8 w-8',
  };
  
  return (
    <svg 
      className={cn('animate-spin text-primary-500', sizes[size], className)} 
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4" 
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
      />
    </svg>
  );
}

/* ============================================================
 * LOADING OVERLAY
 * ============================================================ */

/**
 * Full-page loading overlay
 *
 * @param {Object} props - Component props
 * @param {string} [props.message='Loading...'] - Loading message
 * @returns {JSX.Element} Loading overlay
 */
export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="large" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

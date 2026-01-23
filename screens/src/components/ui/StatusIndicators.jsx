/**
 * @fileoverview Status Indicator Components
 * @description Visual status indicators for connection state, heartbeat,
 *              and data source mode. Used throughout the application UI.
 *
 * @module components/ui/StatusIndicators
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @exports StatusDot - Animated status dot
 * @exports ConnectionStatus - Full connection status display
 * @exports HeartbeatIndicator - Heartbeat animation with timestamp
 * @exports DataSourceIndicator - Data source mode badge
 */

import { cn } from '../../utils/helpers';

/* ============================================================
 * STATUS DOT
 * ============================================================ */

/**
 * Animated status dot indicator
 * Displays green for connected, red for disconnected with pulse animation
 *
 * @param {Object} props - Component props
 * @param {boolean} props.connected - Whether status is connected/active
 * @returns {JSX.Element} Animated dot element
 *
 * @example
 * <StatusDot connected={true} />
 */
export function StatusDot({ connected }) {
  return (
    <span
      className={cn(
        'inline-block w-3 h-3 rounded-full',
        connected 
          ? 'bg-success-500 animate-pulse-slow' 
          : 'bg-danger-500 animate-pulse-slow'
      )}
    />
  );
}

/* ============================================================
 * CONNECTION STATUS
 * ============================================================ */

/**
 * Full connection status display with dot and text
 * Shows connecting, connected, or disconnected state
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Whether connected to server
 * @param {boolean} props.isConnecting - Whether connection in progress
 * @returns {JSX.Element} Status display with dot and label
 *
 * @example
 * <ConnectionStatus isConnected={true} isConnecting={false} />
 */
export function ConnectionStatus({ isConnected, isConnecting }) {
  return (
    <div className="flex items-center gap-2">
      <StatusDot connected={isConnected} />
      <span
        className={cn(
          'font-medium',
          isConnecting && 'text-warning-500',
          isConnected && 'text-success-500',
          !isConnected && !isConnecting && 'text-danger-500'
        )}
      >
        {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

/* ============================================================
 * HEARTBEAT INDICATOR
 * ============================================================ */

/**
 * Heartbeat status indicator with animation and timestamp
 * Shows animated heart when heartbeat is active
 *
 * @param {Object} props - Component props
 * @param {boolean} props.active - Whether heartbeat is active
 * @param {string} props.lastHeartbeat - ISO timestamp of last heartbeat
 * @returns {JSX.Element} Heartbeat indicator with timestamp
 *
 * @example
 * <HeartbeatIndicator active={true} lastHeartbeat="2024-01-01T12:00:00Z" />
 */
export function HeartbeatIndicator({ active, lastHeartbeat }) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <span className={cn('text-xl', active && 'animate-heartbeat')}>💓</span>
      <span className="text-sm">
        {active 
          ? `Heartbeat sent (${new Date(lastHeartbeat).toLocaleTimeString()})` 
          : 'No heartbeat'
        }
      </span>
    </div>
  );
}

/* ============================================================
 * DATA SOURCE INDICATOR
 * ============================================================ */

/**
 * Data source mode indicator badge
 * Shows whether data is from WebSocket or USRP radio
 *
 * @param {Object} props - Component props
 * @param {string} [props.source] - Data source: 'socket' or 'usrp'
 * @param {boolean} [props.usrpMode] - Whether USRP mode is active
 * @returns {JSX.Element|null} Source indicator badge or null if no source
 *
 * @example
 * <DataSourceIndicator source="socket" usrpMode={false} />
 */
export function DataSourceIndicator({ source, usrpMode }) {
  if (!source && !usrpMode) return null;
  
  const isUsrp = source === 'usrp' || usrpMode;
  
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg',
      isUsrp ? 'bg-warning-50 text-warning-700' : 'bg-success-50 text-success-700'
    )}>
      {isUsrp ? (
        <>
          <span>📡</span>
          <span className="font-medium">USRP Mode</span>
        </>
      ) : (
        <>
          <span>🌐</span>
          <span className="font-medium">WebSocket</span>
        </>
      )}
    </div>
  );
}

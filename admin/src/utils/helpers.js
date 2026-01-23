/**
 * @fileoverview Utility Helpers
 * @description Common utility functions used throughout the admin application.
 *              Includes class name merging, formatting, and status utilities.
 *
 * @module utils/helpers
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { API_CONFIG } from '../config';

/* ============================================================
 * CLASS NAME UTILITIES
 * ============================================================ */

/**
 * Merge Tailwind CSS classes with proper conflict resolution
 * Combines clsx conditional logic with tailwind-merge deduplication
 *
 * @param {...(string|Object|Array)} inputs - Class names or conditional objects
 * @returns {string} Merged class string
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-blue-500', { 'text-white': isActive })
 * // => 'px-4 py-2 bg-blue-500 text-white' (when isActive is true)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/* ============================================================
 * STATUS STYLING UTILITIES
 * ============================================================ */

/**
 * Get Tailwind classes for status badge styling
 *
 * @param {string} status - Status value: 'active', 'disabled', 'maintenance', 'error'
 * @returns {Object} Object with bg and text color classes
 *
 * @example
 * getStatusColors('active') // => { bg: 'bg-success-100', text: 'text-success-700' }
 */
export function getStatusColors(status) {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'online':
    case 'connected':
      return { bg: 'bg-success-100', text: 'text-success-700', dot: 'bg-success-500' };
    case 'disabled':
    case 'offline':
    case 'disconnected':
      return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
    case 'maintenance':
    case 'warning':
      return { bg: 'bg-warning-100', text: 'text-warning-700', dot: 'bg-warning-500' };
    case 'error':
    case 'critical':
      return { bg: 'bg-danger-100', text: 'text-danger-700', dot: 'bg-danger-500' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
  }
}

/**
 * Get Tailwind classes for hazard level or detection type display
 *
 * @param {string} level - Hazard level or detection type
 * @param {string} type - Return type: 'full' for full class string, 'bg' for background only
 * @returns {string} Tailwind class string for container styling
 */
export function getHazardColor(level, type = 'full') {
  let colors;
  
  switch (level?.toLowerCase()) {
    case 'fire':
    case 'high':
    case 'critical':
      colors = { bg: 'bg-danger-50', text: 'text-danger-500', border: 'border-danger-200' };
      break;
    case 'smoke':
    case 'moderate':
    case 'medium':
      colors = { bg: 'bg-warning-50', text: 'text-warning-500', border: 'border-warning-200' };
      break;
    case 'people':
    case 'crowd':
      colors = { bg: 'bg-primary-50', text: 'text-primary-500', border: 'border-primary-200' };
      break;
    case 'safe':
    case 'low':
      colors = { bg: 'bg-success-50', text: 'text-success-500', border: 'border-success-200' };
      break;
    default:
      colors = { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' };
  }
  
  if (type === 'bg') return colors.bg;
  if (type === 'text') return colors.text;
  if (type === 'border') return colors.border;
  return `${colors.text} ${colors.bg} ${colors.border}`;
}

/* ============================================================
 * FORMATTING UTILITIES
 * ============================================================ */

/**
 * Format a date string to a human-readable format
 *
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  if (!date) return 'N/A';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format a date to relative time (e.g., "2 hours ago")
 *
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return 'N/A';
  
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  
  return formatDate(date, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format distance value with appropriate unit
 *
 * @param {number} [distanceMeters] - Distance in meters
 * @param {number} [distancePixels] - Distance in pixels (fallback)
 * @returns {string} Formatted distance string (e.g., '15.5m' or '200.0px')
 */
export function formatDistance(distanceMeters, distancePixels) {
  if (distanceMeters !== undefined && distanceMeters !== null) {
    return `${distanceMeters.toFixed(1)}m`;
  }
  if (distancePixels !== undefined && distancePixels !== null) {
    return `${distancePixels.toFixed(1)}px`;
  }
  return 'N/A';
}

/**
 * Format file size in bytes to human readable string
 *
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size string (e.g., '1.5 MB')
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/* ============================================================
 * VALIDATION UTILITIES
 * ============================================================ */

/**
 * Validate a floor ID format
 *
 * @param {string} id - Floor ID to validate
 * @returns {boolean} True if valid
 */
export function isValidFloorId(id) {
  if (!id || typeof id !== 'string') return false;
  // Allow alphanumeric, underscores, and hyphens
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Validate JSON string
 *
 * @param {string} str - String to validate
 * @returns {boolean} True if valid JSON
 */
export function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely parse JSON with fallback
 *
 * @param {string} str - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed value or fallback
 */
export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/* ============================================================
 * ARRAY UTILITIES
 * ============================================================ */

/**
 * Group an array of objects by a key
 *
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object} Grouped object
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    result[group] = result[group] || [];
    result[group].push(item);
    return result;
  }, {});
}

/**
 * Debounce a function call
 *
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/* ============================================================
 * IMAGE URL UTILITIES
 * Functions to construct image URLs with local-first fallback
 * ============================================================ */

/**
 * Get the base URL for the API server
 * @returns {string} API base URL
 */
export function getApiBaseUrl() {
  return API_CONFIG.BASE_URL || 'http://localhost:3000';
}

/**
 * Construct floor map image URL (local server first)
 * Tries local server /floors/{floorId}.jpg first
 * 
 * @param {string} floorId - The floor ID
 * @param {Object} mapImage - The mapImage object from floor data
 * @returns {string|null} Image URL or null if no image available
 */
export function getFloorImageUrl(floorId, mapImage) {
  if (!floorId) return mapImage?.url || mapImage?.localUrl || null;
  
  // Construct local server URL
  const localUrl = `${getApiBaseUrl()}/floors/${floorId}.jpg`;
  return localUrl;
}

/**
 * Get fallback URL for floor image when local fails
 * 
 * @param {Object} mapImage - The mapImage object from floor data
 * @returns {string|null} Fallback URL or null
 */
export function getFloorImageFallback(mapImage) {
  return mapImage?.url || mapImage?.localUrl || null;
}

/**
 * Construct record image URL using local server path
 * Uses local server /images/{localPath} instead of cloudinary
 * 
 * @param {Object} record - The record object
 * @returns {string|null} Image URL or null if no image available
 */
export function getRecordImageUrl(record) {
  if (!record) return null;
  
  // Use local path if available - construct local server URL
  if (record.localPath) {
    // localPath format is like "2025/01/23/cam1_1234567890.jpg"
    return `${getApiBaseUrl()}/images/${record.localPath}`;
  }
  
  // Fallback to cloud URL if no local path
  return record.cloudUrl || null;
}

/* ============================================================
 * FLOOR DATA UTILITIES
 * Helper functions for floor data transformation
 * ============================================================ */

/**
 * Get camera count from floor data
 * Handles both new format (cameras array) and legacy format (cameraToEdge object)
 * 
 * @param {Object} floor - The floor object
 * @returns {number} Number of cameras
 */
export function getCameraCount(floor) {
  if (!floor) return 0;
  if (Array.isArray(floor.cameras)) return floor.cameras.length;
  if (floor.cameraToEdge) return Object.keys(floor.cameraToEdge).length;
  return 0;
}

/**
 * Get screen count from floor data
 * Handles both new format (screens array) and legacy format (startPoints array)
 * 
 * @param {Object} floor - The floor object
 * @returns {number} Number of screens
 */
export function getScreenCount(floor) {
  if (!floor) return 0;
  if (Array.isArray(floor.screens)) return floor.screens.length;
  if (Array.isArray(floor.startPoints)) return floor.startPoints.length;
  return 0;
}

/**
 * @fileoverview Utility Helpers
 * @description Common utility functions used throughout the application.
 *              Includes class name merging, hazard level styling, and formatting.
 *
 * @module utils/helpers
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
 * HAZARD LEVEL STYLING
 * ============================================================ */

/**
 * Get Tailwind classes for hazard level container
 * Returns text, background, and border colors based on hazard level
 *
 * @param {string} level - Hazard level: 'safe', 'low', 'moderate', 'medium', 'high', 'critical'
 * @returns {string} Tailwind class string for container styling
 *
 * @example
 * getHazardColor('high') // => 'text-danger-500 bg-danger-50 border-danger-200'
 */
export function getHazardColor(level) {
  switch (level?.toLowerCase()) {
    case 'safe':
    case 'low':
      return 'text-success-500 bg-success-50 border-success-200';
    case 'moderate':
    case 'medium':
      return 'text-warning-500 bg-warning-50 border-warning-200';
    case 'high':
      return 'text-danger-500 bg-danger-50 border-danger-200';
    case 'critical':
      return 'text-danger-700 bg-danger-100 border-danger-300';
    default:
      return 'text-gray-500 bg-gray-50 border-gray-200';
  }
}

/**
 * Get Tailwind background color class for hazard level badges
 *
 * @param {string} level - Hazard level
 * @returns {string} Tailwind background class
 *
 * @example
 * getHazardBadgeColor('critical') // => 'bg-danger-700'
 */
export function getHazardBadgeColor(level) {
  switch (level?.toLowerCase()) {
    case 'safe':
    case 'low':
      return 'bg-success-500';
    case 'moderate':
    case 'medium':
      return 'bg-warning-500';
    case 'high':
      return 'bg-danger-500';
    case 'critical':
      return 'bg-danger-700';
    default:
      return 'bg-gray-500';
  }
}

/* ============================================================
 * FORMATTING UTILITIES
 * ============================================================ */

/**
 * Format distance value with appropriate unit
 * Prefers meters over pixels if available
 *
 * @param {number} [distanceMeters] - Distance in meters
 * @param {number} [distancePixels] - Distance in pixels (fallback)
 * @returns {string} Formatted distance string (e.g., '15.5m' or '200.0px')
 *
 * @example
 * formatDistance(15.5) // => '15.5m'
 * formatDistance(null, 200) // => '200.0px'
 */
export function formatDistance(distanceMeters, distancePixels) {
  if (distanceMeters !== undefined && distanceMeters !== null) {
    return `${distanceMeters.toFixed(1)}m`;
  }
  if (distancePixels !== undefined && distancePixels !== null) {
    return `${distancePixels.toFixed(1)}px`;
  }
  return '-';
}

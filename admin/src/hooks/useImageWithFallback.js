/**
 * @fileoverview Image with Fallback Hook
 * @description Custom hook for handling image loading with automatic fallback URL.
 *              Provides error handling and state management for image loading.
 *
 * @module hooks/useImageWithFallback
 * @author Marcelino Saad
 * @version 1.0.0
 *
 * @example
 * function MyComponent({ floor }) {
 *   const primaryUrl = getFloorImageUrl(floor.id, floor.mapImage);
 *   const fallbackUrl = getFloorImageFallback(floor.mapImage);
 *   const { imageUrl, handleError, hasError } = useImageWithFallback(primaryUrl, fallbackUrl);
 *
 *   return <img src={imageUrl} onError={handleError} alt="Floor map" />;
 * }
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for image loading with automatic fallback
 *
 * @param {string|null} primaryUrl - Primary image URL to try first
 * @param {string|null} fallbackUrl - Fallback URL if primary fails
 * @returns {Object} Object containing imageUrl, handleError callback, and hasError state
 *
 * @description
 * This hook manages the state for loading images with a fallback mechanism.
 * It first attempts to load the primary URL, and if that fails (onError),
 * it automatically switches to the fallback URL.
 *
 * State is reset when the primary URL changes, allowing the hook to work
 * correctly when displaying different images (e.g., when navigating between floors).
 */
export function useImageWithFallback(primaryUrl, fallbackUrl) {
  const [hasError, setHasError] = useState(false);

  // Reset error state when primary URL changes
  useEffect(() => {
    setHasError(false);
  }, [primaryUrl]);

  // Determine which URL to use
  const imageUrl = hasError ? fallbackUrl : primaryUrl;

  // Error handler callback - memoized to prevent unnecessary rerenders
  const handleError = useCallback(() => {
    if (!hasError && fallbackUrl) {
      setHasError(true);
    }
  }, [hasError, fallbackUrl]);

  return {
    /** Current image URL (primary or fallback) */
    imageUrl,
    /** Error handler to attach to img onError */
    handleError,
    /** Whether the primary image failed to load */
    hasError,
  };
}

export default useImageWithFallback;

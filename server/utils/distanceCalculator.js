/**
 * @fileoverview Distance Calculator Utility
 * @description Calculates real-world distances between graph nodes
 *              using floor plan scale information.
 * 
 * @module utils/distanceCalculator
 * @author Marcelino Saad
 * @version 1.0.0
 * 
 * @exports calculateRealWorldDistance - Convert pixel distance to meters
 */

/**
 * Calculate real-world distance between two nodes based on floor scale.
 * 
 * @function calculateRealWorldDistance
 * @param {Object} node1 - First node with pixel coordinates
 * @param {number} node1.x - X coordinate in pixels
 * @param {number} node1.y - Y coordinate in pixels
 * @param {Object} node2 - Second node with pixel coordinates
 * @param {number} node2.x - X coordinate in pixels
 * @param {number} node2.y - Y coordinate in pixels
 * @param {Object|null} scale - Scale information from floor map
 * @param {number} scale.widthPixels - Image width in pixels
 * @param {number} scale.heightPixels - Image height in pixels
 * @param {number} scale.widthMeters - Real-world width in meters
 * @param {number} scale.heightMeters - Real-world height in meters
 * @returns {number} Distance in meters (or pixels if no scale provided)
 * 
 * @description
 * Conversion process:
 * 1. Calculate Euclidean distance in pixels
 * 2. Calculate scale factor (pixels per meter) for both axes
 * 3. Use average scale for conversion (handles non-uniform scaling)
 * 4. Convert pixel distance to real-world meters
 * 
 * @example
 * const distance = calculateRealWorldDistance(
 *   { x: 100, y: 100 },
 *   { x: 200, y: 200 },
 *   { widthPixels: 1000, heightPixels: 800, widthMeters: 50, heightMeters: 40 }
 * );
 * // Returns: ~7.07 meters
 */
export const calculateRealWorldDistance = (node1, node2, scale) => {
  // If no scale provided, return Euclidean distance in pixels
  // This is a fallback for floors without real-world dimensions
  if (!scale || !scale.widthPixels || !scale.widthMeters) {
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Calculate pixel distance using Euclidean formula
  const dx = node2.x - node1.x;
  const dy = node2.y - node1.y;
  const pixelDistance = Math.sqrt(dx * dx + dy * dy);

  // Calculate scale factor (pixels per meter)
  // Using average of both dimensions for better accuracy
  // (handles cases where X and Y scales differ slightly)
  const scaleX = scale.widthPixels / scale.widthMeters;
  const scaleY = scale.heightPixels / scale.heightMeters;
  const averageScale = (scaleX + scaleY) / 2;

  // Convert pixel distance to meters
  const meterDistance = pixelDistance / averageScale;

  return meterDistance;
};

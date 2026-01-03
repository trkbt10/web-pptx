/**
 * @file Rotation calculation utilities
 *
 * Pure functions for calculating shape rotation transformations.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Point in 2D space
 */
export type Point = {
  readonly x: number;
  readonly y: number;
};

/**
 * Rotation result for a shape
 */
export type RotationResult = {
  /** New X position (top-left) */
  readonly x: number;
  /** New Y position (top-left) */
  readonly y: number;
  /** New rotation angle in degrees */
  readonly rotation: number;
};

// =============================================================================
// Angle Utilities
// =============================================================================

/**
 * Normalize angle to 0-360 range.
 */
export function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  // Handle -0 edge case
  return normalized === 0 ? 0 : normalized;
}

/**
 * Convert degrees to radians.
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees.
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculate the angle (in degrees) from a center point to another point.
 */
export function calculateAngleFromCenter(
  centerX: number,
  centerY: number,
  pointX: number,
  pointY: number
): number {
  return radiansToDegrees(Math.atan2(pointY - centerY, pointX - centerX));
}

// =============================================================================
// Angle Snapping
// =============================================================================

/**
 * Default snap angles (every 45 degrees).
 */
export const DEFAULT_SNAP_ANGLES: readonly number[] = [
  0, 45, 90, 135, 180, 225, 270, 315,
];

/**
 * Default snap threshold in degrees.
 */
export const DEFAULT_SNAP_THRESHOLD = 5;

/**
 * Snap angle to nearest snap point if within threshold.
 *
 * @param angle - The angle to potentially snap
 * @param snapAngles - Array of angles to snap to
 * @param threshold - Maximum distance from snap point to trigger snapping
 * @returns The snapped angle, or original if not within threshold of any snap point
 */
export function snapAngle(
  angle: number,
  snapAngles: readonly number[] = DEFAULT_SNAP_ANGLES,
  threshold: number = DEFAULT_SNAP_THRESHOLD
): number {
  for (const snapAngleValue of snapAngles) {
    const diff = Math.abs(normalizeAngle(angle - snapAngleValue));
    // Check both sides of the 0/360 boundary
    if (diff < threshold || diff > 360 - threshold) {
      return snapAngleValue;
    }
  }
  return angle;
}

// =============================================================================
// Point Rotation
// =============================================================================

/**
 * Rotate a point around a center point.
 *
 * @param point - The point to rotate
 * @param center - The center of rotation
 * @param angleRad - Rotation angle in radians
 * @returns The rotated point
 */
export function rotatePointAroundCenter(
  point: Point,
  center: Point,
  angleRad: number
): Point {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * Calculate the center point of a shape given its bounds.
 */
export function calculateShapeCenter(
  x: number,
  y: number,
  width: number,
  height: number
): Point {
  return {
    x: x + width / 2,
    y: y + height / 2,
  };
}

// =============================================================================
// Multi-Selection Rotation
// =============================================================================

/**
 * Calculate new position and rotation for a shape when rotating around a combined center.
 *
 * Used for multi-selection rotation where each shape rotates around the group center.
 *
 * @param shapeX - Shape's initial X position (top-left)
 * @param shapeY - Shape's initial Y position (top-left)
 * @param shapeWidth - Shape's width
 * @param shapeHeight - Shape's height
 * @param initialRotation - Shape's initial rotation in degrees
 * @param combinedCenterX - X coordinate of the combined rotation center
 * @param combinedCenterY - Y coordinate of the combined rotation center
 * @param deltaAngleDeg - Rotation delta in degrees
 * @returns New position and rotation for the shape
 */
export function rotateShapeAroundCenter(
  shapeX: number,
  shapeY: number,
  shapeWidth: number,
  shapeHeight: number,
  initialRotation: number,
  combinedCenterX: number,
  combinedCenterY: number,
  deltaAngleDeg: number
): RotationResult {
  // Calculate shape center
  const shapeCenter = calculateShapeCenter(shapeX, shapeY, shapeWidth, shapeHeight);

  // Rotate shape center around combined center
  const deltaRad = degreesToRadians(deltaAngleDeg);
  const newCenter = rotatePointAroundCenter(
    shapeCenter,
    { x: combinedCenterX, y: combinedCenterY },
    deltaRad
  );

  // Calculate new top-left position
  const newX = newCenter.x - shapeWidth / 2;
  const newY = newCenter.y - shapeHeight / 2;

  // Update the shape's individual rotation
  const newRotation = normalizeAngle(initialRotation + deltaAngleDeg);

  return {
    x: newX,
    y: newY,
    rotation: newRotation,
  };
}

/**
 * Calculate rotation delta from initial angle to current pointer position.
 *
 * @param centerX - X coordinate of rotation center
 * @param centerY - Y coordinate of rotation center
 * @param currentX - Current pointer X coordinate
 * @param currentY - Current pointer Y coordinate
 * @param startAngle - Initial angle when drag started
 * @returns Delta angle in degrees
 */
export function calculateRotationDelta(
  centerX: number,
  centerY: number,
  currentX: number,
  currentY: number,
  startAngle: number
): number {
  const currentAngle = calculateAngleFromCenter(centerX, centerY, currentX, currentY);
  return currentAngle - startAngle;
}

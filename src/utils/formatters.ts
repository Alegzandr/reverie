/**
 * Formatting utilities for UI display values
 */

/**
 * Format a speed multiplier value for display
 * @param value - Speed multiplier value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with 'x' suffix
 */
export function formatSpeedMultiplier(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}x`;
}

/**
 * Format a percentage value for display
 * @param value - Decimal value (0.0 - 1.0)
 * @returns Formatted string with '%' suffix
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Format a bass boost intensity level as a label
 * @param value - Intensity value (0.0 - 1.0)
 * @param lightThreshold - Threshold for light intensity
 * @param normalThreshold - Threshold for normal intensity
 * @param labels - Translation labels for light, normal, and strong
 * @returns Intensity label string
 */
export function formatBassIntensityLabel(
  value: number,
  lightThreshold: number,
  normalThreshold: number,
  labels: { light: string; normal: string; strong: string }
): string {
  if (value < lightThreshold) return labels.light;
  if (value < normalThreshold) return labels.normal;
  return labels.strong;
}

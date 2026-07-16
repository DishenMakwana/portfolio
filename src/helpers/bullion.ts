/**
 * Adjust base price by a city-specific offset percentage multiplier.
 */
export function getAdjustedBullionPrice(
  basePrice: number,
  offset: number
): number {
  return Math.round(basePrice * (1 + offset));
}

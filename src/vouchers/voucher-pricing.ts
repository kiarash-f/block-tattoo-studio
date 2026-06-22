/**
 * Apply a whole-percent discount to a cents price, rounded HALF-UP to whole
 * cents. Integer math (multiply before divide) avoids float drift; money is
 * always positive so Math.round is genuine half-up.
 *
 * Single source of truth for the discounted gross — the price the buyer actually
 * pays — shared by the purchase flow (charged amount) and the public product
 * listing (finalPriceCents), so the displayed price can never drift from the
 * charged one.
 */
export function discountedGrossCents(
  priceCents: number,
  discountPercent: number,
): number {
  if (discountPercent <= 0) return priceCents;
  return Math.round((priceCents * (100 - discountPercent)) / 100);
}

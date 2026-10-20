/**
 * Utility functions for formatting Indian Rupees (₹) and numbers
 * using standard Indian numbering system (Lakhs, Crores, Thousands).
 */

/**
 * Format a number into Indian Rupees (₹).
 * Example:
 * 1500 -> "₹1,500"
 * 150000 -> "₹1,50,000"
 * 1250.75 -> "₹1,250.75"
 * -500 -> "-₹500"
 */
export function formatRupee(
  amount: number | string | undefined | null,
  options: {
    showDecimals?: boolean;
    alwaysSign?: boolean;
  } = {}
): string {
  const num = typeof amount === 'number' ? amount : Number(amount || 0);

  if (isNaN(num)) return '₹0';

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const hasDecimals = options.showDecimals ?? (absNum % 1 !== 0);

  // Format using en-IN locale
  let formatted = absNum.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 2,
  });

  const sign = isNegative ? '-' : options.alwaysSign && num > 0 ? '+' : '';
  return `${sign}₹${formatted}`;
}

/**
 * Short compact Rupee format for compact charts or badges.
 * Example:
 * 500 -> "₹500"
 * 25000 -> "₹25K"
 * 150000 -> "₹1.5L" (1.5 Lakh)
 * 12000000 -> "₹1.2Cr" (1.2 Crore)
 */
export function formatRupeeCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 10000000) {
    const cr = (abs / 10000000).toFixed(1).replace(/\.0$/, '');
    return `${sign}₹${cr}Cr`;
  }
  if (abs >= 100000) {
    const lk = (abs / 100000).toFixed(1).replace(/\.0$/, '');
    return `${sign}₹${lk}L`;
  }
  if (abs >= 1000) {
    const k = (abs / 1000).toFixed(1).replace(/\.0$/, '');
    return `${sign}₹${k}K`;
  }
  return `${sign}₹${abs}`;
}

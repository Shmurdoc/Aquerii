// Currency utilities for Aquerii
// Supports ZAR (South African Rand) and USD

export type Currency = 'ZAR' | 'USD';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  decimalPlaces: number;
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    decimalPlaces: 2
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2
  }
};

export const VAT_RATE = 0.15; // 15% VAT in South Africa

/**
 * Format amount as currency
 */
export function formatCurrency(amount: number, currency: Currency = 'ZAR'): string {
  const config = CURRENCIES[currency];
  const formatted = amount.toFixed(config.decimalPlaces);
  return `${config.symbol}${formatted}`;
}

/**
 * Format amount with thousands separator
 */
export function formatCurrencyWithSeparator(amount: number, currency: Currency = 'ZAR'): string {
  const config = CURRENCIES[currency];
  const formatted = amount.toLocaleString('en-ZA', {
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces
  });
  return `${config.symbol}${formatted}`;
}

/**
 * Calculate VAT amount
 */
export function calculateVAT(amount: number, vatRate: number = VAT_RATE): number {
  return Math.round(amount * vatRate * 100) / 100;
}

/**
 * Calculate amount including VAT
 */
export function calculateTotalWithVAT(amount: number, vatRate: number = VAT_RATE): number {
  const vat = calculateVAT(amount, vatRate);
  return Math.round((amount + vat) * 100) / 100;
}

/**
 * Calculate amount excluding VAT (reverse calculation)
 */
export function calculateAmountExcludingVAT(amountIncludingVAT: number, vatRate: number = VAT_RATE): number {
  return Math.round((amountIncludingVAT / (1 + vatRate)) * 100) / 100;
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbol and thousands separators
  const cleaned = value.replace(/[R$\s,]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency = 'ZAR'): string {
  return CURRENCIES[currency].symbol;
}

/**
 * Validate currency code
 */
export function isValidCurrency(code: string): code is Currency {
  return code in CURRENCIES;
}

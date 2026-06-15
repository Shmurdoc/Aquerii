import { formatCurrency } from '@/lib/erp'

describe('formatCurrency', () => {
  it('returns $0.00 for NaN input', () => {
    expect(formatCurrency(NaN, 'USD')).toBe('$0.00')
    expect(formatCurrency('not-a-number', 'USD')).toBe('$0.00')
    expect(formatCurrency(undefined as any, 'USD')).toBe('$0.00')
  })

  it('formats positive numbers correctly', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00')
    expect(formatCurrency(1, 'USD')).toBe('$1.00')
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50')
    expect(formatCurrency(99999.99, 'USD')).toBe('$99,999.99')
  })

  it('formats negative numbers correctly', () => {
    expect(formatCurrency(-1, 'USD')).toBe('-$1.00')
    expect(formatCurrency(-1234.5, 'USD')).toBe('-$1,234.50')
    expect(formatCurrency(-0.5, 'USD')).toBe('-$0.50')
  })

  it('handles string input', () => {
    expect(formatCurrency('42', 'USD')).toBe('$42.00')
    expect(formatCurrency('1234.56', 'USD')).toBe('$1,234.56')
    expect(formatCurrency('0', 'USD')).toBe('$0.00')
  })
})

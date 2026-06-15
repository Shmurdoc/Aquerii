import { formatCurrency } from '@/lib/erp'

describe('formatCurrency', () => {
  it('returns formatted $0.00 for NaN input', () => {
    const result = formatCurrency(NaN, 'USD')
    expect(result).toMatch(/\$0\.00/)
  })

  it('returns formatted $0.00 for invalid string input', () => {
    const result = formatCurrency('not-a-number', 'USD')
    expect(result).toMatch(/\$0\.00/)
  })

  it('returns formatted $0.00 for undefined input', () => {
    const result = formatCurrency(undefined as any, 'USD')
    expect(result).toMatch(/\$0\.00/)
  })

  it('formats positive numbers correctly', () => {
    expect(formatCurrency(0, 'USD')).toMatch(/\$0\.00/)
    expect(formatCurrency(1, 'USD')).toMatch(/\$1\.00/)
    expect(formatCurrency(1234.5, 'USD')).toMatch(/1,234\.50/)
    expect(formatCurrency(99999.99, 'USD')).toMatch(/99,999\.99/)
  })

  it('formats negative numbers correctly', () => {
    expect(formatCurrency(-1, 'USD')).toMatch(/-.*1\.00/)
    expect(formatCurrency(-1234.5, 'USD')).toMatch(/-.*1,234\.50/)
    expect(formatCurrency(-0.5, 'USD')).toMatch(/-.*0\.50/)
  })

  it('handles string input', () => {
    expect(formatCurrency('42', 'USD')).toMatch(/42\.00/)
    expect(formatCurrency('1234.56', 'USD')).toMatch(/1,234\.56/)
    expect(formatCurrency('0', 'USD')).toMatch(/\$0\.00/)
  })
})

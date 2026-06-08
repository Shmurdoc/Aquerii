import { formatCurrency } from '@/lib/erp'

describe('formatCurrency', () => {
  const hasTwoDecimals = (s: string) => /,\d{2}$/.test(s) || /\.\d{2}$/.test(s)

  it('returns ZAR format for NaN input', () => {
    expect(formatCurrency(NaN)).toMatch(/^R/)
    expect(formatCurrency('not-a-number')).toMatch(/^R/)
    expect(formatCurrency(undefined as any)).toMatch(/^R/)
  })

  it('formats positive numbers correctly (ZAR default)', () => {
    expect(formatCurrency(0)).toMatch(/^R/)
    expect(formatCurrency(1)).toMatch(/^R.*1/)
    expect(formatCurrency(1234.5)).toMatch(/^R/)
    expect(hasTwoDecimals(formatCurrency(1234.5))).toBe(true)
    expect(formatCurrency(99999.99)).toMatch(/^R/)
  })

  it('formats negative numbers correctly (ZAR default)', () => {
    expect(formatCurrency(-1)).toMatch(/^-R/)
    expect(formatCurrency(-0.5)).toMatch(/^-R/)
  })

  it('handles string input', () => {
    expect(formatCurrency('42')).toMatch(/^R/)
    expect(formatCurrency('1234.56')).toMatch(/^R/)
    expect(formatCurrency('0')).toMatch(/^R/)
  })
})

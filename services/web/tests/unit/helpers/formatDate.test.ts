import { formatDate } from '@/lib/erp'

describe('formatDate', () => {
  it('returns em dash for null or undefined', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  it('returns em dash for empty string', () => {
    expect(formatDate('')).toBe('—')
  })

  it('formats ISO date string correctly', () => {
    expect(formatDate('2024-03-15')).toBe('Mar 15, 2024')
    expect(formatDate('2024-12-25')).toBe('Dec 25, 2024')
  })

  it('formats ISO datetime string correctly', () => {
    expect(formatDate('2024-06-15T10:30:00Z')).toBe('Jun 15, 2024')
    expect(formatDate('2024-01-01T00:00:00Z')).toBe('Jan 1, 2024')
  })
})

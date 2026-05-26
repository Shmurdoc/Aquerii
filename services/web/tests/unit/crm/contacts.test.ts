import { scoreColor, validateContactForm } from '@/lib/crm'

describe('scoreColor', () => {
  it('returns green for score >= 70', () => {
    expect(scoreColor(70)).toBe('text-green-400')
    expect(scoreColor(100)).toBe('text-green-400')
    expect(scoreColor(85)).toBe('text-green-400')
  })

  it('returns yellow for score between 40 and 69', () => {
    expect(scoreColor(40)).toBe('text-yellow-400')
    expect(scoreColor(55)).toBe('text-yellow-400')
    expect(scoreColor(69)).toBe('text-yellow-400')
  })

  it('returns red for score < 40', () => {
    expect(scoreColor(0)).toBe('text-red-400')
    expect(scoreColor(39)).toBe('text-red-400')
    expect(scoreColor(-1)).toBe('text-red-400')
  })
})

describe('validateContactForm', () => {
  it('returns error when first name is empty', () => {
    expect(validateContactForm('', 'Doe')).toBe('First and last name are required.')
  })

  it('returns error when last name is empty', () => {
    expect(validateContactForm('John', '')).toBe('First and last name are required.')
  })

  it('returns error when both names are empty', () => {
    expect(validateContactForm('', '')).toBe('First and last name are required.')
  })

  it('returns error when names are only whitespace', () => {
    expect(validateContactForm('  ', 'Doe')).toBe('First and last name are required.')
    expect(validateContactForm('John', '  ')).toBe('First and last name are required.')
  })

  it('returns null when both names are valid', () => {
    expect(validateContactForm('John', 'Doe')).toBeNull()
  })
})

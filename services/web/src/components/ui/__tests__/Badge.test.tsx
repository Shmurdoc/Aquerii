import { render, screen } from '@testing-library/react'
import { Badge } from '../Badge'

describe('Badge', () => {
  it('renders text content', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    render(<Badge variant="success">Done</Badge>)
    expect(screen.getByText('Done').className).toContain('bg-green-900/50')
  })

  it('applies size classes', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>)
    const smClasses = screen.getByText('Small').className

    rerender(<Badge size="lg">Large</Badge>)
    const lgClasses = screen.getByText('Large').className

    expect(smClasses).not.toBe(lgClasses)
  })
})

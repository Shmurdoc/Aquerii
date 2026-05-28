import { render, screen, fireEvent } from '@testing-library/react'
import { Toggle } from '../Toggle'

describe('Toggle', () => {
  it('renders label', () => {
    render(<Toggle label="Notifications" />)
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('fires onChange when clicked', () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalled()
  })

  it('is disabled when disabled prop is set', () => {
    render(<Toggle disabled aria-label="Disabled toggle" />)
    expect(screen.getByRole('switch')).toBeDisabled()
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '../Input'

describe('Input', () => {
  it('renders label when provided', () => {
    render(<Input label="Email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('displays error message', () => {
    render(<Input label="Email" error="Required field" />)
    expect(screen.getByText('Required field')).toBeInTheDocument()
  })

  it('displays helper text', () => {
    render(<Input label="Email" helperText="We never share your email" />)
    expect(screen.getByText('We never share your email')).toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('fires onChange handler', () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('does not show helper text when error is present', () => {
    render(<Input label="Email" error="Required" helperText="Help text" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.queryByText('Help text')).not.toBeInTheDocument()
  })
})

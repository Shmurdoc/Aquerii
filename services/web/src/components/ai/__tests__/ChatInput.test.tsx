import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInput } from '../ChatInput'

describe('ChatInput', () => {
  it('renders textarea and send button', () => {
    render(<ChatInput onSend={() => {}} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByLabelText('Send message')).toBeInTheDocument()
  })

  it('send button is disabled when input is empty', () => {
    render(<ChatInput onSend={() => {}} />)
    expect(screen.getByLabelText('Send message')).toBeDisabled()
  })

  it('calls onSend with trimmed value on button click', () => {
    const handleSend = vi.fn()
    render(<ChatInput onSend={handleSend} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: '  Hello  ' } })
    fireEvent.click(screen.getByLabelText('Send message'))
    expect(handleSend).toHaveBeenCalledWith('Hello')
  })

  it('calls onSend on Enter without Shift', () => {
    const handleSend = vi.fn()
    render(<ChatInput onSend={handleSend} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'test' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(handleSend).toHaveBeenCalledWith('test')
  })

  it('does not call onSend on Shift+Enter', () => {
    const handleSend = vi.fn()
    render(<ChatInput onSend={handleSend} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'test' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(handleSend).not.toHaveBeenCalled()
  })

  it('clears input after sending', () => {
    render(<ChatInput onSend={() => {}} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'hello' } })
    fireEvent.click(screen.getByLabelText('Send message'))
    expect(textarea.value).toBe('')
  })

  it('is disabled when disabled prop is true', () => {
    render(<ChatInput onSend={() => {}} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByLabelText('Send message')).toBeDisabled()
  })

  it('shows loading spinner when isLoading', () => {
    render(<ChatInput onSend={() => {}} isLoading />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByLabelText('Send message')).toBeDisabled()
  })

  it('shows disabledReason as placeholder when disabled', () => {
    render(<ChatInput onSend={() => {}} disabled disabledReason="Out of credits" />)
    expect(screen.getByPlaceholderText('Out of credits')).toBeInTheDocument()
  })
})

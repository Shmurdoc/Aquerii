import { render, screen, fireEvent } from '@testing-library/react'
import { SuggestedPrompts } from '../SuggestedPrompts'

describe('SuggestedPrompts', () => {
  const prompts = ['Summarize my day', 'Create a task', 'Help me write']

  it('renders all prompts', () => {
    render(<SuggestedPrompts prompts={prompts} onSelect={() => {}} />)
    prompts.forEach(p => expect(screen.getByText(p)).toBeInTheDocument())
  })

  it('calls onSelect with prompt text on click', () => {
    const handleSelect = vi.fn()
    render(<SuggestedPrompts prompts={prompts} onSelect={handleSelect} />)
    fireEvent.click(screen.getByText('Create a task'))
    expect(handleSelect).toHaveBeenCalledWith('Create a task')
  })

  it('disables buttons when disabled prop is true', () => {
    render(<SuggestedPrompts prompts={prompts} onSelect={() => {}} disabled />)
    screen.getAllByRole('button').forEach(btn => {
      expect(btn).toBeDisabled()
    })
  })

  it('returns null for empty prompts array', () => {
    const { container } = render(<SuggestedPrompts prompts={[]} onSelect={() => {}} />)
    expect(container.innerHTML).toBe('')
  })
})

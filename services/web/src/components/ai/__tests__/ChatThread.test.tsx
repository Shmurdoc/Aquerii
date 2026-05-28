import { render, screen } from '@testing-library/react'
import { ChatThread, type ChatMessage } from '../ChatThread'

describe('ChatThread', () => {
  const messages: ChatMessage[] = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
  ]

  it('renders messages', () => {
    render(<ChatThread messages={messages} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('renders empty state when no messages', () => {
    render(<ChatThread messages={[]} emptyState={<div>Start chatting</div>} />)
    expect(screen.getByText('Start chatting')).toBeInTheDocument()
  })

  it('does not render empty state when messages exist', () => {
    render(<ChatThread messages={messages} emptyState={<div>Start chatting</div>} />)
    expect(screen.queryByText('Start chatting')).not.toBeInTheDocument()
  })

  it('shows typing indicator when isLoading', () => {
    const { container } = render(<ChatThread messages={messages} isLoading />)
    const dots = container.querySelectorAll('.animate-bounce')
    expect(dots.length).toBe(3)
  })

  it('renders user messages right-aligned', () => {
    const { container } = render(<ChatThread messages={[{ role: 'user', content: 'test' }]} />)
    const msgDiv = container.querySelector('.justify-end')
    expect(msgDiv).toBeInTheDocument()
  })

  it('renders assistant messages left-aligned', () => {
    const { container } = render(<ChatThread messages={[{ role: 'assistant', content: 'test' }]} />)
    const msgDiv = container.querySelector('.justify-start')
    expect(msgDiv).toBeInTheDocument()
  })

  it('preserves whitespace in message content', () => {
    render(<ChatThread messages={[{ role: 'user', content: 'line1\n  line2' }]} />)
    const el = screen.getByText(/line1/)
    expect(el.className).toContain('whitespace-pre-wrap')
  })
})

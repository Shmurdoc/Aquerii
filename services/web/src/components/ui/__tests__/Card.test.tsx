import { render, screen } from '@testing-library/react'
import { Card } from '../Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card><Card.Body>Content</Card.Body></Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders header and footer', () => {
    render(
      <Card>
        <Card.Header>Header</Card.Header>
        <Card.Body>Body</Card.Body>
        <Card.Footer>Footer</Card.Footer>
      </Card>
    )
    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    render(<Card variant="glass" data-testid="glass-card"><Card.Body>Glass</Card.Body></Card>)
    const card = screen.getByTestId('glass-card')
    expect(card.className).toContain('backdrop-blur')
  })
})

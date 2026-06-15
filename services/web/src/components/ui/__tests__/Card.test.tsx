import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardBody, CardFooter } from '../Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card><CardBody>Content</CardBody></Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders header and footer', () => {
    render(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardBody>Body</CardBody>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    render(<Card variant="glass" data-testid="glass-card"><CardBody>Glass</CardBody></Card>)
    const card = screen.getByTestId('glass-card')
    expect(card.className).toContain('backdrop-blur-lg')
  })
})

import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '../Modal'

describe('Modal', () => {
  it('renders when open', () => {
    render(<Modal open onClose={() => {}} title="Test Modal">Content</Modal>)
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<Modal open={false} onClose={() => {}} title="Hidden">Content</Modal>)
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Test">Content</Modal>)
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalled()
  })

  it('renders footer content', () => {
    render(<Modal open onClose={() => {}} title="Test" footer={<button>Save</button>}>Content</Modal>)
    expect(screen.getByText('Save')).toBeInTheDocument()
  })
})

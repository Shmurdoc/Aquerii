import { render, screen, fireEvent } from '@testing-library/react'
import { DataTable, type Column } from '../DataTable'

interface TestItem {
  id: string
  name: string
  email: string
  role: string
}

const columns: Column<TestItem>[] = [
  { key: 'name', header: 'Name', sortable: true, render: r => r.name },
  { key: 'email', header: 'Email', sortable: true, render: r => r.email, hideOnMobile: true },
  { key: 'role', header: 'Role', render: r => r.role },
]

const data: TestItem[] = [
  { id: '1', name: 'Alice', email: 'alice@test.com', role: 'Admin' },
  { id: '2', name: 'Bob', email: 'bob@test.com', role: 'User' },
  { id: '3', name: 'Charlie', email: 'charlie@test.com', role: 'Editor' },
]

describe('DataTable', () => {
  it('renders text from data rows in at least one viewport', () => {
    render(<DataTable columns={columns} data={data} keyExtractor={r => r.id} />)
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Charlie').length).toBeGreaterThanOrEqual(1)
  })

  it('renders header labels', () => {
    render(<DataTable columns={columns} data={data} keyExtractor={r => r.id} />)
    expect(screen.getAllByText('Name').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Role').length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty state when data is empty', () => {
    render(<DataTable columns={columns} data={[]} keyExtractor={r => r.id} emptyTitle="No contacts" />)
    expect(screen.getByText('No contacts')).toBeInTheDocument()
  })

  it('shows error state with retry button', () => {
    const onRetry = vi.fn()
    render(<DataTable columns={columns} data={[]} keyExtractor={r => r.id} error="Failed to load" onRetry={onRetry} />)
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Retry'))
    expect(onRetry).toHaveBeenCalled()
  })

  it('shows loading skeleton', () => {
    const { container } = render(<DataTable columns={columns} data={[]} keyExtractor={r => r.id} isLoading />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('sorts by column on header click', () => {
    render(<DataTable columns={columns} data={data} keyExtractor={r => r.id} />)
    const nameHeader = screen.getAllByText('Name')[0].closest('th')!
    fireEvent.click(nameHeader)
    const cells = screen.getAllByText(/^(Alice|Bob|Charlie)$/)
    expect(cells[0].textContent).toBe('Alice')

    fireEvent.click(nameHeader)
    const cells2 = screen.getAllByText(/^(Alice|Bob|Charlie)$/)
    expect(cells2[0].textContent).toBe('Charlie')
  })

  it('paginates when data exceeds pageSize', () => {
    const manyItems = Array.from({ length: 25 }, (_, i) => ({
      id: `${i}`,
      name: `User ${i}`,
      email: `user${i}@test.com`,
      role: 'User',
    }))
    render(<DataTable columns={columns} data={manyItems} keyExtractor={r => r.id} pageSize={10} />)

    expect(screen.getByText('25 total')).toBeInTheDocument()
    expect(screen.getAllByText('User 0').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('User 20').length).toBe(0)

    fireEvent.click(screen.getByText('2'))
    expect(screen.getAllByText('User 10').length).toBeGreaterThan(0)
  })

  it('handles row selection', () => {
    const onSelection = vi.fn()
    render(<DataTable columns={columns} data={data} keyExtractor={r => r.id} selectedRows={new Set()} onSelectionChange={onSelection} />)

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(4)
    fireEvent.click(checkboxes[1])
    expect(onSelection).toHaveBeenCalled()
  })

  it('handles select all checkbox in desktop view', () => {
    const onSelection = vi.fn()
    render(<DataTable columns={columns} data={data} keyExtractor={r => r.id} selectedRows={new Set()} onSelectionChange={onSelection} />)

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(4)
    fireEvent.click(checkboxes[0])
    expect(onSelection).toHaveBeenCalled()
  })

  it('does not render empty state when data exists', () => {
    render(<DataTable columns={columns} data={data} keyExtractor={r => r.id} emptyTitle="No data" />)
    expect(screen.queryAllByText('No data')).toHaveLength(0)
  })

  // ── Regression tests for TKT-D.SLICE-001 ──────────────────────────────────
  // The minified bundle surfaced "D.slice is not a function" because callers
  // sometimes pass a Laravel paginated response object { data: [...] } or
  // undefined/null during a loading race. DataTable must coerce these to a
  // safe array rather than throwing into the ErrorBoundary.

  it('unwraps a paginated response object { data: [...] } without throwing', () => {
    const paginated = { data, current_page: 1, last_page: 1, total: 3 }
    expect(() =>
      render(<DataTable columns={columns} data={paginated as any} keyExtractor={r => r.id} />)
    ).not.toThrow()
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Charlie').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the empty state when data is undefined without throwing', () => {
    expect(() =>
      render(
        <DataTable
          columns={columns}
          data={undefined as any}
          keyExtractor={r => r.id}
          emptyTitle="No records"
        />
      )
    ).not.toThrow()
    expect(screen.getByText('No records')).toBeInTheDocument()
  })

  it('renders the empty state when data is null without throwing', () => {
    expect(() =>
      render(
        <DataTable
          columns={columns}
          data={null as any}
          keyExtractor={r => r.id}
          emptyTitle="Nothing here"
        />
      )
    ).not.toThrow()
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })
})

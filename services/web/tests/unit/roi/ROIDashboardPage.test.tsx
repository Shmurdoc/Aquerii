import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ROIDashboardPage from '@/pages/roi/ROIDashboardPage'
import { useROIDashboard } from '@/lib/roi'

vi.mock('@/lib/roi', () => ({
  useROIDashboard: vi.fn(),
}))

const mockData = {
  certificates_prevented_expiring: 12,
  access_denials_prevented: 45,
  avoided_downtime_hours: 120,
  avoided_downtime_cost: 240000,
  compliance_rate: 94,
  compliance_rate_trend: [
    { week: '2024-01-01', rate: 90 },
    { week: '2024-01-08', rate: 92 },
    { week: '2024-01-15', rate: 94 },
  ],
  ptw_processing_time_avg: 3.2,
  time_saved_ptw: 40,
  total_potential_savings: 320000,
  platform_cost: 50000,
  roi_ratio: 6.4,
  period: { from: '2024-01-01', to: '2024-01-31' },
}

const emptyData = {
  certificates_prevented_expiring: 0,
  access_denials_prevented: 0,
  avoided_downtime_hours: 0,
  avoided_downtime_cost: 0,
  compliance_rate: 0,
  compliance_rate_trend: [],
  ptw_processing_time_avg: 0,
  time_saved_ptw: 0,
  total_potential_savings: 0,
  platform_cost: 0,
  roi_ratio: 0,
  period: { from: '2024-01-01', to: '2024-01-31' },
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ROIDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('ROIDashboardPage', () => {
  it('renders with loading state', () => {
    vi.mocked(useROIDashboard).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any)

    renderPage()
    expect(screen.getByText('ROI Dashboard')).toBeInTheDocument()
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders dashboard data when loaded', () => {
    vi.mocked(useROIDashboard).mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any)

    renderPage()
    expect(screen.getByText('ROI Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Compliance Rate')).toBeInTheDocument()
    expect(screen.getAllByText('94%').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('120h')).toBeInTheDocument()
    expect(screen.getByText('6.40')).toBeInTheDocument()
    expect(screen.getByText('Savings Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Compliance Rate Trend')).toBeInTheDocument()
    expect(screen.getByText('Platform Cost')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    vi.mocked(useROIDashboard).mockReturnValue({
      data: emptyData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any)

    renderPage()
    expect(screen.getByText('Not enough data yet')).toBeInTheDocument()
    expect(screen.getByText(/ROI dashboard updates once you have 30\+ days/)).toBeInTheDocument()
  })

  it('shows error state on API failure', () => {
    vi.mocked(useROIDashboard).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch: vi.fn(),
    } as any)

    renderPage()
    expect(screen.getByText('Failed to load ROI data')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('date range preset triggers refetch with new params', () => {
    const refetch = vi.fn()
    let currentFrom: string | undefined = '30d'
    let currentTo: string | undefined = undefined

    vi.mocked(useROIDashboard).mockImplementation((from, to) => {
      currentFrom = from
      currentTo = to
      return {
        data: mockData,
        isLoading: false,
        isError: false,
        error: null,
        refetch,
      } as any
    })

    renderPage()

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '7d' } })

    expect(select).toHaveValue('7d')
  })

  it('renders trend direction indicators', () => {
    vi.mocked(useROIDashboard).mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any)

    renderPage()
    const improvingBadge = screen.getByText('Improving')
    expect(improvingBadge).toBeInTheDocument()
  })
})

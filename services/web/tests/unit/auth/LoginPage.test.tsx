import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from '@/pages/auth/LoginPage'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  sessionStorage.clear()
  useAuthStore.setState({ token: null, user: null, workspace: null })
  vi.restoreAllMocks()
})

describe('LoginPage', () => {
  it('renders the sign-in form', () => {
    renderLogin()
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(document.querySelector('input[name="email"]')).toBeInTheDocument()
    expect(document.querySelector('input[name="password"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    renderLogin()

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument()
    expect(await screen.findByText('Password is required')).toBeInTheDocument()
  })

  it('calls API and sets auth on success', async () => {
    const mockResponse = {
      data: {
        data: {
          token: 'new-token',
          user: { id: 'u1', name: 'Test', email: 'test@t.com', avatar_url: null, mfa_enabled: false },
          workspace: { id: 'w1', name: 'W', slug: 'w', plan: 'free' },
        },
      },
    }

    vi.spyOn(api, 'post').mockResolvedValue(mockResponse)

    renderLogin()

    fireEvent.change(document.querySelector('input[name="email"]')!, { target: { value: 'test@t.com' } })
    fireEvent.change(document.querySelector('input[name="password"]')!, { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
      expect(useAuthStore.getState().token).toBe('new-token')
    })
  })

  it('reveals MFA field when server requires it', async () => {
    const mockMfaResponse = {
      data: {
        data: { mfa_required: true },
      },
    }

    vi.spyOn(api, 'post').mockResolvedValue(mockMfaResponse)

    renderLogin()

    fireEvent.change(document.querySelector('input[name="email"]')!, { target: { value: 'test@t.com' } })
    fireEvent.change(document.querySelector('input[name="password"]')!, { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('MFA Code')).toBeInTheDocument()
  })

  it('shows error toast on failed login', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { data: { error: { message: 'Invalid credentials.' } } },
    })
    vi.spyOn(toast, 'error')

    renderLogin()

    fireEvent.change(document.querySelector('input[name="email"]')!, { target: { value: 'test@t.com' } })
    fireEvent.change(document.querySelector('input[name="password"]')!, { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid credentials.')
    })
  })
})

import { http, HttpResponse } from 'msw'

const API_BASE = '/api'

export const handlers = [
  // Auth
  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      avatar_url: null,
      mfa_enabled: false,
    })
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ success: true })
  }),

  http.post(`${API_BASE}/auth/login`, () => {
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
        mfa_enabled: false,
      },
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        slug: 'test-workspace',
        plan: 'pro',
        logo_url: null,
        color: '#7c3aed',
      },
      role: 'admin',
    })
  }),

  // Dashboard
  http.get(`${API_BASE}/dashboard/stats`, () => {
    return HttpResponse.json({
      tasks: { total: 12, completed: 8, overdue: 2 },
      projects: { total: 3, active: 2 },
      unreadMessages: 5,
    })
  }),

  // Boards
  http.get(`${API_BASE}/boards`, () => {
    return HttpResponse.json([
      { id: 'board-1', name: 'Sprint Board', description: 'Current sprint tasks' },
      { id: 'board-2', name: 'Backlog', description: 'Future work' },
    ])
  }),

  http.get(`${API_BASE}/boards/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Board Detail',
      columns: [
        { id: 'col-1', name: 'To Do', cards: [] },
        { id: 'col-2', name: 'In Progress', cards: [] },
        { id: 'col-3', name: 'Done', cards: [] },
      ],
    })
  }),

  // Notifications
  http.get(`${API_BASE}/notifications`, () => {
    return HttpResponse.json({
      notifications: [
        {
          id: 'notif-1',
          type: 'mention',
          data: { message: 'You were mentioned in a comment' },
          read_at: null,
          created_at: new Date().toISOString(),
        },
      ],
      hasMore: false,
    })
  }),

  // Workspace
  http.get(`${API_BASE}/workspace`, () => {
    return HttpResponse.json({
      id: 'ws-1',
      name: 'Test Workspace',
      slug: 'test-workspace',
      plan: 'pro',
      logo_url: null,
      color: '#7c3aed',
    })
  }),

  // Employees
  http.get(`${API_BASE}/employees`, () => {
    return HttpResponse.json([
      { id: 'emp-1', name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
      { id: 'emp-2', name: 'Bob Smith', email: 'bob@example.com', role: 'member' },
    ])
  }),

  // Catch-all for unmatched requests
  http.all(`${API_BASE}/*`, ({ request }) => {
    console.warn(`[MSW] Unhandled request: ${request.method} ${request.url}`)
    return HttpResponse.json({ error: 'Not found' }, { status: 404 })
  }),
]

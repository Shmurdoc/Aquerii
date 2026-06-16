# Frontend Memory — React/TypeScript

## Patterns
- Functional components with hooks
- TypeScript interfaces for all props
- Custom hooks for reusable logic
- React Query for server state
- Zod for form validation

## Gotchas
- Vite HMR can cause stale closures
- Use `useCallback` for functions passed to children
- React Strict Mode runs effects twice in development
- Bundle size matters — use dynamic imports for routes

## Testing
- Vitest for unit tests
- React Testing Library for component tests
- Playwright for E2E tests
- Mock API calls with MSW

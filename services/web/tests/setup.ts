import '@testing-library/jest-dom'
import { server } from '../src/test/msw-setup'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

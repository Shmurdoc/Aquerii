import React from 'react'

interface Props { children: React.ReactNode; fallback?: React.ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <div className="text-center">
            <p className="text-red-400 font-semibold">Something went wrong</p>
            <p className="text-gray-500 text-xs mt-1">{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()}
              className="mt-4 text-xs text-indigo-400 hover:text-indigo-300">
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

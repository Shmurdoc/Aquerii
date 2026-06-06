import { lazy, Suspense, useCallback, useRef, useEffect, useState, Component, type ReactNode } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { Board } from '@/hooks/useBoards'
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'

// Excalidraw's own types are deeply recursive and cause cascading inference issues.
// We treat the lazy component as `React.ComponentType<any>` here and pass props with `as any`
// at the call site to keep type-checking snappy and avoid the false-positive type errors.
const ExcalidrawLazy = lazy(() =>
  import('@excalidraw/excalidraw').then((mod) => ({ default: mod.Excalidraw as unknown as React.ComponentType<any> }))
) as unknown as React.ComponentType<any>

interface Props {
  board: Board
  boardId: string
}

const SAVE_DEBOUNCE_MS = 1500

type ExcalidrawImperativeAPI = {
  updateScene: (scene: { elements?: unknown[]; appState?: Record<string, unknown> }) => void
  getSceneElements: () => unknown[]
  getAppState: () => Record<string, unknown>
  getFiles: () => Record<string, unknown>
  resetScene: () => void
  ready: boolean
}

class WhiteboardErrorBoundary extends Component<
  { children: ReactNode; onRetry?: () => void; boardName: string },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false as boolean, error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ExcalidrawView] crashed:', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <AlertTriangle size={36} className="text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Whiteboard failed to load
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-md">
              {this.state.error?.message ?? 'An unexpected error occurred.'} Your data is safe — it&apos;s still on the server.
            </p>
          </div>
          <button
            onClick={() => { this.reset(); this.props.onRetry?.() }}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={12} /> Reload whiteboard
          </button>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
            Board: {this.props.boardName}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ExcalidrawView({ board, boardId }: Props) {
  const queryClient = useQueryClient()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle')

  // Excalidraw state shape compatible with ImportedDataState
  const initialData = useRef<{
    type: 'excalidraw'
    version: 2
    source: 'https://excalidraw.com'
    elements: readonly unknown[]
    appState: Record<string, unknown>
    files: Record<string, unknown>
  } | null>(null)

  if (board.excalidraw_state && !initialData.current) {
    const s = board.excalidraw_state as Record<string, unknown>
    initialData.current = {
      type: 'excalidraw',
      version: 2,
      source: 'https://excalidraw.com',
      elements: (s.elements as readonly unknown[]) ?? [],
      appState: (s.appState as Record<string, unknown>) ?? {},
      files: (s.files as Record<string, unknown>) ?? {},
    }
  }

  const { mutate: saveCanvas } = useMutation({
    mutationFn: (state: unknown) =>
      api.patch(`/workspaces/${board.workspace_id}/boards/${boardId}`, {
        excalidraw_state: state,
      }),
    onMutate: () => setSaveStatus('saving'),
    onSuccess: () => {
      setSaveStatus('saved')
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 1500)
    },
    onError: (err: unknown) => {
      setSaveStatus('offline')
      const message = err instanceof Error ? err.message : 'Save failed'
      toast.error(`Whiteboard: ${message}`)
    },
  })


  const handleChange = useCallback(
    (
      elements: readonly unknown[],
      appState: Record<string, unknown>,
      files: Record<string, unknown>
    ) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveCanvas({
          type: 'excalidraw',
          version: 2,
          source: 'https://excalidraw.com',
          elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            gridSize: appState.gridSize,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
            theme: appState.theme,
          },
          files,
        })
      }, SAVE_DEBOUNCE_MS)
    },
    [saveCanvas]
  )

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end gap-2 px-4 py-1.5 bg-[var(--color-bg-surface)] border-b border-[var(--color-glass-border)] text-[10px]">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <RefreshCw size={11} className="animate-spin" /> Saving…
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1.5 text-[var(--color-status-done)]">
            <Wifi size={11} /> Saved
          </span>
        )}
        {saveStatus === 'offline' && (
          <span className="flex items-center gap-1.5 text-[var(--color-status-blocked)]">
            <WifiOff size={11} /> Save failed — retrying on next change
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 bg-[var(--color-bg-base)]">
        <WhiteboardErrorBoundary boardName={board.name}>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                  <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Loading whiteboard…</p>
                </div>
              </div>
            }
          >
            <ExcalidrawLazy
              excalidrawAPI={(api: ExcalidrawImperativeAPI) => { apiRef.current = api }}
              initialData={initialData.current ?? undefined}
              onChange={handleChange}
              theme="dark"
              gridModeEnabled
              UIOptions={{
                canvasActions: {
                  export: { saveFileToDisk: true },
                  loadScene: true,
                  saveToActiveFile: false,
                  toggleTheme: false,
                },
                tools: { image: false },
              }}
            />
          </Suspense>
        </WhiteboardErrorBoundary>
      </div>
    </div>
  )
}

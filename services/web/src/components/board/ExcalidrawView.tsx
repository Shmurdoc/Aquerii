import { lazy, Suspense, useCallback, useRef, useEffect } from 'react'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types/types'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Board } from '@/hooks/useBoards'

// Lazy-load the heavy Excalidraw bundle — keeps initial SPA chunk small
const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then((mod) => ({ default: mod.Excalidraw }))
)

interface Props {
  board: Board
  boardId: string
}

interface CanvasState {
  elements: readonly ExcalidrawElement[]
  appState: Partial<AppState>
  files: BinaryFiles
}

const SAVE_DEBOUNCE_MS = 1500

/**
 * Whiteboard view powered by Excalidraw.
 *
 * Canvas state is persisted as JSONB in boards.excalidraw_state via
 * PATCH /api/workspaces/:wid/boards/:bid { excalidraw_state: {...} }.
 * Changes are debounced 1.5 s to avoid hammering the API on every stroke.
 */
export default function ExcalidrawView({ board, boardId }: Props) {
  const queryClient = useQueryClient()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load persisted canvas state from the board object (already fetched by BoardPage)
  const initialData = useRef<CanvasState | null>(
    (board.excalidraw_state as unknown as CanvasState) ?? null
  )

  const { mutate: saveCanvas } = useMutation({
    mutationFn: (state: CanvasState) =>
      api.patch(`/workspaces/${board.workspace_id}/boards/${boardId}`, {
        excalidraw_state: state,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveCanvas({
          elements: elements as ExcalidrawElement[],
          appState: {
            // Only persist the subset of appState that matters for restoration
          viewBackgroundColor: appState.viewBackgroundColor,
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          },
          files,
        })
      }, SAVE_DEBOUNCE_MS)
    },
    [saveCanvas]
  )

  // Cleanup debounce timer on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  return (
    <div className="w-full h-full bg-gray-950">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <Excalidraw
          initialData={initialData.current ?? undefined}
          onChange={handleChange}
          theme="dark"
          UIOptions={{
            canvasActions: {
              export: { saveFileToDisk: true },
              loadScene: true,
            },
          }}
        />
      </Suspense>
    </div>
  )
}

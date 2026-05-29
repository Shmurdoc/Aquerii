import { lazy, Suspense, useCallback, useRef, useEffect } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Board } from '@/hooks/useBoards'

const ExcalidrawLazy = lazy(() =>
  import('@excalidraw/excalidraw').then((mod) => ({ default: mod.Excalidraw }))
)

interface Props {
  board: Board
  boardId: string
}

const SAVE_DEBOUNCE_MS = 1500

export default function ExcalidrawView({ board, boardId }: Props) {
  const queryClient = useQueryClient()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initialData = useRef<unknown>(
    (board.excalidraw_state as unknown) ?? null
  )

  const { mutate: saveCanvas } = useMutation({
    mutationFn: (state: unknown) =>
      api.patch(`/workspaces/${board.workspace_id}/boards/${boardId}`, {
        excalidraw_state: state,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const handleChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveCanvas({
          elements,
          appState: {
          viewBackgroundColor: appState.viewBackgroundColor as string | undefined,
          zoom: appState.zoom,
          scrollX: appState.scrollX as number | undefined,
          scrollY: appState.scrollY as number | undefined,
          },
          files,
        })
      }, SAVE_DEBOUNCE_MS)
    },
    [saveCanvas]
  )

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  const excalidrawProps = {
    initialData: initialData.current,
    onChange: handleChange,
    theme: 'dark' as const,
    UIOptions: {
      canvasActions: {
        export: { saveFileToDisk: true },
        loadScene: true,
      },
    },
  }

  return (
    <div className="w-full h-full bg-gray-950">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <ExcalidrawLazy {...excalidrawProps as any} />
      </Suspense>
    </div>
  )
}

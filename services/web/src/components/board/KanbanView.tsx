import { useRef, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Board } from '@/hooks/useBoards'
import type { Item } from '@/hooks/useItems'
import { useMoveItem, useCreateItem } from '@/hooks/useItems'
import ItemCard from './ItemCard'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const OVERSCAN = 5
const ITEM_HEIGHT = 120

interface Props {
  board: Board
  items: Item[]
  boardId: string
}

export default function KanbanView({ board, items, boardId }: Props) {
  const moveItem   = useMoveItem(boardId)
  const createItem = useCreateItem(boardId)

  const groups = [...board.groups].sort((a, b) => a.position - b.position)

  const itemsByGroup = useCallback(
    (groupId: string) =>
      items.filter(i => i.group_id === groupId).sort((a, b) => a.position - b.position),
    [items]
  )

  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const { draggableId, source, destination } = result

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return

    const destItems  = itemsByGroup(destination.droppableId)
    const before     = destItems[destination.index - 1]?.position ?? 0
    const after      = destItems[destination.index]?.position ?? (before + 131072)
    const gap        = after - before
    const newPosition = gap < 2 ? after + 65536 : (before + after) / 2

    moveItem.mutate({
      itemId:   draggableId,
      groupId:  destination.droppableId,
      position: newPosition,
    })
  }

  const handleAddItem = async (groupId: string) => {
    try {
      await createItem.mutateAsync({ group_id: groupId, title: 'New Item' })
    } catch {
      toast.error('Failed to create item.')
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-0 h-full overflow-x-auto px-6 py-4">
        {groups.map(group => {
          const groupItems = itemsByGroup(group.id)
          return <KanbanColumn
            key={group.id}
            group={group}
            groupItems={groupItems}
            boardId={boardId}
            onAddItem={handleAddItem}
          />
        })}
      </div>
    </DragDropContext>
  )
}

function KanbanColumn({
  group, groupItems, boardId, onAddItem,
}: {
  group: Board['groups'][0]
  groupItems: Item[]
  boardId: string
  onAddItem: (groupId: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: groupItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: OVERSCAN,
  })

  return (
    <div className="flex flex-col min-w-[280px] mr-4">
      {/* Group header */}
      <div className="flex items-center gap-2 mb-2 px-1 flex-shrink-0">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: group.color ?? '#6366f1' }}
        />
        <span className="text-sm font-medium text-gray-200 flex-1 truncate">{group.name}</span>
        <span className="text-xs text-gray-500 tabular-nums">{groupItems.length}</span>
      </div>

      {/* Virtualized items */}
      <Droppable droppableId={group.id} mode="virtual" renderClone={(provided, snapshot, rubric) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(snapshot.isDragging && 'opacity-80')}
        >
          <ItemCard item={groupItems[rubric.source.index]} boardId={boardId} />
        </div>
      )}>
        {(provided, snapshot) => (
          <div
            ref={(el) => {
              provided.innerRef(el)
              ;(scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el
            }}
            {...provided.droppableProps}
            className={clsx(
              'flex-1 min-h-[120px] rounded-xl transition-colors overflow-y-auto',
              snapshot.isDraggingOver ? 'bg-indigo-950/40' : 'bg-gray-900/40'
            )}
            style={{ maxHeight: 'calc(100vh - 220px)' }}
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const item = groupItems[virtualItem.index]
                return (
                  <Draggable key={item.id} draggableId={item.id} index={virtualItem.index}>
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className={clsx(snap.isDragging && 'opacity-80')}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                          ...prov.draggableProps.style,
                        }}
                      >
                        <div className="px-1 py-1">
                          <ItemCard item={item} boardId={boardId} />
                        </div>
                      </div>
                    )}
                  </Draggable>
                )
              })}
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add item */}
      <button
        onClick={() => onAddItem(group.id)}
        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors mt-1 flex-shrink-0"
      >
        <Plus size={12} />
        Add item
      </button>
    </div>
  )
}

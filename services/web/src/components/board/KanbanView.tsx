import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import type { Board } from '@/hooks/useBoards'
import type { Item } from '@/hooks/useItems'
import { useMoveItem, useCreateItem } from '@/hooks/useItems'
import ItemCard from './ItemCard'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface Props {
  board: Board
  items: Item[]
  boardId: string
}

export default function KanbanView({ board, items, boardId }: Props) {
  const moveItem   = useMoveItem(boardId)
  const createItem = useCreateItem(boardId)

  const groups = [...board.groups].sort((a, b) => a.position - b.position)

  const itemsByGroup = (groupId: string) =>
    items.filter(i => i.group_id === groupId).sort((a, b) => a.position - b.position)

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
    const newPosition = (before + after) / 2

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
        {groups.map(group => (
          <div key={group.id} className="flex flex-col min-w-[280px] mr-4">
            {/* Group header */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: group.color ?? '#6366f1' }}
              />
              <span className="text-sm font-medium text-gray-200 flex-1 truncate">{group.name}</span>
              <span className="text-xs text-gray-500 tabular-nums">
                {itemsByGroup(group.id).length}
              </span>
            </div>

            {/* Items */}
            <Droppable droppableId={group.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={clsx(
                    'flex-1 min-h-[120px] rounded-xl p-2 transition-colors',
                    snapshot.isDraggingOver ? 'bg-indigo-950/40' : 'bg-gray-900/40'
                  )}
                >
                  {itemsByGroup(group.id).map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className={clsx('mb-2', snap.isDragging && 'opacity-80')}
                        >
                          <ItemCard item={item} boardId={boardId} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Add item */}
            <button
              onClick={() => handleAddItem(group.id)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors mt-1"
            >
              <Plus size={12} />
              Add item
            </button>
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}

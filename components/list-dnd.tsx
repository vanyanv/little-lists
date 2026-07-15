"use client";

import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Item, List, StatusId } from "@/lib/types";
import { statusesForList } from "@/lib/types";
import { ItemCard } from "@/components/item-card";
import { focusRing } from "@/lib/a11y";
import type { ViewMode } from "@/components/view-toggle";

export function ListDnd({
  list,
  items,
  view,
  layoutClass,
  onReorder,
}: {
  list: List;
  items: Item[];
  view: ViewMode;
  layoutClass: string;
  onReorder: (orderedIds: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = items.map((i) => i.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  // Stable reference for ItemCard's `statuses` prop — statusesForList returns a
  // fresh array each call, which would defeat ItemCard's memo every render.
  const statuses = useMemo(() => statusesForList(list), [list]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={view === "grid" ? [restrictToParentElement] : [restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={view === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={layoutClass}>
          {items.map((item) => (
            <SortableItemRow key={item.id} list={list} item={item} view={view} statuses={statuses} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItemRow({
  list,
  item,
  view,
  statuses,
}: {
  list: List;
  item: Item;
  view: ViewMode;
  statuses: StatusId[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.9 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1.5">
      {item.pinned ? (
        <span aria-hidden className="mt-1 w-6 shrink-0" />
      ) : (
        <button
          type="button"
          aria-label={`Reorder ${item.title}`}
          {...attributes}
          {...listeners}
          className={`mt-1 grid h-9 w-6 shrink-0 touch-none cursor-grab place-items-center rounded-md text-brown-soft/70 transition-colors hover:bg-cream-deep hover:text-ink active:cursor-grabbing ${focusRing}`}
        >
          <GripVertical size={14} strokeWidth={1.2} fill="currentColor" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <ItemCard listId={list.id} item={item} view={view} statuses={statuses} />
      </div>
    </div>
  );
}

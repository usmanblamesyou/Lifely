import { useState, useCallback } from 'react';

interface DraggableItem {
  id: number;
  position: number;
}

export function useDragReorder<T extends DraggableItem>(
  items: T[],
  onReorder: (updates: { id: number; position: number }[]) => Promise<void>
) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<T[]>([]);

  const handleDragStart = useCallback((id: number) => {
    setDraggingId(id);
    setLocalOrder(items);
  }, [items]);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggingId === null || draggingId === targetId) return;

    setLocalOrder((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((i) => i.id === draggingId);
      const toIdx = arr.findIndex((i) => i.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  }, [draggingId]);

  const handleDrop = useCallback(async () => {
    if (draggingId === null) return;
    setDraggingId(null);

    const updates = localOrder.map((item, index) => ({
      id: item.id,
      position: index,
    }));

    try {
      await onReorder(updates);
    } catch (err) {
      console.error('Reorder failed:', err);
    }
  }, [draggingId, localOrder, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const isDragging = useCallback((id: number) => draggingId === id, [draggingId]);

  const orderedItems = draggingId !== null ? localOrder : items;

  return {
    orderedItems,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    isDragging,
  };
}

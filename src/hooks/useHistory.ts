import { useCallback, useRef, useState } from 'react';

interface HistoryState {
  value: string;
  selStart: number;
  selEnd: number;
}

const MAX_HISTORY = 200;

export interface UseHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  pushHistory: (value: string, selStart: number, selEnd: number) => void;
  undo: () => HistoryState | null;
  redo: () => HistoryState | null;
  resetHistory: (value: string) => void;
}

export function useHistory(initialValue: string): UseHistoryReturn {
  const past = useRef<HistoryState[]>([{ value: initialValue, selStart: 0, selEnd: 0 }]);
  const future = useRef<HistoryState[]>([]);
  // Use a tick counter to force re-renders when can-undo/redo changes
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick(t => t + 1), []);

  const pushHistory = useCallback(
    (value: string, selStart: number, selEnd: number) => {
      const last = past.current[past.current.length - 1];
      // Deduplicate consecutive identical values
      if (last && last.value === value) return;

      past.current.push({ value, selStart, selEnd });
      if (past.current.length > MAX_HISTORY) {
        past.current.shift();
      }
      future.current = [];
      rerender();
    },
    [rerender]
  );

  const undo = useCallback((): HistoryState | null => {
    if (past.current.length <= 1) return null;
    const current = past.current.pop()!;
    future.current.unshift(current);
    const prev = past.current[past.current.length - 1];
    rerender();
    return prev;
  }, [rerender]);

  const redo = useCallback((): HistoryState | null => {
    if (future.current.length === 0) return null;
    const next = future.current.shift()!;
    past.current.push(next);
    rerender();
    return next;
  }, [rerender]);

  const resetHistory = useCallback(
    (value: string) => {
      past.current = [{ value, selStart: 0, selEnd: 0 }];
      future.current = [];
      rerender();
    },
    [rerender]
  );

  return {
    canUndo: past.current.length > 1,
    canRedo: future.current.length > 0,
    pushHistory,
    undo,
    redo,
    resetHistory,
  };
}

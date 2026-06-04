"use client";

/**
 * Undo/redo for the slide editor (Phase 10b).
 *
 * Three-stack history (past / present / future). Two write paths:
 *
 *   • set(next)         — live update, NO history entry. Used during a
 *                         drag/resize gesture so the box follows the
 *                         cursor without flooding the undo stack.
 *   • checkpoint()      — snapshot the current present into `past`
 *                         BEFORE a gesture begins, so the whole gesture
 *                         collapses to one undo step.
 *   • commit(next)      — checkpoint + set in one call, for discrete
 *                         actions (add, delete, reorder, a toolbar
 *                         change).
 */

import { useCallback, useRef, useState } from "react";

export type History<T> = {
  state: T;
  set: (next: T) => void;
  commit: (next: T) => void;
  checkpoint: () => void;
  reset: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const LIMIT = 100;

export function useHistory<T>(initial: T): History<T> {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initial);
  const [future, setFuture] = useState<T[]>([]);
  const presentRef = useRef(present);
  presentRef.current = present;

  const set = useCallback((next: T) => {
    setPresent(next);
  }, []);

  const checkpoint = useCallback(() => {
    setPast((p) => {
      const next = [...p, presentRef.current];
      return next.length > LIMIT ? next.slice(next.length - LIMIT) : next;
    });
    setFuture([]);
  }, []);

  const commit = useCallback((next: T) => {
    setPast((p) => {
      const arr = [...p, presentRef.current];
      return arr.length > LIMIT ? arr.slice(arr.length - LIMIT) : arr;
    });
    setFuture([]);
    setPresent(next);
  }, []);

  // Replace the whole document with NO history (e.g. loading a saved
  // deck on mount). Clears the stacks.
  const reset = useCallback((next: T) => {
    setPast([]);
    setFuture([]);
    setPresent(next);
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1]!;
      setFuture((f) => [presentRef.current, ...f]);
      setPresent(prev);
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0]!;
      setPast((p) => [...p, presentRef.current]);
      setPresent(next);
      return f.slice(1);
    });
  }, []);

  return {
    state: present,
    set,
    commit,
    checkpoint,
    reset,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}

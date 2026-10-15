import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { clearDraft, readDraft, writeDraft } from "@/lib/storage";
import type { StoredDraft } from "@/lib/storage";

const DRAFT_QUERY_KEY = ["draft"] as const;
const SAVE_DELAY_MS = 300;

/**
 * Restores the in-progress draft when the panel opens and persists edits shortly after they
 * happen. A pending write is flushed when the panel is hidden or unmounted.
 */
export function useDraft() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: DRAFT_QUERY_KEY, queryFn: () => readDraft(), staleTime: Infinity });

  const pending = useRef<StoredDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const draft = pending.current;
    pending.current = null;
    if (draft) void writeDraft(draft);
  }, []);

  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  /** Debounced: call on every change. */
  const persist = useCallback(
    (draft: StoredDraft) => {
      pending.current = draft;
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  /** Immediate: for a fresh analysis, so reopening the panel right away still restores it. */
  const saveNow = useCallback(
    (draft: StoredDraft) => {
      pending.current = null;
      clearTimeout(timer.current);
      queryClient.setQueryData(DRAFT_QUERY_KEY, draft);
      void writeDraft(draft);
    },
    [queryClient],
  );

  const discard = useCallback(() => {
    pending.current = null;
    clearTimeout(timer.current);
    queryClient.setQueryData(DRAFT_QUERY_KEY, null);
    void clearDraft();
  }, [queryClient]);

  return { restored: query.data ?? null, isLoading: query.isLoading, persist, saveNow, discard };
}

import { useCallback, useEffect, useRef, useState } from "react";

import { watchSessionValue } from "@/lib/chrome";
import { clearInputText, INPUT_TEXT_KEY, parseInputText, readInputText, writeInputText } from "@/lib/storage";

const SAVE_DELAY_MS = 300;

/**
 * The Text tab's content. It is kept in session storage so it survives closing the panel, and the
 * same storage is where the right-click menu puts text, so a right-click replaces what is here.
 * `onSentText` runs for text that arrives that way (never for the user's own typing).
 */
export function useTextInput(onSentText: () => void) {
  const [text, setText] = useState("");
  // The last value this hook wrote, so the storage change it causes is not mistaken for a right-click.
  const lastWritten = useRef("");
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onSentTextRef = useRef(onSentText);

  useEffect(() => {
    onSentTextRef.current = onSentText;
  }, [onSentText]);

  const write = useCallback((value: string) => {
    lastWritten.current = value;
    void (value.trim() === "" ? clearInputText() : writeInputText(value));
  }, []);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const value = pending.current;
    pending.current = null;
    if (value !== null) write(value);
  }, [write]);

  useEffect(() => {
    let cancelled = false;
    void readInputText().then((stored) => {
      if (cancelled) return;
      lastWritten.current = stored ?? "";
      setText(stored ?? "");
    });

    const unwatch = watchSessionValue(INPUT_TEXT_KEY, (value) => {
      const sent = parseInputText(value) ?? "";
      if (sent === lastWritten.current) return;
      lastWritten.current = sent;
      pending.current = null;
      setText(sent);
      if (sent !== "") onSentTextRef.current();
    });

    window.addEventListener("pagehide", flush);
    return () => {
      cancelled = true;
      unwatch();
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  const change = useCallback(
    (value: string) => {
      setText(value);
      pending.current = value;
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  const clear = useCallback(() => {
    setText("");
    pending.current = null;
    clearTimeout(timer.current);
    write("");
  }, [write]);

  return { text, change, clear };
}

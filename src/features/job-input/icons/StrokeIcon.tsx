import { Icon } from "@chakra-ui/react";
import type { ReactNode } from "react";

/** The shared frame of the tab icons: a 24x24 outline drawing in the current text color. */
export function StrokeIcon({ children }: { children: ReactNode }) {
  return (
    <Icon asChild boxSize="4" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </Icon>
  );
}

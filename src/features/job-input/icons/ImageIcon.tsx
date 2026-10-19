import { StrokeIcon } from "./StrokeIcon";

export function ImageIcon() {
  return (
    <StrokeIcon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 16-5-5-8 8" />
    </StrokeIcon>
  );
}

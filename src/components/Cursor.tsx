/**
 * Cursor.tsx
 *
 * Cursor component.
 * Displays in different shapes depending on the mode:
 * - Normal mode: block cursor (one character wide)
 * - Insert mode: line cursor (vertical bar)
 * - Visual mode: block cursor
 *
 * Cursor position is controlled via CSS variables,
 * calculated using `ch` / `lh` units of a monospace font.
 */

import type { CursorPosition, VimMode } from "../types";

export interface CursorProps {
  /** Cursor position (0-based) */
  position: CursorPosition;
  /** Current Vim mode */
  mode: VimMode;
  /** Whether line numbers are displayed */
  showLineNumbers: boolean;
  /** Gutter width for line numbers (in ch units) */
  gutterWidth: number;
}

/**
 * Renders the editor cursor.
 *
 * Displayed as an overlay using absolute positioning.
 * left / top are calculated accounting for the line number gutter offset.
 */
export function Cursor({
  position,
  mode,
  showLineNumbers,
  gutterWidth,
}: CursorProps) {
  // Determine cursor shape based on the mode
  const cursorClass = getCursorClass(mode);

  // Gutter offset (only when line numbers are displayed)
  // gutterWidth ch + 1ch padding
  const gutterOffset = showLineNumbers ? gutterWidth + 1 : 0;

  return (
    <div
      className={`sv-cursor ${cursorClass}`}
      style={{
        // Set cursor position via CSS variables
        // ch unit: based on the width of "0" in a monospace font
        ["--cursor-col" as string]: position.col + gutterOffset,
        ["--cursor-line" as string]: position.line,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Returns the CSS class for the cursor based on the mode.
 */
function getCursorClass(mode: VimMode): string {
  switch (mode) {
    case "insert":
      return "sv-cursor-line";
    case "normal":
    case "visual":
    case "visual-line":
    case "visual-block":
      return "sv-cursor-block";
    case "command-line":
      return "sv-cursor-block";
    default:
      return "sv-cursor-block";
  }
}

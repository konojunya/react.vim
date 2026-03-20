/**
 * Line.tsx
 *
 * Component that renders a single line of the editor.
 * Receives a Shiki token sequence and renders it as colored spans.
 *
 * Also handles visual mode selection highlighting here.
 */

import type { ThemedToken } from "shiki";

export interface LineProps {
  /** Line number (0-based) */
  lineIndex: number;
  /** Shiki token sequence for this line */
  tokens: ThemedToken[];
  /** Whether to display line numbers */
  showLineNumbers: boolean;
  /** Total number of lines (for calculating line number digit width) */
  totalLines: number;
  /** Whether this line is selected (for visual mode) */
  isSelected: boolean;
  /** Selection start column within the line (for character-wise selection) */
  selectionStartCol?: number;
  /** Selection end column within the line (for character-wise selection) */
  selectionEndCol?: number;
}

/**
 * Renders a single line of the editor.
 *
 * Composed of a line number and a token sequence.
 * Empty lines contain an invisible space to maintain height.
 */
export function Line({
  lineIndex,
  tokens,
  showLineNumbers,
  totalLines,
  isSelected,
  selectionStartCol,
  selectionEndCol,
}: LineProps) {
  // Calculate line number digit width (to align across all lines)
  const gutterWidth = String(totalLines).length;

  return (
    <div
      className="sv-line"
      data-line={lineIndex}
    >
      {/* Line number gutter */}
      {showLineNumbers && (
        <span
          className="sv-line-number"
          style={{ minWidth: `${gutterWidth + 1}ch` }}
        >
          {lineIndex + 1}
        </span>
      )}

      {/* Line content */}
      <span className="sv-line-content">
        {tokens.length === 0 || (tokens.length === 1 && tokens[0].content === "") ? (
          // Empty line: insert invisible character to maintain height
          <span>{"\n"}</span>
        ) : (
          renderTokens(tokens, isSelected, selectionStartCol, selectionEndCol)
        )}
      </span>
    </div>
  );
}

/**
 * Render the token sequence as spans.
 * If there is a selection, apply selection styles to the range.
 */
function renderTokens(
  tokens: ThemedToken[],
  isSelected: boolean,
  selectionStartCol?: number,
  selectionEndCol?: number,
): React.ReactNode[] {
  // Entire line is selected (visual-line mode)
  if (isSelected && selectionStartCol === undefined) {
    return tokens.map((token, i) => (
      <span
        key={i}
        className="sv-token sv-selected"
        style={{ color: token.color }}
      >
        {token.content}
      </span>
    ));
  }

  // Normal rendering when there is no character-wise selection
  if (selectionStartCol === undefined || selectionEndCol === undefined) {
    return tokens.map((token, i) => (
      <span
        key={i}
        className="sv-token"
        style={{ color: token.color }}
      >
        {token.content}
      </span>
    ));
  }

  // Character-wise selection present: split tokens and highlight
  return renderTokensWithSelection(tokens, selectionStartCol, selectionEndCol);
}

/**
 * Token rendering when character-wise selection is present.
 * When token boundaries and selection boundaries do not align,
 * tokens are split and the selected portions are given a CSS class.
 */
function renderTokensWithSelection(
  tokens: ThemedToken[],
  selStart: number,
  selEnd: number,
): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let col = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const tokenStart = col;
    const tokenEnd = col + token.content.length;

    // Token does not overlap with the selection range
    if (tokenEnd <= selStart || tokenStart >= selEnd) {
      result.push(
        <span key={`${i}`} className="sv-token" style={{ color: token.color }}>
          {token.content}
        </span>,
      );
    }
    // Entire token is within the selection range
    else if (tokenStart >= selStart && tokenEnd <= selEnd) {
      result.push(
        <span
          key={`${i}`}
          className="sv-token sv-selected"
          style={{ color: token.color }}
        >
          {token.content}
        </span>,
      );
    }
    // Token partially overlaps with the selection range -> split
    else {
      const parts = splitTokenBySelection(
        token,
        tokenStart,
        selStart,
        selEnd,
      );
      parts.forEach((part, j) => {
        result.push(
          <span
            key={`${i}-${j}`}
            className={`sv-token${part.selected ? " sv-selected" : ""}`}
            style={{ color: token.color }}
          >
            {part.content}
          </span>,
        );
      });
    }

    col = tokenEnd;
  }

  return result;
}

/**
 * Split a token by the selection range.
 */
function splitTokenBySelection(
  token: ThemedToken,
  tokenStart: number,
  selStart: number,
  selEnd: number,
): { content: string; selected: boolean }[] {
  const parts: { content: string; selected: boolean }[] = [];
  const text = token.content;
  const relSelStart = Math.max(0, selStart - tokenStart);
  const relSelEnd = Math.min(text.length, selEnd - tokenStart);

  // Part before the selection
  if (relSelStart > 0) {
    parts.push({ content: text.slice(0, relSelStart), selected: false });
  }

  // Selected part
  if (relSelEnd > relSelStart) {
    parts.push({
      content: text.slice(relSelStart, relSelEnd),
      selected: true,
    });
  }

  // Part after the selection
  if (relSelEnd < text.length) {
    parts.push({ content: text.slice(relSelEnd), selected: false });
  }

  return parts;
}

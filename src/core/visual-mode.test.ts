/**
 * visual-mode.test.ts
 *
 * Integration tests for visual mode (character-wise and line-wise).
 * Verifies selection expansion/contraction, operator execution, and mode switching.
 */

import { describe, it, expect } from "vitest";
import type { VimContext, CursorPosition } from "../types";
import { processKeystroke, createInitialContext } from "./vim-state";
import { TextBuffer } from "./buffer";

// =====================
// Helper functions
// =====================

/** Create a VimContext in visual mode for testing */
function createVisualContext(
  cursor: CursorPosition,
  anchor: CursorPosition,
  overrides?: Partial<VimContext>,
): VimContext {
  return {
    ...createInitialContext(cursor),
    mode: "visual",
    visualAnchor: { ...anchor },
    statusMessage: "-- VISUAL --",
    ...overrides,
  };
}

/** Create a VimContext in visual-line mode for testing */
function createVisualLineContext(
  cursor: CursorPosition,
  anchor: CursorPosition,
  overrides?: Partial<VimContext>,
): VimContext {
  return {
    ...createInitialContext(cursor),
    mode: "visual-line",
    visualAnchor: { ...anchor },
    statusMessage: "-- VISUAL LINE --",
    ...overrides,
  };
}

/** Process multiple keys in sequence and return the final state */
function pressKeys(
  keys: string[],
  ctx: VimContext,
  buffer: TextBuffer,
): { ctx: VimContext; allActions: import("../types").VimAction[] } {
  let current = ctx;
  const allActions: import("../types").VimAction[] = [];
  for (const key of keys) {
    const result = processKeystroke(key, current, buffer);
    current = result.newCtx;
    allActions.push(...result.actions);
  }
  return { ctx: current, allActions };
}

// =====================
// Tests
// =====================

describe("Visual mode", () => {
  // ---------------------------------------------------
  // Starting visual mode and cursor movement
  // ---------------------------------------------------
  describe("Starting visual mode and cursor movement", () => {
    it("enters visual mode with v and sets the anchor", () => {
      const buffer = new TextBuffer("hello world");
      const ctx = createInitialContext({ line: 0, col: 3 });
      const { ctx: result } = pressKeys(["v"], ctx, buffer);
      expect(result.mode).toBe("visual");
      expect(result.visualAnchor).toEqual({ line: 0, col: 3 });
    });

    it("expands selection to the right with l", () => {
      const buffer = new TextBuffer("hello world");
      const ctx = createVisualContext(
        { line: 0, col: 3 },
        { line: 0, col: 3 },
      );
      const { ctx: result } = pressKeys(["l", "l"], ctx, buffer);
      expect(result.cursor.col).toBe(5);
      expect(result.visualAnchor).toEqual({ line: 0, col: 3 });
    });

    it("expands selection to the line below with j", () => {
      const buffer = new TextBuffer("hello\nworld\nfoo");
      const ctx = createVisualContext(
        { line: 0, col: 2 },
        { line: 0, col: 2 },
      );
      const { ctx: result } = pressKeys(["j"], ctx, buffer);
      expect(result.cursor.line).toBe(1);
      expect(result.visualAnchor).toEqual({ line: 0, col: 2 });
    });

    it("moves cursor left and shrinks selection with h", () => {
      const buffer = new TextBuffer("hello world");
      const ctx = createVisualContext(
        { line: 0, col: 5 },
        { line: 0, col: 3 },
      );
      const { ctx: result } = pressKeys(["h"], ctx, buffer);
      expect(result.cursor.col).toBe(4);
    });

    it("moves to the beginning of the file with gg", () => {
      const buffer = new TextBuffer("line1\nline2\nline3");
      const ctx = createVisualContext(
        { line: 2, col: 0 },
        { line: 2, col: 0 },
      );
      const { ctx: result } = pressKeys(["g", "g"], ctx, buffer);
      expect(result.cursor.line).toBe(0);
      expect(result.visualAnchor).toEqual({ line: 2, col: 0 });
    });
  });

  // ---------------------------------------------------
  // Operators in visual mode
  // ---------------------------------------------------
  describe("Operators in visual mode", () => {
    it("deletes the selection with d", () => {
      const buffer = new TextBuffer("hello world");
      const ctx = createVisualContext(
        { line: 0, col: 5 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["d"], ctx, buffer);
      expect(buffer.getContent()).toBe("world");
      expect(result.mode).toBe("normal");
      expect(result.visualAnchor).toBeNull();
    });

    it("deletes the selection with x (same behavior as d)", () => {
      const buffer = new TextBuffer("hello world");
      const ctx = createVisualContext(
        { line: 0, col: 5 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["x"], ctx, buffer);
      expect(buffer.getContent()).toBe("world");
      expect(result.mode).toBe("normal");
    });

    it("yanks the selection with y (buffer unchanged)", () => {
      const buffer = new TextBuffer("hello world");
      const ctx = createVisualContext(
        { line: 0, col: 4 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["y"], ctx, buffer);
      expect(buffer.getContent()).toBe("hello world");
      expect(result.register).toBe("hello");
      expect(result.mode).toBe("normal");
    });

    it("deletes the selection and enters insert mode with c", () => {
      const buffer = new TextBuffer("hello world");
      const ctx = createVisualContext(
        { line: 0, col: 4 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["c"], ctx, buffer);
      expect(buffer.getContent()).toBe(" world");
      expect(result.mode).toBe("insert");
    });

    it("deletes a multi-line selection with d", () => {
      const buffer = new TextBuffer("line1\nline2\nline3");
      const ctx = createVisualContext(
        { line: 1, col: 2 },
        { line: 0, col: 3 },
      );
      const { ctx: result } = pressKeys(["d"], ctx, buffer);
      // line1 cols 0-2 + line2 cols 3+ are deleted
      expect(result.mode).toBe("normal");
    });
  });

  // ---------------------------------------------------
  // Visual-line mode
  // ---------------------------------------------------
  describe("Visual-line mode", () => {
    it("enters visual-line mode with V", () => {
      const buffer = new TextBuffer("line1\nline2\nline3");
      const ctx = createInitialContext({ line: 0, col: 0 });
      const { ctx: result } = pressKeys(["V"], ctx, buffer);
      expect(result.mode).toBe("visual-line");
    });

    it("deletes entire lines with d in visual-line mode", () => {
      const buffer = new TextBuffer("line1\nline2\nline3");
      const ctx = createVisualLineContext(
        { line: 1, col: 0 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["d"], ctx, buffer);
      expect(buffer.getContent()).toBe("line3");
      expect(result.mode).toBe("normal");
      expect(result.register).toBe("line1\nline2\n");
    });

    it("yanks entire lines with y in visual-line mode", () => {
      const buffer = new TextBuffer("line1\nline2\nline3");
      const ctx = createVisualLineContext(
        { line: 1, col: 0 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["y"], ctx, buffer);
      expect(buffer.getContent()).toBe("line1\nline2\nline3");
      expect(result.register).toBe("line1\nline2\n");
      expect(result.mode).toBe("normal");
    });

    it("expands selection downward when pressing j in visual-line mode", () => {
      const buffer = new TextBuffer("line1\nline2\nline3");
      const ctx = createVisualLineContext(
        { line: 0, col: 0 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["j"], ctx, buffer);
      expect(result.cursor.line).toBe(1);
      expect(result.mode).toBe("visual-line");
    });
  });

  // ---------------------------------------------------
  // Escape (exit visual mode)
  // ---------------------------------------------------
  describe("Escape (exit visual mode)", () => {
    it("returns to normal mode with Escape", () => {
      const buffer = new TextBuffer("hello world");
      const ctx = createVisualContext(
        { line: 0, col: 5 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["Escape"], ctx, buffer);
      expect(result.mode).toBe("normal");
      expect(result.visualAnchor).toBeNull();
    });

    it("returns to normal mode when pressing Escape in visual-line mode", () => {
      const buffer = new TextBuffer("line1\nline2");
      const ctx = createVisualLineContext(
        { line: 1, col: 0 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["Escape"], ctx, buffer);
      expect(result.mode).toBe("normal");
    });
  });

  // ---------------------------------------------------
  // Mode switching (re-pressing v / V)
  // ---------------------------------------------------
  describe("Mode switching", () => {
    it("returns to normal mode when pressing v again in visual mode", () => {
      const buffer = new TextBuffer("hello");
      const ctx = createVisualContext(
        { line: 0, col: 3 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["v"], ctx, buffer);
      expect(result.mode).toBe("normal");
    });

    it("switches to visual-line mode when pressing V in visual mode", () => {
      const buffer = new TextBuffer("hello");
      const ctx = createVisualContext(
        { line: 0, col: 3 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["V"], ctx, buffer);
      expect(result.mode).toBe("visual-line");
    });

    it("returns to normal mode when pressing V again in visual-line mode", () => {
      const buffer = new TextBuffer("hello");
      const ctx = createVisualLineContext(
        { line: 0, col: 0 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["V"], ctx, buffer);
      expect(result.mode).toBe("normal");
    });

    it("switches to visual mode when pressing v in visual-line mode", () => {
      const buffer = new TextBuffer("hello");
      const ctx = createVisualLineContext(
        { line: 0, col: 0 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["v"], ctx, buffer);
      expect(result.mode).toBe("visual");
    });
  });

  // ---------------------------------------------------
  // Count prefix
  // ---------------------------------------------------
  describe("Count prefix", () => {
    it("moves cursor 3 positions right with 3l", () => {
      const buffer = new TextBuffer("hello world");
      const ctx = createVisualContext(
        { line: 0, col: 0 },
        { line: 0, col: 0 },
      );
      const { ctx: result } = pressKeys(["3", "l"], ctx, buffer);
      expect(result.cursor.col).toBe(3);
    });
  });

  // ---------------------------------------------------
  // Edge case: visualAnchor is null
  // ---------------------------------------------------
  describe("Edge cases", () => {
    it("operator does nothing when visualAnchor is null", () => {
      const buffer = new TextBuffer("hello");
      const ctx: VimContext = {
        ...createInitialContext({ line: 0, col: 0 }),
        mode: "visual",
        visualAnchor: null,
      };
      const { ctx: result } = pressKeys(["d"], ctx, buffer);
      expect(buffer.getContent()).toBe("hello");
      expect(result.mode).toBe("visual");
    });
  });
});

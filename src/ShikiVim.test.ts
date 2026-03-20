import { describe, it, expect } from "vitest";
import { computeSelectionInfo } from "./ShikiVim";

describe("computeSelectionInfo", () => {
  // ---------------------------------------------------
  // Non-visual modes return no selection
  // ---------------------------------------------------
  describe("non-visual modes", () => {
    it("returns no selection in normal mode", () => {
      const info = computeSelectionInfo("normal", null, { line: 0, col: 0 }, 10);
      expect(info.isLineSelected(0)).toBe(false);
      expect(info.getSelectionStartCol(0)).toBeUndefined();
      expect(info.getSelectionEndCol(0)).toBeUndefined();
    });

    it("returns no selection in insert mode", () => {
      const info = computeSelectionInfo("insert", null, { line: 0, col: 0 }, 10);
      expect(info.isLineSelected(0)).toBe(false);
    });

    it("returns no selection when anchor is null", () => {
      const info = computeSelectionInfo("visual", null, { line: 0, col: 0 }, 10);
      expect(info.isLineSelected(0)).toBe(false);
    });
  });

  // ---------------------------------------------------
  // visual (character-wise)
  // ---------------------------------------------------
  describe("visual (character-wise)", () => {
    it("selects a single line range", () => {
      const info = computeSelectionInfo(
        "visual",
        { line: 0, col: 2 },
        { line: 0, col: 8 },
        10,
      );
      expect(info.isLineSelected(0)).toBe(true);
      expect(info.isLineSelected(1)).toBe(false);
      expect(info.getSelectionStartCol(0)).toBe(2);
      expect(info.getSelectionEndCol(0)).toBe(9); // endCol + 1
    });

    it("selects a multi-line range", () => {
      const info = computeSelectionInfo(
        "visual",
        { line: 1, col: 3 },
        { line: 3, col: 5 },
        10,
      );
      expect(info.isLineSelected(0)).toBe(false);
      expect(info.isLineSelected(1)).toBe(true);
      expect(info.isLineSelected(2)).toBe(true);
      expect(info.isLineSelected(3)).toBe(true);
      expect(info.isLineSelected(4)).toBe(false);
      // First line starts at anchor col
      expect(info.getSelectionStartCol(1)).toBe(3);
      // Middle line starts at col 0
      expect(info.getSelectionStartCol(2)).toBe(0);
      expect(info.getSelectionEndCol(2)).toBe(Infinity);
      // Last line ends at cursor col + 1
      expect(info.getSelectionEndCol(3)).toBe(6);
    });

    it("normalizes when cursor is before anchor", () => {
      const info = computeSelectionInfo(
        "visual",
        { line: 2, col: 5 },
        { line: 0, col: 1 },
        10,
      );
      expect(info.isLineSelected(0)).toBe(true);
      expect(info.isLineSelected(2)).toBe(true);
      expect(info.isLineSelected(3)).toBe(false);
      expect(info.getSelectionStartCol(0)).toBe(1);
      expect(info.getSelectionEndCol(2)).toBe(6);
    });

    it("returns undefined for lines outside the selection", () => {
      const info = computeSelectionInfo(
        "visual",
        { line: 2, col: 0 },
        { line: 2, col: 5 },
        10,
      );
      expect(info.getSelectionStartCol(0)).toBeUndefined();
      expect(info.getSelectionEndCol(0)).toBeUndefined();
      expect(info.getSelectionStartCol(5)).toBeUndefined();
      expect(info.getSelectionEndCol(5)).toBeUndefined();
    });
  });

  // ---------------------------------------------------
  // visual-line
  // ---------------------------------------------------
  describe("visual-line", () => {
    it("selects whole lines in the range", () => {
      const info = computeSelectionInfo(
        "visual-line",
        { line: 1, col: 0 },
        { line: 3, col: 0 },
        10,
      );
      expect(info.isLineSelected(0)).toBe(false);
      expect(info.isLineSelected(1)).toBe(true);
      expect(info.isLineSelected(2)).toBe(true);
      expect(info.isLineSelected(3)).toBe(true);
      expect(info.isLineSelected(4)).toBe(false);
      // visual-line always returns undefined for col ranges
      expect(info.getSelectionStartCol(1)).toBeUndefined();
      expect(info.getSelectionEndCol(1)).toBeUndefined();
    });

    it("normalizes when cursor is before anchor", () => {
      const info = computeSelectionInfo(
        "visual-line",
        { line: 5, col: 0 },
        { line: 2, col: 0 },
        10,
      );
      expect(info.isLineSelected(2)).toBe(true);
      expect(info.isLineSelected(5)).toBe(true);
      expect(info.isLineSelected(1)).toBe(false);
      expect(info.isLineSelected(6)).toBe(false);
    });
  });

  // ---------------------------------------------------
  // visual-block (rectangular)
  // ---------------------------------------------------
  describe("visual-block", () => {
    it("selects a rectangular block within the line range", () => {
      // anchor at (1,2), cursor at (3,5) -> block cols 2..5, lines 1..3
      const info = computeSelectionInfo(
        "visual-block",
        { line: 1, col: 2 },
        { line: 3, col: 5 },
        10,
      );
      expect(info.isLineSelected(0)).toBe(false);
      expect(info.isLineSelected(1)).toBe(true);
      expect(info.isLineSelected(2)).toBe(true);
      expect(info.isLineSelected(3)).toBe(true);
      expect(info.isLineSelected(4)).toBe(false);
      // Same columns on every selected line
      expect(info.getSelectionStartCol(1)).toBe(2);
      expect(info.getSelectionEndCol(1)).toBe(6); // endCol + 1
      expect(info.getSelectionStartCol(2)).toBe(2);
      expect(info.getSelectionEndCol(2)).toBe(6);
      expect(info.getSelectionStartCol(3)).toBe(2);
      expect(info.getSelectionEndCol(3)).toBe(6);
    });

    it("does NOT highlight lines outside the block range", () => {
      // This is the bug regression test:
      // Ctrl-V at (10,2) should NOT highlight line 0, 1, 9, 11, etc.
      const info = computeSelectionInfo(
        "visual-block",
        { line: 10, col: 2 },
        { line: 10, col: 2 },
        100,
      );
      expect(info.isLineSelected(10)).toBe(true);
      expect(info.getSelectionStartCol(10)).toBe(2);
      expect(info.getSelectionEndCol(10)).toBe(3);
      // Lines outside must return undefined
      for (const line of [0, 1, 5, 9, 11, 50, 99]) {
        expect(info.isLineSelected(line)).toBe(false);
        expect(info.getSelectionStartCol(line)).toBeUndefined();
        expect(info.getSelectionEndCol(line)).toBeUndefined();
      }
    });

    it("normalizes when cursor is before anchor", () => {
      const info = computeSelectionInfo(
        "visual-block",
        { line: 5, col: 8 },
        { line: 2, col: 3 },
        10,
      );
      expect(info.isLineSelected(2)).toBe(true);
      expect(info.isLineSelected(5)).toBe(true);
      expect(info.isLineSelected(1)).toBe(false);
      expect(info.isLineSelected(6)).toBe(false);
      expect(info.getSelectionStartCol(3)).toBe(3);
      expect(info.getSelectionEndCol(3)).toBe(9);
    });

    it("handles single-column block (anchor.col === cursor.col)", () => {
      const info = computeSelectionInfo(
        "visual-block",
        { line: 0, col: 4 },
        { line: 2, col: 4 },
        10,
      );
      expect(info.getSelectionStartCol(0)).toBe(4);
      expect(info.getSelectionEndCol(0)).toBe(5);
      expect(info.getSelectionStartCol(3)).toBeUndefined();
    });
  });
});

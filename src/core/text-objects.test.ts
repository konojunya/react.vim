import { describe, it, expect } from "vitest";
import type { VimContext, CursorPosition } from "../types";
import { processKeystroke, createInitialContext } from "./vim-state";
import { TextBuffer } from "./buffer";

function createTestContext(
  cursor: CursorPosition,
  overrides?: Partial<VimContext>,
): VimContext {
  return { ...createInitialContext(cursor), ...overrides };
}

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

describe("Text objects", () => {
  // ---------------------------------------------------
  // iw / aw (inner/a word)
  // ---------------------------------------------------
  describe("iw / aw (word)", () => {
    it("ciw changes the word under cursor", () => {
      const buffer = new TextBuffer("hello world foo");
      const ctx = createTestContext({ line: 0, col: 7 }); // on 'o' of 'world'
      const { ctx: result } = pressKeys(["c", "i", "w"], ctx, buffer);
      expect(buffer.getContent()).toBe("hello  foo");
      expect(result.mode).toBe("insert");
      expect(result.cursor.col).toBe(6);
    });

    it("diw deletes the word under cursor", () => {
      const buffer = new TextBuffer("hello world foo");
      const ctx = createTestContext({ line: 0, col: 6 }); // on 'w' of 'world'
      pressKeys(["d", "i", "w"], ctx, buffer);
      expect(buffer.getContent()).toBe("hello  foo");
    });

    it("yiw yanks the word under cursor without modifying buffer", () => {
      const buffer = new TextBuffer("hello world");
      const ctx = createTestContext({ line: 0, col: 6 });
      const { ctx: result } = pressKeys(["y", "i", "w"], ctx, buffer);
      expect(buffer.getContent()).toBe("hello world");
      expect(result.register).toBe("world");
    });

    it("daw deletes the word with trailing whitespace", () => {
      const buffer = new TextBuffer("hello world foo");
      const ctx = createTestContext({ line: 0, col: 6 }); // on 'w' of 'world'
      pressKeys(["d", "a", "w"], ctx, buffer);
      expect(buffer.getContent()).toBe("hello foo");
    });

    it("daw at end of line deletes with leading whitespace", () => {
      const buffer = new TextBuffer("hello world");
      const ctx = createTestContext({ line: 0, col: 6 }); // on 'w' of 'world'
      pressKeys(["d", "a", "w"], ctx, buffer);
      expect(buffer.getContent()).toBe("hello");
    });

    it("ciw on first word of line", () => {
      const buffer = new TextBuffer("hello world");
      const ctx = createTestContext({ line: 0, col: 0 });
      const { ctx: result } = pressKeys(["c", "i", "w"], ctx, buffer);
      expect(buffer.getContent()).toBe(" world");
      expect(result.mode).toBe("insert");
    });
  });

  // ---------------------------------------------------
  // iW / aW (inner/a WORD)
  // ---------------------------------------------------
  describe("iW / aW (WORD)", () => {
    it("ciW changes the WORD including punctuation", () => {
      const buffer = new TextBuffer("foo.bar baz");
      const ctx = createTestContext({ line: 0, col: 2 }); // on 'o' of 'foo.bar'
      const { ctx: result } = pressKeys(["c", "i", "Shift", "W"], ctx, buffer);
      expect(buffer.getContent()).toBe(" baz");
      expect(result.mode).toBe("insert");
    });

    it("daW deletes WORD with trailing whitespace", () => {
      const buffer = new TextBuffer("foo.bar baz qux");
      const ctx = createTestContext({ line: 0, col: 2 });
      pressKeys(["d", "a", "Shift", "W"], ctx, buffer);
      expect(buffer.getContent()).toBe("baz qux");
    });
  });

  // ---------------------------------------------------
  // i" / a" (inner/a double quotes)
  // ---------------------------------------------------
  describe('i" / a" (double quotes)', () => {
    it('ci" changes content inside quotes', () => {
      const buffer = new TextBuffer('hello "world" foo');
      const ctx = createTestContext({ line: 0, col: 8 }); // inside quotes
      const { ctx: result } = pressKeys(["c", "i", '"'], ctx, buffer);
      expect(buffer.getContent()).toBe('hello "" foo');
      expect(result.mode).toBe("insert");
    });

    it('di" deletes content inside quotes', () => {
      const buffer = new TextBuffer('say "hello world" end');
      const ctx = createTestContext({ line: 0, col: 6 });
      pressKeys(["d", "i", '"'], ctx, buffer);
      expect(buffer.getContent()).toBe('say "" end');
    });

    it('da" deletes content including quotes', () => {
      const buffer = new TextBuffer('say "hello" end');
      const ctx = createTestContext({ line: 0, col: 6 });
      pressKeys(["d", "a", '"'], ctx, buffer);
      expect(buffer.getContent()).toBe("say  end");
    });

    it('yi" yanks content inside quotes', () => {
      const buffer = new TextBuffer('say "hello" end');
      const ctx = createTestContext({ line: 0, col: 6 });
      const { ctx: result } = pressKeys(["y", "i", '"'], ctx, buffer);
      expect(result.register).toBe("hello");
      expect(buffer.getContent()).toBe('say "hello" end');
    });
  });

  // ---------------------------------------------------
  // i' / a' (inner/a single quotes)
  // ---------------------------------------------------
  describe("i' / a' (single quotes)", () => {
    it("ci' changes content inside single quotes", () => {
      const buffer = new TextBuffer("say 'hello' ok");
      const ctx = createTestContext({ line: 0, col: 6 });
      const { ctx: result } = pressKeys(["c", "i", "'"], ctx, buffer);
      expect(buffer.getContent()).toBe("say '' ok");
      expect(result.mode).toBe("insert");
    });
  });

  // ---------------------------------------------------
  // i( / a( (inner/a parentheses)
  // ---------------------------------------------------
  describe("i( / a( (parentheses)", () => {
    it("ci( changes content inside parens", () => {
      const buffer = new TextBuffer("foo(bar, baz) end");
      const ctx = createTestContext({ line: 0, col: 5 }); // inside parens
      const { ctx: result } = pressKeys(["c", "i", "("], ctx, buffer);
      expect(buffer.getContent()).toBe("foo() end");
      expect(result.mode).toBe("insert");
    });

    it("di) also works as alias for di(", () => {
      const buffer = new TextBuffer("foo(bar) end");
      const ctx = createTestContext({ line: 0, col: 5 });
      pressKeys(["d", "i", ")"], ctx, buffer);
      expect(buffer.getContent()).toBe("foo() end");
    });

    it("da( deletes including parens", () => {
      const buffer = new TextBuffer("foo(bar) end");
      const ctx = createTestContext({ line: 0, col: 5 });
      pressKeys(["d", "a", "("], ctx, buffer);
      expect(buffer.getContent()).toBe("foo end");
    });

    it("ci( works with nested parens", () => {
      const buffer = new TextBuffer("foo(bar(baz)) end");
      const ctx = createTestContext({ line: 0, col: 8 }); // inside inner parens
      const { ctx: result } = pressKeys(["c", "i", "("], ctx, buffer);
      expect(buffer.getContent()).toBe("foo(bar()) end");
      expect(result.mode).toBe("insert");
    });

    it("ci( works across multiple lines", () => {
      const buffer = new TextBuffer("foo(\n  bar,\n  baz\n) end");
      const ctx = createTestContext({ line: 1, col: 3 }); // on 'bar'
      const { ctx: result } = pressKeys(["c", "i", "("], ctx, buffer);
      expect(buffer.getContent()).toBe("foo() end");
      expect(result.mode).toBe("insert");
    });
  });

  // ---------------------------------------------------
  // i{ / a{ (inner/a braces)
  // ---------------------------------------------------
  describe("i{ / a{ (braces)", () => {
    it("ci{ changes content inside braces", () => {
      const buffer = new TextBuffer("fn { body } end");
      const ctx = createTestContext({ line: 0, col: 6 });
      const { ctx: result } = pressKeys(["c", "i", "{"], ctx, buffer);
      expect(buffer.getContent()).toBe("fn {} end");
      expect(result.mode).toBe("insert");
    });

    it("di} also works as alias for di{", () => {
      const buffer = new TextBuffer("fn { x } end");
      const ctx = createTestContext({ line: 0, col: 5 });
      pressKeys(["d", "i", "}"], ctx, buffer);
      expect(buffer.getContent()).toBe("fn {} end");
    });
  });

  // ---------------------------------------------------
  // i[ / a[ (inner/a brackets)
  // ---------------------------------------------------
  describe("i[ / a[ (brackets)", () => {
    it("ci[ changes content inside brackets", () => {
      const buffer = new TextBuffer("arr[idx] end");
      const ctx = createTestContext({ line: 0, col: 5 });
      const { ctx: result } = pressKeys(["c", "i", "["], ctx, buffer);
      expect(buffer.getContent()).toBe("arr[] end");
      expect(result.mode).toBe("insert");
    });
  });

  // ---------------------------------------------------
  // Visual mode text objects
  // ---------------------------------------------------
  describe("Visual mode text objects", () => {
    it("viw selects the inner word", () => {
      const buffer = new TextBuffer("hello world foo");
      const ctx = createTestContext({ line: 0, col: 7 });
      const { ctx: result } = pressKeys(["v", "i", "w"], ctx, buffer);
      expect(result.mode).toBe("visual");
      expect(result.visualAnchor).toEqual({ line: 0, col: 6 });
      expect(result.cursor).toEqual({ line: 0, col: 10 });
    });

    it('vi" selects inside quotes', () => {
      const buffer = new TextBuffer('say "hello" end');
      const ctx = createTestContext({ line: 0, col: 6 });
      const { ctx: result } = pressKeys(["v", "i", '"'], ctx, buffer);
      expect(result.mode).toBe("visual");
      expect(result.visualAnchor).toEqual({ line: 0, col: 5 });
      expect(result.cursor).toEqual({ line: 0, col: 9 });
    });

    it("viw then d deletes the word", () => {
      const buffer = new TextBuffer("hello world foo");
      const ctx = createTestContext({ line: 0, col: 7 });
      const { ctx: afterViw } = pressKeys(["v", "i", "w"], ctx, buffer);
      pressKeys(["d"], afterViw, buffer);
      expect(buffer.getContent()).toBe("hello  foo");
    });
  });
});

# shiki-vim

A vim-like lightweight code editor React component powered by [Shiki](https://shiki.style/).

No file tree, no tabs — just a single file editor with syntax highlighting and vim keybindings.

## Install

```bash
bun add shiki-vim shiki react react-dom
```

`shiki`, `react`, and `react-dom` are peer dependencies.

## Usage

```tsx
import ShikiVim from "shiki-vim";
import "shiki-vim/styles.css";
import { createHighlighter } from "shiki";

const highlighter = await createHighlighter({
  themes: ["vitesse-dark"],
  langs: ["typescript"],
});

function Editor() {
  return (
    <ShikiVim
      content={`const hello = "world";`}
      highlighter={highlighter}
      lang="typescript"
      theme="vitesse-dark"
      onSave={(content) => console.log("saved:", content)}
      onYank={(text) => navigator.clipboard.writeText(text)}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | required | The content to display and edit |
| `highlighter` | `HighlighterCore` | required | Shiki highlighter instance |
| `lang` | `string` | required | Language for syntax highlighting |
| `theme` | `string` | required | Theme for syntax highlighting |
| `shikiOptions` | `Record<string, unknown>` | `undefined` | Additional options passed to `codeToTokens` |
| `cursorPosition` | `string` | `"1:1"` | Initial cursor position (1-based, `"line:col"`) |
| `onChange` | `(content: string) => void` | `undefined` | Called when content changes |
| `onYank` | `(text: string) => void` | `undefined` | Called when text is yanked |
| `onSave` | `(content: string) => void` | `undefined` | Called on `:w` command |
| `onModeChange` | `(mode: VimMode) => void` | `undefined` | Called when vim mode changes |
| `className` | `string` | `undefined` | Additional class name for the container |
| `readOnly` | `boolean` | `false` | Whether the editor is read-only |
| `showLineNumbers` | `boolean` | `true` | Whether to show line numbers |

## Vim Keybindings

### Supported (v0.1.0)

#### Modes

| Key | Action |
|-----|--------|
| `i` | Insert before cursor |
| `a` | Insert after cursor |
| `I` | Insert at first non-blank |
| `A` | Insert at end of line |
| `o` | Open line below |
| `O` | Open line above |
| `v` | Visual mode (character) |
| `V` | Visual line mode |
| `Escape` | Return to normal mode |

#### Motions

| Key | Action |
|-----|--------|
| `h` `j` `k` `l` | Basic movement |
| `w` `e` `b` | Word movement |
| `0` | Line start |
| `^` | First non-blank |
| `$` | Line end |
| `gg` | File start (or `{count}gg` for line) |
| `G` | File end (or `{count}G` for line) |
| `f{char}` | Find char forward |
| `F{char}` | Find char backward |
| `t{char}` | Till char forward |
| `T{char}` | Till char backward |
| `%` | Match bracket |

#### Operators

| Key | Action |
|-----|--------|
| `d{motion}` | Delete |
| `y{motion}` | Yank |
| `c{motion}` | Change |
| `dd` `yy` `cc` | Line-wise operator |
| `{count}{operator}{motion}` | With count |

#### Editing

| Key | Action |
|-----|--------|
| `x` | Delete char under cursor |
| `r{char}` | Replace char |
| `p` | Paste after |
| `P` | Paste before |
| `J` | Join lines |
| `u` | Undo |
| `Ctrl-R` | Redo |

#### Search

| Key | Action |
|-----|--------|
| `/{pattern}` | Search forward |
| `?{pattern}` | Search backward |
| `n` | Next match |
| `N` | Previous match |

#### Scroll

| Key | Action |
|-----|--------|
| `Ctrl-U` | Half page up |
| `Ctrl-D` | Half page down |

#### Ex Commands

| Command | Action |
|---------|--------|
| `:w` | Save (calls `onSave`) |
| `:{number}` | Go to line |

### Planned

- [ ] Text objects (`iw`, `i"`, `i(`, etc.)
- [ ] Visual block mode (`Ctrl-V`)
- [ ] `.` (repeat last change)
- [ ] `~` (toggle case)
- [ ] `>>` / `<<` (indent/dedent)
- [ ] `:s/old/new/` (substitute)
- [ ] `:q`, `:wq`
- [ ] Registers (`"a`, `"b`, etc.)
- [ ] Macros (`q{reg}`, `@{reg}`)
- [ ] Marks (`m{a-z}`, `'{a-z}`)

## Styling

The component uses CSS variables for theming. Override them in your CSS:

```css
.sv-container {
  --sv-font-family: "JetBrains Mono", monospace;
  --sv-font-size: 14px;
  --sv-line-height: 1.5;
  --sv-cursor-color: rgba(255, 255, 255, 0.6);
  --sv-selection-bg: rgba(100, 150, 255, 0.3);
  --sv-gutter-color: #858585;
  --sv-statusline-bg: #252526;
  --sv-statusline-fg: #cccccc;
  --sv-focus-color: #007acc;
}
```

## Architecture

```
src/
├── index.ts              # Exports
├── types.ts              # TypeScript types
├── ShikiVim.tsx           # Main component
├── styles.css            # CSS styles
├── core/
│   ├── buffer.ts         # Text buffer with undo/redo
│   ├── motions.ts        # Motion implementations
│   ├── operators.ts      # Operator execution (d, y, c)
│   ├── vim-state.ts      # State machine dispatcher
│   ├── normal-mode.ts    # Normal mode handler
│   ├── insert-mode.ts    # Insert mode handler
│   ├── visual-mode.ts    # Visual mode handler
│   ├── command-line-mode.ts # Command line handler
│   ├── search.ts         # Buffer search
│   ├── motion-resolver.ts # Key → motion mapping
│   ├── char-pending.ts   # f/F/t/T/r handler
│   ├── ctrl-keys.ts      # Ctrl key combos
│   └── key-utils.ts      # Key classification utils
├── hooks/
│   ├── useShikiTokens.ts # Shiki tokenization
│   └── useVimEngine.ts   # Main engine hook
└── components/
    ├── Line.tsx           # Line renderer
    ├── Cursor.tsx         # Cursor overlay
    └── StatusLine.tsx     # Status bar
```

## Development

```bash
bun install
bun run build       # Build
bun run dev         # Watch mode
bun run typecheck   # Type check
bun run test        # Run tests
bun run lint        # Lint with oxlint
bun run fmt         # Format with oxfmt
```

## License

MIT

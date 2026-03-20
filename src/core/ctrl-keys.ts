/**
 * ctrl-keys.ts
 *
 * Processing of Ctrl key combination commands.
 * - Ctrl-R: Redo
 * - Ctrl-U: Scroll half page up
 * - Ctrl-D: Scroll half page down
 */

import type { VimContext, VimAction } from "../types";
import type { TextBuffer } from "./buffer";
import type { KeystrokeResult } from "./vim-state";

/**
 * Handle Ctrl key combinations.
 * Common processing called from both normal mode and visual mode.
 */
export function handleCtrlKey(
  key: string,
  ctx: VimContext,
  buffer: TextBuffer,
  readOnly: boolean = false,
): KeystrokeResult {
  switch (key) {
    case "r":
      // readOnly: block redo
      if (readOnly) return { newCtx: ctx, actions: [] };
      return handleCtrlR(ctx, buffer);
    case "u":
      return handleCtrlU(ctx);
    case "d":
      return handleCtrlD(ctx);
    default:
      return { newCtx: ctx, actions: [] };
  }
}

/**
 * Ctrl-R: Redo
 * Reverses the last undo.
 */
function handleCtrlR(
  ctx: VimContext,
  buffer: TextBuffer,
): KeystrokeResult {
  const restored = buffer.redo(ctx.cursor);

  if (restored) {
    return {
      newCtx: { ...ctx, cursor: restored, count: 0, statusMessage: "" },
      actions: [
        { type: "content-change", content: buffer.getContent() },
        { type: "cursor-move", position: restored },
      ],
    };
  }

  return {
    newCtx: { ...ctx, count: 0, statusMessage: "Already at newest change" },
    actions: [
      { type: "status-message", message: "Already at newest change" },
    ],
  };
}

/**
 * Ctrl-U: Scroll half page up
 * The actual scroll amount is calculated on the component side.
 */
function handleCtrlU(ctx: VimContext): KeystrokeResult {
  return {
    newCtx: { ...ctx, count: 0, statusMessage: "" },
    actions: [{ type: "scroll", direction: "up", amount: 0.5 }],
  };
}

/**
 * Ctrl-D: Scroll half page down
 */
function handleCtrlD(ctx: VimContext): KeystrokeResult {
  return {
    newCtx: { ...ctx, count: 0, statusMessage: "" },
    actions: [{ type: "scroll", direction: "down", amount: 0.5 }],
  };
}

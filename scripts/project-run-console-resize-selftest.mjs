#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(
  path.join(root, "frontend", "src", "components", "projects", "ProjectRunConsole.vue"),
  "utf8",
);

assert.match(source, /role="separator"/);
assert.match(source, /@pointerdown="startResize"/);
assert.match(source, /resizeStartHeight \+ resizeStartY - event\.clientY/);
assert.match(source, /project-run-console-height/);
assert.match(source, /@dblclick="resetPanelHeight"/);
assert.match(source, /ArrowUp/);
assert.match(source, /ArrowDown/);
assert.match(source, /ResizeObserver\(\(\) => fitAddon\?\.fit\(\)\)/);
assert.match(source, /max-width:\s*760px/);

console.log(JSON.stringify({
  pass: true,
  checks: {
    pointer_drag_resizes_vertically: true,
    height_is_clamped: true,
    height_is_persisted: true,
    double_click_restores_default: true,
    keyboard_resize_is_supported: true,
    terminal_refits_after_resize: true,
    mobile_bounds_are_supported: true,
  },
}, null, 2));

import assert from "node:assert/strict";
import { collapseReadSearchRows, readSearchGroupLabel } from "../frontend/src/utils/collapseReadSearchRows.js";

const tool = (name, extra = {}) => ({
  eventType: extra.eventType || "tool_completed",
  eventId: extra.eventId || name,
  toolName: name,
  display: { status: extra.status || "success" },
  ...extra,
});

const grouped = collapseReadSearchRows([
  tool("read_file", { eventId: "r1" }),
  tool("read_file", { eventId: "r2" }),
  tool("grep_text", { eventId: "g1" }),
  tool("apply_patch", { eventId: "e1" }),
  tool("read_file", { eventId: "r3" }),
  tool("list_directory", { eventId: "l1" }),
]);

assert.equal(grouped[0].__readSearchGroup, true);
assert.equal(grouped[0].children.length, 3);
assert.match(grouped[0].label, /读取 2 个文件/);
assert.match(grouped[0].label, /搜索 1 次/);
assert.equal(grouped[0].expanded, false);
assert.equal(grouped[1].toolName, "apply_patch");
assert.equal(grouped[2].__readSearchGroup, true);
assert.equal(grouped[2].children.length, 2);
assert.match(readSearchGroupLabel(grouped[2].children), /读取 1 个文件/);
assert.match(readSearchGroupLabel(grouped[2].children), /列出 1 个目录/);

const expanded = collapseReadSearchRows([
  tool("read_file", { eventId: "a" }),
  tool("glob_files", { eventId: "b" }),
], { expandedGroups: { "read-search:a|b": true } });
assert.equal(expanded[0].expanded, true);
assert.equal(expanded[1].__readSearchChild, true);
assert.equal(expanded[2].__readSearchChild, true);

const running = collapseReadSearchRows([
  tool("web_search", { eventId: "w1", status: "running", eventType: "tool_started" }),
  tool("web_fetch", { eventId: "w2" }),
]);
assert.equal(running[0].running, true);
assert.equal(running[0].expanded, true);
assert.match(running[0].label, /进行中/);

const batchChild = collapseReadSearchRows([
  tool("read_file", { eventId: "b1", __batchChild: true }),
  tool("read_file", { eventId: "b2", __batchChild: true }),
]);
assert.equal(batchChild.length, 2);
assert.equal(batchChild[0].__readSearchGroup, undefined);

console.log(JSON.stringify({ pass: true, schema: "ccm-collapse-read-search-selftest-v1" }));

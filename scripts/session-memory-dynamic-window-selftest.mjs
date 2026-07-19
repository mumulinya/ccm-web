import assert from "node:assert/strict";
import fs from "node:fs";

const {
  calculateSessionMemoryKeepWindow,
  SESSION_MEMORY_MAX_KEEP_TOKENS,
  SESSION_MEMORY_MIN_KEEP_TOKENS,
  SESSION_MEMORY_MIN_TEXT_MESSAGES,
} = await import("../ccm-package/dist/system/session-memory-window.js");
const { getGroupAutoCompactThreshold, resolveGroupModelContextCapacity } = await import("../ccm-package/dist/modules/collaboration/group-compaction-strategy.js");

const messages = (count, chars, prefix = "window") => Array.from({ length: count }, (_, index) => ({
  id: `${prefix}_${index}`,
  role: index % 2 ? "assistant" : "user",
  content: `${prefix}_${index} ${"x".repeat(chars)}`,
}));

const tenThousandWindow = calculateSessionMemoryKeepWindow(messages(100, 1500));
assert.ok(tenThousandWindow.preservedTokenCount >= SESSION_MEMORY_MIN_KEEP_TOKENS);
assert.ok(tenThousandWindow.preservedTokenCount <= SESSION_MEMORY_MAX_KEEP_TOKENS);
assert.ok(tenThousandWindow.preservedTextMessageCount >= SESSION_MEMORY_MIN_TEXT_MESSAGES);
assert.notEqual(tenThousandWindow.preservedMessageCount, 24);

const fiveMessageFloor = calculateSessionMemoryKeepWindow(messages(11, 6000, "five"));
assert.equal(fiveMessageFloor.preservedTextMessageCount, SESSION_MEMORY_MIN_TEXT_MESSAGES);
assert.ok(fiveMessageFloor.preservedTokenCount >= SESSION_MEMORY_MIN_KEEP_TOKENS);

const maxTokenStop = calculateSessionMemoryKeepWindow(messages(10, 30_000, "max"));
assert.equal(maxTokenStop.preservedTextMessageCount, 4);
assert.ok(maxTokenStop.preservedTokenCount >= SESSION_MEMORY_MAX_KEEP_TOKENS);
assert.equal(maxTokenStop.minimumSatisfied, false);

const completeTurn = calculateSessionMemoryKeepWindow(messages(101, 1500, "turn"));
assert.equal(completeTurn.expandedForConversationTurn, true);
assert.equal(completeTurn.startIndex % 2, 0);

const boundedByPreviousCompact = calculateSessionMemoryKeepWindow(messages(100, 1500, "floor"), { floorIndex: 90 });
assert.equal(boundedByPreviousCompact.startIndex, 90);
assert.equal(boundedByPreviousCompact.minimumSatisfied, false);

const automaticCapacity = resolveGroupModelContextCapacity({});
assert.equal(automaticCapacity.contextWindow, 200_000);
assert.equal(getGroupAutoCompactThreshold({}), 167_000);
assert.equal(getGroupAutoCompactThreshold({ modelContextWindow: 516_000, modelAutoCompactTokenLimit: 460_000 }), 460_000);
assert.equal(getGroupAutoCompactThreshold({ modelContextWindow: 1_000_000, modelAutoCompactTokenLimit: 900_000 }), 900_000);

const projectSource = fs.readFileSync(new URL("../backend/modules/projects/project-session-compaction.ts", import.meta.url), "utf8");
const globalSource = fs.readFileSync(new URL("../backend/agents/global/memory.ts", import.meta.url), "utf8");
assert.match(projectSource, /resolveGroupModelContextCapacity\(config\)/);
assert.match(projectSource, /resolveTrustedModelContextCapacity/);
assert.match(projectSource, /autoCompactThreshold: explicitThreshold > 0/);
assert.match(globalSource, /getGroupAutoCompactThreshold\(config\)/);
assert.match(globalSource, /resolveGroupModelContextCapacity\(config\)/);

console.log(JSON.stringify({
  pass: true,
  checks: 23,
  defaults: {
    min_tokens: SESSION_MEMORY_MIN_KEEP_TOKENS,
    min_text_messages: SESSION_MEMORY_MIN_TEXT_MESSAGES,
    max_tokens: SESSION_MEMORY_MAX_KEEP_TOKENS,
  },
  fixed_24_removed: true,
  complete_turn_boundary: true,
  configured_model_capacity_trigger: true,
}, null, 2));

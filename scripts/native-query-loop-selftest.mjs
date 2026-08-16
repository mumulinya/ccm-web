#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const loop = require(path.join(root, "ccm-package", "dist", "agents", "native-query-loop.js"));
const messages = require(path.join(root, "ccm-package", "dist", "agents", "native-query-messages.js"));
const client = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator-llm-client.js"));
const globalAdapter = require(path.join(root, "ccm-package", "dist", "modules", "global", "global-native-query-adapter.js"));

const builtIn = await loop.runNativeQueryLoopSelfTest();
assert.equal(builtIn.pass, true, JSON.stringify(builtIn.checks, null, 2));
const globalBuiltIn = globalAdapter.runGlobalNativeQuerySelfTest();
assert.equal(globalBuiltIn.pass, true, JSON.stringify(globalBuiltIn.checks, null, 2));

const family = messages.nativeQueryFamily({ format: "openai-compatible" });
assert.equal(family, "openai");
const appended = messages.appendNativeTurnTranscript(
  [{ role: "user", content: "hi" }],
  {
    text: "",
    toolCalls: [{ id: "call_1", name: "read_file", arguments: { path: "a.ts" }, argumentsChecksum: "x" }],
    toolReferences: [],
    stopReason: "tool_calls",
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, reported: true },
  },
  [{ callId: "call_1", name: "read_file", ok: true, output: { text: "ok" } }],
  "openai",
);
assert.equal(appended.some(item => item.role === "assistant" && item.tool_calls?.[0]?.id === "call_1"), true);
assert.equal(appended.some(item => item.role === "tool" && item.tool_call_id === "call_1"), true);

const originalFetch = globalThis.fetch;
let sawExtract = false;
const originalExtract = client.extractJsonObject;
client.extractJsonObject = function wrappedExtract(text) {
  sawExtract = true;
  return originalExtract(text);
};
try {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => "" },
    async text() {
      return JSON.stringify({
        choices: [{
          message: {
            content: "",
            tool_calls: [{ id: "call_native", type: "function", function: { name: "read_file", arguments: "{\"path\":\"README.md\"}" } }],
          },
          finish_reason: "tool_calls",
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
    },
  });
  const turn = await client.callNativeAgentTurn({
    apiUrl: "https://example.com/v1",
    apiKey: "selftest-key",
    model: "selftest-model",
    providerNativeToolsMode: "auto",
  }, {
    messages: [{ role: "user", content: "read" }],
    nativeTools: [{ name: "read_file", description: "read", inputSchema: { type: "object", properties: {} } }],
    retry: false,
    stream: false,
  });
  assert.equal(turn.toolCalls[0]?.name, "read_file");
  assert.equal(sawExtract, false, "native turn must not extractJsonObject");
} finally {
  globalThis.fetch = originalFetch;
  client.extractJsonObject = originalExtract;
}

const jsonMode = loop.shouldUseNativeQueryLoop({ providerNativeToolsMode: "json" });
assert.equal(jsonMode, false);

const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const groupLoop = read("backend/modules/collaboration/group-orchestrator-llm.ts");
const groupAdapter = read("backend/modules/collaboration/group-native-query-adapter.ts");
const projectLoop = read("backend/modules/projects/project-main-agent.ts");
const projectAdapter = read("backend/modules/projects/project-native-query-adapter.ts");
const globalRuntime = read("backend/modules/global/global-agent-agentic-runtime.ts");
const globalModel = read("backend/modules/global/global-agent-model.ts");
const nativeLoopSrc = read("backend/agents/native-query-loop.ts");

assert.match(groupLoop, /runGroupMainNativeQueryLoop/);
assert.match(groupAdapter, /runNativeQueryLoop/);
assert.match(groupAdapter, /callNativeAgentTurn/);
assert.equal(groupLoop.includes("callOpenAiCompatibleJson"), false, "群聊主循环不应再走 callOpenAiCompatibleJson");
assert.match(projectLoop, /runProjectMainNativeQueryLoop/);
assert.match(projectAdapter, /runNativeQueryLoop/);
assert.match(projectAdapter, /callNativeAgentTurn/);
assert.equal(projectLoop.includes("await modelJson(gate.messages"), false, "项目主循环不应再对主循环 modelJson");
assert.match(globalRuntime, /runGlobalNativeQueryCall/);
assert.match(globalModel, /callNativeAgentTurn/);
assert.match(nativeLoopSrc, /callNativeAgentTurn/);
assert.match(nativeLoopSrc, /unstreamedTurnText/);
assert.match(nativeLoopSrc, /persistContext/);
assert.match(nativeLoopSrc, /catalogToNativeTools/);
assert.match(nativeLoopSrc, /dispatchPolicy/);
assert.match(nativeLoopSrc, /action: "ask_user"/);
assert.equal(nativeLoopSrc.includes("extractJsonObject"), true, "JSON 退化路径仍可使用 extractJsonObject");

console.log("native-query-loop-selftest: pass");

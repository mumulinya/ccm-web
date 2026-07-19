/**
 * Cold-load export gate for post-split regressions.
 * Uses child processes so require cache cannot hide incomplete circular exports.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "ccm-package", "dist");

function cold(code) {
  const r = spawnSync(process.execPath, ["-e", code], {
    encoding: "utf8",
    cwd: root,
    env: process.env,
  });
  return {
    status: r.status == null ? 1 : r.status,
    out: `${r.stdout || ""}${r.stderr || ""}`.trim(),
  };
}

function fail(msg, out) {
  console.error(`[check-split-exports] FAIL: ${msg}`);
  if (out) console.error(out);
  process.exit(1);
}

function parseLastJson(out) {
  const lines = String(out || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]);
    } catch {
      // keep scanning — warn/log lines may surround the payload
    }
  }
  return null;
}

function assertCold(label, code, predicate) {
  const r = cold(code);
  if (r.status !== 0) fail(`${label} exited ${r.status}`, r.out);
  const payload = parseLastJson(r.out);
  if (!payload) fail(`${label} produced non-JSON output`, r.out);
  if (!predicate(payload)) fail(`${label} assertion failed`, JSON.stringify(payload, null, 2));
  console.log(`[check-split-exports] ok ${label}`);
}

const memoryOrders = [
  {
    name: "shared-first",
    prefix:
      "require('./ccm-package/dist/modules/collaboration/group-memory-shared.js');" +
      "const c=require('./ccm-package/dist/modules/collaboration/group-memory-context.js');" +
      "const s=require('./ccm-package/dist/modules/collaboration/group-memory-shared.js');",
  },
  {
    name: "context-first",
    prefix:
      "const c=require('./ccm-package/dist/modules/collaboration/group-memory-context.js');" +
      "const s=require('./ccm-package/dist/modules/collaboration/group-memory-shared.js');",
  },
  {
    name: "memory-first",
    prefix:
      "require('./ccm-package/dist/modules/collaboration/memory.js');" +
      "const c=require('./ccm-package/dist/modules/collaboration/group-memory-context.js');" +
      "const s=require('./ccm-package/dist/modules/collaboration/group-memory-shared.js');",
  },
];

for (const order of memoryOrders) {
  assertCold(
    `memory-order:${order.name}`,
    `${order.prefix}` +
      // Wait for deferred setImmediate registration in shared-part-02.
      "setTimeout(()=>{" +
      "const ensure=c.ensureGroupMemoryAutoCompactionHook;" +
      "const mark=s.markGroupMemoryAutoCompactHookRegistered;" +
      "const result=typeof ensure==='function'?ensure():{missing:true};" +
      "console.log(JSON.stringify({" +
      "ensure:typeof ensure," +
      "mark:typeof mark," +
      "registered:!!(result&&result.registered)," +
      "already:!!(result&&result.already)" +
      "}));" +
      "}, 25);",
    (p) => p.ensure === "function" && p.mark === "function" && p.registered === true
  );
}

assertCold(
  "global-agent-write-auth",
  "const m=require('./ccm-package/dist/modules/global/global-agent.js');" +
    "console.log(JSON.stringify({" +
    "hasExplicit:typeof m.hasExplicitGlobalWriteAuthorization," +
    "inferLocal:typeof m.inferLocalGlobalAction," +
    "handleApi:typeof m.handleGlobalAgentApi" +
    "}));",
  (p) =>
    p.hasExplicit === "function" &&
    p.inferLocal === "function" &&
    p.handleApi === "function"
);

assertCold(
  "collaboration-hot-path",
  "const m=require('./ccm-package/dist/modules/collaboration/collaboration.js');" +
    "const compact=require('./ccm-package/dist/modules/collaboration/group-memory-compaction.js');" +
    "console.log(JSON.stringify({" +
    "processCrossAgents:typeof m.processCrossAgents," +
    "compact:typeof compact.compactGroupConversationMemory" +
    "}));",
  (p) => p.processCrossAgents === "function" && p.compact === "function"
);

assertCold(
  "hook-state-leaf",
  "const m=require('./ccm-package/dist/modules/collaboration/group-memory-auto-compact-hook-state.js');" +
    "console.log(JSON.stringify({" +
    "mark:typeof m.markGroupMemoryAutoCompactHookRegistered," +
    "isRegistered:typeof m.isGroupMemoryAutoCompactHookRegistered" +
    "}));",
  (p) => p.mark === "function" && p.isRegistered === "function"
);

console.log("[check-split-exports] all passed");
console.log(`[check-split-exports] dist=${dist}`);

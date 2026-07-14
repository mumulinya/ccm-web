import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const [suffix, indexText, startAtText] = process.argv.slice(2);
const index = Number(indexText || 0);
const startAt = Number(startAtText || Date.now());
const waitArray = new Int32Array(new SharedArrayBuffer(4));
const wait = ms => Atomics.wait(waitArray, 0, 0, Math.max(1, ms));

while (Date.now() < startAt) wait(Math.min(20, startAt - Date.now()));

const taskId = `phase228-concurrency-${suffix}-${index}`;
const groupId = `phase228-concurrency-group-${suffix}-${index}`;
const groupSessionId = `gcs_phase228_${index}`;
const session = sessions.openTaskAgentSession({
  scopeId: taskId,
  taskId,
  groupId,
  project: `phase228-concurrency-project-${index}`,
  agentType: "codex",
});

// Keep the open and bind operations in separate transactions to reproduce the
// production handoff window where other worker processes update the same store.
wait(40);
const memoryContext = {
  schema: "ccm-group-memory-context-v1",
  group_id: groupId,
  group_session_id: groupSessionId,
  session_binding: { binding_id: `binding-${suffix}-${index}` },
  memory_policy: { use: "required", ignored: false },
  compaction: {
    sessionMemory: {
      schema: "ccm-group-session-memory-snapshot-v2",
      markdownChecksum: `checksum-${suffix}-${index}`,
      hasSummary: true,
    },
  },
};
const renderedPrompt = `phase228 concurrent prompt ${suffix} ${index}`;
const bound = sessions.bindTaskAgentMemoryContextSnapshot(session.id, {
  taskId,
  groupId,
  project: `phase228-concurrency-project-${index}`,
  agentType: "codex",
  executionId: `exec-${suffix}-${index}`,
  workerContextPacket: { packet_id: `packet-${suffix}-${index}`, memory: memoryContext },
  memoryContext,
  renderedPrompt,
});

if (!bound?.snapshot?.snapshot_id) throw new Error(`session ${session.id} disappeared before snapshot bind`);
process.stdout.write(`${JSON.stringify({ taskId, groupId, groupSessionId, sessionId: session.id, snapshotId: bound.snapshot.snapshot_id })}\n`);

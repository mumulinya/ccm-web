import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// 审计文档不变量 #10：正式压缩生成候选摘要期间到达的新用户消息不得丢失。
// 子进程使用 CCM_TASK_STORE_DIR 隔离运行态；不改写 HOME/USERPROFILE。
const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");

if (process.argv.includes("--child")) {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  const memory = require(dist("modules", "collaboration", "memory.js"));
  const storage = require(dist("modules", "collaboration", "storage.js"));
  const mockCompactionModel = async ({ user }) => {
    const marker = "保真校验参考（最终摘要必须由模型生成并完整覆盖这些事实）：\n";
    const start = user.indexOf(marker) + marker.length;
    const end = user.indexOf("\n", start);
    const reference = JSON.parse(user.slice(start, end));
    return { summary: { ...reference, primaryRequest: reference.primaryRequest || "验证压缩并发提交", currentWork: reference.currentWork || "保留并发到达的新消息" } };
  };
  const groupId = `compact-concurrent-message-${process.pid}-${Date.now().toString(36)}`;
  const session = storage.createGroupChatSession(groupId, "压缩并发消息测试");
  const initialMessages = Array.from({ length: 36 }, (_, index) => ({
    id: `before-${index}`,
    group_session_id: session.id,
    role: index % 2 ? "assistant" : "user",
    target: index % 2 ? undefined : "all",
    agent: index % 2 ? "group-main" : undefined,
    timestamp: new Date(Date.parse("2026-08-08T00:00:00.000Z") + index * 1000).toISOString(),
    // Keep the fixture below the deterministic fallback's per-message projection
    // ceiling so the test reaches the commit fence it is intended to exercise.
    content: `压缩前消息 ${index}；保留并发写入语义。${"上下文".repeat(20)}`,
  }));
  storage.saveGroupMessages(groupId, initialMessages, session.id);
  memory.saveGroupMemory(groupId, { goal: "验证压缩期间新消息不丢失" }, session.id);

  const concurrentMessage = {
    id: "arrived-during-compaction",
    group_session_id: session.id,
    role: "user",
    target: "all",
    timestamp: "2026-08-08T00:01:00.000Z",
    content: "这是候选摘要生成后、提交前到达的新用户约束：不得丢失。",
  };
  let injected = false;
  const result = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: session.id,
    force: true,
    reason: "audit_concurrent_message",
    config: {
      memoryCompactionUseModel: true,
      memoryCompactionMode: "model-required",
      compactionModelCall: mockCompactionModel,
      sessionMemoryCompactEnabled: false,
      minKeepMessages: 4,
      minKeepTokens: 1,
      maxKeepTokens: 200,
    },
    beforeCompactionCommit() {
      const current = storage.getGroupMessages(groupId, session.id);
      storage.saveGroupMessages(groupId, [...current, concurrentMessage], session.id);
      injected = true;
    },
  });

  const transcript = storage.getGroupMessages(groupId, session.id);
  const persisted = memory.loadGroupMemory(groupId, session.id);
  const boundaryIndex = transcript.findIndex(message => message.id === result.boundary?.summarizedThroughMessageId);
  const concurrentIndex = transcript.findIndex(message => message.id === concurrentMessage.id);
  const mutationSession = storage.createGroupChatSession(groupId, "压缩源前缀并发改写测试");
  const mutationMessages = initialMessages.slice(0, 8).map((message, index) => ({
    ...message,
    id: `mutation-${index}`,
    group_session_id: mutationSession.id,
  }));
  storage.saveGroupMessages(groupId, mutationMessages, mutationSession.id);
  memory.saveGroupMemory(groupId, { goal: "并发改写必须失败关闭" }, mutationSession.id);
  const mutationResult = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: mutationSession.id,
    force: true,
    reason: "audit_source_prefix_mutation",
    compactGroupConversationMemory: async ({ memory: sourceMemory }) => ({
      compacted: true,
      memory: sourceMemory,
      boundary: { id: "must-not-commit", summarizedThroughMessageId: "mutation-3" },
      compactTransactionReceipt: { receipt_checksum: "must-not-commit" },
    }),
    beforeCompactionCommit() {
      const current = storage.getGroupMessages(groupId, mutationSession.id);
      storage.saveGroupMessages(groupId, [
        { ...current[0], content: "并发改写了压缩输入前缀" },
        ...current.slice(1),
      ], mutationSession.id);
    },
  });
  const mutationPersisted = memory.loadGroupMemory(groupId, mutationSession.id);
  const checks = {
    hookReachedCommitWindow: injected,
    compactCommitted: result.success === true && result.compacted === true,
    concurrentMessageStillInTranscript: concurrentIndex === initialMessages.length
      && transcript[concurrentIndex]?.content === concurrentMessage.content,
    boundaryStopsBeforeConcurrentMessage: boundaryIndex >= 0 && boundaryIndex < concurrentIndex,
    persistedBoundaryMatchesReturnedBoundary:
      persisted.compactBoundary?.id === result.boundary?.id
      && persisted.compactBoundary?.summarizedThroughMessageId === result.boundary?.summarizedThroughMessageId,
    originalTranscriptPrefixRemainsRecoverable:
      transcript.length === initialMessages.length + 1
      && transcript[0]?.content === initialMessages[0]?.content,
    sourcePrefixMutationFailsClosed:
      mutationResult.success === false
      && /压缩输入在提交前被并发改写/.test(String(mutationResult.error || "")),
    rejectedMutationDoesNotAdvanceBoundary: !mutationPersisted.compactBoundary?.id,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, result }, null, 2));
  console.log(JSON.stringify({
    schema: "ccm-group-compaction-concurrent-message-selftest-v1",
    pass: true,
    checks,
    boundary_index: boundaryIndex,
    concurrent_message_index: concurrentIndex,
  }, null, 2));
  process.exit(0);
}

const taskStore = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-compact-concurrent-message-"));
try {
  const child = spawnSync(process.execPath, [file, "--child"], {
    cwd: root,
    env: { ...process.env, CCM_TASK_STORE_DIR: taskStore },
    encoding: "utf8",
    timeout: 120_000,
  });
  if (child.status !== 0) {
    process.stderr.write(child.stdout || "");
    process.stderr.write(child.stderr || "");
    process.exit(child.status || 1);
  }
  process.stdout.write(child.stdout);
} finally {
  fs.rmSync(taskStore, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

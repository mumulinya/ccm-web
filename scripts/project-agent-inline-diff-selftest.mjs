#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-project-agent-inline-diff-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr || `git ${args.join(" ")} failed`);
  return String(result.stdout || "").trim();
}

try {
  const kernel = require(path.join(root, "ccm-package", "dist", "agents", "execution-kernel.js"));
  const { projectEventFileDiff } = require(path.join(root, "ccm-package", "dist", "system", "event-file-diff.js"));
  const workDir = path.join(tempRoot, "worktree");
  fs.mkdirSync(path.join(workDir, "src"), { recursive: true });
  git(workDir, ["init"]);
  git(workDir, ["config", "user.name", "CCM Selftest"]);
  git(workDir, ["config", "user.email", "ccm-selftest@example.invalid"]);
  fs.writeFileSync(path.join(workDir, "src", "feature.ts"), "export const value = 1;\n", "utf8");
  git(workDir, ["add", "."]);
  git(workDir, ["commit", "-m", "baseline"]);
  const baseHead = git(workDir, ["rev-parse", "HEAD"]);

  const taskId = `inline-diff-${process.pid}-${Date.now().toString(36)}`;
  const task = { id: taskId, title: "Inline diff selftest", description: "Verify project child Agent file ownership and temporary diff reconstruction", target_project: "project-a" };
  kernel.ensureExecution({ task, project: "project-a", agent: "codex", workDir, executionId: taskId });
  kernel.beginExecutionAttempt(taskId, "project child Agent started");
  kernel.attachExecutionWorkspace(taskId, { mode: "worktree", worktreePath: workDir, originalWorkDir: workDir, baseHead });
  fs.writeFileSync(path.join(workDir, "src", "feature.ts"), "export const value = 2;\nexport const ready = true;\n", "utf8");

  const event = {
    schema: "ccm-user-visible-agent-event-v1",
    eventId: "project-agent-file-change-selftest",
    eventType: "agent_completed",
    scope: "project",
    scopeId: "project-a",
    exactSessionId: "session-a",
    taskId,
    generation: 1,
    at: new Date().toISOString(),
    display: { title: "项目子 Agent · project-a", status: "completed" },
    detail: {
      agentRunId: "child-run-a",
      agentDisplay: { projectId: "project-a", projectName: "project-a", runtime: "codex", attempt: 1 },
      fileChanges: [{ path: "src/feature.ts", status: "modified", additions: 2, deletions: 1 }],
    },
  };
  const detail = projectEventFileDiff(event, "src/feature.ts", "project-a");
  assert.equal(detail.schema, "ccm-file-diff-detail-v1");
  assert.equal(detail.file.project, "project-a");
  assert.equal(detail.file.path, "src/feature.ts");
  assert.equal(detail.freshness, "active_worktree");
  assert.equal(detail.diff.available, true);
  assert.match(detail.diff.raw, /export const ready = true/);

  assert.throws(() => projectEventFileDiff(event, "src/other.ts", "project-a"), /不属于当前子 Agent事件/);
  const sensitiveEvent = { ...event, detail: { ...event.detail, fileChanges: [{ path: ".env", status: "modified" }] } };
  assert.throws(() => projectEventFileDiff(sensitiveEvent, ".env", "project-a"), /敏感文件/);

  const transcript = fs.readFileSync(path.join(root, "frontend", "src", "components", "common", "AgentExecutionTranscript.vue"), "utf8");
  const inlineDiff = fs.readFileSync(path.join(root, "frontend", "src", "components", "common", "InlineAgentDiff.vue"), "utf8");
  assert.match(transcript, /项目子 Agent/);
  assert.match(transcript, /projectAgentOwnerFor/);
  assert.match(inlineDiff, /includeDiff:\s*true/);
  assert.doesNotMatch(inlineDiff, /localStorage|sessionStorage/);

  console.log(JSON.stringify({ pass: true, checks: { child_agent_owned: true, active_worktree_diff: true, event_path_binding: true, sensitive_file_denied: true, diff_not_persisted: true, paid_provider_calls: 0 } }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

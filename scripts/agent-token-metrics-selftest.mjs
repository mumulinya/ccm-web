#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const store = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-agent-metrics-"));
process.env.CCM_TASK_STORE_DIR = store;
const require = createRequire(import.meta.url);
const metrics = require(path.join(root, "ccm-package", "dist", "system", "metrics-v3.js"));
const { closeObservabilityDatabaseForTests } = require(path.join(root, "ccm-package", "dist", "system", "observability-database.js"));

try {
  const first = metrics.recordMetricV3("project-main-agent", {
    scopeType: "project",
    scopeId: "demo-project",
    role: "main_agent",
    status: "completed",
    executionId: "main-run-1",
    usageAnchorId: "provider-request-1",
    runtime: "anthropic-compatible",
    usage: {
      inputTokens: 120,
      outputTokens: 40,
      cacheCreationInputTokens: 15,
      cacheReadInputTokens: 80,
      totalCostUsd: 0.0123,
      source: "provider_reported",
    },
    timing: { totalMs: 1200, modelMs: 900, toolWallMs: 200, summaryMs: 100 },
    streaming: { firstVisibleFeedbackMs: 240, firstTokenMs: 610, maxSilentGapMs: 10_200, providerRetryCount: 1, fallbackStreamCount: 0, initialReadFileCount: 4, initialReadTokens: 6200 },
    resources: { peakCpuPercent: 34.5, peakRssBytes: 134217728, peakChildProcessCount: 3 },
  }, "2026-08-11T02:00:00.000Z");
  assert.equal(first.inserted, true);

  const duplicate = metrics.recordMetricV3("project-main-agent", {
    scopeType: "project", scopeId: "demo-project", role: "main_agent", status: "completed",
    usageAnchorId: "provider-request-1", usage: { inputTokens: 120, outputTokens: 40, source: "provider_reported" },
  }, "2026-08-11T02:00:01.000Z");
  assert.equal(duplicate.inserted, false);

  metrics.recordMetricV3("test-agent", {
    scopeType: "project", scopeId: "demo-project", role: "test_agent", status: "completed",
    executionId: "test-run-1", usageAnchorId: "test-local-1", usage: { source: "local_no_model" },
    timing: { totalMs: 400, verificationMs: 400 },
  }, "2026-08-11T02:01:00.000Z");

  metrics.recordMetricV3("codex", {
    scopeType: "project", scopeId: "demo-project", role: "project_agent", status: "failed",
    executionId: "child-run-1", usageAnchorId: "child-unreported-1", runtime: "codex",
    usage: { source: "unreported", missingReason: "runtime_unreported" },
  }, "2026-08-11T02:02:00.000Z");

  const dashboard = metrics.loadMetricsDashboardV3();
  const scope = dashboard.scopes["project:demo-project"];
  const main = scope.roles.main_agent["project-main-agent"];
  assert.equal(main.calls, 1);
  assert.equal(main.inputTokens, 120);
  assert.equal(main.outputTokens, 40);
  assert.equal(main.cacheCreationInputTokens, 15);
  assert.equal(main.cacheReadInputTokens, 80);
  assert.equal(main.totalCostUsd, 0.0123);
  assert.equal(main.modelMs, 900);
  assert.equal(main.peakRssBytes, 134217728);
  assert.equal(scope.roles.test_agent["test-agent"].localNoModelCalls, 1);
  assert.equal(scope.roles.project_agent.codex.unreportedCalls, 1);

  const page = metrics.queryMetricEventsV3({ scopeType: "project", scopeId: "demo-project", pageSize: 20 });
  assert.equal(page.total, 3);
  assert.equal(page.events.find(row => row.role === "test_agent").usageSource, "local_no_model");
  assert.equal(page.events.find(row => row.role === "project_agent").usageMissingReason, "runtime_unreported");
  const mainEvent = page.events.find(row => row.role === "main_agent");
  assert.equal(mainEvent.streaming.firstVisibleFeedbackMs, 240);
  assert.equal(mainEvent.streaming.firstTokenMs, 610);
  assert.equal(mainEvent.streaming.maxSilentGapMs, 10_200);
  assert.equal(mainEvent.streaming.providerRetryCount, 1);
  assert.equal(mainEvent.streaming.initialReadFileCount, 4);
  assert.equal(mainEvent.streaming.initialReadTokens, 6200);
  assert.equal(dashboard.coverage.reduce((sum, row) => sum + row.calls, 0), 3);

  console.log(JSON.stringify({
    pass: true,
    checks: {
      provider_usage_is_recorded_once: true,
      project_main_agent_usage_is_visible: true,
      cache_tokens_and_provider_cost_are_preserved: true,
      local_test_agent_is_not_reported_as_zero_token: true,
      missing_usage_reason_is_preserved: true,
      timing_and_resource_peaks_are_preserved: true,
      streaming_feedback_metrics_are_preserved: true,
      external_calls: 0,
    },
  }, null, 2));
} finally {
  closeObservabilityDatabaseForTests();
  if (path.basename(store).startsWith("ccm-agent-metrics-")) fs.rmSync(store, { recursive: true, force: true });
}

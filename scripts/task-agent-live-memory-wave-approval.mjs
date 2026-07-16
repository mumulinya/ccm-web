#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const approval = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-wave-approval.js"));
const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const item = process.argv[index];
  if (!item.startsWith("--")) continue;
  const key = item.slice(2);
  const next = process.argv[index + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    index += 1;
  } else args.set(key, "true");
}
const action = String(process.argv[2] || "preview").replace(/^--/, "");

if (action === "preview") {
  console.log(`LIVE_PROVIDER_MEMORY_WAVE_APPROVAL_PREVIEW=${JSON.stringify(approval.buildLiveProviderMemoryWaveApprovalPreview({ provider: String(args.get("provider") || "") }))}`);
  process.exit(0);
}

if (action === "transition-preview") {
  console.log(`LIVE_PROVIDER_MEMORY_TRANSITION_CANARY_PREVIEW=${JSON.stringify(approval.buildLiveProviderMemoryVersionTransitionCanaryPreview({ provider: String(args.get("provider") || "") }))}`);
  process.exit(0);
}

if (action === "initial-baseline-preview") {
  const provider = String(args.get("provider") || "");
  if (!provider) throw new Error("initial baseline preview requires --provider");
  console.log(`LIVE_PROVIDER_INITIAL_MEMORY_BASELINE_CANARY_PREVIEW=${JSON.stringify(approval.buildLiveProviderInitialMemoryBaselineCanaryPreview({ provider, model: String(args.get("model") || "") }))}`);
  process.exit(0);
}

if (action === "inventory") {
  console.log(`LIVE_PROVIDER_MEMORY_WAVE_APPROVAL_INVENTORY=${JSON.stringify(approval.reconcileLiveProviderMemoryWaveApprovals())}`);
  process.exit(0);
}

if (action === "approve") {
  const receipt = approval.createLiveProviderMemoryWaveApproval({
    explicitApproval: args.get("explicit-approval") === "true",
    riskAccepted: args.get("risk-accepted") === "true",
    approvedBy: String(args.get("approved-by") || ""),
    reason: String(args.get("reason") || ""),
    enduranceReportChecksum: String(args.get("endurance-report-checksum") || ""),
    planChecksum: String(args.get("plan-checksum") || ""),
    ttlMs: args.has("ttl-ms") ? Number(args.get("ttl-ms")) : undefined,
    provider: String(args.get("provider") || ""),
  });
  console.log(`LIVE_PROVIDER_MEMORY_WAVE_APPROVAL=${JSON.stringify({ receiptId: receipt.receiptId, receiptChecksum: receipt.receiptChecksum, expiresAt: receipt.expiresAt, approvedBy: receipt.approvedBy, plan: receipt.plan, planChecksum: receipt.planChecksum, enduranceReportChecksum: receipt.enduranceReportChecksum })}`);
  process.exit(0);
}

if (action === "approve-transition-canary") {
  const receipt = approval.createLiveProviderMemoryVersionTransitionCanaryApproval({
    explicitApproval: args.get("explicit-approval") === "true",
    riskAccepted: args.get("risk-accepted") === "true",
    transitionAcknowledged: args.get("transition-acknowledged") === "true",
    approvedBy: String(args.get("approved-by") || ""),
    reason: String(args.get("reason") || ""),
    enduranceReportChecksum: String(args.get("endurance-report-checksum") || ""),
    planChecksum: String(args.get("plan-checksum") || ""),
    ttlMs: args.has("ttl-ms") ? Number(args.get("ttl-ms")) : undefined,
    provider: String(args.get("provider") || ""),
  });
  console.log(`LIVE_PROVIDER_MEMORY_TRANSITION_CANARY_APPROVAL=${JSON.stringify({ receiptId: receipt.receiptId, receiptChecksum: receipt.receiptChecksum, expiresAt: receipt.expiresAt, approvedBy: receipt.approvedBy, approvalMode: receipt.approvalMode, plan: receipt.plan, planChecksum: receipt.planChecksum, enduranceReportChecksum: receipt.enduranceReportChecksum, fromProviderVersionKey: receipt.fromProviderVersionKey, toProviderVersionKey: receipt.toProviderVersionKey })}`);
  process.exit(0);
}

if (action === "approve-initial-baseline-canary") {
  const receipt = approval.createLiveProviderInitialMemoryBaselineCanaryApproval({
    explicitApproval: args.get("explicit-approval") === "true",
    riskAccepted: args.get("risk-accepted") === "true",
    initialBaselineAcknowledged: args.get("initial-baseline-acknowledged") === "true",
    approvedBy: String(args.get("approved-by") || ""),
    reason: String(args.get("reason") || ""),
    baselineAbsenceChecksum: String(args.get("baseline-absence-checksum") || ""),
    planChecksum: String(args.get("plan-checksum") || ""),
    ttlMs: args.has("ttl-ms") ? Number(args.get("ttl-ms")) : undefined,
    provider: String(args.get("provider") || ""),
    model: String(args.get("model") || ""),
  });
  console.log(`LIVE_PROVIDER_INITIAL_MEMORY_BASELINE_CANARY_APPROVAL=${JSON.stringify({ receiptId: receipt.receiptId, receiptChecksum: receipt.receiptChecksum, expiresAt: receipt.expiresAt, approvedBy: receipt.approvedBy, approvalMode: receipt.approvalMode, baselineAbsenceChecksum: receipt.baselineAbsenceChecksum, providerVersionKey: receipt.providerVersionKey, plan: receipt.plan, planChecksum: receipt.planChecksum })}`);
  process.exit(0);
}

if (action === "execute") {
  const multiScript = path.join(root, "scripts", "task-agent-live-multi-group-memory-soak.mjs");
  const result = approval.executeApprovedLiveProviderMemoryWave({
    receiptId: String(args.get("receipt-id") || ""),
    receiptChecksum: String(args.get("receipt-checksum") || ""),
    explicitExecution: args.get("explicit-execution") === "true",
    executionActor: String(args.get("execution-actor") || "local-user"),
  }, plan => {
    const batches = Math.ceil(Number(plan.groups || 1) / Number(plan.concurrency || 1));
    const timeout = Math.min(20 * 60_000, batches * (2 * Number(plan.timeoutMs || 120_000) + 60_000) + 60_000);
    const run = spawnSync(process.execPath, [
      multiScript,
      "--live",
      "--groups", String(plan.groups),
      "--concurrency", String(plan.concurrency),
      "--timeout-ms", String(plan.timeoutMs),
      "--provider", String(plan.provider),
      "--model", String(plan.model),
      "--group-prefix", String(plan.groupPrefix),
    ], { cwd: root, encoding: "utf8", timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    const line = String(run.stdout || "").split(/\r?\n/).find(item => item.startsWith("PHASE365_LIVE_MULTI_GROUP_MEMORY_SOAK="));
    if (!line) throw new Error(`approved live memory wave did not produce a report:${crypto.createHash("sha256").update(String(run.stdout || run.stderr || "")).digest("hex")}`);
    const report = JSON.parse(line.slice(line.indexOf("=") + 1));
    return { exitCode: Number.isInteger(run.status) ? run.status : -1, reportFile: report.reportFile, reportChecksum: report.reportChecksum };
  });
  console.log(`LIVE_PROVIDER_MEMORY_WAVE_EXECUTION=${JSON.stringify({ receiptId: result.receiptId, receiptChecksum: result.receiptChecksum, executionId: result.executionId, approvalMode: result.approvalMode || "endurance_wave", status: result.status, wavePassed: result.wavePassed, executionReportChecksum: result.executionReportChecksum, evidencePromotionStatus: result.evidencePromotionStatus, promotedEnduranceReportChecksum: result.promotedEnduranceReportChecksum, executionIssues: result.executionIssues })}`);
  process.exit(result.status === "completed" ? 0 : 1);
}

throw new Error(`unknown live memory wave approval action: ${action}`);

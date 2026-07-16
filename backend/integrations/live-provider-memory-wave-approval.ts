import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { captureAgentRuntimeVersionSnapshot } from "../agents/runtime";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { CCM_DIR } from "../core/utils";
import {
  auditLiveProviderMemoryEndurance,
  readLatestLiveProviderMemoryEnduranceReport,
} from "./live-provider-memory-endurance";
import {
  LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR,
  LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR,
  verifyLiveProviderMemorySoakReport,
  withLiveProviderMemorySoakReportSetLock,
} from "./live-provider-memory-soak-report-store";

export const LIVE_PROVIDER_MEMORY_WAVE_APPROVAL_SCHEMA = "ccm-live-provider-memory-wave-approval-v1";
const APPROVAL_DIR = path.join(CCM_DIR, "reliability", "live-provider-memory-wave-approvals");
const APPROVAL_SECRET_FILE = path.join(CCM_DIR, "reliability", ".live-provider-memory-wave-approval-secret");
const APPROVAL_RETENTION_AUDIT_FILE = path.join(CCM_DIR, "reliability", "live-provider-memory-wave-approval-retention-audit.jsonl");
const DEFAULT_APPROVAL_TTL_MS = 30 * 60_000;
const DEFAULT_CLAIM_STALE_MS = 10 * 60_000;
const DEFAULT_TERMINAL_RETENTION_DAYS = 30;
const DEFAULT_TERMINAL_MAX_RECEIPTS = 500;
const DEFAULT_TERMINAL_MIN_RECEIPTS = 20;
const DEFAULT_TERMINAL_GRACE_HOURS = 1;
const TERMINAL_APPROVAL_STATUSES = new Set(["completed", "completed_with_failures", "execution_failed", "interrupted", "revoked", "expired"]);
const LIVE_MEMORY_WAVE_PROVIDERS = new Set(["claudecode", "codex", "cursor"]);

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function digest(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonical(value))).digest("hex");
}

function safeCode(value: any, fallback = "") {
  const text = String(value || "").trim();
  return /^[a-zA-Z0-9._:@-]{1,160}$/.test(text) ? text : fallback;
}

function ensureSecret() {
  fs.mkdirSync(path.dirname(APPROVAL_SECRET_FILE), { recursive: true });
  try {
    const fd = fs.openSync(APPROVAL_SECRET_FILE, "wx", 0o600);
    try {
      fs.writeFileSync(fd, `${crypto.randomBytes(32).toString("hex")}\n`, "utf8");
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  } catch (error: any) {
    if (String(error?.code || "") !== "EEXIST") throw error;
  }
  const secret = fs.readFileSync(APPROVAL_SECRET_FILE, "utf8").trim();
  if (!/^[a-f0-9]{64}$/.test(secret)) throw new Error("live memory wave approval secret is invalid");
  return Buffer.from(secret, "hex");
}

function receiptCore(receipt: any) {
  const { receiptChecksum: _receiptChecksum, receiptSignature: _receiptSignature, ...core } = receipt || {};
  return core;
}

function receiptSignature(checksum: string) {
  return crypto.createHmac("sha256", ensureSecret()).update(checksum).digest("base64url");
}

function signatureMatches(checksum: string, supplied: any) {
  const expected = Buffer.from(receiptSignature(checksum));
  const actual = Buffer.from(String(supplied || ""));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function sealReceipt(receipt: any) {
  const core = receiptCore(receipt);
  const receiptChecksum = digest(core);
  return { ...core, receiptChecksum, receiptSignature: receiptSignature(receiptChecksum) };
}

function approvalFile(receiptId: string) {
  if (!/^lpmwa_[a-f0-9]{28}$/.test(receiptId)) throw new Error("live memory wave approval id is invalid");
  return path.join(APPROVAL_DIR, `${receiptId}.json`);
}

function pathInside(file: string, root: string) {
  const relative = path.relative(path.resolve(root), path.resolve(file));
  return !!relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function normalizePlan(report: any) {
  const advised = report?.advisory?.nextWave || {};
  const latestWave = Array.isArray(report?.waves) ? report.waves[report.waves.length - 1] : null;
  const epochs = Array.isArray(report?.providerVersionTrend?.epochs) ? report.providerVersionTrend.epochs : [];
  const latestEpoch = epochs[epochs.length - 1] || {};
  const provider = safeCode(advised.provider || latestWave?.provider, "");
  const model = safeCode(advised.model || latestWave?.model, "");
  const groups = Math.max(1, Math.min(3, Number(advised.groups || 0)));
  const concurrency = Math.max(1, Math.min(3, Number(advised.concurrency || 0)));
  const timeoutMs = Math.max(60_000, Math.min(300_000, Number(advised.timeoutMs || 0)));
  const providerVersions = Array.from(new Set((Array.isArray(advised.providerVersions) ? advised.providerVersions : latestEpoch.providerVersions || []).map((value: any) => safeCode(value, "")).filter(Boolean)));
  const providerRuntimeIdentityChecksums = Array.from(new Set((Array.isArray(advised.providerRuntimeIdentityChecksums) ? advised.providerRuntimeIdentityChecksums : latestEpoch.providerRuntimeIdentityChecksums || []).map(String).filter(value => /^[a-f0-9]{64}$/.test(value))));
  return {
    provider,
    model,
    providerVersionKey: String(advised.providerVersionKey || latestEpoch.versionKey || ""),
    providerVersions,
    providerRuntimeIdentityChecksums,
    groups,
    concurrency,
    timeoutMs,
    groupPrefix: `approved-memory-wave-${String(report?.reportChecksum || "").slice(0, 12)}`,
  };
}

function runtimeSummary(runtime: any) {
  return runtime ? {
    provider: runtime.provider,
    semanticVersion: runtime.semanticVersion,
    executableIdentityChecksum: runtime.executableIdentityChecksum,
    status: runtime.status,
    snapshotChecksum: runtime.snapshotChecksum,
  } : null;
}

function defaultProviderModel(provider: string, requested: any = "") {
  const configured = String(requested || (provider === "claudecode"
    ? process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_CLAUDE_MODEL || "sonnet"
    : provider === "cursor"
      ? process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_CURSOR_MODEL || "gpt-5.4-mini-none"
      : process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_CODEX_MODEL || "gpt-5.4-mini")).trim();
  return safeCode(configured, "");
}

export function buildLiveProviderMemoryWaveApprovalPreview(options: any = {}) {
  const operation = () => {
    const requestedProvider = safeCode(options.provider, "");
    const report = readLatestLiveProviderMemoryEnduranceReport({ provider: options.provider });
    const reportValid = !!report && verifyLiveProviderMemorySoakReport(report, "endurance").valid;
    const plan = normalizePlan(report);
    const runtime = plan.provider || requestedProvider ? captureAgentRuntimeVersionSnapshot(plan.provider || requestedProvider) : null;
    const runtimeMatches = runtime?.status === "ok"
      && plan.providerVersions.includes(String(runtime.semanticVersion || ""))
      && plan.providerRuntimeIdentityChecksums.includes(String(runtime.executableIdentityChecksum || ""));
    const versionTransitionReady = Number(report?.providerVersionTrend?.transitionCount || 0) === 0
      || report?.providerVersionTrend?.latestTransitionGatePassed === true;
    const planValid = LIVE_MEMORY_WAVE_PROVIDERS.has(plan.provider)
      && !!plan.model
      && plan.groups >= 1
      && plan.concurrency >= 1
      && plan.concurrency <= plan.groups
      && plan.timeoutMs >= 60_000
      && plan.timeoutMs <= 300_000
      && plan.providerVersions.length > 0
      && plan.providerRuntimeIdentityChecksums.length > 0;
    return {
      schema: "ccm-live-provider-memory-wave-approval-preview-v1",
      requestedProvider,
      generatedAt: new Date().toISOString(),
      enduranceReportChecksum: String(report?.reportChecksum || ""),
      sourceSetChecksum: String(report?.sourceSetChecksum || ""),
      providerVersionKey: String(plan.providerVersionKey || ""),
      plan,
      planChecksum: digest(plan),
      runtime: runtimeSummary(runtime),
      reportValid,
      planValid,
      runtimeMatches,
      versionTransitionReady,
      approvable: reportValid
        && report?.gatePassed === true
        && report?.advisory?.advisoryOnly === true
        && report?.advisory?.policyMutationApplied === false
        && report?.advisory?.nextWave?.liveExecutionAuthorized === false
        && planValid
        && runtimeMatches
        && versionTransitionReady,
      liveExecutionAuthorized: false,
      receiptCreated: false,
    };
  };
  return options.reportSetLockHeld === true ? operation() : withLiveProviderMemorySoakReportSetLock(operation);
}

export function buildLiveProviderMemoryVersionTransitionCanaryPreview(options: any = {}) {
  const operation = () => {
    const requestedProvider = safeCode(options.provider, "");
    const report = readLatestLiveProviderMemoryEnduranceReport({ provider: options.provider });
    const reportValid = !!report && verifyLiveProviderMemorySoakReport(report, "endurance").valid;
    const baselinePlan = normalizePlan(report);
    const baselinePresent = reportValid && !!baselinePlan.provider && !!baselinePlan.model && /^[a-f0-9]{64}$/.test(String(baselinePlan.providerVersionKey || ""));
    const selectedProvider = baselinePlan.provider || requestedProvider;
    const runtime = selectedProvider ? captureAgentRuntimeVersionSnapshot(selectedProvider) : null;
    const runtimeReady = runtime?.status === "ok"
      && !!safeCode(runtime.semanticVersion, "")
      && /^[a-f0-9]{64}$/.test(String(runtime.executableIdentityChecksum || ""));
    const runtimeMatchesBaseline = runtimeReady
      && baselinePlan.providerVersions.includes(String(runtime.semanticVersion || ""))
      && baselinePlan.providerRuntimeIdentityChecksums.includes(String(runtime.executableIdentityChecksum || ""));
    const baselineTransitionReady = Number(report?.providerVersionTrend?.transitionCount || 0) === 0
      || report?.providerVersionTrend?.latestTransitionGatePassed === true;
    const providerVersions = runtimeReady ? [String(runtime.semanticVersion || "")] : [];
    const providerRuntimeIdentityChecksums = runtimeReady ? [String(runtime.executableIdentityChecksum || "")] : [];
    const providerVersionKey = runtimeReady ? digest([selectedProvider, baselinePlan.model, providerVersions, providerRuntimeIdentityChecksums]) : "";
    const plan = {
      provider: selectedProvider,
      model: baselinePlan.model,
      providerVersionKey,
      providerVersions,
      providerRuntimeIdentityChecksums,
      groups: 2,
      concurrency: 1,
      timeoutMs: Math.max(60_000, Math.min(300_000, Number(baselinePlan.timeoutMs || 120_000))),
      groupPrefix: `transition-canary-${String(report?.reportChecksum || "").slice(0, 10)}-${String(runtime?.executableIdentityChecksum || "").slice(0, 10)}`,
      approvalMode: "version_transition_canary",
      canaryOnly: true,
      fromProviderVersionKey: baselinePlan.providerVersionKey,
      toProviderVersionKey: providerVersionKey,
    };
    const planValid = LIVE_MEMORY_WAVE_PROVIDERS.has(selectedProvider)
      && !!baselinePlan.model
      && runtimeReady
      && providerVersions.length === 1
      && providerRuntimeIdentityChecksums.length === 1
      && plan.groups === 2
      && plan.concurrency === 1;
    return {
      schema: "ccm-live-provider-memory-version-transition-canary-preview-v1",
      requestedProvider,
      generatedAt: new Date().toISOString(),
      approvalMode: "version_transition_canary",
      enduranceReportChecksum: String(report?.reportChecksum || ""),
      sourceSetChecksum: String(report?.sourceSetChecksum || ""),
      providerVersionKey,
      fromProviderVersionKey: baselinePlan.providerVersionKey,
      toProviderVersionKey: providerVersionKey,
      plan,
      planChecksum: digest(plan),
      runtime: runtimeSummary(runtime),
      reportValid,
      planValid,
      runtimeReady,
      runtimeMatchesBaseline,
      baselinePresent,
      runtimeUnproven: runtimeReady && !baselinePresent,
      runtimeDriftDetected: baselinePresent && runtimeReady && !runtimeMatchesBaseline,
      baselineTransitionReady,
      approvable: reportValid
        && report?.gatePassed === true
        && report?.advisory?.advisoryOnly === true
        && report?.advisory?.policyMutationApplied === false
        && report?.advisory?.nextWave?.liveExecutionAuthorized === false
        && baselineTransitionReady
        && planValid
        && !runtimeMatchesBaseline,
      liveExecutionAuthorized: false,
      receiptCreated: false,
      transitionAcknowledgementRequired: true,
      evidencePromotionRequired: true,
    };
  };
  return options.reportSetLockHeld === true ? operation() : withLiveProviderMemorySoakReportSetLock(operation);
}

export function buildLiveProviderInitialMemoryBaselineCanaryPreview(options: any = {}) {
  const operation = () => {
    const provider = safeCode(options.provider, "");
    const report = provider ? readLatestLiveProviderMemoryEnduranceReport({ provider }) : null;
    const reportValid = !!report && verifyLiveProviderMemorySoakReport(report, "endurance").valid;
    const runtime = provider ? captureAgentRuntimeVersionSnapshot(provider) : null;
    const runtimeReady = runtime?.status === "ok"
      && !!safeCode(runtime.semanticVersion, "")
      && /^[a-f0-9]{64}$/.test(String(runtime.executableIdentityChecksum || ""));
    const model = defaultProviderModel(provider, options.model);
    const providerVersions = runtimeReady ? [String(runtime.semanticVersion || "")] : [];
    const providerRuntimeIdentityChecksums = runtimeReady ? [String(runtime.executableIdentityChecksum || "")] : [];
    const providerVersionKey = runtimeReady && model ? digest([provider, model, providerVersions, providerRuntimeIdentityChecksums]) : "";
    const baselineAbsenceChecksum = digest({
      provider,
      reportPresent: !!report,
      reportValid,
      model,
      semanticVersion: String(runtime?.semanticVersion || ""),
      executableIdentityChecksum: String(runtime?.executableIdentityChecksum || ""),
    });
    const plan = {
      provider,
      model,
      providerVersionKey,
      providerVersions,
      providerRuntimeIdentityChecksums,
      groups: 2,
      concurrency: 1,
      timeoutMs: Math.max(60_000, Math.min(300_000, Number(options.timeoutMs || options.timeout_ms || 120_000))),
      groupPrefix: `initial-baseline-${provider}-${String(runtime?.executableIdentityChecksum || "").slice(0, 12)}`,
      approvalMode: "initial_provider_baseline_canary",
      canaryOnly: true,
      baselineAbsenceChecksum,
    };
    const planValid = LIVE_MEMORY_WAVE_PROVIDERS.has(provider)
      && !!model
      && runtimeReady
      && providerVersions.length === 1
      && providerRuntimeIdentityChecksums.length === 1
      && plan.groups === 2
      && plan.concurrency === 1;
    return {
      schema: "ccm-live-provider-initial-memory-baseline-canary-preview-v1",
      requestedProvider: provider,
      generatedAt: new Date().toISOString(),
      approvalMode: "initial_provider_baseline_canary",
      enduranceReportChecksum: "",
      sourceSetChecksum: baselineAbsenceChecksum,
      baselineAbsenceChecksum,
      providerVersionKey,
      plan,
      planChecksum: digest(plan),
      runtime: runtimeSummary(runtime),
      reportPresent: !!report,
      reportValid,
      runtimeReady,
      runtimeUnproven: runtimeReady && !reportValid,
      planValid,
      approvable: !reportValid && planValid,
      liveExecutionAuthorized: false,
      receiptCreated: false,
      initialBaselineAcknowledgementRequired: true,
      evidencePromotionRequired: true,
    };
  };
  return options.reportSetLockHeld === true ? operation() : withLiveProviderMemorySoakReportSetLock(operation);
}

function approvalMode(receipt: any) {
  return String(receipt?.approvalMode || receipt?.approval_mode || "endurance_wave");
}

function currentPreviewForReceipt(receipt: any, options: any = {}) {
  const scopedOptions = { ...options, provider: String(receipt?.plan?.provider || "") };
  if (approvalMode(receipt) === "version_transition_canary") return buildLiveProviderMemoryVersionTransitionCanaryPreview(scopedOptions);
  if (approvalMode(receipt) === "initial_provider_baseline_canary") return buildLiveProviderInitialMemoryBaselineCanaryPreview({ ...scopedOptions, model: receipt?.plan?.model });
  return buildLiveProviderMemoryWaveApprovalPreview(scopedOptions);
}

export function verifyLiveProviderMemoryWaveApprovalReceipt(receipt: any, options: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== LIVE_PROVIDER_MEMORY_WAVE_APPROVAL_SCHEMA || Number(receipt?.version || 0) !== 1) issues.push("approval_schema_invalid");
  const expectedChecksum = digest(receiptCore(receipt));
  if (String(receipt?.receiptChecksum || "") !== expectedChecksum) issues.push("approval_checksum_invalid");
  if (!signatureMatches(expectedChecksum, receipt?.receiptSignature)) issues.push("approval_signature_invalid");
  if (String(receipt?.planChecksum || "") !== digest(receipt?.plan || {})) issues.push("approval_plan_checksum_invalid");
  if (receipt?.approved !== true || receipt?.explicitApproval !== true || receipt?.riskAccepted !== true || receipt?.singleUse !== true || receipt?.allowLiveProviderExecution !== true) issues.push("approval_policy_invalid");
  if (!new Set(["endurance_wave", "version_transition_canary", "initial_provider_baseline_canary"]).has(approvalMode(receipt))) issues.push("approval_mode_invalid");
  if (approvalMode(receipt) === "version_transition_canary"
    && (receipt?.transitionAcknowledged !== true || receipt?.canaryOnly !== true || receipt?.evidencePromotionRequired !== true
      || Number(receipt?.plan?.groups || 0) !== 2 || Number(receipt?.plan?.concurrency || 0) !== 1
      || receipt?.plan?.approvalMode !== "version_transition_canary" || receipt?.plan?.canaryOnly !== true)) issues.push("transition_canary_policy_invalid");
  if (approvalMode(receipt) === "initial_provider_baseline_canary"
    && (receipt?.initialBaselineAcknowledged !== true || receipt?.canaryOnly !== true || receipt?.evidencePromotionRequired !== true
      || Number(receipt?.plan?.groups || 0) !== 2 || Number(receipt?.plan?.concurrency || 0) !== 1
      || receipt?.plan?.approvalMode !== "initial_provider_baseline_canary" || receipt?.plan?.canaryOnly !== true
      || String(receipt?.baselineAbsenceChecksum || "") !== String(receipt?.plan?.baselineAbsenceChecksum || ""))) issues.push("initial_baseline_canary_policy_invalid");
  if (!safeCode(receipt?.approvedBy, "")) issues.push("approval_actor_invalid");
  const atMs = Number(options.atMs || Date.now());
  const expiresMs = Date.parse(String(receipt?.expiresAt || ""));
  if (!Number.isFinite(expiresMs) || atMs > expiresMs) issues.push("approval_expired");
  if (receipt?.revoked === true) issues.push("approval_revoked");
  if (receipt?.consumed === true || !["approved"].includes(String(receipt?.status || ""))) issues.push("approval_already_consumed");
  if (options.requireCurrent === true) {
    const preview = currentPreviewForReceipt(receipt, { reportSetLockHeld: options.reportSetLockHeld === true });
    if (!preview.approvable) issues.push("approval_current_plan_not_approvable");
    if (String(receipt?.enduranceReportChecksum || "") !== preview.enduranceReportChecksum) issues.push("approval_endurance_report_stale");
    if (String(receipt?.sourceSetChecksum || "") !== preview.sourceSetChecksum) issues.push("approval_source_set_stale");
    if (String(receipt?.providerVersionKey || "") !== preview.providerVersionKey) issues.push("approval_provider_version_stale");
    if (String(receipt?.planChecksum || "") !== preview.planChecksum) issues.push("approval_plan_stale");
  }
  return { valid: issues.length === 0, issues, expectedChecksum };
}

function assertNoActiveApprovalForPlan(planChecksum: string, createdAtMs: number) {
  try {
    if (!fs.existsSync(APPROVAL_DIR)) return;
    for (const entry of fs.readdirSync(APPROVAL_DIR, { withFileTypes: true })) {
      if (!entry.isFile() || !/^lpmwa_[a-f0-9]{28}\.json$/.test(entry.name)) continue;
      const existing = readJsonWithBackup<any>(path.join(APPROVAL_DIR, entry.name), null);
      if (!existing || existing.planChecksum !== planChecksum || existing.status !== "approved" || existing.consumed === true || existing.revoked === true) continue;
      const verification = verifyLiveProviderMemoryWaveApprovalReceipt(existing, { atMs: createdAtMs });
      if (verification.valid) throw new Error("live memory wave plan already has an active approval");
    }
  } catch (error: any) {
    if (String(error?.message || error).includes("already has an active approval")) throw error;
  }
}

export function createLiveProviderMemoryWaveApproval(input: any = {}) {
  if (input.explicitApproval !== true && input.explicit_approval !== true) throw new Error("live memory wave approval requires explicitApproval=true");
  if (input.riskAccepted !== true && input.risk_accepted !== true) throw new Error("live memory wave approval requires riskAccepted=true");
  const approvedBy = safeCode(input.approvedBy || input.approved_by, "");
  if (!approvedBy) throw new Error("live memory wave approval requires approvedBy");
  return withLiveProviderMemorySoakReportSetLock(() => {
    const preview = buildLiveProviderMemoryWaveApprovalPreview({ reportSetLockHeld: true, provider: input.provider });
    if (!preview.approvable) throw new Error("live memory wave plan is not currently approvable");
    if (String(input.enduranceReportChecksum || input.endurance_report_checksum || "") !== preview.enduranceReportChecksum) throw new Error("live memory wave endurance report confirmation mismatch");
    if (String(input.planChecksum || input.plan_checksum || "") !== preview.planChecksum) throw new Error("live memory wave plan confirmation mismatch");
    const createdAtMs = Number(input.atMs || Date.now());
    assertNoActiveApprovalForPlan(preview.planChecksum, createdAtMs);
    const ttlMs = Math.max(60_000, Math.min(60 * 60_000, Number(input.ttlMs || input.ttl_ms || DEFAULT_APPROVAL_TTL_MS)));
    const receiptId = `lpmwa_${crypto.randomBytes(14).toString("hex")}`;
    const receipt = sealReceipt({
      schema: LIVE_PROVIDER_MEMORY_WAVE_APPROVAL_SCHEMA,
      version: 1,
      receiptId,
      createdAt: new Date(createdAtMs).toISOString(),
      expiresAt: new Date(createdAtMs + ttlMs).toISOString(),
      status: "approved",
      approved: true,
      explicitApproval: true,
      riskAccepted: true,
      approvedBy,
      approvalMode: "endurance_wave",
      reasonChecksum: digest(String(input.reason || "explicit_live_memory_wave_approval")),
      singleUse: true,
      allowLiveProviderExecution: true,
      enduranceReportChecksum: preview.enduranceReportChecksum,
      sourceSetChecksum: preview.sourceSetChecksum,
      providerVersionKey: preview.providerVersionKey,
      runtimeSnapshotChecksum: String(preview.runtime?.snapshotChecksum || ""),
      plan: preview.plan,
      planChecksum: preview.planChecksum,
      consumed: false,
      revoked: false,
      schedulerCreated: false,
      schedulerExecutable: false,
    });
    fs.mkdirSync(APPROVAL_DIR, { recursive: true });
    writeJsonAtomic(approvalFile(receiptId), receipt);
    return receipt;
  });
}

export function createLiveProviderMemoryVersionTransitionCanaryApproval(input: any = {}) {
  if (input.explicitApproval !== true && input.explicit_approval !== true) throw new Error("transition canary approval requires explicitApproval=true");
  if (input.riskAccepted !== true && input.risk_accepted !== true) throw new Error("transition canary approval requires riskAccepted=true");
  if (input.transitionAcknowledged !== true && input.transition_acknowledged !== true) throw new Error("transition canary approval requires transitionAcknowledged=true");
  const approvedBy = safeCode(input.approvedBy || input.approved_by, "");
  if (!approvedBy) throw new Error("transition canary approval requires approvedBy");
  return withLiveProviderMemorySoakReportSetLock(() => {
    const preview = buildLiveProviderMemoryVersionTransitionCanaryPreview({ reportSetLockHeld: true, provider: input.provider });
    if (!preview.approvable) throw new Error("version transition canary is not currently approvable");
    if (String(input.enduranceReportChecksum || input.endurance_report_checksum || "") !== preview.enduranceReportChecksum) throw new Error("transition canary baseline report confirmation mismatch");
    if (String(input.planChecksum || input.plan_checksum || "") !== preview.planChecksum) throw new Error("transition canary plan confirmation mismatch");
    const createdAtMs = Number(input.atMs || Date.now());
    assertNoActiveApprovalForPlan(preview.planChecksum, createdAtMs);
    const ttlMs = Math.max(60_000, Math.min(30 * 60_000, Number(input.ttlMs || input.ttl_ms || 15 * 60_000)));
    const receiptId = `lpmwa_${crypto.randomBytes(14).toString("hex")}`;
    const receipt = sealReceipt({
      schema: LIVE_PROVIDER_MEMORY_WAVE_APPROVAL_SCHEMA,
      version: 1,
      receiptId,
      createdAt: new Date(createdAtMs).toISOString(),
      expiresAt: new Date(createdAtMs + ttlMs).toISOString(),
      status: "approved",
      approved: true,
      explicitApproval: true,
      riskAccepted: true,
      transitionAcknowledged: true,
      approvedBy,
      approvalMode: "version_transition_canary",
      reasonChecksum: digest(String(input.reason || "explicit_version_transition_canary_approval")),
      singleUse: true,
      allowLiveProviderExecution: true,
      canaryOnly: true,
      evidencePromotionRequired: true,
      enduranceReportChecksum: preview.enduranceReportChecksum,
      sourceSetChecksum: preview.sourceSetChecksum,
      providerVersionKey: preview.providerVersionKey,
      fromProviderVersionKey: preview.fromProviderVersionKey,
      toProviderVersionKey: preview.toProviderVersionKey,
      runtimeSnapshotChecksum: String(preview.runtime?.snapshotChecksum || ""),
      plan: preview.plan,
      planChecksum: preview.planChecksum,
      consumed: false,
      revoked: false,
      schedulerCreated: false,
      schedulerExecutable: false,
    });
    fs.mkdirSync(APPROVAL_DIR, { recursive: true });
    writeJsonAtomic(approvalFile(receiptId), receipt);
    return receipt;
  });
}

export function createLiveProviderInitialMemoryBaselineCanaryApproval(input: any = {}) {
  if (input.explicitApproval !== true && input.explicit_approval !== true) throw new Error("initial memory baseline canary approval requires explicitApproval=true");
  if (input.riskAccepted !== true && input.risk_accepted !== true) throw new Error("initial memory baseline canary approval requires riskAccepted=true");
  if (input.initialBaselineAcknowledged !== true && input.initial_baseline_acknowledged !== true) throw new Error("initial memory baseline canary approval requires initialBaselineAcknowledged=true");
  const approvedBy = safeCode(input.approvedBy || input.approved_by, "");
  if (!approvedBy) throw new Error("initial memory baseline canary approval requires approvedBy");
  return withLiveProviderMemorySoakReportSetLock(() => {
    const preview = buildLiveProviderInitialMemoryBaselineCanaryPreview({
      reportSetLockHeld: true,
      provider: input.provider,
      model: input.model,
    });
    if (!preview.approvable) throw new Error("initial memory baseline canary is not currently approvable");
    if (String(input.baselineAbsenceChecksum || input.baseline_absence_checksum || "") !== preview.baselineAbsenceChecksum) throw new Error("initial memory baseline absence confirmation mismatch");
    if (String(input.planChecksum || input.plan_checksum || "") !== preview.planChecksum) throw new Error("initial memory baseline canary plan confirmation mismatch");
    const createdAtMs = Number(input.atMs || Date.now());
    assertNoActiveApprovalForPlan(preview.planChecksum, createdAtMs);
    const ttlMs = Math.max(60_000, Math.min(30 * 60_000, Number(input.ttlMs || input.ttl_ms || 15 * 60_000)));
    const receiptId = `lpmwa_${crypto.randomBytes(14).toString("hex")}`;
    const receipt = sealReceipt({
      schema: LIVE_PROVIDER_MEMORY_WAVE_APPROVAL_SCHEMA,
      version: 1,
      receiptId,
      createdAt: new Date(createdAtMs).toISOString(),
      expiresAt: new Date(createdAtMs + ttlMs).toISOString(),
      status: "approved",
      approved: true,
      explicitApproval: true,
      riskAccepted: true,
      initialBaselineAcknowledged: true,
      approvedBy,
      approvalMode: "initial_provider_baseline_canary",
      reasonChecksum: digest(String(input.reason || "explicit_initial_provider_memory_baseline_canary_approval")),
      singleUse: true,
      allowLiveProviderExecution: true,
      canaryOnly: true,
      evidencePromotionRequired: true,
      enduranceReportChecksum: "",
      sourceSetChecksum: preview.sourceSetChecksum,
      baselineAbsenceChecksum: preview.baselineAbsenceChecksum,
      providerVersionKey: preview.providerVersionKey,
      runtimeSnapshotChecksum: String(preview.runtime?.snapshotChecksum || ""),
      plan: preview.plan,
      planChecksum: preview.planChecksum,
      consumed: false,
      revoked: false,
      schedulerCreated: false,
      schedulerExecutable: false,
    });
    fs.mkdirSync(APPROVAL_DIR, { recursive: true });
    writeJsonAtomic(approvalFile(receiptId), receipt);
    return receipt;
  });
}

export function readLiveProviderMemoryWaveApproval(receiptId: string) {
  return readJsonWithBackup<any>(approvalFile(receiptId), null);
}

export function revokeLiveProviderMemoryWaveApproval(input: any = {}) {
  if (input.explicitRevocation !== true && input.explicit_revocation !== true) throw new Error("live memory wave approval revocation requires explicitRevocation=true");
  const receiptId = String(input.receiptId || input.receipt_id || "");
  const file = approvalFile(receiptId);
  return withFileLock(file, () => {
    const receipt = readJsonWithBackup<any>(file, null);
    if (!receipt) throw new Error("live memory wave approval receipt not found");
    if (String(input.receiptChecksum || input.receipt_checksum || "") !== String(receipt.receiptChecksum || "")) throw new Error("live memory wave revocation confirmation mismatch");
    const verification = verifyLiveProviderMemoryWaveApprovalReceipt(receipt, { atMs: input.atMs });
    if (!verification.valid) throw new Error(`live memory wave approval cannot be revoked:${verification.issues.join(",")}`);
    const revoked = sealReceipt({
      ...receiptCore(receipt),
      status: "revoked",
      revoked: true,
      revokedAt: new Date(Number(input.atMs || Date.now())).toISOString(),
      revokedBy: safeCode(input.revokedBy || input.revoked_by, "local-user"),
      revocationReasonChecksum: digest(String(input.reason || "explicit_live_memory_wave_revocation")),
      consumed: true,
      consumedAt: new Date(Number(input.atMs || Date.now())).toISOString(),
    });
    writeJsonAtomic(file, revoked);
    return revoked;
  });
}

export function claimLiveProviderMemoryWaveApproval(input: any = {}) {
  if (input.explicitExecution !== true && input.explicit_execution !== true) throw new Error("live memory wave execution requires explicitExecution=true");
  const receiptId = String(input.receiptId || input.receipt_id || "");
  const file = approvalFile(receiptId);
  return withLiveProviderMemorySoakReportSetLock(() => withFileLock(file, () => {
    const receipt = readJsonWithBackup<any>(file, null);
    if (!receipt) throw new Error("live memory wave approval receipt not found");
    if (String(input.receiptChecksum || input.receipt_checksum || "") !== String(receipt.receiptChecksum || "")) throw new Error("live memory wave receipt confirmation mismatch");
    const verification = verifyLiveProviderMemoryWaveApprovalReceipt(receipt, { requireCurrent: true, reportSetLockHeld: true, atMs: input.atMs });
    if (!verification.valid) throw new Error(`live memory wave approval rejected:${verification.issues.join(",")}`);
    const executionId = `lpmwe_${crypto.randomBytes(14).toString("hex")}`;
    const claimed = sealReceipt({
      ...receiptCore(receipt),
      status: "claimed",
      consumed: true,
      consumedAt: new Date(Number(input.atMs || Date.now())).toISOString(),
      executionId,
      explicitExecution: true,
      executionActor: safeCode(input.executionActor || input.execution_actor, "local-user"),
    });
    writeJsonAtomic(file, claimed);
    return claimed;
  }));
}

function findSingleReportByChecksum(checksum: string) {
  try {
    if (!/^[a-f0-9]{64}$/.test(checksum) || !fs.existsSync(LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR)) return null;
    for (const entry of fs.readdirSync(LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      try {
        const report = JSON.parse(fs.readFileSync(path.join(LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR, entry.name), "utf8"));
        const verification = verifyLiveProviderMemorySoakReport(report, "single");
        if (verification.valid && verification.reportChecksum === checksum) return report;
      } catch {}
    }
  } catch {}
  return null;
}

function verifyTransitionCanaryOutcome(plan: any, report: any) {
  const issues: string[] = [];
  if (report?.accountBacked !== true) issues.push("transition_canary_not_account_backed");
  if (report?.isolationValid !== true) issues.push("transition_canary_isolation_invalid");
  if (Number(report?.passedCount || 0) !== 2 || Number(report?.failedCount || 0) !== 0) issues.push("transition_canary_group_failure");
  const groups = Array.isArray(report?.groups) ? report.groups : [];
  if (groups.length !== 2 || new Set(groups.map((row: any) => row.groupId)).size !== 2 || new Set(groups.map((row: any) => row.groupSessionId)).size !== 2) issues.push("transition_canary_group_identity_invalid");
  for (const group of groups) {
    const codexMode = plan.provider === "codex";
    const expectedMode = codexMode ? "receipt_recovery" : "native_session_resume";
    const expectedRecoveryStatus = codexMode ? "recovered" : "native_session_resume_verified";
    if (group?.status !== "passed" || group?.receiptValid !== true || group?.memoryContinuityVerified !== true
      || String(group?.memoryContinuityMode || "") !== expectedMode || String(group?.recoveryStatus || "") !== expectedRecoveryStatus) issues.push("transition_canary_recovery_unproven");
    const child = findSingleReportByChecksum(String(group?.childReportChecksum || ""));
    if (!child || String(child.groupId || "") !== String(group?.groupId || "") || String(child.groupSessionId || "") !== String(group?.groupSessionId || "")) {
      issues.push("transition_canary_child_report_invalid");
      continue;
    }
    if (child.accountBacked !== true) issues.push("transition_canary_child_not_account_backed");
    const provider = Array.isArray(child.providers) ? child.providers[0] : null;
    if (provider?.status !== "passed"
      || !plan.providerVersions.includes(String(provider?.version || ""))
      || !plan.providerRuntimeIdentityChecksums.includes(String(provider?.providerRuntimeIdentityChecksum || ""))) issues.push("transition_canary_runtime_evidence_mismatch");
    if (provider?.workspaceUnchanged !== true) issues.push("transition_canary_workspace_changed");
    if (codexMode) {
      if (provider?.receiptRecovery?.recovered !== true || provider?.receiptRecovery?.receiptValid !== true || provider?.receiptRecovery?.suppressTaskReplay === true) issues.push("transition_canary_memory_recovery_unproven");
    } else if (provider?.initial?.status !== "passed" || provider?.resume?.status !== "passed"
      || !/^[a-f0-9]{64}$/.test(String(provider?.sessionChecksum || ""))
      || !/^[a-f0-9]{64}$/.test(String(provider?.sentinelChecksum || ""))) issues.push("transition_canary_native_session_memory_unproven");
  }
  return [...new Set(issues)];
}

function verifyWaveOutcome(plan: any, outcome: any) {
  const issues: string[] = [];
  const file = path.resolve(String(outcome?.reportFile || ""));
  if (!pathInside(file, LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR)) issues.push("execution_report_path_invalid");
  let report: any = null;
  try { report = JSON.parse(fs.readFileSync(file, "utf8")); } catch { issues.push("execution_report_missing"); }
  const verification = report ? verifyLiveProviderMemorySoakReport(report, "multi") : null;
  if (!verification?.valid) issues.push("execution_report_invalid");
  if (String(outcome?.reportChecksum || "") !== String(verification?.reportChecksum || "")) issues.push("execution_report_checksum_mismatch");
  if (String(report?.provider || "") !== String(plan?.provider || "")) issues.push("execution_provider_mismatch");
  if (String(report?.model || "") !== String(plan?.model || "")) issues.push("execution_model_mismatch");
  if (Number(report?.requestedGroupCount || 0) !== Number(plan?.groups || 0)) issues.push("execution_group_count_mismatch");
  if (Number(report?.concurrency || 0) !== Number(plan?.concurrency || 0)) issues.push("execution_concurrency_mismatch");
  if (!String(report?.groups?.[0]?.groupId || "").startsWith(String(plan?.groupPrefix || ""))) issues.push("execution_group_prefix_mismatch");
  if (["version_transition_canary", "initial_provider_baseline_canary"].includes(String(plan?.approvalMode || ""))) issues.push(...verifyTransitionCanaryOutcome(plan, report));
  return { valid: issues.length === 0, issues, report };
}

function finalizeLiveProviderMemoryWaveExecution(claimed: any, outcome: any, error: any = null) {
  const file = approvalFile(String(claimed.receiptId || ""));
  return withFileLock(file, () => {
    const current = readJsonWithBackup<any>(file, null);
    if (!current || current.status !== "claimed" || current.executionId !== claimed.executionId || current.receiptChecksum !== claimed.receiptChecksum) throw new Error("live memory wave execution claim changed before finalization");
    const validation = error ? { valid: false, issues: ["execution_runner_failed"], report: null } : verifyWaveOutcome(current.plan, outcome);
    const report = validation.report;
    const executionCompleted = validation.valid && Number(outcome?.exitCode ?? 0) === 0 && Number(report?.passedCount || 0) === Number(current.plan?.groups || 0);
    const canary = ["version_transition_canary", "initial_provider_baseline_canary"].includes(approvalMode(current));
    let promotionReport: any = null;
    let evidencePromotionStatus = canary ? "not_run" : "not_required";
    let evidencePromotionIssue = "";
    if (canary && executionCompleted) {
      try {
        promotionReport = auditLiveProviderMemoryEndurance({
          provider: current.plan?.provider,
          groupPrefix: approvalMode(current) === "initial_provider_baseline_canary" ? current.plan?.groupPrefix : "",
          initialBaselineCanary: approvalMode(current) === "initial_provider_baseline_canary",
        });
        const epochs = Array.isArray(promotionReport?.providerVersionTrend?.epochs) ? promotionReport.providerVersionTrend.epochs : [];
        const latestEpoch = epochs[epochs.length - 1] || {};
        const comparisons = Array.isArray(promotionReport?.providerVersionTrend?.comparisons) ? promotionReport.providerVersionTrend.comparisons : [];
        const latestComparison = comparisons[comparisons.length - 1] || null;
        const promoted = String(latestEpoch.versionKey || "") === String(current.toProviderVersionKey || current.providerVersionKey || "")
          && (!latestComparison || latestComparison.status === "verified")
          && promotionReport?.gatePassed === true;
        evidencePromotionStatus = promoted ? "promoted" : "unverified";
        if (!promoted) evidencePromotionIssue = "transition_canary_endurance_promotion_unverified";
      } catch (promotionError: any) {
        evidencePromotionStatus = "failed";
        evidencePromotionIssue = "transition_canary_endurance_promotion_failed";
      }
    }
    const completed = executionCompleted && (!canary || evidencePromotionStatus === "promoted");
    const executionIssues = [...validation.issues, ...(evidencePromotionIssue ? [evidencePromotionIssue] : [])];
    const finalized = sealReceipt({
      ...receiptCore(current),
      status: validation.valid ? (completed ? "completed" : "completed_with_failures") : "execution_failed",
      finalizedAt: new Date().toISOString(),
      executionValid: validation.valid,
      executionIssues,
      exitCode: Number(outcome?.exitCode ?? (error ? -1 : 0)),
      wavePassed: completed,
      evidencePromotionStatus,
      evidencePromotionRequired: canary,
      promotedEnduranceReportChecksum: String(promotionReport?.reportChecksum || ""),
      promotedSourceSetChecksum: String(promotionReport?.sourceSetChecksum || ""),
      executionReportChecksum: String(outcome?.reportChecksum || ""),
      executionReportFileChecksum: outcome?.reportFile ? digest(path.resolve(String(outcome.reportFile))) : "",
      executionRunIdChecksum: digest(String(report?.runId || "")),
      executionErrorChecksum: error ? digest(String(error?.message || error)) : "",
    });
    writeJsonAtomic(file, finalized);
    return finalized;
  });
}

export function executeApprovedLiveProviderMemoryWave(input: any = {}, runner?: (plan: any, claim: any) => any) {
  if (typeof runner !== "function") throw new Error("live memory wave execution runner is required");
  const claimed = claimLiveProviderMemoryWaveApproval(input);
  try {
    const outcome = runner(claimed.plan, claimed);
    return finalizeLiveProviderMemoryWaveExecution(claimed, outcome, null);
  } catch (error: any) {
    finalizeLiveProviderMemoryWaveExecution(claimed, null, error);
    throw error;
  }
}

export function reconcileLiveProviderMemoryWaveApprovals(options: any = {}) {
  const nowMs = Number(options.nowMs ?? Date.now());
  const staleMs = Math.max(60_000, Number(options.claimStaleMs ?? options.claim_stale_ms ?? DEFAULT_CLAIM_STALE_MS));
  const retentionDays = Math.max(1, Number(options.retentionDays ?? options.retention_days ?? DEFAULT_TERMINAL_RETENTION_DAYS));
  const minimumRetained = Math.max(0, Number(options.minimumRetained ?? options.minimum_retained ?? DEFAULT_TERMINAL_MIN_RECEIPTS));
  const maximumReceipts = Math.max(minimumRetained, Number(options.maximumReceipts ?? options.maximum_receipts ?? DEFAULT_TERMINAL_MAX_RECEIPTS));
  const graceHours = Math.max(0, Number(options.graceHours ?? options.grace_hours ?? DEFAULT_TERMINAL_GRACE_HOURS));
  const prune = options.prune === true && options.dryRun !== true;
  const maintenanceRequested = options.maintenance === true || options.prune === true || options.dryRun !== undefined;
  const rows: any[] = [];
  const pruned: any[] = [];
  const skipped: any[] = [];
  let invalidCount = 0;
  try {
    if (fs.existsSync(APPROVAL_DIR)) {
      for (const entry of fs.readdirSync(APPROVAL_DIR, { withFileTypes: true })) {
        if (!entry.isFile() || !/^lpmwa_[a-f0-9]{28}\.json$/.test(entry.name)) continue;
        const file = path.join(APPROVAL_DIR, entry.name);
        try {
          let receipt = readJsonWithBackup<any>(file, null);
          const checksumValid = !!receipt && receipt.receiptChecksum === digest(receiptCore(receipt)) && signatureMatches(receipt.receiptChecksum, receipt.receiptSignature);
          if (!checksumValid) {
            invalidCount += 1;
            rows.push({ receiptId: String(receipt?.receiptId || ""), file, status: "invalid", valid: false, protectedBy: "invalid_fail_closed", prunable: false, candidateReasons: [] });
            continue;
          }
          const claimedMs = Date.parse(String(receipt.consumedAt || ""));
          if (receipt.status === "claimed" && Number.isFinite(claimedMs) && nowMs - claimedMs >= staleMs) {
            receipt = sealReceipt({ ...receiptCore(receipt), status: "interrupted", interruptedAt: new Date(nowMs).toISOString(), executionValid: false, executionIssues: ["claimed_execution_interrupted"] });
            writeJsonAtomic(file, receipt);
          }
          const expiresMs = Date.parse(String(receipt.expiresAt || ""));
          if (receipt.status === "approved" && Number.isFinite(expiresMs) && nowMs > expiresMs) {
            receipt = sealReceipt({ ...receiptCore(receipt), status: "expired", expiredAt: new Date(expiresMs).toISOString(), consumed: true, consumedAt: new Date(expiresMs).toISOString() });
            writeJsonAtomic(file, receipt);
          }
          const terminalAt = String(receipt.finalizedAt || receipt.interruptedAt || receipt.revokedAt || receipt.expiredAt || receipt.consumedAt || receipt.createdAt || "");
          const terminalMs = Date.parse(terminalAt);
          rows.push({
            receiptId: receipt.receiptId,
            file,
            receiptChecksum: receipt.receiptChecksum,
            approvalMode: approvalMode(receipt),
            status: receipt.status,
            valid: true,
            createdAt: receipt.createdAt,
            expiresAt: receipt.expiresAt,
            terminalAt,
            terminalMs: Number.isFinite(terminalMs) ? terminalMs : 0,
            ageHours: Number.isFinite(terminalMs) ? Math.max(0, (nowMs - terminalMs) / 3_600_000) : 0,
            consumed: receipt.consumed === true,
            enduranceReportChecksum: receipt.enduranceReportChecksum,
            planChecksum: receipt.planChecksum,
            executionId: receipt.executionId || "",
            executionReportChecksum: receipt.executionReportChecksum || "",
            promotedEnduranceReportChecksum: receipt.promotedEnduranceReportChecksum || "",
            evidencePromotionStatus: receipt.evidencePromotionStatus || "",
            wavePassed: receipt.wavePassed === true,
            protectedBy: ["approved", "claimed"].includes(receipt.status) ? "active_or_claimed" : TERMINAL_APPROVAL_STATUSES.has(receipt.status) ? "terminal_retention" : "unknown_fail_closed",
            prunable: false,
            candidateReasons: [],
          });
        } catch { invalidCount += 1; }
      }
    }
  } catch {}
  const terminalRows = rows.filter(row => row.valid && TERMINAL_APPROVAL_STATUSES.has(row.status)).sort((left, right) => right.terminalMs - left.terminalMs);
  for (let index = 0; index < terminalRows.length; index += 1) {
    const row = terminalRows[index];
    const reasons: string[] = [];
    if (row.ageHours >= graceHours && index >= minimumRetained) {
      if (row.ageHours >= retentionDays * 24) reasons.push("terminal_retention_expired");
      if (index >= maximumReceipts) reasons.push("terminal_count_overflow");
    }
    row.candidateReasons = reasons;
    row.prunable = reasons.length > 0;
    row.protectedBy = row.prunable ? "explicit_terminal_prune_candidate" : index < minimumRetained ? "minimum_terminal_retained" : row.ageHours < graceHours ? "terminal_grace" : "terminal_policy_window";
  }
  const candidates = terminalRows.filter(row => row.prunable);
  if (prune) {
    for (const candidate of candidates) {
      try {
        if (!pathInside(candidate.file, APPROVAL_DIR)) throw new Error("approval_path_outside_managed_root");
        const current = JSON.parse(fs.readFileSync(candidate.file, "utf8"));
        const checksumValid = current?.receiptChecksum === candidate.receiptChecksum
          && current.receiptChecksum === digest(receiptCore(current))
          && signatureMatches(current.receiptChecksum, current.receiptSignature);
        if (!checksumValid || !TERMINAL_APPROVAL_STATUSES.has(String(current.status || ""))) throw new Error("approval_changed_or_invalid_before_prune");
        fs.unlinkSync(candidate.file);
        try { fs.unlinkSync(`${candidate.file}.bak`); } catch {}
        pruned.push({ receiptId: candidate.receiptId, receiptChecksum: candidate.receiptChecksum, reasons: candidate.candidateReasons });
      } catch (error: any) {
        skipped.push({ receiptId: candidate.receiptId, receiptChecksum: candidate.receiptChecksum, reason: String(error?.message || error) });
      }
    }
  }
  rows.sort((left, right) => String(right.createdAt || right.receiptId).localeCompare(String(left.createdAt || left.receiptId)));
  const audit = maintenanceRequested ? {
    schema: "ccm-live-provider-memory-wave-approval-retention-audit-v1",
    at: new Date(nowMs).toISOString(),
    dryRun: !prune,
    candidateCount: candidates.length,
    prunedCount: pruned.length,
    skippedCount: skipped.length,
    candidateChecksum: digest(candidates.map(row => [row.receiptChecksum, row.candidateReasons])),
    prunedChecksum: digest(pruned.map(row => [row.receiptChecksum, row.reasons])),
  } : null;
  if (audit) {
    fs.mkdirSync(path.dirname(APPROVAL_RETENTION_AUDIT_FILE), { recursive: true });
    fs.appendFileSync(APPROVAL_RETENTION_AUDIT_FILE, `${JSON.stringify(audit)}\n`, { encoding: "utf8", mode: 0o600 });
  }
  return {
    schema: "ccm-live-provider-memory-wave-approval-inventory-v1",
    generatedAt: new Date(nowMs).toISOString(),
    policy: { retentionDays, minimumRetained, maximumReceipts, graceHours, claimStaleMs: staleMs },
    count: rows.length,
    approvedCount: rows.filter(row => row.status === "approved").length,
    claimedCount: rows.filter(row => row.status === "claimed").length,
    completedCount: rows.filter(row => ["completed", "completed_with_failures"].includes(row.status)).length,
    failedCount: rows.filter(row => ["execution_failed", "interrupted"].includes(row.status)).length,
    revokedCount: rows.filter(row => row.status === "revoked").length,
    expiredCount: rows.filter(row => row.status === "expired").length,
    transitionCanaryCount: rows.filter(row => row.approvalMode === "version_transition_canary").length,
    transitionCanaryApprovedCount: rows.filter(row => row.approvalMode === "version_transition_canary" && row.status === "approved").length,
    transitionCanaryPromotedCount: rows.filter(row => row.approvalMode === "version_transition_canary" && row.evidencePromotionStatus === "promoted").length,
    transitionCanaryPromotionFailedCount: rows.filter(row => row.approvalMode === "version_transition_canary" && ["failed", "unverified"].includes(row.evidencePromotionStatus)).length,
    initialBaselineCanaryCount: rows.filter(row => row.approvalMode === "initial_provider_baseline_canary").length,
    initialBaselineCanaryApprovedCount: rows.filter(row => row.approvalMode === "initial_provider_baseline_canary" && row.status === "approved").length,
    initialBaselineCanaryPromotedCount: rows.filter(row => row.approvalMode === "initial_provider_baseline_canary" && row.evidencePromotionStatus === "promoted").length,
    initialBaselineCanaryPromotionFailedCount: rows.filter(row => row.approvalMode === "initial_provider_baseline_canary" && ["failed", "unverified"].includes(row.evidencePromotionStatus)).length,
    terminalCount: terminalRows.length,
    prunableCount: candidates.length,
    prunedCount: pruned.length,
    skippedCount: skipped.length,
    invalidCount,
    referencedEnduranceReportChecksums: [...new Set(rows.filter(row => row.valid).flatMap(row => [row.enduranceReportChecksum, row.promotedEnduranceReportChecksum]).filter(Boolean))],
    referencedMultiReportChecksums: [...new Set(rows.filter(row => row.valid && row.executionReportChecksum).map(row => row.executionReportChecksum))],
    pruned,
    skipped,
    audit,
    rows: rows.slice(0, 100),
  };
}

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { CCM_DIR } from "../core/utils";
import {
  LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR,
  LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR,
  commitLiveProviderMemorySoakReport,
  verifyLiveProviderMemorySoakReport,
  withLiveProviderMemorySoakReportSetLock,
} from "./live-provider-memory-soak-report-store";
import { recordLiveProviderMemoryVersionTransitionEvidence } from "./live-provider-memory-version-transition-ledger";

export const LIVE_PROVIDER_MEMORY_ENDURANCE_SCHEMA = "ccm-live-provider-memory-endurance-report-v1";
export const LIVE_PROVIDER_MEMORY_ENDURANCE_SCHEDULER_SCHEMA = "ccm-live-provider-memory-endurance-scheduler-v1";
const ENDURANCE_SCHEDULER_STATE_FILE = path.join(CCM_DIR, "reliability", "live-provider-memory-endurance-scheduler.json");
const DEFAULT_ENDURANCE_AUDIT_INTERVAL_MS = 6 * 60 * 60 * 1000;

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

function readReports(directory: string) {
  const rows: any[] = [];
  let invalidJsonCount = 0;
  try {
    if (!fs.existsSync(directory)) return { rows, invalidJsonCount };
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const file = path.join(directory, entry.name);
      try {
        rows.push({ file, report: JSON.parse(fs.readFileSync(file, "utf8")) });
      } catch {
        invalidJsonCount += 1;
      }
    }
  } catch {}
  return { rows, invalidJsonCount };
}

function percentile(values: number[], ratio: number) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
}

function diagnosticCode(value: any) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  return /^[a-z0-9_.:+-]{1,96}$/.test(text) ? text : `issue_checksum:${digest(text).slice(0, 24)}`;
}

function classifyObservation(source: any, child: any, childValid: boolean) {
  const sourceIssues = Array.isArray(source?.issues) ? source.issues.map(String) : [];
  const provider = Array.isArray(child?.providers) ? child.providers[0] : null;
  const rawProviderIssue = String(provider?.issue || "");
  const providerIssue = diagnosticCode(rawProviderIssue);
  const issueText = [...sourceIssues, rawProviderIssue].join(" ").toLowerCase();
  if (!childValid || /identity_mismatch|child_report_not_durable|cross_group_identity_collision/.test(issueText)) {
    return { classification: "ccm_evidence_failure", provider, providerIssue };
  }
  if (source?.status === "passed" && provider?.status === "passed" && source?.receiptValid === true) {
    return { classification: "passed", provider, providerIssue };
  }
  if (provider?.status === "timeout" || /provider_(startup|api_retry|turn|terminal)_timeout/.test(issueText)) {
    return { classification: "provider_latency_timeout", provider, providerIssue };
  }
  if (provider?.status === "unavailable" || /provider_unavailable|executable_unavailable/.test(issueText)) {
    return { classification: "provider_unavailable", provider, providerIssue };
  }
  if (/receipt_missing|receipt_invalid|receipt_recovery|memory_context_load_receipt/.test(issueText)
    || ["blocked", "not_run"].includes(String(provider?.receiptRecovery?.status || ""))) {
    return { classification: "memory_receipt_failure", provider, providerIssue };
  }
  if (/continuation_chain_invalid|continuation_receipt_counter_missing|recovery_inventory_invalid/.test(issueText)) {
    return { classification: "ccm_evidence_failure", provider, providerIssue };
  }
  return { classification: "provider_failure", provider, providerIssue };
}

function buildEnduranceReportLocked(options: any = {}) {
  const groupPrefix = String(options.groupPrefix || options.group_prefix || "").trim();
  const providerFilter = String(options.provider || options.provider_filter || "").trim();
  const initialBaselineCanary = options.initialBaselineCanary === true || options.initial_baseline_canary === true;
  const includeFixtures = options.includeFixtures === true || options.include_fixtures === true;
  const singleScan = readReports(LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR);
  const multiScan = readReports(LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR);
  const validSingles = new Map<string, any>();
  let invalidSingleReportCount = singleScan.invalidJsonCount;
  for (const row of singleScan.rows) {
    const verification = verifyLiveProviderMemorySoakReport(row.report, "single");
    if (verification.valid) validSingles.set(verification.reportChecksum, row.report);
    else invalidSingleReportCount += 1;
  }
  const sourceReports: any[] = [];
  let invalidSourceReportCount = multiScan.invalidJsonCount;
  for (const row of multiScan.rows) {
    const kind = verifyLiveProviderMemorySoakReport(row.report).kind;
    if (kind !== "multi") continue;
    const verification = verifyLiveProviderMemorySoakReport(row.report, "multi");
    if (!verification.valid) {
      invalidSourceReportCount += 1;
      continue;
    }
    if (!includeFixtures && row.report?.accountBacked !== true) continue;
    if (providerFilter && String(row.report?.provider || "") !== providerFilter) continue;
    const groups = (Array.isArray(row.report?.groups) ? row.report.groups : []).filter((group: any) => !groupPrefix || String(group?.groupId || "").startsWith(groupPrefix));
    if (groups.length) sourceReports.push({ ...row.report, groups });
  }

  const waves = sourceReports.map(source => {
    const observations = source.groups.map((group: any) => {
      const childChecksum = String(group?.childReportChecksum || "");
      const child = validSingles.get(childChecksum) || null;
      const childVerification = child ? verifyLiveProviderMemorySoakReport(child, "single") : null;
      const childValid = childVerification?.valid === true
        && childVerification.reportChecksum === childChecksum
        && String(child?.groupId || "") === String(group?.groupId || "")
        && String(child?.groupSessionId || "") === String(group?.groupSessionId || "");
      const classified = classifyObservation(group, child, childValid);
      return {
        groupIdChecksum: digest(String(group?.groupId || "")),
        groupSessionIdChecksum: digest(String(group?.groupSessionId || "")),
        childReportChecksum: childChecksum,
        childReportValid: childValid,
        classification: classified.classification,
        providerStatus: String(classified.provider?.status || ""),
        providerIssue: classified.providerIssue,
        providerVersion: diagnosticCode(classified.provider?.version || ""),
        providerRuntimeIdentityChecksum: String(classified.provider?.providerRuntimeIdentityChecksum || ""),
        providerModel: diagnosticCode(classified.provider?.model || source?.model || ""),
        durationMs: Math.max(0, Number(group?.durationMs || 0)),
        workspaceUnchanged: classified.provider?.workspaceUnchanged === true,
        replaySuppressed: classified.provider?.receiptRecovery?.suppressTaskReplay === true,
      };
    });
    const count = (classification: string) => observations.filter((row: any) => row.classification === classification).length;
    const durations = observations.map((row: any) => row.durationMs).filter((value: number) => value > 0);
    const providerVersions = [...new Set(observations.map((row: any) => row.providerVersion).filter(Boolean))];
    const providerRuntimeIdentityChecksums = [...new Set(observations.map((row: any) => row.providerRuntimeIdentityChecksum).filter(Boolean))];
    return {
      sourceReportChecksum: String(source.reportChecksum || ""),
      runIdChecksum: digest(String(source.runId || "")),
      generatedAt: String(source.generatedAt || ""),
      accountBacked: source.accountBacked === true,
      provider: String(source.provider || ""),
      model: String(source.model || ""),
      providerVersions,
      providerRuntimeIdentityChecksums,
      concurrency: Math.max(1, Number(source.concurrency || 1)),
      requestedGroupCount: Math.max(0, Number(source.requestedGroupCount || observations.length)),
      observedGroupCount: observations.length,
      passedCount: count("passed"),
      providerLatencyTimeoutCount: count("provider_latency_timeout"),
      providerUnavailableCount: count("provider_unavailable"),
      memoryReceiptFailureCount: count("memory_receipt_failure"),
      ccmEvidenceFailureCount: count("ccm_evidence_failure"),
      providerFailureCount: count("provider_failure"),
      replaySuppressedCount: observations.filter((row: any) => row.replaySuppressed).length,
      workspaceChangedCount: observations.filter((row: any) => row.workspaceUnchanged === false).length,
      isolationValid: source.isolationValid === true,
      durationP50Ms: percentile(durations, 0.5),
      durationP95Ms: percentile(durations, 0.95),
      observations,
    };
  }).sort((left, right) => Date.parse(left.generatedAt) - Date.parse(right.generatedAt));

  const versionEpochs: any[] = [];
  for (const wave of waves) {
    const versionKey = digest([wave.provider, wave.model, wave.providerVersions, wave.providerRuntimeIdentityChecksums]);
    let epoch = versionEpochs[versionEpochs.length - 1];
    if (!epoch || epoch.versionKey !== versionKey) {
      epoch = {
        epoch: versionEpochs.length + 1,
        versionKey,
        provider: wave.provider,
        model: wave.model,
        providerVersions: wave.providerVersions,
        providerRuntimeIdentityChecksums: wave.providerRuntimeIdentityChecksums,
        firstObservedAt: wave.generatedAt,
        lastObservedAt: wave.generatedAt,
        waveCount: 0,
        groupCount: 0,
        passedCount: 0,
        providerLatencyTimeoutCount: 0,
        providerUnavailableCount: 0,
        memoryReceiptFailureCount: 0,
        ccmEvidenceFailureCount: 0,
        providerFailureCount: 0,
        replaySuppressedCount: 0,
        workspaceChangedCount: 0,
        isolationFailureCount: 0,
      };
      versionEpochs.push(epoch);
    }
    epoch.lastObservedAt = wave.generatedAt;
    epoch.waveCount += 1;
    epoch.groupCount += wave.observedGroupCount;
    epoch.passedCount += wave.passedCount;
    epoch.providerLatencyTimeoutCount += wave.providerLatencyTimeoutCount;
    epoch.providerUnavailableCount += wave.providerUnavailableCount;
    epoch.memoryReceiptFailureCount += wave.memoryReceiptFailureCount;
    epoch.ccmEvidenceFailureCount += wave.ccmEvidenceFailureCount;
    epoch.providerFailureCount += wave.providerFailureCount;
    epoch.replaySuppressedCount += wave.replaySuppressedCount;
    epoch.workspaceChangedCount += wave.workspaceChangedCount;
    epoch.isolationFailureCount += wave.isolationValid ? 0 : wave.observedGroupCount;
    (wave as any).versionEpoch = epoch.epoch;
  }
  const roundedRate = (count: number, total: number) => total ? Math.round(count / total * 10_000) / 10_000 : 0;
  for (const epoch of versionEpochs) {
    const durations = waves.filter((wave: any) => wave.versionEpoch === epoch.epoch).flatMap(wave => wave.observations.map((row: any) => Number(row.durationMs || 0))).filter((value: number) => value > 0);
    epoch.passRate = roundedRate(epoch.passedCount, epoch.groupCount);
    epoch.providerLatencyTimeoutRate = roundedRate(epoch.providerLatencyTimeoutCount, epoch.groupCount);
    epoch.providerUnavailableRate = roundedRate(epoch.providerUnavailableCount, epoch.groupCount);
    epoch.memoryReceiptFailureRate = roundedRate(epoch.memoryReceiptFailureCount, epoch.groupCount);
    epoch.ccmEvidenceFailureRate = roundedRate(epoch.ccmEvidenceFailureCount, epoch.groupCount);
    epoch.durationP95Ms = percentile(durations, 0.95);
  }
  const epochSnapshot = (epoch: any) => ({
    groupCount: epoch.groupCount,
    passedCount: epoch.passedCount,
    passRate: epoch.passRate,
    providerLatencyTimeoutCount: epoch.providerLatencyTimeoutCount,
    providerLatencyTimeoutRate: epoch.providerLatencyTimeoutRate,
    providerUnavailableCount: epoch.providerUnavailableCount,
    providerUnavailableRate: epoch.providerUnavailableRate,
    memoryReceiptFailureCount: epoch.memoryReceiptFailureCount,
    memoryReceiptFailureRate: epoch.memoryReceiptFailureRate,
    ccmEvidenceFailureCount: epoch.ccmEvidenceFailureCount,
    ccmEvidenceFailureRate: epoch.ccmEvidenceFailureRate,
    isolationFailureCount: epoch.isolationFailureCount,
    workspaceChangedCount: epoch.workspaceChangedCount,
    replaySuppressedCount: epoch.replaySuppressedCount,
    durationP95Ms: epoch.durationP95Ms,
  });
  const versionComparisons = versionEpochs.slice(1).map((epoch, index) => {
    const from = versionEpochs[index];
    const fromSnapshot = epochSnapshot(from);
    const toSnapshot = epochSnapshot(epoch);
    const sufficientEvidence = from.groupCount >= 2 && epoch.groupCount >= 2;
    const reasons: string[] = [];
    if (epoch.memoryReceiptFailureCount > 0) reasons.push("new_epoch_memory_receipt_failure");
    if (epoch.ccmEvidenceFailureCount > 0) reasons.push("new_epoch_ccm_evidence_failure");
    if (epoch.isolationFailureCount > 0) reasons.push("new_epoch_group_isolation_failure");
    if (epoch.workspaceChangedCount > 0) reasons.push("new_epoch_workspace_changed");
    if (epoch.passRate < from.passRate - 0.1) reasons.push("new_epoch_pass_rate_regression");
    if (epoch.providerLatencyTimeoutRate > from.providerLatencyTimeoutRate + 0.2) reasons.push("new_epoch_timeout_rate_regression");
    if (epoch.providerUnavailableRate > from.providerUnavailableRate + 0.2) reasons.push("new_epoch_unavailable_rate_regression");
    const regressionDetected = reasons.length > 0;
    const memoryContinuityVerified = sufficientEvidence
      && epoch.memoryReceiptFailureCount === 0
      && epoch.ccmEvidenceFailureCount === 0
      && epoch.isolationFailureCount === 0
      && epoch.workspaceChangedCount === 0
      && epoch.passRate >= 0.9;
    const transitionKind = versionEpochs.slice(0, index + 1).some(previous => previous.versionKey === epoch.versionKey) ? "reappearance" : "new_identity";
    const transitionId = digest([from.versionKey, epoch.versionKey, epoch.firstObservedAt, index + 1]);
    return {
      transitionId,
      transitionIndex: index + 1,
      transitionKind,
      fromVersionKey: from.versionKey,
      toVersionKey: epoch.versionKey,
      observedAt: epoch.firstObservedAt,
      fromProviderVersions: from.providerVersions,
      toProviderVersions: epoch.providerVersions,
      sufficientEvidence,
      regressionDetected,
      memoryContinuityVerified,
      status: !sufficientEvidence ? "insufficient_evidence" : regressionDetected || !memoryContinuityVerified ? "degraded" : "verified",
      reasons: !sufficientEvidence ? ["minimum_two_groups_per_epoch_required", ...reasons] : reasons,
      from: fromSnapshot,
      to: toSnapshot,
      deltas: {
        passRate: Math.round((epoch.passRate - from.passRate) * 10_000) / 10_000,
        providerLatencyTimeoutRate: Math.round((epoch.providerLatencyTimeoutRate - from.providerLatencyTimeoutRate) * 10_000) / 10_000,
        providerUnavailableRate: Math.round((epoch.providerUnavailableRate - from.providerUnavailableRate) * 10_000) / 10_000,
        memoryReceiptFailureRate: Math.round((epoch.memoryReceiptFailureRate - from.memoryReceiptFailureRate) * 10_000) / 10_000,
        ccmEvidenceFailureRate: Math.round((epoch.ccmEvidenceFailureRate - from.ccmEvidenceFailureRate) * 10_000) / 10_000,
        durationP95Ms: epoch.durationP95Ms - from.durationP95Ms,
      },
    };
  });
  const versionTransitions = versionComparisons.map(comparison => ({
    transitionId: comparison.transitionId,
    transitionIndex: comparison.transitionIndex,
    transitionKind: comparison.transitionKind,
    fromVersionKey: comparison.fromVersionKey,
    toVersionKey: comparison.toVersionKey,
    observedAt: comparison.observedAt,
    fromProviderVersions: comparison.fromProviderVersions,
    toProviderVersions: comparison.toProviderVersions,
    status: comparison.status,
    memoryContinuityVerified: comparison.memoryContinuityVerified,
  }));

  const bucketMap = new Map<number, any[]>();
  for (const wave of waves) bucketMap.set(wave.concurrency, [...(bucketMap.get(wave.concurrency) || []), wave]);
  const concurrencyBuckets = [...bucketMap.entries()].sort((left, right) => left[0] - right[0]).map(([concurrency, bucketWaves]) => {
    const groupCount = bucketWaves.reduce((sum, wave) => sum + wave.observedGroupCount, 0);
    const timeoutCount = bucketWaves.reduce((sum, wave) => sum + wave.providerLatencyTimeoutCount, 0);
    const ccmEvidenceFailureCount = bucketWaves.reduce((sum, wave) => sum + wave.ccmEvidenceFailureCount, 0);
    return {
      concurrency,
      waveCount: bucketWaves.length,
      groupCount,
      passedCount: bucketWaves.reduce((sum, wave) => sum + wave.passedCount, 0),
      providerLatencyTimeoutCount: timeoutCount,
      memoryReceiptFailureCount: bucketWaves.reduce((sum, wave) => sum + wave.memoryReceiptFailureCount, 0),
      ccmEvidenceFailureCount,
      timeoutRate: groupCount ? Math.round(timeoutCount / groupCount * 10_000) / 10_000 : 0,
    };
  });
  const baselineBuckets = concurrencyBuckets.filter(row => row.concurrency === 1);
  const elevatedBuckets = concurrencyBuckets.filter(row => row.concurrency > 1);
  const aggregateBuckets = (rows: any[]) => ({
    groupCount: rows.reduce((sum, row) => sum + row.groupCount, 0),
    timeoutCount: rows.reduce((sum, row) => sum + row.providerLatencyTimeoutCount, 0),
    ccmEvidenceFailureCount: rows.reduce((sum, row) => sum + row.ccmEvidenceFailureCount, 0),
  });
  const baseline = aggregateBuckets(baselineBuckets);
  const elevated = aggregateBuckets(elevatedBuckets);
  const baselineTimeoutRate = baseline.groupCount ? baseline.timeoutCount / baseline.groupCount : 0;
  const elevatedTimeoutRate = elevated.groupCount ? elevated.timeoutCount / elevated.groupCount : 0;
  const saturationObserved = baseline.groupCount >= 2
    && elevated.groupCount >= 2
    && elevated.ccmEvidenceFailureCount === 0
    && elevatedTimeoutRate >= baselineTimeoutRate + 0.2;
  const allDurations = waves.flatMap(wave => wave.observations.map((row: any) => Number(row.durationMs || 0))).filter((value: number) => value > 0);
  const observedP95Ms = percentile(allDurations, 0.95);
  const recommendedTimeoutMs = Math.max(60_000, Math.min(300_000, Math.ceil((observedP95Ms * 1.25) / 5_000) * 5_000 || 120_000));
  const highestObservedConcurrency = Math.max(1, ...concurrencyBuckets.map(row => row.concurrency));
  const recommendedConcurrencyCeiling = saturationObserved ? 1 : highestObservedConcurrency;
  const summary = {
    waveCount: waves.length,
    observedGroupCount: waves.reduce((sum, wave) => sum + wave.observedGroupCount, 0),
    passedGroupCount: waves.reduce((sum, wave) => sum + wave.passedCount, 0),
    providerLatencyTimeoutCount: waves.reduce((sum, wave) => sum + wave.providerLatencyTimeoutCount, 0),
    providerUnavailableCount: waves.reduce((sum, wave) => sum + wave.providerUnavailableCount, 0),
    memoryReceiptFailureCount: waves.reduce((sum, wave) => sum + wave.memoryReceiptFailureCount, 0),
    ccmEvidenceFailureCount: waves.reduce((sum, wave) => sum + wave.ccmEvidenceFailureCount, 0),
    providerFailureCount: waves.reduce((sum, wave) => sum + wave.providerFailureCount, 0),
    replaySuppressedCount: waves.reduce((sum, wave) => sum + wave.replaySuppressedCount, 0),
    invalidSourceReportCount,
    invalidSingleReportCount,
    allWaveIsolationValid: waves.length > 0 && waves.every(wave => wave.isolationValid),
    providerVersionEpochCount: versionEpochs.length,
    providerVersionTransitionCount: versionTransitions.length,
    providerVersionTransitionVerifiedCount: versionComparisons.filter(row => row.status === "verified").length,
    providerVersionTransitionDegradedCount: versionComparisons.filter(row => row.status === "degraded").length,
    providerVersionTransitionInsufficientCount: versionComparisons.filter(row => row.status === "insufficient_evidence").length,
  };
  const sourceSetChecksum = digest(waves.map(wave => [
    wave.sourceReportChecksum,
    wave.observations.map((row: any) => [
      row.childReportChecksum,
      row.childReportValid,
      row.classification,
      row.providerVersion,
      row.providerRuntimeIdentityChecksum,
    ]),
  ]));
  const standardGatePassed = summary.waveCount >= 2
    && summary.passedGroupCount >= 2
    && summary.ccmEvidenceFailureCount === 0
    && summary.allWaveIsolationValid;
  const initialBaselineCanaryGatePassed = initialBaselineCanary
    && !!providerFilter
    && !!groupPrefix
    && summary.waveCount === 1
    && summary.observedGroupCount === 2
    && summary.passedGroupCount === 2
    && summary.providerLatencyTimeoutCount === 0
    && summary.providerUnavailableCount === 0
    && summary.memoryReceiptFailureCount === 0
    && summary.ccmEvidenceFailureCount === 0
    && summary.providerFailureCount === 0
    && summary.replaySuppressedCount === 0
    && summary.allWaveIsolationValid
    && versionEpochs.length === 1
    && versionEpochs[0]?.groupCount === 2
    && versionEpochs[0]?.workspaceChangedCount === 0;
  const unsigned = {
    schema: LIVE_PROVIDER_MEMORY_ENDURANCE_SCHEMA,
    version: 1,
    classifierVersion: 3,
    attributionRuleVersion: 1,
    versionTransitionRuleVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceSetChecksum,
    providerFilter,
    groupPrefixChecksum: groupPrefix ? digest(groupPrefix) : "",
    baselineQualification: {
      mode: initialBaselineCanary ? "initial_provider_baseline_canary" : "multi_wave_endurance",
      initialBaselineCanary,
      initialBaselineCanaryGatePassed,
      standardGatePassed,
      minimumWaveCount: initialBaselineCanary ? 1 : 2,
      minimumGroupCount: 2,
    },
    summary,
    concurrencyBuckets,
    attribution: {
      providerLatencySaturationObserved: saturationObserved,
      confidence: saturationObserved && baseline.groupCount >= 3 && elevated.groupCount >= 3 ? "moderate_correlation" : saturationObserved ? "low_correlation" : "not_observed",
      causalClaim: false,
      baselineGroupCount: baseline.groupCount,
      baselineTimeoutRate: Math.round(baselineTimeoutRate * 10_000) / 10_000,
      elevatedGroupCount: elevated.groupCount,
      elevatedTimeoutRate: Math.round(elevatedTimeoutRate * 10_000) / 10_000,
    },
    providerVersionTrend: {
      epochCount: versionEpochs.length,
      transitionCount: versionTransitions.length,
      epochs: versionEpochs,
      transitions: versionTransitions,
      comparisons: versionComparisons,
      latestTransitionGatePassed: versionComparisons.length === 0 || versionComparisons[versionComparisons.length - 1].status === "verified",
    },
    advisory: {
      advisoryOnly: true,
      policyMutationApplied: false,
      recommendedConcurrencyCeiling,
      recommendedProviderTimeoutMs: recommendedTimeoutMs,
      observedDurationP95Ms: observedP95Ms,
      reason: saturationObserved ? "provider_latency_correlation_at_elevated_concurrency" : "no_elevated_latency_correlation_observed",
      nextWave: {
        provider: String(waves[waves.length - 1]?.provider || "codex"),
        model: String(waves[waves.length - 1]?.model || ""),
        providerVersionKey: String(versionEpochs[versionEpochs.length - 1]?.versionKey || ""),
        providerVersions: versionEpochs[versionEpochs.length - 1]?.providerVersions || [],
        providerRuntimeIdentityChecksums: versionEpochs[versionEpochs.length - 1]?.providerRuntimeIdentityChecksums || [],
        groups: Math.max(2, Math.min(3, Number(waves[waves.length - 1]?.requestedGroupCount || 2))),
        concurrency: recommendedConcurrencyCeiling,
        timeoutMs: recommendedTimeoutMs,
        liveExecutionAuthorized: false,
      },
    },
    gatePassed: standardGatePassed || initialBaselineCanaryGatePassed,
    waves,
  };
  return { ...unsigned, reportChecksum: digest(unsigned) };
}

export function auditLiveProviderMemoryEndurance(options: any = {}) {
  return withLiveProviderMemorySoakReportSetLock(() => {
    const report = buildEnduranceReportLocked(options);
    const reportFile = options.persist === false
      ? ""
      : commitLiveProviderMemorySoakReport(report, { kind: "endurance", lockHeld: true });
    if (options.persist !== false) recordLiveProviderMemoryVersionTransitionEvidence(report, { nowMs: options.nowMs });
    return { ...report, reportFile };
  }, { timeoutMs: Math.max(1_000, Number(options.lockTimeoutMs || options.lock_timeout_ms || 60_000)) });
}

export function readLatestLiveProviderMemoryEnduranceSummary(options: any = {}) {
  const provider = String(typeof options === "string" ? options : options.provider || "").trim();
  const rows: any[] = [];
  try {
    if (fs.existsSync(LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR)) {
      for (const entry of fs.readdirSync(LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.startsWith("endurance-") || !entry.name.endsWith(".json")) continue;
        try {
          const report = JSON.parse(fs.readFileSync(path.join(LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR, entry.name), "utf8"));
          if (verifyLiveProviderMemorySoakReport(report, "endurance").valid
            && (!provider || String(report?.advisory?.nextWave?.provider || report?.providerFilter || "") === provider)) rows.push(report);
        } catch {}
      }
    }
  } catch {}
  rows.sort((left, right) => Date.parse(String(right.generatedAt || "")) - Date.parse(String(left.generatedAt || "")));
  const latest = rows[0] || null;
  return {
    schema: "ccm-memory-center-live-provider-memory-endurance-summary-v1",
    generatedAt: new Date().toISOString(),
    present: !!latest,
    reportChecksum: String(latest?.reportChecksum || ""),
    sourceGeneratedAt: String(latest?.generatedAt || ""),
    waveCount: Number(latest?.summary?.waveCount || 0),
    observedGroupCount: Number(latest?.summary?.observedGroupCount || 0),
    passedGroupCount: Number(latest?.summary?.passedGroupCount || 0),
    providerLatencyTimeoutCount: Number(latest?.summary?.providerLatencyTimeoutCount || 0),
    memoryReceiptFailureCount: Number(latest?.summary?.memoryReceiptFailureCount || 0),
    ccmEvidenceFailureCount: Number(latest?.summary?.ccmEvidenceFailureCount || 0),
    replaySuppressedCount: Number(latest?.summary?.replaySuppressedCount || 0),
    providerLatencySaturationObserved: latest?.attribution?.providerLatencySaturationObserved === true,
    attributionConfidence: String(latest?.attribution?.confidence || ""),
    gatePassed: latest?.gatePassed === true,
    providerVersionEpochCount: Number(latest?.providerVersionTrend?.epochCount || 0),
    providerVersionTransitionCount: Number(latest?.providerVersionTrend?.transitionCount || 0),
    providerVersionTransitionVerifiedCount: Number(latest?.summary?.providerVersionTransitionVerifiedCount || 0),
    providerVersionTransitionDegradedCount: Number(latest?.summary?.providerVersionTransitionDegradedCount || 0),
    providerVersionTransitionInsufficientCount: Number(latest?.summary?.providerVersionTransitionInsufficientCount || 0),
    latestVersionTransitionGatePassed: latest?.providerVersionTrend?.latestTransitionGatePassed !== false,
    advisoryOnly: latest?.advisory?.advisoryOnly === true,
    policyMutationApplied: latest?.advisory?.policyMutationApplied === true,
    recommendedConcurrencyCeiling: Number(latest?.advisory?.recommendedConcurrencyCeiling || 0),
    recommendedProviderTimeoutMs: Number(latest?.advisory?.recommendedProviderTimeoutMs || 0),
    concurrencyBuckets: (Array.isArray(latest?.concurrencyBuckets) ? latest.concurrencyBuckets : []).slice(0, 12),
  };
}

export function readLatestLiveProviderMemoryEnduranceReport(options: any = {}) {
  const provider = String(typeof options === "string" ? options : options.provider || "").trim();
  const rows: any[] = [];
  try {
    if (fs.existsSync(LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR)) {
      for (const entry of fs.readdirSync(LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.startsWith("endurance-") || !entry.name.endsWith(".json")) continue;
        try {
          const report = JSON.parse(fs.readFileSync(path.join(LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR, entry.name), "utf8"));
          if (verifyLiveProviderMemorySoakReport(report, "endurance").valid
            && (!provider || String(report?.advisory?.nextWave?.provider || report?.providerFilter || "") === provider)) rows.push(report);
        } catch {}
      }
    }
  } catch {}
  rows.sort((left, right) => Date.parse(String(right.generatedAt || "")) - Date.parse(String(left.generatedAt || "")));
  return rows[0] || null;
}

export function runLiveProviderMemoryEnduranceSchedulerTick(options: any = {}) {
  const stateFile = String(options.stateFile || options.state_file || ENDURANCE_SCHEDULER_STATE_FILE);
  if (options.stateLockHeld !== true) {
    return withFileLock(stateFile, () => runLiveProviderMemoryEnduranceSchedulerTick({ ...options, stateFile, stateLockHeld: true }), {
      timeoutMs: Math.max(1_000, Number(options.lockTimeoutMs || options.lock_timeout_ms || 30_000)),
    });
  }
  const atMs = Date.parse(String(options.at || ""));
  const nowMs = Number.isFinite(atMs) ? atMs : Date.now();
  const at = new Date(nowMs).toISOString();
  const intervalMs = Math.max(60_000, Number(options.intervalMs || options.interval_ms || DEFAULT_ENDURANCE_AUDIT_INTERVAL_MS));
  const previous = readJsonWithBackup<any>(stateFile, null);
  const lastCheckedMs = Date.parse(String(previous?.lastCheckedAt || ""));
  const due = options.force === true || !Number.isFinite(lastCheckedMs) || nowMs - lastCheckedMs >= intervalMs;
  if (!due) {
    return {
      ...previous,
      schema: LIVE_PROVIDER_MEMORY_ENDURANCE_SCHEDULER_SCHEMA,
      status: "not_due",
      due: false,
      nextRunAt: new Date(lastCheckedMs + intervalMs).toISOString(),
      destructiveActionAuthorized: false,
      liveExecutionAuthorized: false,
      policyMutationApplied: false,
    };
  }
  const preview = auditLiveProviderMemoryEndurance({ ...options, persist: false });
  const sourceAvailable = Number(preview.summary?.waveCount || 0) > 0;
  const ruleChanged = Number(previous?.lastClassifierVersion || 0) !== Number(preview.classifierVersion || 0)
    || Number(previous?.lastVersionTransitionRuleVersion || 0) !== Number(preview.versionTransitionRuleVersion || 0);
  const sourceChanged = sourceAvailable && (String(preview.sourceSetChecksum || "") !== String(previous?.lastSourceSetChecksum || "") || ruleChanged);
  const persisted = sourceChanged ? auditLiveProviderMemoryEndurance({ ...options, persist: true }) : null;
  const state = {
    schema: LIVE_PROVIDER_MEMORY_ENDURANCE_SCHEDULER_SCHEMA,
    status: !sourceAvailable ? "no_source_evidence" : sourceChanged ? "persisted" : "source_unchanged",
    due: true,
    lastCheckedAt: at,
    lastPersistedAt: sourceChanged ? at : String(previous?.lastPersistedAt || ""),
    nextRunAt: new Date(nowMs + intervalMs).toISOString(),
    intervalMs,
    runCount: Math.max(0, Number(previous?.runCount || 0)) + 1,
    persistedCount: Math.max(0, Number(previous?.persistedCount || 0)) + (sourceChanged ? 1 : 0),
    noChangeCount: Math.max(0, Number(previous?.noChangeCount || 0)) + (sourceAvailable && !sourceChanged ? 1 : 0),
    noSourceCount: Math.max(0, Number(previous?.noSourceCount || 0)) + (sourceAvailable ? 0 : 1),
    lastSourceSetChecksum: String(preview.sourceSetChecksum || ""),
    lastClassifierVersion: Number(preview.classifierVersion || 0),
    lastVersionTransitionRuleVersion: Number(preview.versionTransitionRuleVersion || 0),
    lastReportChecksum: String(persisted?.reportChecksum || previous?.lastReportChecksum || ""),
    lastGatePassed: persisted ? persisted.gatePassed === true : previous?.lastGatePassed === true,
    latestVersionTransitionGatePassed: preview.providerVersionTrend?.latestTransitionGatePassed !== false,
    versionTransitionVerifiedCount: Number(preview.summary?.providerVersionTransitionVerifiedCount || 0),
    versionTransitionDegradedCount: Number(preview.summary?.providerVersionTransitionDegradedCount || 0),
    versionTransitionInsufficientCount: Number(preview.summary?.providerVersionTransitionInsufficientCount || 0),
    recommendedConcurrencyCeiling: Number(preview.advisory?.recommendedConcurrencyCeiling || 0),
    recommendedProviderTimeoutMs: Number(preview.advisory?.recommendedProviderTimeoutMs || 0),
    destructiveActionAuthorized: false,
    liveExecutionAuthorized: false,
    policyMutationApplied: false,
    createdTaskCount: 0,
    deletedCount: 0,
  };
  writeJsonAtomic(stateFile, state);
  return state;
}

export function getLiveProviderMemoryEnduranceSchedulerStatus(options: any = {}) {
  const stateFile = String(options.stateFile || options.state_file || ENDURANCE_SCHEDULER_STATE_FILE);
  const state = readJsonWithBackup<any>(stateFile, null);
  return {
    schema: LIVE_PROVIDER_MEMORY_ENDURANCE_SCHEDULER_SCHEMA,
    present: !!state,
    safe: !state || (state.destructiveActionAuthorized === false
      && state.liveExecutionAuthorized === false
      && state.policyMutationApplied === false
      && Number(state.createdTaskCount || 0) === 0
      && Number(state.deletedCount || 0) === 0),
    state,
  };
}

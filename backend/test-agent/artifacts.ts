import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  BrowserEvidenceArtifact,
  BrowserProviderGapItem,
  BrowserCheckResult,
  BrowserToolCallRecord,
  CommandRunResult,
  DevServerResult,
  EvidenceItem,
  HttpCheckResult,
  TestAgentArtifactManifest,
  TestAgentArtifactManifestItem,
  TestAgentReport,
} from "./types";
import { buildAcceptanceSummary, formatAcceptanceMarkdownSummaryLines } from "./acceptance-summary";
import { buildRequiredCheckSummary, formatRequiredCheckMarkdownSummaryLines } from "./required-check-summary";
import { formatBrowserProviderGapLine } from "./browser/provider-gaps";
import { formatBrowserProviderSummaryLine } from "./browser/provider-summary";
import { formatBrowserFlowSummaryLine } from "./browser/flow-summary";
import { formatBrowserMultiSessionSummaryLine } from "./browser/multi-session-summary";
import { formatBrowserStabilitySummaryLine } from "./browser/stability-summary";
import { formatBrowserCheckExecutionCoverageLine } from "./browser/check-execution-coverage";
import { formatBrowserEvidenceTemporalIntegrityLine } from "./browser/evidence-temporal-integrity";
import { formatBrowserResourceLifecycleLine } from "./browser/resource-lifecycle";
import { formatBrowserToolEvidenceLineageLine } from "./browser/tool-evidence-lineage";
import { formatBrowserToolCallTimeoutSummaryLine } from "./browser/tool-call-timeout";
import {
  buildBrowserAuthenticationSummary,
  formatBrowserAuthenticationEvidence,
  formatBrowserAuthenticationSummaryLine,
} from "./browser/authentication-summary";
import { formatBrowserRecoverySummaryLine } from "./browser/recovery-summary";
import { formatBrowserActionEffectSummaryLine } from "./browser/action-effect-summary";
import { formatAdversarialEvidenceSummaryLine } from "./adversarial-summary";
import { formatAcceptanceEvidenceGateSummaryLine } from "./acceptance-gate";
import { formatHttpConcurrencySummaryLine } from "./http-concurrency";
import { formatHttpPageResourceSummary } from "./http-page-resources";
import { compactText, ensureDir, nowIso } from "./utils";
import { buildTestAgentVerdict } from "./verdict";

function fileIntegrity(filePath: string, options: { omitHash?: boolean } = {}): TestAgentArtifactManifestItem["integrity"] {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return { exists: false, error: "Path exists but is not a file." };
    if (options.omitHash) {
      return {
        exists: true,
        sizeBytes: stat.size,
        error: "sha256 omitted for self-referential artifact.",
      };
    }
    const hash = crypto.createHash("sha256");
    hash.update(fs.readFileSync(filePath));
    return {
      exists: true,
      sizeBytes: stat.size,
      sha256: hash.digest("hex"),
    };
  } catch (error: any) {
    return {
      exists: false,
      error: error.message || String(error),
    };
  }
}

function withArtifactIntegrity(files: TestAgentArtifactManifestItem[], manifestPath: string) {
  return files.map(item => ({
    ...item,
    integrity: fileIntegrity(item.path, { omitHash: path.resolve(item.path) === path.resolve(manifestPath) }),
  }));
}

function statusLine(label: string, status: string, detail = "") {
  return `- ${label}: ${status}${detail ? ` - ${detail}` : ""}`;
}

function commandLine(result: CommandRunResult) {
  const detail = result.error || `exit=${result.exitCode}; duration=${result.durationMs}ms`;
  return statusLine(`${result.project} command \`${result.command}\``, result.status, detail);
}

function httpLine(result: HttpCheckResult) {
  const detail = result.error || `status=${result.statusCode}; resources=${result.resourceChecks.length}${result.concurrency ? `; concurrentRequests=${result.concurrency.requested}; maxInFlight=${result.concurrency.maxInFlight}` : ""}${result.probeType ? `; probe=${result.probeType}` : ""}`;
  return statusLine(`${result.project} ${result.adversarial ? "adversarial " : ""}HTTP ${result.name || result.url}`, result.status, detail);
}

function browserLine(result: BrowserCheckResult) {
  const finalUrl = result.finalUrl && result.finalUrl !== result.url ? `; final=${result.finalUrl}` : "";
  const viewport = result.viewport ? `; viewport=${result.viewport.width}x${result.viewport.height}${result.viewport.isMobile ? "; mobile" : ""}` : "";
  const browserContext = result.contextOptions ? `; context=${browserContextOptionsSummary(result.contextOptions)}` : "";
  const source = browserSourceSummary(result.context);
  const artifacts = (result.browserArtifacts || []).length;
  const sessions = (result.browserSessions || []).length;
  const stability = Number(result.context?.stabilityRuns || 0) > 1
    ? `; stabilityRun=${result.context?.stabilityRun}/${result.context?.stabilityRuns}`
    : "";
  const authentication = result.authentication ? `; authentication=${formatBrowserAuthenticationEvidence(result.authentication)}` : "";
  const actionEffects = result.actionEffects || [];
  const failedActionEffects = actionEffects.filter(effect => effect.status !== "changed").length;
  const detail = result.error || `${result.url}${finalUrl}${viewport}${browserContext}${source ? `; source=${source}` : ""}; steps=${result.steps.length}; actionEffects=${actionEffects.length}; failedActionEffects=${failedActionEffects}; sessions=${sessions}; screenshots=${result.screenshots.length}; artifacts=${artifacts}${authentication}${stability}${result.probeType ? `; probe=${result.probeType}` : ""}`;
  return statusLine(`${result.project} ${result.adversarial ? "adversarial " : ""}browser ${result.name}`, result.status, detail);
}

function browserSourceSummary(context: BrowserCheckResult["context"]) {
  if (!context) return "";
  const generatedBy = String(context.generatedBy || context.source || "").trim();
  const criteria = Array.isArray(context.acceptanceCriteria) ? context.acceptanceCriteria.length : 0;
  return [generatedBy, criteria ? `criteria=${criteria}` : ""].filter(Boolean).join("; ");
}

function browserContextOptionsSummary(contextOptions: NonNullable<BrowserCheckResult["contextOptions"]>) {
  const parts = [
    contextOptions.locale ? `locale=${contextOptions.locale}` : "",
    contextOptions.timezoneId ? `timezone=${contextOptions.timezoneId}` : "",
    contextOptions.colorScheme ? `color=${contextOptions.colorScheme}` : "",
    contextOptions.reducedMotion ? `motion=${contextOptions.reducedMotion}` : "",
    contextOptions.permissions?.length ? `permissions=${contextOptions.permissions.join(",")}` : "",
    contextOptions.geolocation ? `geo=${contextOptions.geolocation.latitude},${contextOptions.geolocation.longitude}` : "",
  ].filter(Boolean);
  return parts.join("; ") || "default";
}

function browserNetworkSummaryLine(item: TestAgentReport["browserNetworkSummary"][number]) {
  const failedUrls = item.failedUrls.length ? `; failed=${item.failedUrls.slice(0, 3).join(", ")}` : "";
  const detail = `requests=${item.requestCount}; responses=${item.responseCount}; errors=${item.errorCount}; failedResponses=${item.failedResponseCount}${failedUrls}${item.networkLogPath ? `; log=${item.networkLogPath}` : ""}`;
  return statusLine(`${item.project} browser network ${item.name}`, item.status, detail);
}

function typedCounts(counts: Record<string, number>) {
  const entries = Object.entries(counts || {});
  return entries.length ? entries.map(([key, value]) => `${key}:${value}`).join(", ") : "none";
}

function browserInteractionSummaryLine(item: TestAgentReport["browserInteractionSummary"][number]) {
  const failed = item.failedSteps.length ? `; failed=${item.failedSteps.slice(0, 3).map(step => `${step.name}${step.error ? `(${step.error})` : ""}`).join(", ")}` : "";
  const detail = `actions=${item.actionCount} passed=${item.passedActions} failed=${item.failedActions}; assertions=${item.assertionCount} passed=${item.passedAssertions} failed=${item.failedAssertions}; actionTypes=${typedCounts(item.actionTypes)}; assertionTypes=${typedCounts(item.assertionTypes)}${failed}`;
  return statusLine(`${item.project} browser interactions ${item.name}`, item.status, detail);
}

function browserFlowSummaryLines(report: TestAgentReport) {
  const summary = report.browserFlowSummary;
  if (!summary) return ["- none"];
  const lines = [`- ${formatBrowserFlowSummaryLine(summary)}; actions=${summary.actionCount}; assertions=${summary.assertionCount}; failedSteps=${summary.failedStepCount}`];
  for (const item of summary.items) {
    const counts = item.statusCounts;
    const detail = [
      `total=${item.total}`,
      `passed=${counts.passed}`,
      `failed=${counts.failed}`,
      `blocked=${counts.blocked}`,
      `skipped=${counts.skipped}`,
      `criteria=${item.criteriaCount}`,
      `projects=${item.projects.join(",") || "none"}`,
      `providers=${item.providers.join(",") || "none"}`,
      `actions=${item.actionCount}`,
      `assertions=${item.assertionCount}`,
      `failedSteps=${item.failedStepCount}`,
      item.failures[0] ? `firstFailure=${item.failures[0].project}/${item.failures[0].name}` : "",
    ].filter(Boolean).join("; ");
    lines.push(statusLine(item.flowType, counts.failed || counts.blocked ? "attention" : "passed", detail));
  }
  return lines;
}

function browserMultiSessionSummaryLines(report: TestAgentReport) {
  const summary = report.browserMultiSessionSummary;
  if (!summary) return ["- none"];
  const lines = [
    `- ${formatBrowserMultiSessionSummaryLine(summary)}; actions=${summary.actionCount}; assertions=${summary.assertionCount}; failedSteps=${summary.failedStepCount}; screenshots=${summary.screenshotCount}; consoleErrors=${summary.consoleErrorCount}; pageErrors=${summary.pageErrorCount}; networkErrors=${summary.networkErrorCount}`,
  ];
  for (const item of summary.items) {
    const detail = [
      `sessions=${item.sessionNames.join(",") || "none"}`,
      `parallelGroups=${item.parallelGroupCount}`,
      `comparisons=${item.comparisonCount}`,
      `failedComparisons=${item.failedComparisonCount}`,
      `actions=${item.actionCount}`,
      `assertions=${item.assertionCount}`,
      `failedSteps=${item.failedStepCount}`,
      `screenshots=${item.screenshotCount}`,
      `consoleErrors=${item.consoleErrorCount}`,
      `pageErrors=${item.pageErrorCount}`,
      `networkErrors=${item.networkErrorCount}`,
      item.failedSessionNames.length ? `failedSessions=${item.failedSessionNames.join(",")}` : "",
      item.failedSteps[0] ? `firstFailure=${item.failedSteps[0]}` : "",
    ].filter(Boolean).join("; ");
    lines.push(statusLine(`${item.project} / ${item.name}`, item.status, detail));
  }
  return lines;
}

function browserStabilitySummaryLines(report: TestAgentReport) {
  const summary = report.browserStabilitySummary;
  if (!summary) return ["- none"];
  const lines = [
    `- ${formatBrowserStabilitySummaryLine(summary)}; passedRuns=${summary.passedRunCount}; failedRuns=${summary.failedRunCount}; blockedRuns=${summary.blockedRunCount}; screenshots=${summary.screenshotCount}`,
  ];
  for (const item of summary.items) {
    const detail = [
      `runs=${item.runCount}/${item.expectedRuns}`,
      `passed=${item.statusCounts.passed}`,
      `failed=${item.statusCounts.failed}`,
      `blocked=${item.statusCounts.blocked}`,
      `skipped=${item.statusCounts.skipped}`,
      `failedRuns=${item.failedRuns.join(",") || "none"}`,
      `blockedRuns=${item.blockedRuns.join(",") || "none"}`,
      `durationMs=${item.durationMs}`,
      `screenshots=${item.screenshotCount}`,
      item.firstFailure ? `firstFailure=${item.firstFailure}` : "",
    ].filter(Boolean).join("; ");
    lines.push(statusLine(`${item.project} / ${item.name}`, item.status, detail));
  }
  return lines;
}

function browserCheckExecutionCoverageLines(report: TestAgentReport) {
  const summary = report.browserCheckExecutionCoverage;
  if (!summary) return ["- none"];
  const lines = [`- ${formatBrowserCheckExecutionCoverageLine(summary)}; syntheticBlocked=${summary.syntheticBlockedCount}`];
  for (const item of summary.items) {
    const detail = [
      `provider=${item.plannedProvider}`,
      `runs=${item.observedRuns.length}/${item.expectedRuns}`,
      `observed=${item.observedRuns.join(",") || "none"}`,
      `missing=${item.missingRuns.join(",") || "none"}`,
      `duplicate=${item.duplicateRuns.join(",") || "none"}`,
      `syntheticBlocked=${item.syntheticBlockedRuns.join(",") || "none"}`,
    ].join("; ");
    lines.push(statusLine(`${item.project} / ${item.name} [${item.checkId}]`, item.status, detail));
  }
  return lines;
}

function browserEvidenceTemporalIntegrityLines(report: TestAgentReport) {
  const summary = report.browserEvidenceTemporalIntegrity;
  if (!summary) return ["- none"];
  const lines = [`- ${formatBrowserEvidenceTemporalIntegrityLine(summary)}; toleranceMs=${summary.toleranceMs}`];
  for (const item of summary.items) {
    const execution = item.checkId ? `; execution=${item.checkId} run ${item.run}` : "";
    const detail = `startedAt=${item.startedAt}; finishedAt=${item.finishedAt}; durationMs=${item.durationMs}${execution}${item.errors.length ? `; errors=${item.errors.join(" | ")}` : ""}`;
    lines.push(statusLine(`${item.kind} / ${item.id}`, item.status, detail));
  }
  return lines;
}

function browserResourceLifecycleLines(report: TestAgentReport) {
  const summary = report.browserResourceLifecycleSummary;
  if (!summary) return ["- none"];
  const lines = [`- ${formatBrowserResourceLifecycleLine(summary)}`];
  for (const event of summary.events) {
    const detail = [
      `planId=${event.planId}`,
      `ownership=${event.ownership}`,
      `acquiredAt=${event.acquiredAt}`,
      event.releaseAttemptedAt ? `releaseAttemptedAt=${event.releaseAttemptedAt}` : "",
      event.releasedAt ? `releasedAt=${event.releasedAt}` : "",
      event.error ? `error=${event.error}` : "",
    ].filter(Boolean).join("; ");
    lines.push(statusLine(`${event.provider} ${event.resourceType} / ${event.scope} [${event.id}]`, event.status, detail));
  }
  return lines;
}

function browserToolEvidenceLineageLines(report: TestAgentReport) {
  const summary = report.browserToolEvidenceLineage;
  if (!summary) return ["- none"];
  const lines = [`- ${formatBrowserToolEvidenceLineageLine(summary)}; failedCalls=${summary.failedToolCallCount}`];
  for (const item of summary.items) {
    const detail = [
      `result=${item.resultStatus}`,
      `required=${item.evidenceRequired}`,
      `linkedCalls=${item.linkedToolCallCount}`,
      `failedCalls=${item.failedToolCallCount}`,
      `callIds=${item.toolCallIds.join(",") || "none"}`,
      `missing=${item.missingToolCallIds.join(",") || "none"}`,
      `foreign=${item.foreignToolCallIds.join(",") || "none"}`,
      `duplicate=${item.duplicateToolCallIds.join(",") || "none"}`,
    ].join("; ");
    lines.push(statusLine(`${item.project} / ${item.name} [${item.checkId} run ${item.run}]`, item.status, detail));
  }
  return lines;
}

function browserToolCallTimeoutLines(report: TestAgentReport) {
  const summary = report.browserToolCallTimeoutSummary;
  if (!summary) return ["- none"];
  return [
    `- ${formatBrowserToolCallTimeoutSummaryLine(summary)}`,
    ...summary.items.map(item => statusLine(
      `${item.toolName} [${item.id}]`,
      "timed_out",
      `timeoutMs=${item.timeoutMs}; durationMs=${item.durationMs}; abortRequested=${item.abortRequested}${item.checkId ? `; execution=${item.checkId} run ${item.run}` : ""}`,
    )),
  ];
}

function browserAuthenticationSummaryLines(report: TestAgentReport) {
  const summary = buildBrowserAuthenticationSummary(report.browserResults);
  return [
    `- ${formatBrowserAuthenticationSummaryLine(summary)}`,
    `- Credential environment names: ${summary.credentialEnvNames.join(", ") || "none"}`,
  ];
}

function browserRecoverySummaryLines(report: TestAgentReport) {
  const summary = report.browserRecoverySummary;
  if (!summary) return ["- none"];
  const lines = [`- ${formatBrowserRecoverySummaryLine(summary)}`];
  for (const item of summary.items) {
    const events = item.events.map(event =>
      `${event.provider}/${event.operation}:${event.trigger}:${event.status}`
    ).join(", ");
    lines.push(statusLine(
      `${item.project} / ${item.name}`,
      item.failed || item.notRetried ? "attention" : "recovered",
      `attempted=${item.attempted}; recovered=${item.recovered}; failed=${item.failed}; unsafeRetriesPrevented=${item.notRetried}${events ? `; events=${events}` : ""}`,
    ));
  }
  return lines;
}

function browserActionEffectSummaryLines(report: TestAgentReport) {
  const summary = report.browserActionEffectSummary;
  if (!summary) return ["- none"];
  const lines = [`- ${formatBrowserActionEffectSummaryLine(summary)}`];
  for (const item of summary.items) {
    const changedSignals = Object.entries(item.changedSignals)
      .filter(([, count]) => count > 0)
      .map(([signal, count]) => `${signal}:${count}`)
      .join(",") || "none";
    lines.push(statusLine(
      `${item.project} / ${item.name}`,
      item.failed ? "attention" : "passed",
      `actions=${item.actions}; changed=${item.changed}; failed=${item.failed}; unchanged=${item.unchanged}; unavailable=${item.unavailable}; crossSession=${item.crossSession}; detailSuppressed=${item.detailSuppressed}; changedSignals=${changedSignals}`,
    ));
  }
  return lines;
}

function adversarialEvidenceSummaryLines(report: TestAgentReport) {
  const summary = report.adversarialEvidenceSummary;
  const lines = [`- ${formatAdversarialEvidenceSummaryLine(summary)}`];
  for (const item of summary.items) {
    const linkage = [
      `relevance=${item.relevance}`,
      item.linkedCriteria.length ? `criteria=${item.linkedCriteria.join(" | ")}` : "",
      item.goalLinked ? "goalLinked=yes" : "",
      `score=${item.matchScore}`,
    ].filter(Boolean).join("; ");
    lines.push(statusLine(
      `${item.project} ${item.surface} ${item.name}`,
      item.status,
      `${item.target}${item.probeType ? `; probe=${item.probeType}` : ""}${item.provider ? `; provider=${item.provider}` : ""}; ${linkage}`,
    ));
  }
  return lines;
}

function browserProviderGapLine(item: BrowserProviderGapItem) {
  return statusLine(`${item.provider} ${item.category}`, "gap", formatBrowserProviderGapLine(item));
}

function browserProviderSummaryLines(report: TestAgentReport) {
  const summary = report.browserProviderSummary;
  if (!summary) return ["- none"];
  const lines = [`- ${formatBrowserProviderSummaryLine(summary)}`];
  for (const item of summary.items || []) {
    const detail = [
      `preferred=${item.preferred ? "yes" : "no"}`,
      `available=${item.available ? "yes" : "no"}`,
      `selected=${item.selected ? "yes" : "no"}`,
      `attempted=${item.attempted ? "yes" : "no"}`,
      `results=${item.resultCount}`,
      `passed=${item.passed}`,
      `failed=${item.failed}`,
      `blocked=${item.blocked}`,
      `skipped=${item.skipped}`,
      item.reason ? `reason=${item.reason}` : "",
      item.tools?.length ? `tools=${item.tools.length}` : "",
    ].filter(Boolean).join("; ");
    lines.push(statusLine(`${item.label || item.provider}`, item.provider, detail));
  }
  return lines;
}

function evidenceLine(item: EvidenceItem) {
  const target = item.path || item.detail || "";
  return statusLine(item.title, item.status, target);
}

function requiredCheckLine(item: TestAgentReport["requiredCheckCoverage"][number]) {
  const detail = item.evidence.length ? item.evidence.join("; ") : item.missingReason || "";
  return statusLine(item.check, item.status, detail);
}

function failureSummaryLine(item: TestAgentReport["failureSummary"][number]) {
  const evidence = item.evidence?.length ? `; evidence=${item.evidence.join("; ")}` : "";
  const diagnostics = item.diagnostics?.length ? `; diagnostics=${item.diagnostics.join(" | ")}` : "";
  const next = item.nextAction ? `; next=${item.nextAction}` : "";
  return statusLine(`${item.type}${item.project ? ` ${item.project}` : ""} ${item.title}`, item.status, `${item.reason}${evidence}${diagnostics}${next}`);
}

function fence(value: any, max = 4000) {
  const text = compactText(value ?? "", max).replace(/```/g, "`` `").trim();
  return text ? ["```text", text, "```"] : ["```text", "(empty)", "```"];
}

function section(title: string, lines: string[]) {
  return ["", `## ${title}`, "", ...lines];
}

function detailTitle(index: number, title: string) {
  return `### ${index + 1}. ${title}`;
}

function commandDetail(result: CommandRunResult, index: number) {
  return [
    detailTitle(index, `${result.project}: ${result.command}`),
    "",
    `- Status: ${result.status}`,
    `- CWD: ${result.cwd}`,
    `- Exit code: ${result.exitCode === null ? "(none)" : result.exitCode}`,
    `- Duration: ${result.durationMs}ms`,
    ...(result.error ? [`- Error: ${result.error}`] : []),
    "",
    "**Command run:**",
    ...fence(result.command, 1000),
    "",
    "**Output observed:**",
    ...fence(result.output || [result.stdout, result.stderr].filter(Boolean).join("\n"), 6000),
  ];
}

function devServerDetail(result: DevServerResult, index: number) {
  return [
    detailTitle(index, `${result.project}: ${result.command || "dev server readiness"}`),
    "",
    `- Status: ${result.status}`,
    `- CWD: ${result.cwd}`,
    `- URL: ${result.url || "(none)"}`,
    `- Started: ${result.startedAt}`,
    ...(result.readyAt ? [`- Ready: ${result.readyAt}`] : []),
    ...(result.error ? [`- Error: ${result.error}`] : []),
    "",
    "**Server output:**",
    ...fence(result.output || "", 3000),
  ];
}

function httpDetail(result: HttpCheckResult, index: number) {
  const resources = result.resourceChecks.length
    ? result.resourceChecks.map(item => `- ${item.status}: ${item.kind || "other"} ${item.statusCode ?? "(none)"} ${item.url}${item.finalUrl && item.finalUrl !== item.url ? ` -> ${item.finalUrl}` : ""}${item.contentType ? ` (${item.contentType})` : ""}${item.source ? `; source=${item.source}` : ""}${item.contentTypeMatched === false ? "; content-type mismatch" : ""}${item.error ? ` - ${item.error}` : ""}`)
    : ["- none"];
  const assertions = (result.assertions || []).length
    ? (result.assertions || []).map(item => `- ${item.status}: ${item.name}${item.detail ? ` - ${item.detail}` : ""}${item.error ? ` - ${item.error}` : ""}`)
    : ["- none"];
  const concurrency = result.concurrency;
  const concurrentRequests = concurrency
    ? concurrency.requests.map(request =>
      `- ${request.requestNumber}. ${request.status}: ${request.method} ${request.url}; status=${request.statusCode}; duration=${request.durationMs}ms; aggregateValues=${request.aggregateValues.length}${request.error ? `; error=${request.error}` : ""}`
    )
    : ["- none"];
  const concurrencyAssertions = concurrency?.aggregateAssertions.length
    ? concurrency.aggregateAssertions.map(item =>
      `- ${item.status}: ${item.name}${item.detail ? ` - ${item.detail}` : ""}${item.error ? ` - ${item.error}` : ""}`
    )
    : ["- none"];
  return [
    detailTitle(index, `${result.project}: ${result.name || result.url}`),
    "",
    `- Status: ${result.status}`,
    `- Adversarial: ${result.adversarial ? "yes" : "no"}`,
    ...(result.probeType ? [`- Probe type: ${result.probeType}`] : []),
    `- Method: ${result.method || "GET"}`,
    `- URL: ${result.url}`,
    `- HTTP status: ${result.statusCode === null ? "(none)" : result.statusCode}`,
    `- Content-Type: ${result.contentType || "(none)"}`,
    `- Duration: ${result.durationMs}ms`,
    ...(result.error ? [`- Error: ${result.error}`] : []),
    "",
    "**Assertions:**",
    ...assertions,
    "",
    "**Concurrency:**",
    ...(concurrency ? [
      `- Requested: ${concurrency.requested}`,
      `- Completed: ${concurrency.completed}`,
      `- Passed: ${concurrency.passed}`,
      `- Failed: ${concurrency.failed}`,
      `- Blocked: ${concurrency.blocked}`,
      `- Launch spread: ${concurrency.launchSpreadMs}ms`,
      `- Max in flight: ${concurrency.maxInFlight}`,
      `- Overlap observed: ${concurrency.overlapObserved ? "yes" : "no"}`,
    ] : ["- none"]),
    "",
    "**Concurrency aggregate assertions:**",
    ...concurrencyAssertions,
    "",
    "**Concurrent requests:**",
    ...concurrentRequests,
    "",
    "**Resource sample:**",
    ...resources,
    "",
    "**Response preview:**",
    ...fence(result.responsePreview || "", 3000),
  ];
}

function browserDetail(result: BrowserCheckResult, index: number) {
  const steps = result.steps.length
    ? result.steps.map((step, stepIndex) => `- ${stepIndex + 1}. ${step.kind} ${step.name}: ${step.status}${step.detail ? ` - ${step.detail}` : ""}${step.error ? ` - ${step.error}` : ""}`)
    : ["- none"];
  const browserArtifacts = result.browserArtifacts || [];
  const browserSessions = result.browserSessions || [];
  const actionEffects = result.actionEffects || [];
  return [
    detailTitle(index, `${result.project}: ${result.name}`),
    "",
    `- Status: ${result.status}`,
    `- Adversarial: ${result.adversarial ? "yes" : "no"}`,
    ...(result.probeType ? [`- Probe type: ${result.probeType}`] : []),
    ...(browserSourceSummary(result.context) ? [`- Source: ${browserSourceSummary(result.context)}`] : []),
    `- Provider: ${result.provider || "(unknown)"}`,
    `- URL: ${result.url}`,
    ...(result.finalUrl ? [`- Final URL: ${result.finalUrl}`] : []),
    ...(result.viewport ? [`- Viewport: ${result.viewport.width}x${result.viewport.height}${result.viewport.isMobile ? " mobile" : ""}${result.viewport.deviceScaleFactor ? ` @${result.viewport.deviceScaleFactor}x` : ""}`] : []),
    ...(result.contextOptions ? [`- Context: ${browserContextOptionsSummary(result.contextOptions)}`] : []),
    ...(result.authentication ? [`- Authentication: ${formatBrowserAuthenticationEvidence(result.authentication)}`] : []),
    ...(result.recovery ? [
      `- Recovery: attempted=${result.recovery.attempted}; recovered=${result.recovery.recovered}; failed=${result.recovery.failed}; unsafeRetriesPrevented=${result.recovery.notRetried}`,
    ] : []),
    ...(result.title ? [`- Title: ${result.title}`] : []),
    `- Duration: ${result.durationMs}ms`,
    ...(result.error ? [`- Error: ${result.error}`] : []),
    ...(result.context?.acceptanceCriteria ? [
      "",
      "**Acceptance source:**",
      ...(Array.isArray(result.context.acceptanceCriteria) && result.context.acceptanceCriteria.length
        ? result.context.acceptanceCriteria.map((criterion: string) => `- ${criterion}`)
        : ["- none"]),
    ] : []),
    "",
    "**Steps:**",
    ...steps,
    "",
    "**Action effects:**",
    ...(actionEffects.length ? actionEffects.map(effect => `- ${[
      `actionIndex=${effect.actionIndex}`,
      effect.session ? `session=${effect.session}` : "",
      effect.effectSession ? `effectSession=${effect.effectSession}` : "",
      `action=${effect.actionType}`,
      `status=${effect.status}`,
      `requested=${effect.requestedSignals.join(",") || "none"}`,
      `observed=${effect.observedSignals.join(",") || "none"}`,
      `changed=${effect.changedSignals.join(",") || "none"}`,
      `timeoutMs=${effect.timeoutMs}`,
      effect.detailSuppressed ? "detail=suppressed" : "",
    ].filter(Boolean).join("; ")}`) : ["- none"]),
    "",
    "**Browser sessions:**",
    ...(browserSessions.length ? browserSessions.flatMap(session => [
      `- ${session.name}: ${session.url}${session.finalUrl && session.finalUrl !== session.url ? ` -> ${session.finalUrl}` : ""}; screenshots=${session.screenshots.length}; consoleErrors=${session.consoleErrors.length}; pageErrors=${session.pageErrors.length}; networkErrors=${session.networkErrors.length}${session.authentication ? `; authentication=${formatBrowserAuthenticationEvidence(session.authentication)}` : ""}`,
      ...(session.consoleLogPath ? [`  - Console log: ${session.consoleLogPath}`] : []),
      ...(session.networkLogPath ? [`  - Network log: ${session.networkLogPath}`] : []),
      ...(session.pageTextPreview ? [`  - Text: ${compactText(session.pageTextPreview, 300)}`] : []),
    ]) : ["- none"]),
    "",
    "**Console errors:**",
    ...(result.consoleErrors.length ? result.consoleErrors.map(item => `- ${item}`) : ["- none"]),
    "",
    "**Console messages:**",
    ...((result.consoleMessages || []).length ? (result.consoleMessages || []).slice(0, 20).map(item => `- ${item}`) : ["- none"]),
    ...(result.consoleLogPath ? [`- Full log: ${result.consoleLogPath}`] : []),
    "",
    "**Browser dialogs:**",
    ...((result.dialogMessages || []).length ? (result.dialogMessages || []).slice(0, 20).map(item => `- ${item}`) : ["- none"]),
    ...(result.dialogLogPath ? [`- Full log: ${result.dialogLogPath}`] : []),
    "",
    "**Browser popups:**",
    ...((result.popupMessages || []).length ? (result.popupMessages || []).slice(0, 20).map(item => `- ${item}`) : ["- none"]),
    ...(result.popupLogPath ? [`- Full log: ${result.popupLogPath}`] : []),
    "",
    "**Page errors:**",
    ...(result.pageErrors.length ? result.pageErrors.map(item => `- ${item}`) : ["- none"]),
    "",
    "**Network errors:**",
    ...((result.networkErrors || []).length ? (result.networkErrors || []).map(item => `- ${item}`) : ["- none"]),
    "",
    "**Network requests:**",
    ...((result.networkRequests || []).length ? (result.networkRequests || []).slice(0, 30).map(item => `- ${item}`) : ["- none"]),
    ...(result.networkLogPath ? [`- Full log: ${result.networkLogPath}`] : []),
    "",
    "**Screenshots:**",
    ...(result.screenshots.length ? result.screenshots.map(item => `- ${item}`) : ["- none"]),
    "",
    "**Page snapshots:**",
    ...((result.pageSnapshots || []).length ? (result.pageSnapshots || []).map(item => `- ${item}`) : ["- none"]),
    "",
    "**Browser artifacts:**",
    ...(browserArtifacts.length ? browserArtifacts.map(item => `- ${item.type}: ${item.path}${item.mediaType ? ` (${item.mediaType})` : ""}${item.source ? ` - ${item.source}` : ""}`) : ["- none"]),
    "",
    "**Page text preview:**",
    ...fence(result.pageTextPreview || "", 2000),
  ];
}

function browserToolCallDetail(result: BrowserToolCallRecord, index: number) {
  const execution = result.browserExecution;
  return [
    detailTitle(index, result.toolName),
    "",
    `- Status: ${result.status}`,
    `- ID: ${result.id}`,
    ...(execution ? [`- Browser execution: ${execution.checkId} run ${execution.run}/${execution.expectedRuns}`] : []),
    `- Duration: ${result.durationMs}ms`,
    ...(result.timeoutMs ? [`- Timeout: ${result.timeoutMs}ms`] : []),
    ...(result.timedOut ? ["- Timed out: yes"] : []),
    ...(result.abortRequested ? ["- Abort requested: yes"] : []),
    `- Started: ${result.startedAt}`,
    `- Finished: ${result.finishedAt}`,
    ...(result.error ? [`- Error: ${result.error}`] : []),
    "",
    "**Input:**",
    ...fence(JSON.stringify(result.input, null, 2), 3000),
    "",
    "**Output preview:**",
    ...fence(result.outputPreview || "", 3000),
  ];
}

function browserProviderPreflightLines(report: TestAgentReport) {
  const preflight = Array.isArray(report.metadata?.browserProviderPreflight)
    ? report.metadata.browserProviderPreflight as any[]
    : [];
  if (!preflight.length) return ["- none"];
  return preflight.flatMap((item, index) => [
    detailTitle(index, `${item.label || item.provider}`),
    "",
    `- Provider: ${item.provider || "(unknown)"}`,
    `- Preferred: ${item.preferred ? "yes" : "no"}`,
    `- Available: ${item.available ? "yes" : "no"}`,
    ...(item.reason ? [`- Reason: ${item.reason}`] : []),
    ...(item.diagnostics ? [
      "- Diagnostics:",
      ...Object.entries(item.diagnostics).map(([key, value]) => `  - ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`),
    ] : []),
    "- Tools:",
    ...(Array.isArray(item.tools) && item.tools.length ? item.tools.map((tool: string) => `  - ${tool}`) : ["  - none"]),
    "",
  ]);
}

function uniqueManifestItems(items: TestAgentArtifactManifestItem[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.type}:${path.resolve(item.path)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function browserArtifactManifestType(artifact: BrowserEvidenceArtifact): TestAgentArtifactManifestItem["type"] {
  if (artifact.type === "trace") return "browser_trace";
  if (artifact.type === "har") return "browser_har";
  if (artifact.type === "video") return "browser_video";
  if (artifact.type === "accessibility_snapshot") return "browser_accessibility_snapshot";
  return "browser_artifact";
}

export function buildTestAgentArtifactManifest(report: TestAgentReport, manifestPath: string): TestAgentArtifactManifest {
  const files = withArtifactIntegrity(uniqueManifestItems([
    {
      type: "report_json",
      title: "TestAgent JSON report",
      path: String((report.metadata.artifactFiles as any)?.reportJsonPath || path.join(report.artifactDir, "report.json")),
      status: report.status,
      source: "writeTestAgentArtifacts",
    },
    {
      type: "report_markdown",
      title: "TestAgent Markdown report",
      path: String((report.metadata.artifactFiles as any)?.reportMarkdownPath || path.join(report.artifactDir, "report.md")),
      status: report.status,
      source: "writeTestAgentArtifacts",
    },
    {
      type: "verdict_json",
      title: "TestAgent verdict JSON",
      path: String((report.metadata.artifactFiles as any)?.verdictJsonPath || path.join(report.artifactDir, "verdict.json")),
      status: report.status,
      source: "writeTestAgentArtifacts",
    },
    {
      type: "artifact_manifest",
      title: "TestAgent artifact manifest",
      path: manifestPath,
      status: report.status,
      source: "writeTestAgentArtifacts",
    },
    ...report.browserResults.flatMap(result => result.screenshots.map(screenshot => ({
      type: "screenshot" as const,
      title: `Screenshot: ${result.name}`,
      path: screenshot,
      project: result.project,
      status: result.status,
      source: "browserResults",
    }))),
    ...report.browserResults.flatMap(result => (result.pageSnapshots || []).map(snapshot => ({
      type: "browser_snapshot" as const,
      title: `Page snapshot: ${result.name}`,
      path: snapshot,
      project: result.project,
      status: result.status,
      source: "browserResults",
    }))),
    ...report.browserResults.flatMap(result => result.consoleLogPath ? [{
      type: "browser_console_log" as const,
      title: `Console log: ${result.name}`,
      path: result.consoleLogPath,
      project: result.project,
      status: result.status,
      source: "browserResults",
    }] : []),
    ...report.browserResults.flatMap(result => result.dialogLogPath ? [{
      type: "browser_dialog_log" as const,
      title: `Dialog log: ${result.name}`,
      path: result.dialogLogPath,
      project: result.project,
      status: result.status,
      source: "browserResults",
    }] : []),
    ...report.browserResults.flatMap(result => result.popupLogPath ? [{
      type: "browser_popup_log" as const,
      title: `Popup log: ${result.name}`,
      path: result.popupLogPath,
      project: result.project,
      status: result.status,
      source: "browserResults",
    }] : []),
    ...report.browserResults.flatMap(result => result.networkLogPath ? [{
      type: "browser_network_log" as const,
      title: `Network log: ${result.name}`,
      path: result.networkLogPath,
      project: result.project,
      status: result.status,
      source: "browserResults",
    }] : []),
    ...report.browserResults.flatMap(result => (result.browserArtifacts || []).map(artifact => ({
      type: browserArtifactManifestType(artifact),
      title: `Browser ${artifact.type}: ${result.name}`,
      path: artifact.path,
      project: result.project,
      status: result.status,
      source: artifact.source || "browserResults",
    }))),
    ...(typeof report.metadata.browserToolTranscriptPath === "string" && report.metadata.browserToolTranscriptPath
      ? [{
        type: "browser_tool_transcript" as const,
        title: "Browser MCP tool call transcript",
        path: report.metadata.browserToolTranscriptPath,
        status: report.browserToolCalls.some(item => item.status === "failed") ? "failed" : "passed",
        source: "browserToolCalls",
      }]
      : []),
    ...report.evidence
      .filter(item => item.type === "artifact" && item.path)
      .map(item => ({
        type: "evidence_artifact" as const,
        title: item.title,
        path: item.path!,
        project: item.project,
        status: item.status,
        source: "evidence",
      })),
  ]), manifestPath);

  return {
    schema: "ccm-test-agent-artifact-manifest-v1",
    reportId: report.id,
    workOrderId: report.workOrderId,
    taskId: report.taskId,
    groupId: report.groupId,
    originalUserGoal: report.originalUserGoal,
    acceptanceCriteria: report.acceptanceCriteria,
    status: report.status,
    artifactDir: report.artifactDir,
    generatedAt: nowIso(),
    summary: {
      reports: files.filter(item => item.type === "report_json" || item.type === "report_markdown").length,
      screenshots: files.filter(item => item.type === "screenshot").length,
      browserSnapshots: files.filter(item => item.type === "browser_snapshot").length,
      browserAccessibilitySnapshots: files.filter(item => item.type === "browser_accessibility_snapshot").length,
      browserConsoleLogs: files.filter(item => item.type === "browser_console_log").length,
      browserPopupLogs: files.filter(item => item.type === "browser_popup_log").length,
      browserNetworkLogs: files.filter(item => item.type === "browser_network_log").length,
      browserToolTranscripts: files.filter(item => item.type === "browser_tool_transcript").length,
      browserTraces: files.filter(item => item.type === "browser_trace").length,
      browserHars: files.filter(item => item.type === "browser_har").length,
      browserVideos: files.filter(item => item.type === "browser_video").length,
      browserArtifacts: files.filter(item => item.type === "browser_artifact").length,
      evidenceArtifacts: files.filter(item => item.type === "evidence_artifact").length,
      integrityVerified: files.filter(item => item.integrity?.exists).length,
      integrityMissing: files.filter(item => !item.integrity?.exists).length,
    },
    files,
  };
}

export function buildTestAgentMarkdownReport(report: TestAgentReport) {
  const requiredCheckSummary = buildRequiredCheckSummary(report.requiredCheckCoverage, { evidenceLimit: 1, textLimit: 260 });
  const acceptanceSummary = buildAcceptanceSummary(report.acceptanceCoverage, { evidenceLimit: 1, textLimit: 260 });
  const lines = [
    `# TestAgent Report`,
    "",
    `- Status: ${report.status}`,
    `- Recommendation: ${report.recommendation}`,
    `- Work order: ${report.workOrderId}`,
    `- Task: ${report.taskId || "(none)"}`,
    `- Group: ${report.groupId || "(none)"}`,
    `- Original goal: ${report.originalUserGoal || "(none)"}`,
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Duration: ${report.durationMs}ms`,
    "",
    "## Summary",
    "",
    report.summary,
    "",
    "## Acceptance Criteria",
    "",
    ...(report.acceptanceCriteria.length ? report.acceptanceCriteria.map(criterion => `- ${criterion}`) : ["- none"]),
    "",
    "## Commands",
    "",
    ...(report.commandResults.length ? report.commandResults.map(commandLine) : ["- none"]),
    "",
    "## HTTP",
    "",
    ...(report.httpResults.length ? report.httpResults.map(httpLine) : ["- none"]),
    "",
    "## HTTP Concurrency Summary",
    "",
    `- ${formatHttpConcurrencySummaryLine(report.httpConcurrencySummary)}`,
    ...((report.httpConcurrencySummary?.items || []).map(item => statusLine(
      `${item.project} / ${item.name}`,
      item.status,
      `requested=${item.requested}; completed=${item.completed}; passed=${item.passed}; failed=${item.failed}; blocked=${item.blocked}; maxInFlight=${item.maxInFlight}; aggregatePassed=${item.aggregatePassed}; aggregateFailed=${item.aggregateFailed}; aggregateSkipped=${item.aggregateSkipped}`,
    ))),
    "",
    "## HTTP Page Resource Summary",
    "",
    `- ${formatHttpPageResourceSummary(report.httpResults)}`,
    "",
    "## Adversarial Evidence Summary",
    "",
    ...adversarialEvidenceSummaryLines(report),
    "",
    "## Browser",
    "",
    ...(report.browserResults.length ? report.browserResults.map(browserLine) : ["- none"]),
    "",
    "## Browser Network Summary",
    "",
    ...((report.browserNetworkSummary || []).length ? (report.browserNetworkSummary || []).map(browserNetworkSummaryLine) : ["- none"]),
    "",
    "## Browser Authentication Summary",
    "",
    ...browserAuthenticationSummaryLines(report),
    "",
    "## Browser Recovery Summary",
    "",
    ...browserRecoverySummaryLines(report),
    "",
    "## Browser Action Effect Summary",
    "",
    ...browserActionEffectSummaryLines(report),
    "",
    "## Browser Interaction Summary",
    "",
    ...((report.browserInteractionSummary || []).length ? (report.browserInteractionSummary || []).map(browserInteractionSummaryLine) : ["- none"]),
    "",
    "## Browser Multi-Session Summary",
    "",
    ...browserMultiSessionSummaryLines(report),
    "",
    "## Browser Stability Summary",
    "",
    ...browserStabilitySummaryLines(report),
    "",
    "## Browser Check Execution Coverage",
    "",
    ...browserCheckExecutionCoverageLines(report),
    "",
    "## Browser Evidence Temporal Integrity",
    "",
    ...browserEvidenceTemporalIntegrityLines(report),
    "",
    "## Browser Resource Lifecycle",
    "",
    ...browserResourceLifecycleLines(report),
    "",
    "## Browser Tool Evidence Lineage",
    "",
    ...browserToolEvidenceLineageLines(report),
    "",
    "## Browser Tool Call Timeouts",
    "",
    ...browserToolCallTimeoutLines(report),
    "",
    "## Browser Acceptance Flow Summary",
    "",
    ...browserFlowSummaryLines(report),
    "",
    "## Browser Provider Summary",
    "",
    ...browserProviderSummaryLines(report),
    "",
    "## Browser Provider Gaps",
    "",
    ...((report.browserProviderGaps || []).length ? (report.browserProviderGaps || []).map(browserProviderGapLine) : ["- none"]),
    "",
    "## Failure Summary",
    "",
    ...((report.failureSummary || []).length ? (report.failureSummary || []).map(failureSummaryLine) : ["- none"]),
    "",
    "## Required Check Summary",
    "",
    ...formatRequiredCheckMarkdownSummaryLines(requiredCheckSummary),
    "",
    "## Required Check Coverage",
    "",
    ...(report.requiredCheckCoverage.length ? report.requiredCheckCoverage.map(requiredCheckLine) : ["- none"]),
    "",
    "## Acceptance Summary",
    "",
    ...formatAcceptanceMarkdownSummaryLines(acceptanceSummary),
    "",
    "## Required Acceptance Evidence Gate",
    "",
    `- ${formatAcceptanceEvidenceGateSummaryLine(report.acceptanceEvidenceGateSummary)}`,
    ...(report.acceptanceEvidenceGateSummary.failedCriteria.length
      ? report.acceptanceEvidenceGateSummary.failedCriteria.map(criterion => `- Failed criterion: ${criterion}`)
      : []),
    ...(report.acceptanceEvidenceGateSummary.incompleteCriteria.length
      ? report.acceptanceEvidenceGateSummary.incompleteCriteria.map(criterion => `- Missing matched evidence: ${criterion}`)
      : []),
    ...(report.acceptanceEvidenceGateSummary.weakCriteria.length
      ? report.acceptanceEvidenceGateSummary.weakCriteria.map(criterion => `- Fallback-only evidence: ${criterion}`)
      : []),
    "",
    "## Acceptance Coverage",
    "",
    ...(report.acceptanceCoverage.length
      ? report.acceptanceCoverage.map(item => statusLine(item.criterion, item.status, item.evidence.join("; ")))
      : ["- none"]),
    "",
    "## Risks",
    "",
    ...(report.risks.length ? report.risks.map(risk => `- ${risk}`) : ["- none"]),
    "",
    "## Blocked Reasons",
    "",
    ...(report.blockedReasons.length ? report.blockedReasons.map(reason => `- ${reason}`) : ["- none"]),
    "",
    "## Evidence",
    "",
    ...(report.evidence.length ? report.evidence.map(evidenceLine) : ["- none"]),
    ...section("Dev Server Details", report.devServerResults.length ? report.devServerResults.flatMap(devServerDetail) : ["- none"]),
    ...section("Command Details", report.commandResults.length ? report.commandResults.flatMap(commandDetail) : ["- none"]),
    ...section("HTTP Details", report.httpResults.length ? report.httpResults.flatMap(httpDetail) : ["- none"]),
    ...section("Browser Details", report.browserResults.length ? report.browserResults.flatMap(browserDetail) : ["- none"]),
    ...section("Browser Provider Preflight", browserProviderPreflightLines(report)),
    ...section("Browser Tool Calls", report.browserToolCalls.length ? report.browserToolCalls.flatMap(browserToolCallDetail) : ["- none"]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export function writeTestAgentArtifacts(report: TestAgentReport): TestAgentReport {
  const artifactDir = ensureDir(report.artifactDir);
  const reportJsonPath = path.join(artifactDir, "report.json");
  const reportMarkdownPath = path.join(artifactDir, "report.md");
  const verdictJsonPath = path.join(artifactDir, "verdict.json");
  const manifestPath = path.join(artifactDir, "artifact-manifest.json");
  const artifactEvidence: EvidenceItem[] = [
    {
      type: "artifact",
      title: "TestAgent JSON report",
      status: report.status,
      path: reportJsonPath,
    },
    {
      type: "artifact",
      title: "TestAgent Markdown report",
      status: report.status,
      path: reportMarkdownPath,
    },
    {
      type: "artifact",
      title: "TestAgent verdict JSON",
      status: report.status,
      path: verdictJsonPath,
    },
    {
      type: "artifact",
      title: "TestAgent artifact manifest",
      status: report.status,
      path: manifestPath,
    },
  ];
  const augmented: TestAgentReport = {
    ...report,
    evidence: [...report.evidence, ...artifactEvidence],
    metadata: {
      ...report.metadata,
      artifactFiles: {
        reportJsonPath,
        reportMarkdownPath,
        verdictJsonPath,
        manifestPath,
      },
    },
  };
  const verdict = buildTestAgentVerdict(augmented);
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(augmented, null, 2)}\n`, "utf-8");
  fs.writeFileSync(reportMarkdownPath, buildTestAgentMarkdownReport(augmented), "utf-8");
  fs.writeFileSync(verdictJsonPath, `${JSON.stringify(verdict, null, 2)}\n`, "utf-8");
  let manifest = buildTestAgentArtifactManifest(augmented, manifestPath);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  manifest = buildTestAgentArtifactManifest(augmented, manifestPath);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  return augmented;
}

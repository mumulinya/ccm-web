import * as fs from "fs";
import { runTestAgent } from "./agent";
import { TestAgentArtifactVerification, verifyTestAgentArtifactManifest } from "./artifact-verifier";
import { cliOverrides, parseTestAgentCliArgs, testAgentCliUsage } from "./cli-options";
import { TestAgentWorkOrderContractValidation, validateTestAgentHandoffContract, validateTestAgentWorkOrderContract } from "./contract";
import { buildTestAgentExecutionPlan, TestAgentExecutionPlan } from "./execution-plan";
import { formatBrowserProviderGapLine, formatBrowserProviderPlanWarningLine } from "./browser/provider-gaps";
import { formatBrowserProviderSummaryLine } from "./browser/provider-summary";
import { formatBrowserFlowAttentionLines, formatBrowserFlowSummaryLine } from "./browser/flow-summary";
import { formatBrowserMultiSessionAttentionLines, formatBrowserMultiSessionSummaryLine } from "./browser/multi-session-summary";
import { formatBrowserStabilityAttentionLines, formatBrowserStabilitySummaryLine } from "./browser/stability-summary";
import {
  formatBrowserCheckExecutionCoverageAttentionLines,
  formatBrowserCheckExecutionCoverageLine,
} from "./browser/check-execution-coverage";
import { buildBrowserAuthenticationSummary, formatBrowserAuthenticationSummaryLine } from "./browser/authentication-summary";
import { formatBrowserRecoverySummaryLine } from "./browser/recovery-summary";
import { formatBrowserActionEffectSummaryLine } from "./browser/action-effect-summary";
import { formatAdversarialEvidenceSummaryLine } from "./adversarial-summary";
import { formatAcceptanceEvidenceGateSummaryLine } from "./acceptance-gate";
import { formatHttpConcurrencySummaryLine } from "./http-concurrency";
import { formatHttpPageResourceSummary } from "./http-page-resources";
import {
  buildAcceptanceSummary,
  formatAcceptanceAttentionLines,
  formatAcceptanceEvidenceSourceCounts,
  formatAcceptanceMatchStrengthCounts,
  formatAcceptanceStatusCounts,
  formatAcceptanceVerifiedEvidenceLines,
} from "./acceptance-summary";
import { buildRequiredCheckSummary, formatRequiredCheckAttentionLines, formatRequiredCheckStatusCounts, formatRequiredCheckVerifiedEvidenceLines } from "./required-check-summary";
import { formatTestAgentSelfTestMatrixSummary, runTestAgentSelfTestMatrix, TestAgentSelfTestMatrixOptions, TestAgentSelfTestMatrixReport } from "./self-test-matrix";
import { TestAgentArtifactManifest, TestAgentReport, TestAgentRuntimeOptions, TestAgentWorkOrder } from "./types";

interface TestAgentCliWriter {
  write(message: string): unknown;
}

export interface TestAgentCliIo {
  stdout?: TestAgentCliWriter;
  stderr?: TestAgentCliWriter;
  readFile?: (file: string) => string;
  runAgent?: (input: TestAgentWorkOrder, options: TestAgentRuntimeOptions) => Promise<TestAgentReport>;
  runSelfTestMatrix?: (options: TestAgentSelfTestMatrixOptions) => Promise<TestAgentSelfTestMatrixReport>;
}

interface ParsedJsonFile {
  input: any;
  error: string;
  ok: boolean;
}

function exitCodeForReport(report: TestAgentReport) {
  if (report.status === "passed") return 0;
  if (report.status === "failed") return 1;
  return 2;
}

function statusCounts(items: Array<{ status: string }>) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.status, (counts.get(item.status) || 0) + 1);
  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${status}:${count}`)
    .join(", ") || "none";
}

function formatIssues(label: string, issues: Array<{ code: string; message: string; path?: string; project?: string }>, limit = 5) {
  if (!issues.length) return [`${label}: 0`];
  const lines = [`${label}: ${issues.length}`];
  for (const issue of issues.slice(0, limit)) {
    const location = issue.path || issue.project || "";
    lines.push(`- ${issue.code}${location ? ` (${location})` : ""}: ${issue.message}`);
  }
  if (issues.length > limit) lines.push(`- ... ${issues.length - limit} more`);
  return lines;
}

export function formatTestAgentCliValidationSummary(validation: TestAgentWorkOrderContractValidation) {
  const lines = [
    `TestAgent work order: ${validation.valid ? "valid" : "invalid"}`,
    ...formatIssues("Errors", validation.errors),
    ...formatIssues("Warnings", validation.warnings),
  ];
  if (validation.normalized) {
    lines.push(`Work order: ${validation.normalized.id}`);
    lines.push(`Projects: ${validation.normalized.projects.map(project => project.name).join(", ") || "none"}`);
    lines.push(`Browser provider: ${validation.normalized.options.browserProvider}`);
    lines.push(`Adversarial gate: required=${validation.normalized.options.requireAdversarialProbe ? "yes" : "no"}${validation.normalized.options.adversarialProbeWaiver ? ` waiver=${validation.normalized.options.adversarialProbeWaiver}` : ""}`);
    lines.push(`Artifact dir: ${validation.normalized.options.artifactDir}`);
  }
  return `${lines.join("\n")}\n`;
}

export function formatTestAgentCliReportSummary(report: TestAgentReport) {
  const requiredCheckSummary = buildRequiredCheckSummary(report.requiredCheckCoverage, { evidenceLimit: 1, textLimit: 220 });
  const acceptanceSummary = buildAcceptanceSummary(report.acceptanceCoverage, { evidenceLimit: 1, textLimit: 220 });
  const networkErrors = (report.browserNetworkSummary || []).reduce((sum, item) => sum + Number(item.errorCount || 0), 0);
  const failedNetworkUrls = (report.browserNetworkSummary || []).flatMap(item => item.failedUrls || []).slice(0, 3);
  const browserProviderGaps = report.browserProviderGaps || [];
  const lines = [
    `TestAgent report: ${report.status} (${report.recommendation})`,
    `Summary: ${report.summary}`,
    `Work order: ${report.workOrderId}`,
    `Original goal: ${report.originalUserGoal || "(none)"}`,
    `Acceptance criteria: ${report.acceptanceCriteria.length}`,
    `Acceptance evidence gate: ${formatAcceptanceEvidenceGateSummaryLine(report.acceptanceEvidenceGateSummary)}`,
    `Commands: ${statusCounts(report.commandResults)}`,
    `HTTP checks: ${statusCounts(report.httpResults)}`,
    `HTTP page resources: ${formatHttpPageResourceSummary(report.httpResults)}`,
    `HTTP concurrency: ${formatHttpConcurrencySummaryLine(report.httpConcurrencySummary)}`,
    `Adversarial evidence: ${formatAdversarialEvidenceSummaryLine(report.adversarialEvidenceSummary)}`,
    `Browser checks: ${statusCounts(report.browserResults)}`,
    `Browser execution coverage: ${formatBrowserCheckExecutionCoverageLine(report.browserCheckExecutionCoverage)}`,
    ...formatBrowserCheckExecutionCoverageAttentionLines(report.browserCheckExecutionCoverage, 5),
    `Browser multi-session: ${formatBrowserMultiSessionSummaryLine(report.browserMultiSessionSummary)}`,
    ...formatBrowserMultiSessionAttentionLines(report.browserMultiSessionSummary, 5),
    `Browser stability: ${formatBrowserStabilitySummaryLine(report.browserStabilitySummary)}`,
    ...formatBrowserStabilityAttentionLines(report.browserStabilitySummary, 5),
    `Browser authentication: ${formatBrowserAuthenticationSummaryLine(buildBrowserAuthenticationSummary(report.browserResults))}`,
    `Browser recovery: ${formatBrowserRecoverySummaryLine(report.browserRecoverySummary)}`,
    `Browser action effects: ${formatBrowserActionEffectSummaryLine(report.browserActionEffectSummary)}`,
    `Browser acceptance flows: ${formatBrowserFlowSummaryLine(report.browserFlowSummary)}`,
    ...formatBrowserFlowAttentionLines(report.browserFlowSummary, 5),
    `Browser network: errors:${networkErrors}${failedNetworkUrls.length ? ` failed:${failedNetworkUrls.join(", ")}` : ""}`,
    `Browser providers: ${formatBrowserProviderSummaryLine(report.browserProviderSummary)}`,
    `Browser provider gaps: ${browserProviderGaps.length}`,
    ...browserProviderGaps.slice(0, 5).map(item => `- ${formatBrowserProviderGapLine(item)}`),
    `Required checks: ${formatRequiredCheckStatusCounts(requiredCheckSummary)}`,
    ...formatRequiredCheckAttentionLines(requiredCheckSummary, 5),
    ...formatRequiredCheckVerifiedEvidenceLines(requiredCheckSummary, 3),
    `Acceptance coverage: ${formatAcceptanceStatusCounts(acceptanceSummary)}`,
    `Acceptance match strength: ${formatAcceptanceMatchStrengthCounts(acceptanceSummary)}`,
    `Acceptance evidence source: ${formatAcceptanceEvidenceSourceCounts(acceptanceSummary)}`,
    ...formatAcceptanceAttentionLines(acceptanceSummary, 5),
    ...formatAcceptanceVerifiedEvidenceLines(acceptanceSummary, 3),
    `Artifacts: ${report.artifactDir}`,
  ];
  if (report.risks.length) lines.push(`Risks: ${report.risks.slice(0, 5).join("; ")}`);
  if (report.blockedReasons.length) lines.push(`Blocked: ${report.blockedReasons.slice(0, 5).join("; ")}`);
  if (report.issues.length) lines.push(...formatIssues("Issues", report.issues));
  return `${lines.join("\n")}\n`;
}

export function formatTestAgentCliArtifactVerificationSummary(verification: TestAgentArtifactVerification) {
  const lines = [
    `TestAgent artifact verification: ${verification.status}`,
    `Manifest: ${verification.manifestPath || "(inline)"}`,
    `Files: total=${verification.summary.total}, passed=${verification.summary.passed}, failed=${verification.summary.failed}, skipped=${verification.summary.skipped}`,
  ];
  for (const item of verification.items.filter(item => item.status === "failed").slice(0, 8)) {
    lines.push(`- ${item.type} ${item.path}: ${item.error || "failed"}`);
  }
  return `${lines.join("\n")}\n`;
}

export function formatTestAgentCliExecutionPlanSummary(plan: TestAgentExecutionPlan) {
  const lines = [
    `TestAgent execution plan: ${plan.valid ? "valid" : "invalid"}`,
    `Work order: ${plan.workOrderId}`,
    `Projects: ${plan.projects.map(project => project.name).join(", ") || "none"}`,
    `Commands: ${plan.summary.commands} (auto-discovered ${plan.summary.autoDiscoveredCommands})`,
    `Dev servers: ${plan.summary.devServers}`,
    `HTTP checks: ${plan.summary.httpChecks} (adversarial ${plan.summary.adversarialHttpChecks})`,
    `HTTP concurrency plan: checks:${plan.summary.httpConcurrencyChecks} requests:${plan.summary.httpConcurrentRequests}`,
    `Adversarial gate: required=${plan.summary.adversarialProbeRequired ? "yes" : "no"} waived=${plan.summary.adversarialProbeWaived ? "yes" : "no"} configured=${plan.summary.adversarialProbeCount} linked=${plan.summary.adversarialLinkedProbeCount} unlinked=${plan.summary.adversarialUnlinkedProbeCount}${plan.summary.adversarialProbeWaiverReason ? ` waiver=${plan.summary.adversarialProbeWaiverReason}` : ""}`,
    `Browser checks: ${plan.summary.browserChecks} (auto ${plan.summary.autoBrowserChecks}, adversarial ${plan.summary.adversarialBrowserChecks})`,
    `Browser provider routing plan: playwright:${plan.summary.browserPlannedPlaywrightChecks} mcp:${plan.summary.browserPlannedMcpChecks} capabilityFallback:${plan.summary.browserCapabilityRoutedChecks} existingSession:${plan.summary.browserExistingSessionRoutedChecks}`,
    ...plan.projects.flatMap(project => project.browserChecks.map(check =>
      `- Browser route: ${project.name} / ${check.name} -> ${check.plannedProvider} (${check.providerRoutingReason})`
    )).slice(0, 8),
    `Browser multi-session plan: sessions:${plan.summary.browserSessions} steps:${plan.summary.browserSessionSteps} parallelGroups:${plan.summary.browserParallelGroups} comparisons:${plan.summary.browserSessionComparisons}`,
    `Browser stability plan: checks:${plan.summary.browserStabilityChecks} runs:${plan.summary.browserStabilityRuns}`,
    `Browser authentication plan: checks:${plan.summary.browserAuthenticationChecks} managed:${plan.summary.browserManagedAuthenticationChecks} existingSession:${plan.summary.browserExistingSessionChecks} sessionRecovery:${plan.summary.browserSessionRecoveryChecks} minimal:${plan.summary.browserExistingSessionMinimalEvidenceChecks} full:${plan.summary.browserExistingSessionFullEvidenceChecks} existingProviders:${plan.summary.browserExistingSessionProviders.join(",") || "none"} credentialEnvNames:${plan.summary.browserCredentialEnvBindings} storageStates:${plan.summary.browserStorageStateFiles} artifactSuppressions:${plan.summary.browserSensitiveArtifactSuppressions}`,
    `Browser action effect plan: checks:${plan.summary.browserActionEffectChecks} actions:${plan.summary.browserActionEffectActions} crossSession:${plan.summary.browserCrossSessionActionEffectActions}`,
    `Browser provider: ${plan.browserProvider}`,
    `Browser provider warnings: ${plan.browserProviderWarnings?.length || 0}`,
    ...(plan.browserProviderWarnings || []).slice(0, 5).map(item => `- ${formatBrowserProviderPlanWarningLine(item)}`),
    `Expected artifacts: ${plan.summary.expectedArtifactTypes.join(", ") || "none"}`,
    `Artifact dir: ${plan.artifactDir}`,
    ...formatIssues("Issues", plan.issues),
  ];
  return `${lines.join("\n")}\n`;
}

function parseWorkOrderJson(file: string, readFile: (file: string) => string, label = "work order"): ParsedJsonFile {
  let text = "";
  try {
    text = readFile(file);
  } catch (error: any) {
    return {
      input: null,
      error: `Unable to read ${label} file "${file}": ${error?.message || String(error)}`,
      ok: false,
    };
  }
  try {
    return { input: JSON.parse(text), error: "", ok: true };
  } catch (error: any) {
    return {
      input: null,
      error: `Invalid JSON in ${label} file "${file}": ${error?.message || String(error)}`,
      ok: false,
    };
  }
}

function isJsonObject(input: any) {
  return !!input && typeof input === "object" && !Array.isArray(input);
}

function invalidJsonRootMessage(label: string, file: string) {
  return `Invalid ${label} file "${file}": root value must be a JSON object.`;
}

export async function runTestAgentCli(args = process.argv.slice(2), io: TestAgentCliIo = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  const readFile = io.readFile || ((file: string) => fs.readFileSync(file, "utf-8"));
  const runAgent = io.runAgent || runTestAgent;
  const runSelfTestMatrix = io.runSelfTestMatrix || runTestAgentSelfTestMatrix;
  const parsed = parseTestAgentCliArgs(args);
  const { options, errors } = parsed;

  if (options.help) {
    stdout.write(`${testAgentCliUsage()}\n`);
    return { exitCode: 0 };
  }

  if (errors.length) {
    stderr.write(`${testAgentCliUsage()}\n\n${errors.map(error => `Error: ${error}`).join("\n")}\n`);
    return { exitCode: 2 };
  }

  if (options.selfTestMatrix) {
    const report = await runSelfTestMatrix({
      ...(options.selfTestModulePath ? { selfTestModulePath: options.selfTestModulePath } : {}),
      ...(options.selfTestNames.length ? { names: options.selfTestNames } : {}),
      ...(options.selfTestPattern ? { pattern: options.selfTestPattern } : {}),
      ...(options.selfTestTimeoutMs ? { timeoutMs: options.selfTestTimeoutMs } : {}),
      ...(options.selfTestStopOnFailure ? { stopOnFailure: true } : {}),
    });
    stdout.write(options.summary
      ? `${formatTestAgentSelfTestMatrixSummary(report)}\n`
      : `${JSON.stringify(report, null, 2)}\n`);
    return { exitCode: report.pass ? 0 : 1 };
  }

  if (options.verifyArtifactsPath) {
    const manifestJson = parseWorkOrderJson(options.verifyArtifactsPath, readFile, "artifact manifest");
    if (!manifestJson.ok) {
      stderr.write(`${manifestJson.error}\n`);
      return { exitCode: 2 };
    }
    if (!isJsonObject(manifestJson.input)) {
      stderr.write(`${invalidJsonRootMessage("artifact manifest", options.verifyArtifactsPath)}\n`);
      return { exitCode: 2 };
    }
    const manifest = manifestJson.input as TestAgentArtifactManifest;
    if (manifest?.schema !== "ccm-test-agent-artifact-manifest-v1" || !Array.isArray(manifest.files)) {
      stderr.write(`Invalid TestAgent artifact manifest: ${options.verifyArtifactsPath}\n`);
      return { exitCode: 2 };
    }
    const verification = verifyTestAgentArtifactManifest(manifest, options.verifyArtifactsPath);
    stdout.write(options.summary
      ? formatTestAgentCliArtifactVerificationSummary(verification)
      : `${JSON.stringify(verification, null, 2)}\n`);
    return { exitCode: verification.status === "passed" ? 0 : 1 };
  }

  const workOrderJson = parseWorkOrderJson(options.handoffPath || options.workOrderPath, readFile, options.handoffPath ? "handoff" : "work order");
  if (!workOrderJson.ok) {
    stderr.write(`${workOrderJson.error}\n`);
    return { exitCode: 2 };
  }
  const inputLabel = options.handoffPath ? "handoff" : "work order";
  const inputPath = options.handoffPath || options.workOrderPath;
  if (!isJsonObject(workOrderJson.input)) {
    stderr.write(`${invalidJsonRootMessage(inputLabel, inputPath)}\n`);
    return { exitCode: 2 };
  }

  const overrides = cliOverrides(options);
  let workOrderInput: TestAgentWorkOrder | null = null;
  let validation: TestAgentWorkOrderContractValidation;
  if (options.handoffPath) {
    const handoffValidation = validateTestAgentHandoffContract(workOrderJson.input, overrides);
    validation = handoffValidation;
    workOrderInput = handoffValidation.workOrder || null;
  } else {
    workOrderInput = workOrderJson.input as TestAgentWorkOrder;
    validation = validateTestAgentWorkOrderContract(workOrderInput, overrides);
  }
  if (!validation.valid) {
    stdout.write(options.summary
      ? formatTestAgentCliValidationSummary(validation)
      : `${JSON.stringify(validation, null, 2)}\n`);
    return { exitCode: 2 };
  }
  if (options.validateOnly) {
    stdout.write(options.summary
      ? formatTestAgentCliValidationSummary(validation)
      : `${JSON.stringify(validation, null, 2)}\n`);
    return { exitCode: 0 };
  }
  if (!workOrderInput) {
    stderr.write("Unable to build TestAgent work order from input.\n");
    return { exitCode: 2 };
  }
  if (options.planOnly) {
    const plan = buildTestAgentExecutionPlan(workOrderInput, overrides, validation);
    stdout.write(options.summary
      ? formatTestAgentCliExecutionPlanSummary(plan)
      : `${JSON.stringify(plan, null, 2)}\n`);
    return { exitCode: plan.valid ? 0 : 2 };
  }

  const report = await runAgent(workOrderInput, overrides);
  stdout.write(options.summary
    ? formatTestAgentCliReportSummary(report)
    : `${JSON.stringify(report, null, 2)}\n`);
  return { exitCode: exitCodeForReport(report) };
}

async function main() {
  const result = await runTestAgentCli();
  process.exit(result.exitCode);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error?.stack || error?.message || String(error));
    process.exit(2);
  });
}

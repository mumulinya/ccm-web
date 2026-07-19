// Behavior-freeze extraction from self-test-core.ts (part-02.ts).
// Extracted functional module. The original entry remains a compatibility facade.

import * as fs from "fs";

import * as net from "net";

import * as os from "os";

import * as path from "path";

import * as crypto from "crypto";

import * as zlib from "zlib";

import { spawnSync } from "child_process";

import {
  normalizeTestAgentWorkOrderForSelfTest as normalizeTestAgentWorkOrder,
  runTestAgentForSelfTest as runTestAgent,
} from "../self-test-policy";

import { verifyTestAgentArtifactManifestFile } from "../artifact-verifier";

import { ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE, buildAcceptanceClipboardFlowBrowserChecks } from "../browser/acceptance-clipboard-flows";

import { ACCEPTANCE_CLICK_FLOW_PROBE_TYPE, buildAcceptanceClickFlowBrowserChecks } from "../browser/acceptance-click-flows";

import { buildAcceptanceDerivedBrowserAssertions } from "../browser/acceptance-derived-checks";

import { ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE, buildAcceptanceDialogFlowBrowserChecks } from "../browser/acceptance-dialog-flows";

import { ACCEPTANCE_DRAG_FLOW_PROBE_TYPE, buildAcceptanceDragFlowBrowserChecks } from "../browser/acceptance-drag-flows";

import { ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE, buildAcceptanceDownloadFlowBrowserChecks } from "../browser/acceptance-download-flows";

import { ACCEPTANCE_FORM_FLOW_PROBE_TYPE, buildAcceptanceFormFlowBrowserChecks } from "../browser/acceptance-form-flows";

import { ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE, buildAcceptanceHistoryFlowBrowserChecks } from "../browser/acceptance-history-flows";

import { ACCEPTANCE_HOVER_FLOW_PROBE_TYPE, buildAcceptanceHoverFlowBrowserChecks } from "../browser/acceptance-hover-flows";

import { ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE, buildAcceptanceKeyboardFlowBrowserChecks } from "../browser/acceptance-keyboard-flows";

import { ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE, buildAcceptanceNetworkStateFlowBrowserChecks } from "../browser/acceptance-network-state-flows";

import { MULTI_SESSION_BROWSER_PROBE_TYPE } from "../browser/multi-session";

import { ACCEPTANCE_POPUP_FLOW_PROBE_TYPE, buildAcceptancePopupFlowBrowserChecks } from "../browser/acceptance-popup-flows";

import { runBrowserSessionComparison } from "../browser/session-comparison";

import { ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE, buildAcceptanceRepeatedClickBrowserChecks } from "../browser/acceptance-repeated-click-checks";

import { ACCEPTANCE_RESPONSIVE_PROBE_TYPE, buildAcceptanceResponsiveBrowserChecks } from "../browser/acceptance-responsive-checks";

import { ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE, buildAcceptanceScrollFlowBrowserChecks } from "../browser/acceptance-scroll-flows";

import { buildBrowserStabilitySummary } from "../browser/stability-summary";

import { ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE, buildAcceptanceUploadFlowBrowserChecks } from "../browser/acceptance-upload-flows";

import { AUTO_BROWSER_SMOKE_PROBE_TYPE, buildAcceptancePathBrowserSmokeChecks, buildAutoBrowserSmokeCheck, buildBrowserChecksForProject } from "../browser/auto-checks";

import { checkPlaywrightAvailability } from "../browser/playwright-provider";

import { buildSemanticLocatorPlan } from "../browser/semantic-locator";

import { createStaticBrowserToolExecutor } from "../browser/tool-executor";

import { formatTestAgentCliArtifactVerificationSummary, formatTestAgentCliExecutionPlanSummary, formatTestAgentCliReportSummary, formatTestAgentCliValidationSummary, runTestAgentCli } from "../cli";

import { cliOverrides, parseTestAgentCliArgs } from "../cli-options";

import { TEST_AGENT_MINIMAL_HANDOFF_EXAMPLE, TEST_AGENT_WEB_APP_HANDOFF_EXAMPLE, TEST_AGENT_WEB_APP_WORK_ORDER_EXAMPLE, validateTestAgentHandoffContract, validateTestAgentReportContract, validateTestAgentVerdictContract, validateTestAgentWorkOrderContract } from "../contract";

import { buildAcceptanceCoverage } from "../coverage";

import { buildAcceptanceSummary } from "../acceptance-summary";

import { buildTestAgentExecutionPlan } from "../execution-plan";

import { buildTestAgentMarkdownReport } from "../artifacts";

import { buildTestAgentReport } from "../result-builder";

import { buildRequiredCheckCoverage } from "../required-checks";

import { discoverTestAgentSelfTests, formatTestAgentSelfTestMatrixSummary, runTestAgentSelfTestMatrix } from "../self-test-matrix";

import { buildTestAgentVerdict } from "../verdict";

import { buildTestAgentWorkOrderFromHandoff } from "../work-order-builder";

import {
  buildEmptyZip,
  buildStoredZip,
  getFreePort,
  refreshManifestItemIntegrity,
  writeSolidRgbaPng,
  writeTaskBoardFixtureServer,
} from "../self-test";


export function runTestAgentBrowserStabilitySummarySelfTest() {
  const { workOrder, issues } = normalizeTestAgentWorkOrder({
    id: `browser-stability-summary-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify repeated isolated browser checks are summarized and gate acceptance.",
    acceptanceCriteria: ["Repeated browser checks distinguish stable delivery from flaky delivery."],
    requiredChecks: ["browser_stability"],
    projects: [{
      name: "browser-stability-summary-self-test",
      workDir: process.cwd(),
      targetUrl: "http://example.test/chat",
    }],
  });
  const startedAt = new Date(Date.now() - 2000).toISOString();
  const finishedAt = new Date().toISOString();
  const fixtureResult = (input: {
    groupId: string;
    name: string;
    run: number;
    runs?: number;
    status: "passed" | "failed" | "blocked" | "skipped";
    error?: string;
  }) => ({
    provider: "playwright" as const,
    project: "browser-stability-summary-self-test",
    name: input.name,
    url: "http://example.test/chat",
    finalUrl: "http://example.test/chat",
    status: input.status,
    startedAt,
    finishedAt,
    durationMs: 100,
    steps: [{
      kind: "assertion" as const,
      name: "assert:text",
      status: input.status === "passed" ? "passed" as const : input.status === "failed" ? "failed" as const : "skipped" as const,
      ...(input.error ? { error: input.error } : {}),
    }],
    screenshots: [`${input.groupId}-${input.run}.png`],
    consoleErrors: [],
    pageErrors: [],
    networkErrors: [],
    context: {
      browserStability: true,
      stabilityGroupId: input.groupId,
      stabilityRun: input.run,
      stabilityRuns: input.runs ?? 3,
    },
    ...(input.error ? { error: input.error } : {}),
  });
  const browserResults = [
    fixtureResult({ groupId: "stable-group", name: "Chat delivery remains stable", run: 1, status: "passed" }),
    fixtureResult({ groupId: "stable-group", name: "Chat delivery remains stable", run: 2, status: "passed" }),
    fixtureResult({ groupId: "stable-group", name: "Chat delivery remains stable", run: 3, status: "passed" }),
    fixtureResult({ groupId: "flaky-group", name: "Presence update remains stable", run: 1, status: "passed" }),
    fixtureResult({ groupId: "flaky-group", name: "Presence update remains stable", run: 2, status: "failed", error: "transient presence mismatch" }),
    fixtureResult({ groupId: "flaky-group", name: "Presence update remains stable", run: 3, status: "passed" }),
  ];
  const report = buildTestAgentReport({
    workOrder,
    startedAt,
    issues,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserResults,
    browserToolCalls: [],
  });
  const verdict = buildTestAgentVerdict(report);
  const summary = report.browserStabilitySummary;
  const cliSummary = formatTestAgentCliReportSummary(report);
  const markdown = buildTestAgentMarkdownReport(report);
  const reportValidation = validateTestAgentReportContract(report);
  const verdictValidation = validateTestAgentVerdictContract(verdict);
  const duplicateSummary = buildBrowserStabilitySummary([
    fixtureResult({ groupId: "duplicate-group", name: "Duplicate run metadata", run: 1, status: "passed" }),
    fixtureResult({ groupId: "duplicate-group", name: "Duplicate run metadata", run: 1, status: "passed" }),
    fixtureResult({ groupId: "duplicate-group", name: "Duplicate run metadata", run: 3, status: "passed" }),
  ]);
  const incompleteSummary = buildBrowserStabilitySummary([
    fixtureResult({ groupId: "incomplete-group", name: "Incomplete runs", run: 1, status: "passed" }),
    fixtureResult({ groupId: "incomplete-group", name: "Incomplete runs", run: 2, status: "passed" }),
  ]);
  const blockedSummary = buildBrowserStabilitySummary([
    fixtureResult({ groupId: "blocked-group", name: "Blocked run", run: 1, status: "passed" }),
    fixtureResult({ groupId: "blocked-group", name: "Blocked run", run: 2, status: "blocked", error: "browser infrastructure unavailable" }),
    fixtureResult({ groupId: "blocked-group", name: "Blocked run", run: 3, status: "passed" }),
  ]);
  const stableFailSummary = buildBrowserStabilitySummary([
    fixtureResult({ groupId: "stable-fail-group", name: "Consistently failing run", run: 1, status: "failed", error: "delivery missing" }),
    fixtureResult({ groupId: "stable-fail-group", name: "Consistently failing run", run: 2, status: "failed", error: "delivery missing" }),
    fixtureResult({ groupId: "stable-fail-group", name: "Consistently failing run", run: 3, status: "failed", error: "delivery missing" }),
  ]);
  const stabilityCoverage = report.requiredCheckCoverage.find(item => item.check === "browser_stability");

  const pass = report.status === "failed"
    && summary?.total === 2
    && summary?.statusCounts.stable_pass === 1
    && summary?.statusCounts.flaky === 1
    && summary?.statusCounts.stable_fail === 0
    && summary?.statusCounts.blocked === 0
    && summary?.expectedRunCount === 6
    && summary?.runCount === 6
    && summary?.passedRunCount === 5
    && summary?.failedRunCount === 1
    && summary?.items.find(item => item.groupId === "flaky-group")?.failedRuns.join(",") === "2"
    && summary?.items.find(item => item.groupId === "flaky-group")?.firstFailure === "run 2: transient presence mismatch"
    && duplicateSummary.items[0]?.status === "blocked"
    && incompleteSummary.items[0]?.status === "blocked"
    && blockedSummary.items[0]?.status === "blocked"
    && stableFailSummary.items[0]?.status === "stable_fail"
    && stabilityCoverage?.status === "not_verified"
    && verdict.browserStabilitySummary?.statusCounts.flaky === 1
    && verdict.evidenceSummary.browserStabilityGroups === 2
    && verdict.evidenceSummary.browserFlakyStabilityGroups === 1
    && verdict.evidenceSummary.browserStabilityRuns === 6
    && verdict.evidenceSummary.browserFailedStabilityRuns === 1
    && cliSummary.includes("Browser stability: groups=2; stable=1; flaky=1; failed=0; blocked=0; runs=6/6")
    && cliSummary.includes("Presence update remains stable: flaky")
    && markdown.includes("## Browser Stability Summary")
    && markdown.includes("Presence update remains stable")
    && markdown.includes("failedRuns=2")
    && report.risks.some(item => item.includes("browser stability flaky"))
    && reportValidation.valid
    && verdictValidation.valid;

  return {
    pass,
    report,
    verdict,
    summary,
    duplicateSummary,
    incompleteSummary,
    blockedSummary,
    stableFailSummary,
    cliSummary,
    markdown,
    reportValidation,
    verdictValidation,
  };
}

export function runTestAgentAcceptanceSummarySelfTest() {
  const { workOrder, issues } = normalizeTestAgentWorkOrder({
    id: `acceptance-summary-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify acceptance criteria are summarized for handoff.",
    acceptanceCriteria: [
      "Ready banner appears",
      "Payment succeeds",
      "Audit log is created",
    ],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "acceptance-summary-self-test",
      workDir: process.cwd(),
      targetUrl: "http://example.test/app",
    }],
    options: { browserProvider: "playwright" },
  });
  const startedAt = new Date(Date.now() - 1000).toISOString();
  const now = new Date().toISOString();
  const browserResults = [
    {
      provider: "playwright" as const,
      project: "acceptance-summary-self-test",
      name: "Ready banner appears",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      title: "Ready",
      pageTextPreview: "Ready banner appears",
      status: "passed" as const,
      startedAt,
      finishedAt: now,
      durationMs: 100,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Ready banner appears" }],
      screenshots: ["C:\\tmp\\ready-banner.png"],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    },
    {
      provider: "playwright" as const,
      project: "acceptance-summary-self-test",
      name: "Payment succeeds",
      url: "http://example.test/pay",
      finalUrl: "http://example.test/pay",
      title: "Payment",
      pageTextPreview: "Payment failed",
      status: "failed" as const,
      startedAt,
      finishedAt: now,
      durationMs: 120,
      error: "Payment succeeds assertion failed.",
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "failed" as const, detail: "Payment succeeds", error: "Expected page text to include Payment succeeds." }],
      screenshots: ["C:\\tmp\\payment-failure.png"],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    },
  ];
  const report = buildTestAgentReport({
    workOrder,
    startedAt,
    issues,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserResults,
    browserToolCalls: [],
  });
  const verdict = buildTestAgentVerdict(report);
  const reportValidation = validateTestAgentReportContract(report);
  const verdictValidation = validateTestAgentVerdictContract(verdict);
  const cliSummary = formatTestAgentCliReportSummary(report);
  const markdown = buildTestAgentMarkdownReport(report);
  const byCriterion = new Map(report.acceptanceCoverage.map(item => [item.criterion, item]));
  const { workOrder: fallbackWorkOrder } = normalizeTestAgentWorkOrder({
    id: `acceptance-fallback-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify single acceptance fallback evidence is labeled.",
    acceptanceCriteria: ["Checkout flow completes"],
    requiredChecks: ["unit_tests"],
    projects: [{
      name: "acceptance-fallback-self-test",
      workDir: process.cwd(),
      verificationCommands: ["npm test"],
    }],
  });
  const fallbackCoverage = buildAcceptanceCoverage({
    workOrder: fallbackWorkOrder,
    status: "passed",
    issues: [],
    commandResults: [{
      project: "acceptance-fallback-self-test",
      command: "npm test",
      cwd: process.cwd(),
      status: "passed",
      exitCode: 0,
      startedAt,
      finishedAt: now,
      durationMs: 20,
      stdout: "all automated checks passed",
      stderr: "",
      output: "all automated checks passed",
    }],
    devServerResults: [],
    httpResults: [],
    browserResults: [],
    browserToolCalls: [],
    evidence: [],
  });
  const fallbackSummary = buildAcceptanceSummary(fallbackCoverage);
  const fallbackItem = fallbackCoverage[0];
  const readyCoverage = byCriterion.get("Ready banner appears");
  const paymentCoverage = byCriterion.get("Payment succeeds");
  const auditCoverage = byCriterion.get("Audit log is created");
  const pass = report.status === "failed"
    && readyCoverage?.status === "verified"
    && readyCoverage?.matchStrength === "direct"
    && readyCoverage?.matchScore === 100
    && readyCoverage?.evidenceSource === "matched_evidence"
    && paymentCoverage?.status === "not_verified"
    && paymentCoverage?.matchStrength === "direct"
    && paymentCoverage?.matchScore === 100
    && paymentCoverage?.evidenceSource === "matched_evidence"
    && auditCoverage?.status === "unknown"
    && auditCoverage?.matchStrength === "none"
    && auditCoverage?.matchScore === 0
    && auditCoverage?.evidenceSource === "none"
    && verdict.acceptanceSummary?.total === 3
    && verdict.acceptanceSummary?.statusCounts?.verified === 1
    && verdict.acceptanceSummary?.statusCounts?.not_verified === 1
    && verdict.acceptanceSummary?.statusCounts?.unknown === 1
    && verdict.acceptanceSummary?.matchStrengthCounts?.direct === 2
    && verdict.acceptanceSummary?.matchStrengthCounts?.none === 1
    && verdict.acceptanceSummary?.evidenceSourceCounts?.matched_evidence === 2
    && verdict.acceptanceSummary?.evidenceSourceCounts?.none === 1
    && verdict.acceptanceSummary?.verified?.some(item => item.criterion === "Ready banner appears" && item.matchStrength === "direct")
    && verdict.acceptanceSummary?.notVerified?.some(item => item.criterion === "Payment succeeds" && item.matchStrength === "direct" && item.evidence.some(evidence => evidence.includes("Payment succeeds assertion failed")))
    && verdict.acceptanceSummary?.unknown?.some(item => item.criterion === "Audit log is created" && item.matchStrength === "none")
    && fallbackItem?.status === "verified"
    && fallbackItem?.matchStrength === "fallback"
    && fallbackItem?.matchScore === 0
    && fallbackItem?.evidenceSource === "single_criterion_report_status"
    && fallbackSummary.matchStrengthCounts.fallback === 1
    && fallbackSummary.evidenceSourceCounts.single_criterion_report_status === 1
    && cliSummary.includes("Acceptance coverage: verified:1, not_verified:1, unknown:1, total:3")
    && cliSummary.includes("Acceptance attention:")
    && cliSummary.includes("Payment succeeds")
    && cliSummary.includes("Audit log is created")
    && markdown.includes("## Acceptance Summary")
    && markdown.includes("Match strength counts: direct:2")
    && markdown.includes("Evidence source counts: matched_evidence:2")
    && markdown.includes("Attention not_verified Payment succeeds")
    && markdown.includes("Attention unknown Audit log is created")
    && reportValidation.valid
    && verdictValidation.valid;

  return {
    pass,
    report,
    verdict,
    byCriterion: Object.fromEntries(byCriterion),
    fallbackCoverage,
    fallbackSummary,
    cliSummary,
    markdown,
    reportValidation,
    verdictValidation,
  };
}

export async function runTestAgentArtifactManifestSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-manifest-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName) => {
      if (toolName.endsWith("browser_snapshot")) return "Manifest Ready";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { path: "manifest-screenshot.png" };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `artifact-manifest-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent writes an artifact manifest.",
    acceptanceCriteria: ["Artifact manifest lists reports, screenshots, and browser tool transcripts"],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      name: "artifact-manifest-self-test",
      workDir: dir,
      browserChecks: [{
        name: "Manifest browser check",
        url: "http://example.test/manifest",
        actions: [{ type: "goto", url: "http://example.test/manifest" }],
        assertions: [{ type: "text", text: "Manifest Ready" }, { type: "consoleNoErrors" }],
        screenshot: true,
      }],
    }],
    options: { artifactDir, browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const files = report.metadata.artifactFiles as any;
  const manifestPath = String(files?.manifestPath || "");
  const transcriptPath = String(report.metadata.browserToolTranscriptPath || "");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const manifestFiles = manifest?.files || [];
  const manifestTypes = new Set<string>(manifestFiles.map((item: any) => String(item.type)));
  const reportJsonEntry = manifestFiles.find((item: any) => item.type === "report_json");
  const verdictEntry = manifestFiles.find((item: any) => item.type === "verdict_json");
  const screenshotEntry = manifestFiles.find((item: any) => item.type === "screenshot");
  const manifestEntry = manifestFiles.find((item: any) => item.type === "artifact_manifest");
  const pass = report.status === "passed"
    && fs.existsSync(manifestPath)
    && fs.existsSync(transcriptPath)
    && manifest?.schema === "ccm-test-agent-artifact-manifest-v1"
    && manifestTypes.has("report_json")
    && manifestTypes.has("report_markdown")
    && manifestTypes.has("verdict_json")
    && manifestTypes.has("artifact_manifest")
    && manifestTypes.has("screenshot")
    && manifestTypes.has("browser_snapshot")
    && manifestTypes.has("browser_console_log")
    && manifestTypes.has("browser_network_log")
    && manifestTypes.has("browser_tool_transcript")
    && manifest.summary?.screenshots === 1
    && manifest.summary?.browserSnapshots === 1
    && manifest.summary?.browserConsoleLogs === 1
    && manifest.summary?.browserNetworkLogs === 1
    && manifest.summary?.browserToolTranscripts === 1
    && manifest.summary?.integrityMissing === 0
    && manifest.summary?.integrityVerified === manifestFiles.length
    && manifestFiles.every((item: any) => item.integrity?.exists === true)
    && typeof reportJsonEntry?.integrity?.sha256 === "string"
    && reportJsonEntry.integrity.sha256.length === 64
    && typeof verdictEntry?.integrity?.sha256 === "string"
    && verdictEntry.integrity.sha256.length === 64
    && typeof screenshotEntry?.integrity?.sha256 === "string"
    && screenshotEntry.integrity.sha256.length === 64
    && manifestEntry?.integrity?.exists === true
    && manifestEntry?.integrity?.error === "sha256 omitted for self-referential artifact.";

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    manifest,
  };
}

export async function runTestAgentArtifactVerifierSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-artifact-verifier-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const report = await runTestAgent({
    id: `artifact-verifier-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent artifact manifest can be independently checked.",
    acceptanceCriteria: ["Artifact verifier detects intact and tampered files"],
    requiredChecks: ["commands"],
    projects: [{
      name: "artifact-verifier-self-test",
      workDir: dir,
      verificationCommands: [`"${process.execPath}" -e "console.log('Artifact verifier detects intact and tampered files')"`],
    }],
    options: { artifactDir, browserProvider: "none" },
  });

  const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
  const markdownPath = String((report.metadata.artifactFiles as any)?.reportMarkdownPath || "");
  const verdictPath = String((report.metadata.artifactFiles as any)?.verdictJsonPath || "");
  const verification = verifyTestAgentArtifactManifestFile(manifestPath);
  const summary = formatTestAgentCliArtifactVerificationSummary(verification);
  const cliStdout: string[] = [];
  const cliStderr: string[] = [];
  const cliResult = await runTestAgentCli(["--verify-artifacts", manifestPath, "--summary"], {
    stdout: { write: message => cliStdout.push(String(message)) },
    stderr: { write: message => cliStderr.push(String(message)) },
  });

  const verdict = JSON.parse(fs.readFileSync(verdictPath, "utf-8"));
  verdict.reportId = `${verdict.reportId}-tampered`;
  verdict.canAccept = !verdict.canAccept;
  fs.writeFileSync(verdictPath, `${JSON.stringify(verdict, null, 2)}\n`, "utf-8");
  refreshManifestItemIntegrity(manifestPath, "verdict_json");
  const semanticTampered = verifyTestAgentArtifactManifestFile(manifestPath);
  const semanticSummary = formatTestAgentCliArtifactVerificationSummary(semanticTampered);

  fs.appendFileSync(markdownPath, "\nTAMPERED\n", "utf-8");
  const tampered = verifyTestAgentArtifactManifestFile(manifestPath);
  const tamperedStdout: string[] = [];
  const tamperedResult = await runTestAgentCli(["--verify-artifacts", manifestPath, "--summary"], {
    stdout: { write: message => tamperedStdout.push(String(message)) },
    stderr: { write: message => cliStderr.push(String(message)) },
  });

  const pass = report.status === "passed"
    && verification.status === "passed"
    && verification.summary.failed === 0
    && verification.summary.passed > 0
    && verification.summary.skipped >= 1
    && verification.items.some(item => item.type === "verdict_consistency" && item.status === "passed")
    && summary.includes("TestAgent artifact verification: passed")
    && cliResult.exitCode === 0
    && cliStdout.join("").includes("TestAgent artifact verification: passed")
    && cliStderr.length === 0
    && semanticTampered.status === "failed"
    && semanticTampered.items.some(item => item.type === "verdict_consistency" && item.status === "failed" && String(item.error || "").includes("verdict.reportId"))
    && semanticSummary.includes("TestAgent artifact verification: failed")
    && tampered.status === "failed"
    && tampered.items.some(item => item.path === markdownPath && item.error === "Size mismatch: expected " + item.expectedSizeBytes + ", got " + item.actualSizeBytes + ".")
    && tamperedResult.exitCode === 1
    && tamperedStdout.join("").includes("TestAgent artifact verification: failed");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    verification,
    semanticTampered,
    tampered,
  };
}

export async function runTestAgentMcpScreenshotArtifactSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-mcp-screenshot-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName) => {
      if (toolName.endsWith("browser_snapshot")) return "Screenshot artifact ready";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { image: `data:image/png;base64,${onePixelPng}` };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `mcp-screenshot-artifact-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify MCP screenshot captures become local artifacts.",
    acceptanceCriteria: ["Screenshot artifact is written as a local image"],
    requiredChecks: ["browser_e2e", "screenshots"],
    projects: [{
      name: "mcp-screenshot-artifact-self-test",
      workDir: dir,
      browserChecks: [{
        name: "MCP screenshot artifact",
        url: "http://example.test/screenshot",
        actions: [{ type: "goto", url: "http://example.test/screenshot" }],
        assertions: [{ type: "text", text: "Screenshot artifact ready" }],
        screenshot: true,
      }],
    }],
    options: { artifactDir, browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const result = report.browserResults[0];
  const screenshotPath = String(result?.screenshots?.[0] || "");
  const originalScreenshotSize = fs.existsSync(screenshotPath) ? fs.statSync(screenshotPath).size : 0;
  const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const manifestScreenshot = (manifest?.files || []).find((item: any) => item.type === "screenshot");
  const verification = verifyTestAgentArtifactManifestFile(manifestPath);
  const screenshotMetadata = verification.items.find(item => item.type === "screenshot_png_metadata");
  const screenshotContent = verification.items.find(item => item.type === "screenshot_png_content");

  writeSolidRgbaPng(screenshotPath, 4, 4, [255, 255, 255, 255]);
  refreshManifestItemIntegrity(manifestPath, "screenshot");
  const blank = verifyTestAgentArtifactManifestFile(manifestPath);
  const blankScreenshotContent = blank.items.find(item => item.type === "screenshot_png_content");

  fs.writeFileSync(screenshotPath, "not a png screenshot\n", "utf-8");
  refreshManifestItemIntegrity(manifestPath, "screenshot");
  const tampered = verifyTestAgentArtifactManifestFile(manifestPath);
  const tamperedScreenshotMetadata = tampered.items.find(item => item.type === "screenshot_png_metadata");

  const pass = report.status === "passed"
    && screenshotPath.endsWith(".png")
    && fs.existsSync(screenshotPath)
    && originalScreenshotSize > 20
    && manifestScreenshot?.path === screenshotPath
    && report.evidence.some(item => item.path === screenshotPath)
    && report.requiredCheckCoverage.some(item => item.check === "screenshots" && item.status === "verified")
    && verification.status === "passed"
    && screenshotMetadata?.status === "passed"
    && screenshotMetadata?.imageWidth === 1
    && screenshotMetadata?.imageHeight === 1
    && screenshotContent?.status === "skipped"
    && String(screenshotContent?.error || "").includes("too small for blank-image detection")
    && blank.status === "failed"
    && blankScreenshotContent?.status === "failed"
    && blankScreenshotContent?.imageBlank === true
    && blankScreenshotContent?.imageUniqueColors === 1
    && blankScreenshotContent?.imageWidth === 4
    && blankScreenshotContent?.imageHeight === 4
    && tampered.status === "failed"
    && tamperedScreenshotMetadata?.status === "failed"
    && String(tamperedScreenshotMetadata?.error || "").includes("Invalid PNG signature");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    screenshotPath,
    manifest,
    verification,
    blank,
    tampered,
  };
}

export async function runTestAgentMcpFailureScreenshotSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-mcp-failure-screenshot-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  const calls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName, input) => {
      calls.push({ toolName, input });
      if (toolName.endsWith("browser_snapshot")) return "MCP failure page ready";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { image: `data:image/png;base64,${onePixelPng}` };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `mcp-failure-screenshot-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify MCP browser provider captures failure screenshots when normal screenshots are disabled.",
    acceptanceCriteria: ["A failing MCP browser assertion produces a local failure screenshot artifact."],
    requiredChecks: ["browser_e2e", "console_errors"],
    projects: [{
      name: "mcp-failure-screenshot-self-test",
      workDir: dir,
      browserChecks: [{
        name: "MCP failure screenshot",
        url: "http://example.test/mcp-failure",
        actions: [{ type: "goto", url: "http://example.test/mcp-failure" }],
        assertions: [{ type: "text", text: "Missing MCP text" }],
        screenshot: false,
      }],
    }],
    options: { artifactDir, browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const browser = report.browserResults[0];
  const screenshotPath = String(browser?.screenshots?.[0] || "");
  const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const verification = manifestPath ? verifyTestAgentArtifactManifestFile(manifestPath) : null;
  const screenshotEntry = (manifest?.files || []).find((item: any) => item.type === "screenshot" && String(item.path || "").includes("failure"));
  const screenshotMetadata = verification?.items.find(item => item.type === "screenshot_png_metadata" && String(item.path || "").includes("failure"));
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = report.status === "failed"
    && browser?.provider === "mcp"
    && browser?.status === "failed"
    && browser?.steps.some(step => step.name === "playwright:text" && step.status === "failed")
    && browser?.screenshots.length === 1
    && screenshotPath.endsWith(".png")
    && screenshotPath.includes("failure")
    && fs.existsSync(screenshotPath)
    && fs.statSync(screenshotPath).size > 20
    && calls.some(call => call.toolName.endsWith("browser_take_screenshot"))
    && calls.some(call => call.toolName.endsWith("browser_take_screenshot") && String(call.input?.filename || "").includes("failure"))
    && manifest?.summary?.screenshots === 1
    && screenshotEntry?.path === screenshotPath
    && verification?.status === "passed"
    && screenshotMetadata?.status === "passed"
    && byCheck.get("browser_e2e")?.status === "not_verified"
    && report.failureSummary.some(item => item.type === "browser" && item.evidence?.some(evidence => evidence.includes(screenshotPath)));

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    manifest,
    verification,
    calls,
    screenshotPath,
  };
}

export async function runTestAgentBrowserEvidenceArtifactSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-evidence-artifact-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const providerDir = path.join(dir, "provider-artifacts");
  fs.mkdirSync(providerDir, { recursive: true });
  const harPath = path.join(providerDir, "session.har");
  const videoPath = path.join(providerDir, "session.webm");
  fs.writeFileSync(harPath, JSON.stringify({ log: { version: "1.2", entries: [] } }), "utf-8");
  fs.writeFileSync(videoPath, Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]));
  const traceZip = buildStoredZip([{ name: "trace.trace", data: '{"type":"context-options"}\n' }]);
  const traceBase64 = traceZip.toString("base64");
  const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName) => {
      if (toolName.endsWith("browser_snapshot")) return "Evidence artifacts ready";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return {
        image: `data:image/png;base64,${onePixelPng}`,
        trace: `data:application/zip;base64,${traceBase64}`,
        harPath,
        videoPath,
      };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `browser-evidence-artifact-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent preserves rich browser evidence artifacts.",
    acceptanceCriteria: ["Browser evidence artifacts are listed, hashed, and verifiable"],
    requiredChecks: ["browser_e2e", "browser_trace", "browser_har", "browser_video", "browser_artifacts"],
    projects: [{
      name: "browser-evidence-artifact-self-test",
      workDir: dir,
      browserChecks: [{
        name: "Browser evidence artifact bundle",
        url: "http://example.test/evidence",
        actions: [{ type: "goto", url: "http://example.test/evidence" }],
        assertions: [{ type: "text", text: "Evidence artifacts ready" }],
        screenshot: true,
      }],
    }],
    options: { artifactDir, browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const result = report.browserResults[0];
  const artifacts = result?.browserArtifacts || [];
  const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const verification = manifestPath ? verifyTestAgentArtifactManifestFile(manifestPath) : null;
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const manifestTypes = new Set((manifest?.files || []).map((item: any) => item.type));
  const traceMetadata = verification?.items.find(item => item.type === "browser_trace_zip");
  const harMetadata = verification?.items.find(item => item.type === "browser_har_metadata");
  const videoMetadata = verification?.items.find(item => item.type === "browser_video_container");
  const copiedTrace = artifacts.find(item => item.type === "trace")?.path || "";
  if (copiedTrace) {
    fs.writeFileSync(copiedTrace, buildEmptyZip());
    refreshManifestItemIntegrity(manifestPath, "browser_trace");
  }
  const emptyTrace = manifestPath ? verifyTestAgentArtifactManifestFile(manifestPath) : null;
  const emptyTraceMetadata = emptyTrace?.items.find(item => item.type === "browser_trace_zip");
  if (copiedTrace) {
    fs.writeFileSync(copiedTrace, buildStoredZip([{ name: "trace.trace", data: "" }]));
    refreshManifestItemIntegrity(manifestPath, "browser_trace");
  }
  const noEventTrace = manifestPath ? verifyTestAgentArtifactManifestFile(manifestPath) : null;
  const noEventTraceMetadata = noEventTrace?.items.find(item => item.type === "browser_trace_zip");
  if (copiedTrace) {
    fs.writeFileSync(copiedTrace, traceZip);
    refreshManifestItemIntegrity(manifestPath, "browser_trace");
  }
  const copiedHar = artifacts.find(item => item.type === "har")?.path || "";
  if (copiedHar) {
    fs.writeFileSync(copiedHar, JSON.stringify({ notLog: true }), "utf-8");
    refreshManifestItemIntegrity(manifestPath, "browser_har");
  }
  const tamperedHar = manifestPath ? verifyTestAgentArtifactManifestFile(manifestPath) : null;
  const tamperedHarMetadata = tamperedHar?.items.find(item => item.type === "browser_har_metadata");
  const pass = report.status === "passed"
    && artifacts.some(item => item.type === "trace" && item.path.endsWith(".zip") && fs.existsSync(item.path))
    && artifacts.some(item => item.type === "har" && item.path.endsWith(".har") && fs.existsSync(item.path))
    && artifacts.some(item => item.type === "video" && item.path.endsWith(".webm") && fs.existsSync(item.path))
    && byCheck.get("browser_trace")?.status === "verified"
    && byCheck.get("browser_har")?.status === "verified"
    && byCheck.get("browser_video")?.status === "verified"
    && byCheck.get("browser_artifacts")?.status === "verified"
    && manifestTypes.has("browser_trace")
    && manifestTypes.has("browser_har")
    && manifestTypes.has("browser_video")
    && manifest?.summary?.browserTraces === 1
    && manifest?.summary?.browserHars === 1
    && manifest?.summary?.browserVideos === 1
    && verification?.status === "passed"
    && traceMetadata?.status === "passed"
    && traceMetadata?.artifactFormat === "zip:trace"
    && traceMetadata?.artifactEntries === 1
    && traceMetadata?.artifactEvents === 1
    && harMetadata?.status === "passed"
    && harMetadata?.artifactFormat === "har:1.2"
    && harMetadata?.artifactEntries === 0
    && videoMetadata?.status === "passed"
    && videoMetadata?.artifactFormat === "webm"
    && emptyTrace?.status === "failed"
    && emptyTraceMetadata?.status === "failed"
    && String(emptyTraceMetadata?.error || "").includes("at least one entry")
    && noEventTrace?.status === "failed"
    && noEventTraceMetadata?.status === "failed"
    && String(noEventTraceMetadata?.error || "").includes("at least one JSON event")
    && tamperedHar?.status === "failed"
    && tamperedHarMetadata?.status === "failed"
    && String(tamperedHarMetadata?.error || "").includes("log object");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    manifest,
    verification,
    emptyTrace,
    noEventTrace,
    tamperedHar,
  };
}

export function runTestAgentCoverageSelfTest() {
  const { workOrder } = normalizeTestAgentWorkOrder({
    id: `coverage-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: [
      "Login page renders",
      "Settings save persists",
      "Checkout flow completes",
    ],
    projects: [{
      name: "coverage-self-test",
      workDir: process.cwd(),
      verificationCommands: ["npm test"],
    }],
  });
  const startedAt = new Date().toISOString();
  const baseCommand = {
    project: "coverage-self-test",
    command: "npm test",
    cwd: process.cwd(),
    startedAt,
    finishedAt: startedAt,
    durationMs: 1,
    stdout: "",
    stderr: "",
    output: "",
    exitCode: 0,
  };
  const coverage = buildAcceptanceCoverage({
    workOrder,
    status: "partial",
    issues: [],
    commandResults: [{
      ...baseCommand,
      status: "passed",
      stdout: "Login page renders",
      output: "Login page renders",
    } as any],
    devServerResults: [],
    httpResults: [],
    browserResults: [{
      provider: "playwright",
      project: "coverage-self-test",
      name: "Settings save persists",
      url: "http://example.test/settings",
      status: "failed",
      startedAt,
      finishedAt: startedAt,
      durationMs: 1,
      steps: [{ kind: "assertion", name: "assert:text", status: "failed", detail: "Settings save persists", error: "Expected saved toast." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    }],
    browserToolCalls: [],
    evidence: [],
  });
  const byCriterion = new Map(coverage.map(item => [item.criterion, item]));
  return {
    pass: byCriterion.get("Login page renders")?.status === "verified"
      && byCriterion.get("Settings save persists")?.status === "not_verified"
      && byCriterion.get("Checkout flow completes")?.status === "unknown",
    coverage,
  };
}

export async function runTestAgentCommandPlannerSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-command-planner-selftest-"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
    private: true,
    scripts: {
      build: "node -e \"console.log('auto build ok')\"",
      "test:unit": "node -e \"console.log('auto unit ok')\"",
      typecheck: "node -e \"console.log('auto typecheck ok')\"",
      lint: "node -e \"console.log('auto lint ok')\"",
    },
  }, null, 2), "utf-8");

  const report = await runTestAgent({
    id: `command-planner-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent auto-discovers package scripts for required checks.",
    acceptanceCriteria: ["Auto-discovered verification commands run"],
    requiredChecks: ["build", "unit_tests", "typecheck", "lint"],
    projects: [{
      name: "command-planner-self-test",
      workDir: dir,
    }],
  });

  const planned = report.metadata.autoDiscoveredVerificationCommands as any[];
  const output = report.commandResults.map(item => item.output).join("\n");
  const pass = report.status === "passed"
    && Array.isArray(planned)
    && planned.length === 4
    && report.commandResults.length === 4
    && output.includes("auto build ok")
    && output.includes("auto unit ok")
    && output.includes("auto typecheck ok")
    && output.includes("auto lint ok")
    && !report.issues.some(issue => issue.code === "no_executable_checks");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    planned,
  };
}

export async function runTestAgentExecutionPlanSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-execution-plan-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
    private: true,
    scripts: {
      build: "node -e \"console.log('plan build ok')\"",
      test: "node -e \"console.log('plan test ok')\"",
      e2e: "node -e \"console.log('plan e2e ok')\"",
    },
  }, null, 2), "utf-8");

  const workOrder = buildTestAgentWorkOrderFromHandoff({
    taskId: `execution-plan-self-test-${process.pid}-${Date.now()}`,
    groupId: "execution-plan-group",
    originalUserGoal: "Preview TestAgent checks before execution.",
    acceptanceCriteria: ["The web preview page renders Ready"],
    completedTasks: ["Project delivery is ready for dry-run planning."],
    requiredChecks: ["build", "unit_tests", "browser_e2e", "http"],
    projects: [{
      name: "execution-plan-web",
      workDir: dir,
      runCommand: "npm run dev",
      targetUrl: "http://127.0.0.1:5173/preview",
      httpChecks: [{
        name: "Preview HTTP",
        url: "http://127.0.0.1:5173/preview",
        assertions: [{ type: "status", status: 200 }],
      }],
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: true,
    },
  }).workOrder;
  const validation = validateTestAgentWorkOrderContract(workOrder);
  const plan = buildTestAgentExecutionPlan(workOrder, {}, validation);
  const summary = formatTestAgentCliExecutionPlanSummary(plan);
  const providerWarningWorkOrder = buildTestAgentWorkOrderFromHandoff({
    taskId: `execution-plan-provider-warning-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Preview browser provider limitations before execution.",
    acceptanceCriteria: ["The upload flow can upload and download a file."],
    requiredChecks: ["browser_e2e", "browser_upload", "browser_download"],
    projects: [{
      name: "execution-plan-provider-warning-web",
      workDir: dir,
      targetUrl: "http://127.0.0.1:5173/upload",
      browserChecks: [{
        name: "Upload download MCP warning",
        url: "http://127.0.0.1:5173/upload",
        actions: [{ type: "uploadFile", selector: "#file", filePath: "fixture.txt" }],
        assertions: [{ type: "downloadedFile", fileName: "fixture.txt" }],
      }],
    }],
    options: {
      artifactDir,
      browserProvider: "mcp",
    },
  }).workOrder;
  const providerWarningValidation = validateTestAgentWorkOrderContract(providerWarningWorkOrder);
  const providerWarningPlan = buildTestAgentExecutionPlan(providerWarningWorkOrder, {}, providerWarningValidation);
  const providerWarningSummary = formatTestAgentCliExecutionPlanSummary(providerWarningPlan);

  const handoffPath = path.join(dir, "handoff.json");
  fs.writeFileSync(handoffPath, JSON.stringify({
    taskId: `execution-plan-cli-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Preview TestAgent CLI plan from handoff.",
    acceptanceCriteria: ["The handoff preview page renders Ready"],
    completedTasks: ["CLI handoff dry-run planning is available."],
    requiredChecks: ["build", "unit_tests", "browser_e2e", "http"],
    projects: [{
      name: "execution-plan-cli-web",
      workDir: dir,
      runCommand: "npm run dev",
      targetUrl: "http://127.0.0.1:5173/preview",
      httpChecks: [{
        name: "CLI preview HTTP",
        url: "http://127.0.0.1:5173/preview",
        assertions: [{ type: "status", status: 200 }],
      }],
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      collectBrowserArtifacts: true,
    },
  }, null, 2), "utf-8");

  const cliStdout: string[] = [];
  const cliStderr: string[] = [];
  let runAgentCalled = false;
  const cliResult = await runTestAgentCli([
    "--from-handoff",
    handoffPath,
    "--plan-only",
    "--summary",
    "--no-auto-discover",
  ], {
    stdout: { write: message => cliStdout.push(String(message)) },
    stderr: { write: message => cliStderr.push(String(message)) },
    runAgent: async () => {
      runAgentCalled = true;
      throw new Error("plan-only should not execute TestAgent");
    },
  });
  const cliSummary = cliStdout.join("");

  const commandNames = plan.projects[0].commands.map(item => item.command);
  const browserCheck = plan.projects[0].browserChecks[0];
  const pass = validation.valid
    && plan.valid
    && plan.schema === "ccm-test-agent-execution-plan-v1"
    && plan.summary.projects === 1
    && plan.summary.commands === 3
    && plan.summary.autoDiscoveredCommands === 3
    && commandNames.includes("npm run build")
    && commandNames.includes("npm run test")
    && commandNames.includes("npm run e2e")
    && plan.summary.devServers === 1
    && plan.projects[0].devServer.command === "npm run dev"
    && plan.summary.httpChecks === 1
    && plan.summary.browserChecks === 1
    && plan.summary.autoBrowserChecks === 1
    && plan.summary.browserProviderWarnings === 0
    && plan.browserProviderWarnings.length === 0
    && browserCheck?.autoGenerated === true
    && browserCheck?.screenshot === true
    && plan.summary.expectedArtifactTypes.includes("browser_accessibility_snapshot")
    && plan.summary.expectedArtifactTypes.includes("browser_trace")
    && plan.summary.expectedArtifactTypes.includes("browser_har")
    && plan.summary.expectedArtifactTypes.includes("screenshot")
    && summary.includes("TestAgent execution plan: valid")
    && summary.includes("Commands: 3")
    && summary.includes("Browser provider warnings: 0")
    && providerWarningValidation.valid
    && providerWarningPlan.valid
    && providerWarningPlan.browserProvider === "mcp"
    && providerWarningPlan.summary.browserProviderWarnings === 3
    && providerWarningPlan.browserProviderWarnings.some(item => item.kind === "artifact" && item.item === "trace/har")
    && providerWarningPlan.browserProviderWarnings.some(item => item.kind === "action" && item.item === "uploadFile" && item.category === "requires_playwright")
    && providerWarningPlan.browserProviderWarnings.some(item => item.kind === "assertion" && item.item === "downloadedFile" && item.recommendation.includes("Playwright"))
    && providerWarningSummary.includes("Browser provider warnings: 3")
    && providerWarningSummary.includes("trace/har")
    && providerWarningSummary.includes("uploadFile")
    && providerWarningSummary.includes("downloadedFile")
    && cliResult.exitCode === 0
    && !runAgentCalled
    && cliStderr.length === 0
    && cliSummary.includes("TestAgent execution plan: valid")
    && cliSummary.includes("Commands: 0")
    && cliSummary.includes("Browser checks: 1");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    validation,
    plan,
    summary,
    providerWarningPlan,
    providerWarningSummary,
    cliResult,
    cliSummary,
    runAgentCalled,
  };
}

export async function runTestAgentHttpApiSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-http-api-selftest-"));
  const port = await getFreePort();
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const readBody = req => new Promise(resolve => { let body = ''; req.on('data', c => body += c); req.on('end', () => resolve(body)); });",
    "http.createServer(async (req, res) => {",
    "  if (req.url === '/api/health') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ status: 'ok', service: { name: 'test-agent-api' } })); return; }",
    "  if (req.url === '/api/echo' && req.method === 'POST') { const body = await readBody(req); res.writeHead(201, {'content-type':'application/json'}); res.end(JSON.stringify({ received: JSON.parse(body || '{}') })); return; }",
    "  res.writeHead(404, {'content-type':'application/json'}); res.end(JSON.stringify({ error: 'not found' }));",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseUrl = `http://127.0.0.1:${port}`;
  const report = await runTestAgent({
    id: `http-api-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent explicit HTTP/API checks.",
    acceptanceCriteria: ["Health endpoint returns ok", "Echo endpoint returns submitted JSON", "Missing endpoint returns 404"],
    requiredChecks: ["api"],
    projects: [{
      name: "http-api-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      startupUrl: `${baseUrl}/api/health`,
      env: { PORT: port },
      httpChecks: [{
        name: "Health endpoint",
        url: `${baseUrl}/api/health`,
        assertions: [
          { type: "status", status: 200 },
          { type: "jsonPathEquals", path: "status", value: "ok" },
          { type: "jsonPathIncludes", path: "service.name", value: "agent" },
        ],
      }, {
        name: "Echo endpoint",
        method: "POST",
        url: `${baseUrl}/api/echo`,
        json: { name: "Ada" },
        assertions: [
          { type: "status", status: 201 },
          { type: "jsonPathEquals", path: "received.name", value: "Ada" },
        ],
      }, {
        name: "Missing endpoint",
        url: `${baseUrl}/api/missing`,
        assertions: [
          { type: "status", status: 404 },
          { type: "jsonPathEquals", path: "error", value: "not found" },
        ],
      }],
    }],
  });

  const apiResults = report.httpResults.filter(item => item.name && item.name !== "Page HTTP probe");
  const pass = report.status === "passed"
    && apiResults.length === 3
    && apiResults.every(item => item.status === "passed")
    && apiResults.some(item => item.method === "POST" && item.statusCode === 201)
    && apiResults.some(item => item.statusCode === 404 && item.status === "passed")
    && report.acceptanceCoverage.some(item => item.criterion.includes("Health") && item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
  };
}

export async function runTestAgentAdversarialHttpSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-adversarial-http-selftest-"));
  const port = await getFreePort();
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const readBody = req => new Promise(resolve => { let body = ''; req.on('data', c => body += c); req.on('end', () => resolve(body)); });",
    "http.createServer(async (req, res) => {",
    "  if (req.url === '/api/health') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ status: 'ok' })); return; }",
    "  if (req.url === '/api/items' && req.method === 'POST') { const body = JSON.parse(await readBody(req) || '{}'); if (!body.name) { res.writeHead(400, {'content-type':'application/json'}); res.end(JSON.stringify({ error: 'name is required' })); return; } res.writeHead(201, {'content-type':'application/json'}); res.end(JSON.stringify({ id: 'item-1', name: body.name })); return; }",
    "  if (req.url.startsWith('/api/items/')) { res.writeHead(404, {'content-type':'application/json'}); res.end(JSON.stringify({ error: 'item not found' })); return; }",
    "  res.writeHead(404, {'content-type':'application/json'}); res.end(JSON.stringify({ error: 'not found' }));",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseUrl = `http://127.0.0.1:${port}`;
  const report = await runTestAgent({
    id: `adversarial-http-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent records adversarial HTTP probes.",
    acceptanceCriteria: ["Invalid item create is rejected", "Orphan item lookup returns 404"],
    requiredChecks: ["api", "adversarial"],
    projects: [{
      name: "adversarial-http-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      startupUrl: `${baseUrl}/api/health`,
      env: { PORT: port },
      adversarialHttpChecks: [{
        name: "Invalid item create",
        probeType: "boundary",
        method: "POST",
        url: `${baseUrl}/api/items`,
        json: {},
        assertions: [
          { type: "status", status: 400 },
          { type: "jsonPathIncludes", path: "error", value: "name" },
        ],
      }, {
        name: "Orphan item lookup",
        probeType: "orphan",
        url: `${baseUrl}/api/items/does-not-exist`,
        assertions: [
          { type: "status", status: 404 },
          { type: "jsonPathIncludes", path: "error", value: "not found" },
        ],
      }],
    }],
  });

  const probes = report.httpResults.filter(item => item.adversarial);
  const pass = report.status === "passed"
    && probes.length === 2
    && probes.every(item => item.status === "passed")
    && probes.some(item => item.probeType === "boundary" && item.statusCode === 400)
    && probes.some(item => item.probeType === "orphan" && item.statusCode === 404)
    && report.evidence.some(item => item.title.includes("Adversarial"))
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
  };
}

export async function runTestAgentAdversarialBrowserSelfTest() {
  const calls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName, input) => {
      calls.push({ toolName, input });
      if (toolName.endsWith("browser_snapshot")) return "Login\nInvalid password\nPlease try again";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { path: "adversarial-browser.png" };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `adversarial-browser-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent records adversarial browser probes.",
    acceptanceCriteria: ["Invalid login stays on login page"],
    requiredChecks: ["browser_e2e", "adversarial", "screenshots", "browser_snapshots", "browser_console_logs", "browser_network_logs", "console_errors"],
    projects: [{
      name: "adversarial-browser-self-test",
      workDir: process.cwd(),
      adversarialBrowserChecks: [{
        name: "Invalid login stays on login page",
        probeType: "negative_auth_ui",
        url: "http://example.test/login",
        actions: [
          { type: "goto", url: "http://example.test/login" },
        ],
        assertions: [
          { type: "urlIncludes", text: "/login" },
          { type: "visible", text: "Invalid password" },
          { type: "consoleNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: { browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const adversarialResults = report.browserResults.filter(item => item.adversarial);
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  return {
    pass: report.status === "passed"
      && adversarialResults.length === 1
      && adversarialResults[0].status === "passed"
      && adversarialResults[0].probeType === "negative_auth_ui"
      && adversarialResults[0].finalUrl === "http://example.test/login"
      && adversarialResults[0].pageTextPreview?.includes("Invalid password")
      && byCheck.get("adversarial")?.status === "verified"
      && report.evidence.some(item => item.title.includes("Adversarial"))
      && report.acceptanceCoverage.every(item => item.status === "verified")
      && calls.length >= 4,
    report,
    calls,
  };
}

export async function runTestAgentBrowserProbeTemplateSelfTest() {
  const calls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_type",
      "mcp__playwright__browser_click",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName, input) => {
      calls.push({ toolName, input });
      if (toolName.endsWith("browser_snapshot")) return [
        "Login",
        "Invalid password",
        "Counter stable",
        "Saved draft",
      ].join("\n");
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { path: `${input.filename || "template-check"}.png` };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `browser-probe-template-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent expands browser probe templates into executable checks.",
    acceptanceCriteria: [
      "Invalid form input template produces a real browser probe",
      "Repeated click template produces idempotent browser click evidence",
      "Refresh persistence template reloads and verifies saved state",
    ],
    requiredChecks: ["browser_e2e", "adversarial", "screenshots", "browser_snapshots", "browser_console_logs", "browser_network_logs", "console_errors"],
    projects: [{
      name: "browser-probe-template-self-test",
      workDir: process.cwd(),
      adversarialBrowserProbeTemplates: [
        {
          kind: "invalid_form_input",
          name: "Invalid form input template",
          url: "http://example.test/login",
          fields: [
            { label: "Email", value: "bad@example.test" },
            { label: "Password", value: "wrong-password" },
          ],
          submit: { role: "button", name: "Sign in" },
          expectedUrlIncludes: "/login",
          expectedText: "Invalid password",
          screenshot: true,
        },
        {
          kind: "repeated_click",
          name: "Repeated click template",
          url: "http://example.test/counter",
          target: { role: "button", name: "Retry" },
          repeat: 4,
          expectedUrlIncludes: "/counter",
          expectedText: "Counter stable",
          screenshot: true,
        },
        {
          kind: "refresh_persistence",
          name: "Refresh persistence template",
          url: "http://example.test/editor",
          setupActions: [
            { type: "fill", label: "Title", value: "Draft title" },
          ],
          stateAssertions: [
            { type: "visible", text: "Saved draft" },
          ],
          expectedUrlIncludes: "/editor",
          screenshot: true,
        },
      ],
    }],
    options: { browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const byProbe = new Map(report.browserResults.map(result => [result.probeType, result]));
  const invalidResult = byProbe.get("invalid_form_input");
  const repeatedResult = byProbe.get("repeated_click");
  const refreshResult = byProbe.get("refresh_persistence");
  const typed = report.browserToolCalls.filter(call => call.toolName.endsWith("browser_type"));
  const retryClicks = report.browserToolCalls.filter(call => call.toolName.endsWith("browser_click") && call.input?.name === "Retry");
  const navigations = report.browserToolCalls.filter(call => call.toolName.endsWith("browser_navigate"));
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  return {
    pass: report.status === "passed"
      && report.browserResults.length === 3
      && invalidResult?.adversarial === true
      && invalidResult?.finalUrl === "http://example.test/login"
      && invalidResult?.pageTextPreview?.includes("Invalid password")
      && (invalidResult?.pageSnapshots || []).length === 1
      && !!invalidResult?.consoleLogPath
      && !!invalidResult?.networkLogPath
      && invalidResult.steps.some(step => step.name.includes("fill") && step.status === "passed")
      && invalidResult.steps.some(step => step.name.includes("click") && step.status === "passed")
      && repeatedResult?.adversarial === true
      && repeatedResult?.finalUrl === "http://example.test/counter"
      && repeatedResult?.pageTextPreview?.includes("Counter stable")
      && repeatedResult.steps.filter(step => step.name.includes("click") && step.status === "passed").length === 4
      && refreshResult?.adversarial === true
      && refreshResult?.finalUrl === "http://example.test/editor"
      && refreshResult?.pageTextPreview?.includes("Saved draft")
      && refreshResult.steps.some(step => step.name.includes("reload") && step.status === "passed")
      && typed.length === 3
      && retryClicks.length === 4
      && navigations.length === 4
      && byCheck.get("browser_snapshots")?.status === "verified"
      && byCheck.get("browser_console_logs")?.status === "verified"
      && byCheck.get("browser_network_logs")?.status === "verified"
      && byCheck.get("adversarial")?.status === "verified"
      && !report.issues.some(issue => issue.code === "no_executable_checks"),
    report,
    calls,
  };
}


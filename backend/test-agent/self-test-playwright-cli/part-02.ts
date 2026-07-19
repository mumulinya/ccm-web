// Behavior-freeze extraction from self-test-playwright-cli.ts (part-02.ts).
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


export async function runTestAgentStandaloneHandoffRealWebSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-standalone-handoff-real-web-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const handoffPath = path.join(dir, "handoff.json");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/app`;
  const cliPath = path.join(__dirname, "cli.js");
  writeTaskBoardFixtureServer(dir);

  const handoff = {
    taskId: `standalone-handoff-real-web-self-test-${process.pid}-${Date.now()}`,
    groupId: "standalone-handoff-self-test-group",
    originalUserGoal: "Verify a group-main-agent handoff can drive TestAgent browser validation for a real web feature.",
    acceptanceCriteria: [
      'Task board saves "Ship handoff browser test" and still shows it after refresh at /app',
    ],
    completedTasks: [
      "The handoff CLI path can launch a real web fixture",
    ],
    completedByProjectAgents: ["frontend-agent", "verification-agent"],
    requiredChecks: [
      "commands",
      "http",
      "browser_e2e",
      "screenshots",
      "console_errors",
      "browser_snapshots",
      "browser_console_logs",
      "browser_network_logs",
      "browser_trace",
      "browser_har",
    ],
    projects: [{
      name: "standalone-handoff-real-web-self-test",
      workDir: dir,
      verificationCommands: [`"${process.execPath}" -e "console.log('handoff fixture command ok')"`],
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      httpChecks: [{
        name: "Handoff task board HTTP probe",
        url: targetUrl,
        assertions: [
          { type: "status", status: 200 },
          { type: "textIncludes", text: "Task board" },
        ],
      }],
      adversarialBrowserChecks: [{
        name: "Handoff CLI rejects an empty task",
        probeType: "invalid_form_input",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "click", role: "button", name: "Add task" },
        ],
        assertions: [
          { type: "text", text: "Task required" },
          { type: "consoleNoErrors" },
        ],
        screenshot: true,
      }],
      browserChecks: [{
        name: "Handoff CLI task board flow",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "fill", label: "Task", exact: true, value: "Ship handoff browser test" },
          { type: "click", role: "button", name: "Add task" },
          { type: "reload" },
        ],
        assertions: [
          { type: "text", text: "Ship handoff browser test" },
          { type: "localStorageIncludes", key: "tasks", value: "Ship handoff browser test" },
          { type: "urlIncludes", text: "/app" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        coversAcceptanceCriteria: [
          "Task creation and refresh persistence were implemented",
        ],
        screenshot: true,
      }],
      completedTasks: [
        "Task creation and refresh persistence were implemented",
      ],
      risks: [
        "Persistence must be verified in an actual browser session.",
      ],
    }],
    options: {
      browserProvider: "playwright",
      collectBrowserArtifacts: true,
    },
    metadata: {
      handoffSource: "standalone-handoff-real-web-self-test",
    },
  };
  fs.writeFileSync(handoffPath, JSON.stringify(handoff, null, 2), "utf-8");

  const runResult = spawnSync(process.execPath, [
    cliPath,
    "--from-handoff",
    handoffPath,
    "--summary",
    "--artifact-dir",
    artifactDir,
    "--browser-provider",
    "playwright",
    "--no-auto-discover",
  ], {
    cwd: dir,
    encoding: "utf-8",
    timeout: 120_000,
    windowsHide: true,
    env: { ...process.env },
  });

  const reportJsonPath = path.join(artifactDir, "report.json");
  const manifestPath = path.join(artifactDir, "artifact-manifest.json");
  const report = fs.existsSync(reportJsonPath) ? JSON.parse(fs.readFileSync(reportJsonPath, "utf-8")) : null;
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const verifyResult = fs.existsSync(manifestPath)
    ? spawnSync(process.execPath, [
      cliPath,
      "--verify-artifacts",
      manifestPath,
      "--summary",
    ], {
      cwd: dir,
      encoding: "utf-8",
      timeout: 60_000,
      windowsHide: true,
      env: { ...process.env },
    })
    : null;

  const browser = report?.browserResults?.[0];
  const byCheck = new Map<string, any>((report?.requiredCheckCoverage || []).map((item: any) => [item.check, item]));
  const browserArtifacts = browser?.browserArtifacts || [];
  const stdout = String(runResult.stdout || "");
  const stderr = String(runResult.stderr || "");
  const verifyStdout = String(verifyResult?.stdout || "");
  const pass = fs.existsSync(cliPath)
    && runResult.status === 0
    && !runResult.error
    && stdout.includes("TestAgent report: passed")
    && stderr.trim() === ""
    && report?.status === "passed"
    && report?.taskId === handoff.taskId
    && report?.groupId === handoff.groupId
    && report?.metadata?.handoffSource === "standalone-handoff-real-web-self-test"
    && report?.metadata?.completedByProjectAgents?.includes("frontend-agent")
    && report?.metadata?.completedByProjectAgents?.includes("verification-agent")
    && report?.commandResults?.some((item: any) => item.status === "passed" && String(item.output || "").includes("handoff fixture command ok"))
    && report?.httpResults?.some((item: any) => item.status === "passed" && item.name === "Handoff task board HTTP probe")
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl?.includes("/app")
    && browser?.pageTextPreview?.includes("Ship handoff browser test")
    && browser?.steps?.some((step: any) => step.name === "action:reload" && step.status === "passed")
    && browser?.steps?.some((step: any) => step.name === "assert:localStorageIncludes" && step.status === "passed")
    && browser?.screenshots?.some((item: string) => fs.existsSync(item))
    && browserArtifacts.some((item: any) => item.type === "trace" && fs.existsSync(item.path))
    && browserArtifacts.some((item: any) => item.type === "har" && fs.existsSync(item.path))
    && byCheck.get("commands")?.status === "verified"
    && byCheck.get("http")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && byCheck.get("console_errors")?.status === "verified"
    && byCheck.get("browser_trace")?.status === "verified"
    && byCheck.get("browser_har")?.status === "verified"
    && manifest?.summary?.browserTraces >= 1
    && manifest?.summary?.browserHars >= 1
    && verifyResult?.status === 0
    && verifyStdout.includes("TestAgent artifact verification: passed");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    runResult: {
      status: runResult.status,
      signal: runResult.signal,
      error: runResult.error?.message,
      stdout,
      stderr,
    },
    verifyResult: verifyResult ? {
      status: verifyResult.status,
      signal: verifyResult.signal,
      error: verifyResult.error?.message,
      stdout: verifyStdout,
      stderr: String(verifyResult.stderr || ""),
    } : null,
    report,
    manifest,
  };
}

export async function runTestAgentPlaywrightAvailabilitySelfTest() {
  let closed = false;
  let fallbackClosed = false;
  const available = await checkPlaywrightAvailability(() => ({
    chromium: {
      launch: async () => ({
        close: async () => { closed = true; },
      }),
    },
  }));
  const unavailable = await checkPlaywrightAvailability(() => ({
    chromium: {
      launch: async () => {
        throw new Error("missing chromium binary");
      },
    },
  }));
  const fallback = await checkPlaywrightAvailability(() => ({
    chromium: {
      launch: async (options: any = {}) => {
        if (options.channel === "msedge") {
          return { close: async () => { fallbackClosed = true; } };
        }
        throw new Error(`missing ${options.channel || "bundled"}`);
      },
    },
  }));
  const availableDiagnostics: any = available.diagnostics || {};
  const unavailableDiagnostics: any = unavailable.diagnostics || {};
  const fallbackDiagnostics: any = fallback.diagnostics || {};
  const unavailableReason = String(unavailable.reason || "");
  const fallbackErrors = Array.isArray(fallbackDiagnostics.launchFallbackErrors)
    ? fallbackDiagnostics.launchFallbackErrors
    : [];
  return {
    pass: available.available === true
      && closed
      && availableDiagnostics.packageAvailable === true
      && availableDiagnostics.launchChecked === true
      && availableDiagnostics.launchAttempt === "bundled-chromium"
      && unavailable.available === false
      && unavailableReason.includes("Chromium launch failed")
      && unavailableDiagnostics.launchChecked === true
      && Array.isArray(unavailableDiagnostics.launchAttempts)
      && fallback.available === true
      && fallbackClosed
      && fallbackDiagnostics.channel === "msedge"
      && fallbackDiagnostics.launchAttempt === "msedge-channel"
      && fallbackErrors.length === 1,
    available,
    unavailable,
    fallback,
  };
}


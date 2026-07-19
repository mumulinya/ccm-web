// Behavior-freeze helpers extracted from part-03.ts.
// Coverage fixture builders — host orchestrates pass/return.

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

export function buildRequiredCheckCoverageFixturesPart01(dir: string) {
  const { workOrder: networkWorkOrder } = normalizeTestAgentWorkOrder({
    id: `required-browser-network-coverage-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Browser network evidence is tracked separately from generic browser evidence."],
    requiredChecks: ["browser_e2e", "browser_network", "browser_network_logs"],
    projects: [{ name: "required-browser-network-coverage-self-test", workDir: dir }],
  });
  const genericBrowserCoverage = buildRequiredCheckCoverage({
    workOrder: networkWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-browser-network-coverage-self-test",
      name: "Generic browser check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Ready" }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      networkRequests: [],
    } as any],
  });
  const networkBrowserCoverage = buildRequiredCheckCoverage({
    workOrder: networkWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-browser-network-coverage-self-test",
      name: "Network browser check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "assertion" as const, name: "assert:networkRequest", status: "passed" as const, detail: "method=POST urlIncludes=/api/tasks" },
        { kind: "assertion" as const, name: "assert:networkResponse", status: "passed" as const, detail: "status=201 urlIncludes=/api/tasks" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      networkRequests: ["request POST http://example.test/api/tasks", "response 201 fetch http://example.test/api/tasks"],
      networkLogPath: path.join(dir, "browser.network.log"),
    } as any],
  });
  const failedNetworkBrowserCoverage = buildRequiredCheckCoverage({
    workOrder: networkWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-browser-network-coverage-self-test",
      name: "Failed network browser check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected browser network telemetry to match method=POST urlIncludes=/api/tasks.",
      steps: [{ kind: "assertion" as const, name: "assert:networkRequest", status: "failed" as const, detail: "method=POST urlIncludes=/api/tasks", error: "Expected browser network telemetry to match method=POST urlIncludes=/api/tasks." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      networkRequests: [],
    } as any],
  });
  const { workOrder: accessibilityWorkOrder } = normalizeTestAgentWorkOrder({
    id: `required-accessibility-coverage-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Accessibility evidence is tracked separately from generic browser evidence."],
    requiredChecks: ["browser_e2e", "accessibility", "aria", "browser_accessibility_snapshot"],
    projects: [{ name: "required-accessibility-coverage-self-test", workDir: dir }],
  });
  const genericAccessibilityCoverage = buildRequiredCheckCoverage({
    workOrder: accessibilityWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-accessibility-coverage-self-test",
      name: "Generic browser check",
      url: "http://example.test/settings",
      finalUrl: "http://example.test/settings",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Settings" }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      browserArtifacts: [],
    } as any],
  });
  const accessibilityBrowserCoverage = buildRequiredCheckCoverage({
    workOrder: accessibilityWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-accessibility-coverage-self-test",
      name: "Accessibility browser check",
      url: "http://example.test/settings",
      finalUrl: "http://example.test/settings",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "assertion" as const, name: "assert:accessibleNameEquals", status: "passed" as const, detail: "button name=Save profile" },
        { kind: "assertion" as const, name: "assert:ariaExpanded", status: "passed" as const, detail: "aria-expanded=true" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      browserArtifacts: [{
        type: "accessibility_snapshot",
        title: "Accessibility snapshot",
        path: path.join(dir, "settings.aria.txt"),
        source: "self-test",
      }],
    } as any],
  });
  const failedAccessibilityCoverage = buildRequiredCheckCoverage({
    workOrder: accessibilityWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-accessibility-coverage-self-test",
      name: "Failed accessibility browser check",
      url: "http://example.test/settings",
      finalUrl: "http://example.test/settings",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected accessible name to equal Save profile.",
      steps: [{ kind: "assertion" as const, name: "assert:accessibleNameEquals", status: "failed" as const, detail: "button name=Save profile", error: "Expected accessible name to equal Save profile." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      browserArtifacts: [],
    } as any],
  });
  const { workOrder: consoleWarningWorkOrder } = normalizeTestAgentWorkOrder({
    id: `required-console-warning-coverage-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Console warning evidence is tracked separately from generic browser evidence."],
    requiredChecks: ["browser_e2e", "console_warnings", "console_errors"],
    projects: [{ name: "required-console-warning-coverage-self-test", workDir: dir }],
  });
  const genericConsoleWarningCoverage = buildRequiredCheckCoverage({
    workOrder: consoleWarningWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-console-warning-coverage-self-test",
      name: "Generic browser check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Ready" }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const warningFreeConsoleCoverage = buildRequiredCheckCoverage({
    workOrder: consoleWarningWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-console-warning-coverage-self-test",
      name: "Warning-free browser check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:consoleNoWarnings", status: "passed" as const, detail: "no console warning messages" }],
      screenshots: [],
      consoleMessages: ["[log] feature ready"],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      consoleLogPath: path.join(dir, "warning-free.console.log"),
    } as any],
  });
  const warningConsoleCoverage = buildRequiredCheckCoverage({
    workOrder: consoleWarningWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-console-warning-coverage-self-test",
      name: "Warning browser check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Ready" }],
      screenshots: [],
      consoleMessages: ["[warning] deprecated API used"],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      consoleLogPath: path.join(dir, "warning.console.log"),
    } as any],
  });
  const failedWarningAssertionCoverage = buildRequiredCheckCoverage({
    workOrder: consoleWarningWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-console-warning-coverage-self-test",
      name: "Failed warning assertion browser check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:consoleNoWarnings", status: "failed" as const, detail: "no console warning messages", error: "Unexpected browser console telemetry matched no console warning messages: warning: deprecated API" }],
      screenshots: [],
      consoleMessages: ["warning: deprecated API"],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      consoleLogPath: path.join(dir, "failed-warning.console.log"),
    } as any],
  });
  const failedConsoleErrorCoverage = buildRequiredCheckCoverage({
    workOrder: consoleWarningWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-console-warning-coverage-self-test",
      name: "Console error browser check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Ready" }],
      screenshots: [],
      consoleMessages: ["error: Uncaught TypeError: boom"],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      consoleLogPath: path.join(dir, "console-error.console.log"),
    } as any],
  });
  const computerUseConsoleCoverage = buildRequiredCheckCoverage({
    workOrder: consoleWarningWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-console-warning-coverage-self-test",
      name: "Computer Use browser check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "passed" as const,
      provider: "mcp" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "action" as const, name: "computer-use:goto", status: "passed" as const, detail: "http://example.test/app typed into the active browser" }],
      screenshots: [],
      consoleMessages: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      consoleLogPath: path.join(dir, "computer-use.console.log"),
    } as any],
  });
  const { workOrder: browserInteractionWorkOrder } = normalizeTestAgentWorkOrder({
    id: `required-browser-interaction-coverage-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Dialog and popup evidence is tracked separately from generic browser evidence."],
    requiredChecks: ["browser_e2e", "browser_dialog", "browser_popup", "browser_dialog_log", "browser_popup_log"],
    projects: [{ name: "required-browser-interaction-coverage-self-test", workDir: dir }],
  });
  const genericInteractionCoverage = buildRequiredCheckCoverage({
    workOrder: browserInteractionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-browser-interaction-coverage-self-test",
      name: "Generic browser check with interaction logs",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Ready" }],
      screenshots: [],
      consoleMessages: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      dialogMessages: [],
      popupMessages: [],
      dialogLogPath: path.join(dir, "generic.dialogs.log"),
      popupLogPath: path.join(dir, "generic.popups.log"),
    } as any],
  });
  const dialogInteractionCoverage = buildRequiredCheckCoverage({
    workOrder: browserInteractionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-browser-interaction-coverage-self-test",
      name: "Dialog browser check",
      url: "http://example.test/dialogs",
      finalUrl: "http://example.test/dialogs",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:dialogMessageIncludes", status: "passed" as const, detail: "dialogType=alert; expected message substring length=12" }],
      screenshots: [],
      consoleMessages: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      dialogMessages: ["dialog alert message=\"Saved profile\" accepted=yes"],
      popupMessages: [],
      dialogLogPath: path.join(dir, "dialog.dialogs.log"),
    } as any],
  });
  const failedDialogInteractionCoverage = buildRequiredCheckCoverage({
    workOrder: browserInteractionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-browser-interaction-coverage-self-test",
      name: "Failed dialog browser check",
      url: "http://example.test/dialogs",
      finalUrl: "http://example.test/dialogs",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected browser dialog matching dialogType=alert.",
      steps: [{ kind: "assertion" as const, name: "assert:dialogMessageIncludes", status: "failed" as const, detail: "dialogType=alert; expected message substring length=9", error: "Observed dialogs: confirm: wrong type" }],
      screenshots: [],
      consoleMessages: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      dialogMessages: ["dialog confirm message=\"Confirm shipping\" accepted=yes"],
      popupMessages: [],
      dialogLogPath: path.join(dir, "failed-dialog.dialogs.log"),
    } as any],
  });
  const popupInteractionCoverage = buildRequiredCheckCoverage({
    workOrder: browserInteractionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-browser-interaction-coverage-self-test",
      name: "Popup browser check",
      url: "http://example.test/help",
      finalUrl: "http://example.test/help",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:popupTextIncludes", status: "passed" as const, detail: "any popup; expected text substring length=12" }],
      screenshots: [],
      consoleMessages: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      dialogMessages: [],
      popupMessages: ["popup url=http://example.test/help title=\"Help Center\" text=\"Support article\""],
      popupLogPath: path.join(dir, "popup.popups.log"),
    } as any],
  });
  const failedPopupInteractionCoverage = buildRequiredCheckCoverage({
    workOrder: browserInteractionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-browser-interaction-coverage-self-test",
      name: "Failed popup browser check",
      url: "http://example.test/help",
      finalUrl: "http://example.test/help",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected browser popup matching any popup.",
      steps: [{ kind: "assertion" as const, name: "assert:popupTextIncludes", status: "failed" as const, detail: "any popup; expected text substring length=15", error: "Observed popups: 1" }],
      screenshots: [],
      consoleMessages: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      dialogMessages: [],
      popupMessages: ["popup url=http://example.test/help title=\"Help Center\" text=\"Support article\""],
      popupLogPath: path.join(dir, "failed-popup.popups.log"),
    } as any],
  });
  const { workOrder: transferWorkOrder } = normalizeTestAgentWorkOrder({
    id: `required-transfer-coverage-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Upload and download evidence is tracked separately from generic browser evidence."],
    requiredChecks: ["browser_e2e", "browser_upload", "browser_download"],
    projects: [{ name: "required-transfer-coverage-self-test", workDir: dir }],
  });
  const genericTransferCoverage = buildRequiredCheckCoverage({
    workOrder: transferWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-transfer-coverage-self-test",
      name: "Generic browser check",
      url: "http://example.test/files",
      finalUrl: "http://example.test/files",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Files" }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      browserArtifacts: [],
    } as any],
  });
  const uploadTransferCoverage = buildRequiredCheckCoverage({
    workOrder: transferWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-transfer-coverage-self-test",
      name: "Upload browser check",
      url: "http://example.test/upload",
      finalUrl: "http://example.test/upload",
      status: "passed" as const,
      provider: "playwright" as const,
      probeType: "acceptance_upload_flow",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "action" as const, name: "action:uploadFile", status: "passed" as const, detail: "label=Attachment; files=notes.txt" },
        { kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Uploaded notes.txt" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      browserArtifacts: [],
    } as any],
  });
  const failedUploadTransferCoverage = buildRequiredCheckCoverage({
    workOrder: transferWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-transfer-coverage-self-test",
      name: "Failed upload browser check",
      url: "http://example.test/upload",
      finalUrl: "http://example.test/upload",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "uploadFile requires filePath/file_path/path or fileContent/file_content/content.",
      steps: [{ kind: "action" as const, name: "action:uploadFile", status: "failed" as const, detail: "label=Attachment", error: "uploadFile requires filePath/file_path/path or fileContent/file_content/content." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      browserArtifacts: [],
    } as any],
  });
  const downloadTransferCoverage = buildRequiredCheckCoverage({
    workOrder: transferWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-transfer-coverage-self-test",
      name: "Download browser check",
      url: "http://example.test/exports",
      finalUrl: "http://example.test/exports",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:downloadedFile", status: "passed" as const, detail: "filename=tasks.csv; contentIncludes=Ship TestAgent" }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      browserArtifacts: [{
        type: "download",
        title: "Download: tasks.csv",
        path: path.join(dir, "tasks.csv"),
        source: "self-test",
      }],
    } as any],
  });
  const failedDownloadTransferCoverage = buildRequiredCheckCoverage({
    workOrder: transferWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-transfer-coverage-self-test",
      name: "Failed download browser check",
      url: "http://example.test/exports",
      finalUrl: "http://example.test/exports",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected downloaded file matching filename=tasks.csv.",
      steps: [{ kind: "assertion" as const, name: "assert:downloadedFile", status: "failed" as const, detail: "filename=tasks.csv", error: "No downloads were observed." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
      browserArtifacts: [],
    } as any],
  });
  const { workOrder: inputWorkOrder } = normalizeTestAgentWorkOrder({
    id: `required-input-coverage-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Keyboard, focus, and clipboard evidence is tracked separately from generic browser evidence."],
    requiredChecks: ["browser_e2e", "browser_clipboard", "browser_focus", "browser_keyboard"],
    projects: [{ name: "required-input-coverage-self-test", workDir: dir }],
  });
  const genericInputCoverage = buildRequiredCheckCoverage({
    workOrder: inputWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-input-coverage-self-test",
      name: "Generic browser check",
      url: "http://example.test/input",
      finalUrl: "http://example.test/input",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Input Ready" }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const clipboardInputCoverage = buildRequiredCheckCoverage({
    workOrder: inputWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-input-coverage-self-test",
      name: "Clipboard browser check",
      url: "http://example.test/input",
      finalUrl: "http://example.test/input",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "action" as const, name: "action:setClipboard", status: "passed" as const, detail: "text length=12" },
        { kind: "assertion" as const, name: "assert:clipboardTextEquals", status: "passed" as const, detail: "expected length=12" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedClipboardInputCoverage = buildRequiredCheckCoverage({
    workOrder: inputWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-input-coverage-self-test",
      name: "Failed clipboard browser check",
      url: "http://example.test/input",
      finalUrl: "http://example.test/input",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Clipboard text did not match expected length.",
      steps: [{ kind: "assertion" as const, name: "assert:clipboardTextEquals", status: "failed" as const, detail: "expected length=12", error: "Clipboard text length 4 did not equal expected length 12." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const focusInputCoverage = buildRequiredCheckCoverage({
    workOrder: inputWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-input-coverage-self-test",
      name: "Focus browser check",
      url: "http://example.test/input",
      finalUrl: "http://example.test/input",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "action" as const, name: "action:focus", status: "passed" as const, detail: "label=Email" },
        { kind: "assertion" as const, name: "assert:focused", status: "passed" as const, detail: "label=Email" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedFocusInputCoverage = buildRequiredCheckCoverage({
    workOrder: inputWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-input-coverage-self-test",
      name: "Failed focus browser check",
      url: "http://example.test/input",
      finalUrl: "http://example.test/input",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected target to be focused.",
      steps: [{ kind: "assertion" as const, name: "assert:focused", status: "failed" as const, detail: "role=button; name=Save", error: "Expected target to be focused." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const keyboardInputCoverage = buildRequiredCheckCoverage({
    workOrder: inputWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-input-coverage-self-test",
      name: "Keyboard browser check",
      url: "http://example.test/input",
      finalUrl: "http://example.test/input",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "action" as const, name: "action:typeText", status: "passed" as const, detail: "label=Search; text length=5" },
        { kind: "action" as const, name: "action:press", status: "passed" as const, detail: "Enter" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedKeyboardInputCoverage = buildRequiredCheckCoverage({
    workOrder: inputWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-input-coverage-self-test",
      name: "Failed keyboard browser check",
      url: "http://example.test/input",
      finalUrl: "http://example.test/input",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "press requires key/text/value.",
      steps: [{ kind: "action" as const, name: "action:press", status: "failed" as const, detail: "", error: "press requires key/text/value." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const { workOrder: visualLayoutWorkOrder } = normalizeTestAgentWorkOrder({
    id: `required-visual-layout-coverage-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Visual and layout evidence is tracked separately from generic browser and screenshot evidence."],
    requiredChecks: ["browser_e2e", "screenshots", "browser_visual", "browser_layout"],
    projects: [{ name: "required-visual-layout-coverage-self-test", workDir: dir }],
  });
  const genericVisualLayoutCoverage = buildRequiredCheckCoverage({
    workOrder: visualLayoutWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-visual-layout-coverage-self-test",
      name: "Generic browser check with screenshot",
      url: "http://example.test/visual",
      finalUrl: "http://example.test/visual",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Chart ready" }],
      screenshots: [path.join(dir, "visual.png")],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const visualAssertionCoverage = buildRequiredCheckCoverage({
    workOrder: visualLayoutWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-visual-layout-coverage-self-test",
      name: "Visual browser check",
      url: "http://example.test/visual",
      finalUrl: "http://example.test/visual",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:elementScreenshotNotBlank", status: "passed" as const, detail: "selector=#chart; minUniqueColors=3" }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedVisualAssertionCoverage = buildRequiredCheckCoverage({
    workOrder: visualLayoutWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-visual-layout-coverage-self-test",
      name: "Failed visual browser check",
      url: "http://example.test/visual",
      finalUrl: "http://example.test/visual",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Element screenshot was visually blank.",
      steps: [{ kind: "assertion" as const, name: "assert:elementScreenshotNotBlank", status: "failed" as const, detail: "selector=#chart; minNonWhitePixels=100", error: "Expected element screenshot to contain non-blank visual content." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const layoutAssertionCoverage = buildRequiredCheckCoverage({
    workOrder: visualLayoutWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-visual-layout-coverage-self-test",
      name: "Layout browser check",
      url: "http://example.test/layout",
      finalUrl: "http://example.test/layout",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "assertion" as const, name: "assert:inViewport", status: "passed" as const, detail: "testId=cta" },
        { kind: "assertion" as const, name: "assert:noHorizontalOverflow", status: "passed" as const, detail: "scrollWidth=390 clientWidth=390" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedLayoutAssertionCoverage = buildRequiredCheckCoverage({
    workOrder: visualLayoutWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-visual-layout-coverage-self-test",
      name: "Failed layout browser check",
      url: "http://example.test/layout",
      finalUrl: "http://example.test/layout",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected no horizontal overflow.",
      steps: [{ kind: "assertion" as const, name: "assert:noHorizontalOverflow", status: "failed" as const, detail: "scrollWidth=900 clientWidth=390", error: "Page has horizontal overflow." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  return {
    genericBrowserCoverage,
    networkBrowserCoverage,
    failedNetworkBrowserCoverage,
    genericAccessibilityCoverage,
    accessibilityBrowserCoverage,
    failedAccessibilityCoverage,
    genericConsoleWarningCoverage,
    warningFreeConsoleCoverage,
    warningConsoleCoverage,
    failedWarningAssertionCoverage,
    failedConsoleErrorCoverage,
    computerUseConsoleCoverage,
    genericInteractionCoverage,
    dialogInteractionCoverage,
    failedDialogInteractionCoverage,
    popupInteractionCoverage,
    failedPopupInteractionCoverage,
    genericTransferCoverage,
    uploadTransferCoverage,
    failedUploadTransferCoverage,
    downloadTransferCoverage,
    failedDownloadTransferCoverage,
    genericInputCoverage,
    clipboardInputCoverage,
    failedClipboardInputCoverage,
    focusInputCoverage,
    failedFocusInputCoverage,
    keyboardInputCoverage,
    failedKeyboardInputCoverage,
    genericVisualLayoutCoverage,
    visualAssertionCoverage,
    failedVisualAssertionCoverage,
    layoutAssertionCoverage,
    failedLayoutAssertionCoverage
  };
}

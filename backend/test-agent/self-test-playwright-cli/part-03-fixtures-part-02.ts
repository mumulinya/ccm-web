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

export function buildRequiredCheckCoverageFixturesPart02(dir: string) {
  const { workOrder: uiStructureWorkOrder } = normalizeTestAgentWorkOrder({
    id: `required-ui-structure-coverage-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Form, table, list, and text-order evidence is tracked separately from generic browser evidence."],
    requiredChecks: ["browser_e2e", "browser_form", "form_state", "input_value", "selected", "checked", "enabled", "browser_table", "browser_list", "browser_text_order"],
    projects: [{ name: "required-ui-structure-coverage-self-test", workDir: dir }],
  });
  const genericUiStructureCoverage = buildRequiredCheckCoverage({
    workOrder: uiStructureWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-ui-structure-coverage-self-test",
      name: "Generic browser check",
      url: "http://example.test/dashboard",
      finalUrl: "http://example.test/dashboard",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Dashboard Ready" }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const formFlowCoverage = buildRequiredCheckCoverage({
    workOrder: uiStructureWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-ui-structure-coverage-self-test",
      name: "Acceptance form flow",
      url: "http://example.test/profile",
      finalUrl: "http://example.test/profile",
      status: "passed" as const,
      provider: "playwright" as const,
      probeType: "acceptance_form_flow",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "action" as const, name: "action:fill", status: "passed" as const, detail: "label=Display name; value length=12" },
        { kind: "action" as const, name: "action:click", status: "passed" as const, detail: "role=button; name=Save" },
        { kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Saved profile" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const formStateCoverage = buildRequiredCheckCoverage({
    workOrder: uiStructureWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-ui-structure-coverage-self-test",
      name: "Form state browser check",
      url: "http://example.test/profile",
      finalUrl: "http://example.test/profile",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "assertion" as const, name: "assert:inputValueEquals", status: "passed" as const, detail: "label=Display name; expected length=12" },
        { kind: "assertion" as const, name: "assert:selectedTextIncludes", status: "passed" as const, detail: "label=Priority; expected=High" },
        { kind: "assertion" as const, name: "assert:checked", status: "passed" as const, detail: "label=Notify team" },
        { kind: "assertion" as const, name: "assert:enabled", status: "passed" as const, detail: "role=button; name=Save" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedFormStateCoverage = buildRequiredCheckCoverage({
    workOrder: uiStructureWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-ui-structure-coverage-self-test",
      name: "Failed form state browser check",
      url: "http://example.test/profile",
      finalUrl: "http://example.test/profile",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected input value to equal Ada Lovelace.",
      steps: [{ kind: "assertion" as const, name: "assert:inputValueEquals", status: "failed" as const, detail: "label=Display name; expected length=12", error: "Expected input value to equal Ada Lovelace." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const tableCoverage = buildRequiredCheckCoverage({
    workOrder: uiStructureWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-ui-structure-coverage-self-test",
      name: "Table browser check",
      url: "http://example.test/orders",
      finalUrl: "http://example.test/orders",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "assertion" as const, name: "assert:tableRowIncludes", status: "passed" as const, detail: "selector=#orders; expected text count=2" },
        { kind: "assertion" as const, name: "assert:tableCellTextEquals", status: "passed" as const, detail: "column=Status; expected=Shipped" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedTableCoverage = buildRequiredCheckCoverage({
    workOrder: uiStructureWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-ui-structure-coverage-self-test",
      name: "Failed table browser check",
      url: "http://example.test/orders",
      finalUrl: "http://example.test/orders",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected table cell Status to equal Shipped.",
      steps: [{ kind: "assertion" as const, name: "assert:tableCellTextEquals", status: "failed" as const, detail: "column=Status; expected=Shipped", error: "Expected table cell Status to equal Shipped." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const listCoverage = buildRequiredCheckCoverage({
    workOrder: uiStructureWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-ui-structure-coverage-self-test",
      name: "List browser check",
      url: "http://example.test/tasks",
      finalUrl: "http://example.test/tasks",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:elementCountAtLeast", status: "passed" as const, detail: "role=listitem; min count=3" }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedListCoverage = buildRequiredCheckCoverage({
    workOrder: uiStructureWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-ui-structure-coverage-self-test",
      name: "Failed list browser check",
      url: "http://example.test/tasks",
      finalUrl: "http://example.test/tasks",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected element count to equal 3.",
      steps: [{ kind: "assertion" as const, name: "assert:elementCountEquals", status: "failed" as const, detail: "role=listitem; expected count=3", error: "Expected element count to equal 3." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const textOrderCoverage = buildRequiredCheckCoverage({
    workOrder: uiStructureWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-ui-structure-coverage-self-test",
      name: "Text order browser check",
      url: "http://example.test/tasks",
      finalUrl: "http://example.test/tasks",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:textOrder", status: "passed" as const, detail: "expected text count=3" }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedTextOrderCoverage = buildRequiredCheckCoverage({
    workOrder: uiStructureWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-ui-structure-coverage-self-test",
      name: "Failed text order browser check",
      url: "http://example.test/tasks",
      finalUrl: "http://example.test/tasks",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected text order to match Alpha, Bravo, Charlie.",
      steps: [{ kind: "assertion" as const, name: "assert:textOrder", status: "failed" as const, detail: "expected text count=3", error: "Expected text order to match Alpha, Bravo, Charlie." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const { workOrder: pageStateWorkOrder } = normalizeTestAgentWorkOrder({
    id: `required-page-state-coverage-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["URL, title, navigation, attributes, network state, and presence evidence is tracked separately from generic browser evidence."],
    requiredChecks: ["browser_e2e", "browser_url", "browser_title", "browser_navigation", "browser_attribute", "browser_network_state", "browser_presence", "browser_visibility"],
    projects: [{ name: "required-page-state-coverage-self-test", workDir: dir }],
  });
  const genericPageStateCoverage = buildRequiredCheckCoverage({
    workOrder: pageStateWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-page-state-coverage-self-test",
      name: "Generic browser check",
      url: "http://example.test/home",
      finalUrl: "http://example.test/home",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "Home Ready" }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const urlTitleNavigationCoverage = buildRequiredCheckCoverage({
    workOrder: pageStateWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-page-state-coverage-self-test",
      name: "URL title navigation browser check",
      url: "http://example.test/start",
      finalUrl: "http://example.test/done",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "action" as const, name: "action:waitForUrl", status: "passed" as const, detail: "/done" },
        { kind: "assertion" as const, name: "assert:urlIncludes", status: "passed" as const, detail: "expected=/done" },
        { kind: "assertion" as const, name: "assert:titleEquals", status: "passed" as const, detail: "expected=Done Title" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedUrlTitleNavigationCoverage = buildRequiredCheckCoverage({
    workOrder: pageStateWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-page-state-coverage-self-test",
      name: "Failed URL title navigation browser check",
      url: "http://example.test/start",
      finalUrl: "http://example.test/login",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected URL to include /done and title to equal Done Title.",
      steps: [
        { kind: "assertion" as const, name: "assert:urlIncludes", status: "failed" as const, detail: "expected=/done", error: "Expected URL to include /done." },
        { kind: "assertion" as const, name: "assert:titleEquals", status: "failed" as const, detail: "expected=Done Title", error: "Expected title to equal Done Title." },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const attributeCoverage = buildRequiredCheckCoverage({
    workOrder: pageStateWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-page-state-coverage-self-test",
      name: "Attribute browser check",
      url: "http://example.test/menu",
      finalUrl: "http://example.test/menu",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "assertion" as const, name: "assert:attributeEquals", status: "passed" as const, detail: "attribute=aria-expanded; expected length=4" },
        { kind: "assertion" as const, name: "assert:attributeIncludes", status: "passed" as const, detail: "attribute=data-state; expected substring length=6" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedAttributeCoverage = buildRequiredCheckCoverage({
    workOrder: pageStateWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-page-state-coverage-self-test",
      name: "Failed attribute browser check",
      url: "http://example.test/menu",
      finalUrl: "http://example.test/menu",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected aria-expanded to equal true.",
      steps: [{ kind: "assertion" as const, name: "assert:attributeEquals", status: "failed" as const, detail: "attribute=aria-expanded; expected length=4", error: "Expected aria-expanded to equal true." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const networkStateCoverage = buildRequiredCheckCoverage({
    workOrder: pageStateWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-page-state-coverage-self-test",
      name: "Network state browser check",
      url: "http://example.test/network",
      finalUrl: "http://example.test/network",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "action" as const, name: "action:setOffline", status: "passed" as const, detail: "offline" },
        { kind: "assertion" as const, name: "assert:browserOffline", status: "passed" as const, detail: "offline" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedNetworkStateCoverage = buildRequiredCheckCoverage({
    workOrder: pageStateWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-page-state-coverage-self-test",
      name: "Failed network state browser check",
      url: "http://example.test/network",
      finalUrl: "http://example.test/network",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected browser to be online.",
      steps: [{ kind: "assertion" as const, name: "assert:browserOnline", status: "failed" as const, detail: "online", error: "Expected browser to be online." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const presenceCoverage = buildRequiredCheckCoverage({
    workOrder: pageStateWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-page-state-coverage-self-test",
      name: "Presence browser check",
      url: "http://example.test/items",
      finalUrl: "http://example.test/items",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "assertion" as const, name: "assert:visible", status: "passed" as const, detail: "role=button; name=Save" },
        { kind: "assertion" as const, name: "assert:notPresent", status: "passed" as const, detail: "selector=#deleted" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedPresenceCoverage = buildRequiredCheckCoverage({
    workOrder: pageStateWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-page-state-coverage-self-test",
      name: "Failed presence browser check",
      url: "http://example.test/items",
      finalUrl: "http://example.test/items",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected target to be hidden.",
      steps: [{ kind: "assertion" as const, name: "assert:notVisible", status: "failed" as const, detail: "text=Debug panel", error: "Expected target to be hidden." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const { workOrder: interactionActionWorkOrder } = normalizeTestAgentWorkOrder({
    id: `required-interaction-action-coverage-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Hover, drag/drop, scroll, and history action evidence is tracked separately from generic browser evidence."],
    requiredChecks: ["browser_e2e", "browser_hover", "browser_drag", "browser_scroll", "browser_history", "browser_reload"],
    projects: [{ name: "required-interaction-action-coverage-self-test", workDir: dir }],
  });
  const genericInteractionActionCoverage = buildRequiredCheckCoverage({
    workOrder: interactionActionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-interaction-action-coverage-self-test",
      name: "Generic browser check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "App Ready" }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const hoverInteractionActionCoverage = buildRequiredCheckCoverage({
    workOrder: interactionActionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-interaction-action-coverage-self-test",
      name: "Hover browser check",
      url: "http://example.test/menu",
      finalUrl: "http://example.test/menu",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "action" as const, name: "action:hover", status: "passed" as const, detail: "role=button; name=Tools" },
        { kind: "assertion" as const, name: "assert:visible", status: "passed" as const, detail: "role=menuitem; name=Export" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedHoverInteractionActionCoverage = buildRequiredCheckCoverage({
    workOrder: interactionActionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-interaction-action-coverage-self-test",
      name: "Failed hover browser check",
      url: "http://example.test/menu",
      finalUrl: "http://example.test/menu",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected hover target to be visible.",
      steps: [{ kind: "action" as const, name: "action:hover", status: "failed" as const, detail: "role=button; name=Missing", error: "Expected hover target to be visible." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const dragInteractionActionCoverage = buildRequiredCheckCoverage({
    workOrder: interactionActionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-interaction-action-coverage-self-test",
      name: "Drag browser check",
      url: "http://example.test/board",
      finalUrl: "http://example.test/board",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "action" as const, name: "action:dragTo", status: "passed" as const, detail: "text=Task; destinationTestId=done-column" },
        { kind: "assertion" as const, name: "assert:elementTextIncludes", status: "passed" as const, detail: "testId=done-list" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedDragInteractionActionCoverage = buildRequiredCheckCoverage({
    workOrder: interactionActionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-interaction-action-coverage-self-test",
      name: "Failed drag browser check",
      url: "http://example.test/board",
      finalUrl: "http://example.test/board",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Drag destination missing.",
      steps: [{ kind: "action" as const, name: "action:dragTo", status: "failed" as const, detail: "destinationTestId=missing-column", error: "Drag destination missing." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const scrollInteractionActionCoverage = buildRequiredCheckCoverage({
    workOrder: interactionActionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-interaction-action-coverage-self-test",
      name: "Scroll browser check",
      url: "http://example.test/landing",
      finalUrl: "http://example.test/landing",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "action" as const, name: "action:scroll", status: "passed" as const, detail: "page; down 920px" },
        { kind: "assertion" as const, name: "assert:inViewport", status: "passed" as const, detail: "testId=below-fold-cta" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedScrollInteractionActionCoverage = buildRequiredCheckCoverage({
    workOrder: interactionActionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-interaction-action-coverage-self-test",
      name: "Failed scroll browser check",
      url: "http://example.test/landing",
      finalUrl: "http://example.test/landing",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Scroll target missing.",
      steps: [{ kind: "action" as const, name: "action:scroll", status: "failed" as const, detail: "selector=#missing; down 400px", error: "Scroll target missing." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const historyInteractionActionCoverage = buildRequiredCheckCoverage({
    workOrder: interactionActionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-interaction-action-coverage-self-test",
      name: "History browser check",
      url: "http://example.test/start",
      finalUrl: "http://example.test/start",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "action" as const, name: "action:reload", status: "passed" as const, detail: "domcontentloaded" },
        { kind: "action" as const, name: "action:goBack", status: "passed" as const, detail: "domcontentloaded" },
        { kind: "action" as const, name: "action:goForward", status: "passed" as const, detail: "domcontentloaded" },
        { kind: "assertion" as const, name: "assert:urlIncludes", status: "passed" as const, detail: "/start" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedHistoryInteractionActionCoverage = buildRequiredCheckCoverage({
    workOrder: interactionActionWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-interaction-action-coverage-self-test",
      name: "Failed history browser check",
      url: "http://example.test/start",
      finalUrl: "http://example.test/start",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "History navigation failed.",
      steps: [{ kind: "action" as const, name: "action:goBack", status: "failed" as const, detail: "domcontentloaded", error: "History navigation failed." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const { workOrder: scriptWaitWorkOrder } = normalizeTestAgentWorkOrder({
    id: `required-script-wait-coverage-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Browser JavaScript/expression and conditional wait evidence is tracked separately from generic browser evidence."],
    requiredChecks: ["browser_e2e", "browser_js", "browser_script", "browser_wait"],
    projects: [{ name: "required-script-wait-coverage-self-test", workDir: dir }],
  });
  const genericScriptWaitCoverage = buildRequiredCheckCoverage({
    workOrder: scriptWaitWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-script-wait-coverage-self-test",
      name: "Generic browser check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [{ kind: "assertion" as const, name: "assert:text", status: "passed" as const, detail: "App Ready" }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const scriptCoverage = buildRequiredCheckCoverage({
    workOrder: scriptWaitWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-script-wait-coverage-self-test",
      name: "Browser script check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "action" as const, name: "action:evaluate", status: "passed" as const, detail: "localStorage.setItem('profile.saved','yes')" },
        { kind: "assertion" as const, name: "assert:jsTruthy", status: "passed" as const, detail: "Boolean(localStorage.getItem('profile.saved'))" },
        { kind: "assertion" as const, name: "assert:jsEquals", status: "passed" as const, detail: "document.readyState; expected=complete" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedScriptCoverage = buildRequiredCheckCoverage({
    workOrder: scriptWaitWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-script-wait-coverage-self-test",
      name: "Failed browser script check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Expected JavaScript expression to be truthy.",
      steps: [{ kind: "assertion" as const, name: "assert:jsTruthy", status: "failed" as const, detail: "window.__ready === true", error: "Expected JavaScript expression to be truthy." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const waitCoverage = buildRequiredCheckCoverage({
    workOrder: scriptWaitWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-script-wait-coverage-self-test",
      name: "Browser wait check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/done",
      status: "passed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      steps: [
        { kind: "action" as const, name: "action:waitForText", status: "passed" as const, detail: "Ready after async load" },
        { kind: "action" as const, name: "action:waitForSelector", status: "passed" as const, detail: "selector=#ready" },
        { kind: "action" as const, name: "action:waitForUrl", status: "passed" as const, detail: "/done" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  const failedWaitCoverage = buildRequiredCheckCoverage({
    workOrder: scriptWaitWorkOrder,
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserToolCalls: [],
    browserResults: [{
      project: "required-script-wait-coverage-self-test",
      name: "Failed browser wait check",
      url: "http://example.test/app",
      finalUrl: "http://example.test/app",
      status: "failed" as const,
      provider: "playwright" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      error: "Timed out waiting for async text.",
      steps: [{ kind: "action" as const, name: "action:waitForText", status: "failed" as const, detail: "Ready after async load", error: "Timed out waiting for async text." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    } as any],
  });
  return {
    genericUiStructureCoverage,
    formFlowCoverage,
    formStateCoverage,
    failedFormStateCoverage,
    tableCoverage,
    failedTableCoverage,
    listCoverage,
    failedListCoverage,
    textOrderCoverage,
    failedTextOrderCoverage,
    genericPageStateCoverage,
    urlTitleNavigationCoverage,
    failedUrlTitleNavigationCoverage,
    attributeCoverage,
    failedAttributeCoverage,
    networkStateCoverage,
    failedNetworkStateCoverage,
    presenceCoverage,
    failedPresenceCoverage,
    genericInteractionActionCoverage,
    hoverInteractionActionCoverage,
    failedHoverInteractionActionCoverage,
    dragInteractionActionCoverage,
    failedDragInteractionActionCoverage,
    scrollInteractionActionCoverage,
    failedScrollInteractionActionCoverage,
    historyInteractionActionCoverage,
    failedHistoryInteractionActionCoverage,
    genericScriptWaitCoverage,
    scriptCoverage,
    failedScriptCoverage,
    waitCoverage,
    failedWaitCoverage
  };
}

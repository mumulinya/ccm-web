// Behavior-freeze extraction from self-test-playwright-cli.ts (part-03.ts).
// Coverage fixtures live in companion helper modules.

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

import { buildRequiredCheckCoverageFixturesPart01 } from "./part-03-fixtures-part-01";
import { buildRequiredCheckCoverageFixturesPart02 } from "./part-03-fixtures-part-02";

export async function runTestAgentRequiredCheckCoverageSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-required-coverage-selftest-"));
  const report = await runTestAgent({
    id: `required-check-coverage-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify required check coverage gates final status.",
    acceptanceCriteria: ["Required checks are tracked separately"],
    requiredChecks: ["commands", "screenshots"],
    projects: [{
      name: "required-check-coverage-self-test",
      workDir: dir,
      verificationCommands: [`"${process.execPath}" -e "console.log('required command ok')"`],
    }],
    options: { browserProvider: "none" },
  });
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const __fixtures1 = buildRequiredCheckCoverageFixturesPart01(dir);
  const __fixtures2 = buildRequiredCheckCoverageFixturesPart02(dir);
  const {
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
    failedLayoutAssertionCoverage,
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
    failedWaitCoverage,
  } = { ...__fixtures1, ...__fixtures2 };
  const genericByCheck = new Map(genericBrowserCoverage.map(item => [item.check, item]));
  const networkByCheck = new Map(networkBrowserCoverage.map(item => [item.check, item]));
  const failedNetworkByCheck = new Map(failedNetworkBrowserCoverage.map(item => [item.check, item]));
  const genericAccessibilityByCheck = new Map(genericAccessibilityCoverage.map(item => [item.check, item]));
  const accessibilityByCheck = new Map(accessibilityBrowserCoverage.map(item => [item.check, item]));
  const failedAccessibilityByCheck = new Map(failedAccessibilityCoverage.map(item => [item.check, item]));
  const genericConsoleWarningByCheck = new Map(genericConsoleWarningCoverage.map(item => [item.check, item]));
  const warningFreeConsoleByCheck = new Map(warningFreeConsoleCoverage.map(item => [item.check, item]));
  const warningConsoleByCheck = new Map(warningConsoleCoverage.map(item => [item.check, item]));
  const failedWarningAssertionByCheck = new Map(failedWarningAssertionCoverage.map(item => [item.check, item]));
  const failedConsoleErrorByCheck = new Map(failedConsoleErrorCoverage.map(item => [item.check, item]));
  const computerUseConsoleByCheck = new Map(computerUseConsoleCoverage.map(item => [item.check, item]));
  const genericInteractionByCheck = new Map(genericInteractionCoverage.map(item => [item.check, item]));
  const dialogInteractionByCheck = new Map(dialogInteractionCoverage.map(item => [item.check, item]));
  const failedDialogInteractionByCheck = new Map(failedDialogInteractionCoverage.map(item => [item.check, item]));
  const popupInteractionByCheck = new Map(popupInteractionCoverage.map(item => [item.check, item]));
  const failedPopupInteractionByCheck = new Map(failedPopupInteractionCoverage.map(item => [item.check, item]));
  const genericTransferByCheck = new Map(genericTransferCoverage.map(item => [item.check, item]));
  const uploadTransferByCheck = new Map(uploadTransferCoverage.map(item => [item.check, item]));
  const failedUploadTransferByCheck = new Map(failedUploadTransferCoverage.map(item => [item.check, item]));
  const downloadTransferByCheck = new Map(downloadTransferCoverage.map(item => [item.check, item]));
  const failedDownloadTransferByCheck = new Map(failedDownloadTransferCoverage.map(item => [item.check, item]));
  const genericInputByCheck = new Map(genericInputCoverage.map(item => [item.check, item]));
  const clipboardInputByCheck = new Map(clipboardInputCoverage.map(item => [item.check, item]));
  const failedClipboardInputByCheck = new Map(failedClipboardInputCoverage.map(item => [item.check, item]));
  const focusInputByCheck = new Map(focusInputCoverage.map(item => [item.check, item]));
  const failedFocusInputByCheck = new Map(failedFocusInputCoverage.map(item => [item.check, item]));
  const keyboardInputByCheck = new Map(keyboardInputCoverage.map(item => [item.check, item]));
  const failedKeyboardInputByCheck = new Map(failedKeyboardInputCoverage.map(item => [item.check, item]));
  const genericVisualLayoutByCheck = new Map(genericVisualLayoutCoverage.map(item => [item.check, item]));
  const visualAssertionByCheck = new Map(visualAssertionCoverage.map(item => [item.check, item]));
  const failedVisualAssertionByCheck = new Map(failedVisualAssertionCoverage.map(item => [item.check, item]));
  const layoutAssertionByCheck = new Map(layoutAssertionCoverage.map(item => [item.check, item]));
  const failedLayoutAssertionByCheck = new Map(failedLayoutAssertionCoverage.map(item => [item.check, item]));
  const genericUiStructureByCheck = new Map(genericUiStructureCoverage.map(item => [item.check, item]));
  const formFlowByCheck = new Map(formFlowCoverage.map(item => [item.check, item]));
  const formStateByCheck = new Map(formStateCoverage.map(item => [item.check, item]));
  const failedFormStateByCheck = new Map(failedFormStateCoverage.map(item => [item.check, item]));
  const tableByCheck = new Map(tableCoverage.map(item => [item.check, item]));
  const failedTableByCheck = new Map(failedTableCoverage.map(item => [item.check, item]));
  const listByCheck = new Map(listCoverage.map(item => [item.check, item]));
  const failedListByCheck = new Map(failedListCoverage.map(item => [item.check, item]));
  const textOrderByCheck = new Map(textOrderCoverage.map(item => [item.check, item]));
  const failedTextOrderByCheck = new Map(failedTextOrderCoverage.map(item => [item.check, item]));
  const genericPageStateByCheck = new Map(genericPageStateCoverage.map(item => [item.check, item]));
  const urlTitleNavigationByCheck = new Map(urlTitleNavigationCoverage.map(item => [item.check, item]));
  const failedUrlTitleNavigationByCheck = new Map(failedUrlTitleNavigationCoverage.map(item => [item.check, item]));
  const attributeByCheck = new Map(attributeCoverage.map(item => [item.check, item]));
  const failedAttributeByCheck = new Map(failedAttributeCoverage.map(item => [item.check, item]));
  const networkStateByCheck = new Map(networkStateCoverage.map(item => [item.check, item]));
  const failedNetworkStateByCheck = new Map(failedNetworkStateCoverage.map(item => [item.check, item]));
  const presenceByCheck = new Map(presenceCoverage.map(item => [item.check, item]));
  const failedPresenceByCheck = new Map(failedPresenceCoverage.map(item => [item.check, item]));
  const genericInteractionActionByCheck = new Map(genericInteractionActionCoverage.map(item => [item.check, item]));
  const hoverInteractionActionByCheck = new Map(hoverInteractionActionCoverage.map(item => [item.check, item]));
  const failedHoverInteractionActionByCheck = new Map(failedHoverInteractionActionCoverage.map(item => [item.check, item]));
  const dragInteractionActionByCheck = new Map(dragInteractionActionCoverage.map(item => [item.check, item]));
  const failedDragInteractionActionByCheck = new Map(failedDragInteractionActionCoverage.map(item => [item.check, item]));
  const scrollInteractionActionByCheck = new Map(scrollInteractionActionCoverage.map(item => [item.check, item]));
  const failedScrollInteractionActionByCheck = new Map(failedScrollInteractionActionCoverage.map(item => [item.check, item]));
  const historyInteractionActionByCheck = new Map(historyInteractionActionCoverage.map(item => [item.check, item]));
  const failedHistoryInteractionActionByCheck = new Map(failedHistoryInteractionActionCoverage.map(item => [item.check, item]));
  const genericScriptWaitByCheck = new Map(genericScriptWaitCoverage.map(item => [item.check, item]));
  const scriptByCheck = new Map(scriptCoverage.map(item => [item.check, item]));
  const failedScriptByCheck = new Map(failedScriptCoverage.map(item => [item.check, item]));
  const waitByCheck = new Map(waitCoverage.map(item => [item.check, item]));
  const failedWaitByCheck = new Map(failedWaitCoverage.map(item => [item.check, item]));
  const pass = report.status === "partial"
    && byCheck.get("commands")?.status === "verified"
    && byCheck.get("screenshots")?.status === "unknown"
    && !!byCheck.get("screenshots")?.missingReason
    && report.risks.some(item => item.includes("required check screenshots"))
    && genericByCheck.get("browser_e2e")?.status === "verified"
    && genericByCheck.get("browser_network")?.status === "unknown"
    && genericByCheck.get("browser_network_logs")?.status === "unknown"
    && String(genericByCheck.get("browser_network")?.missingReason || "").includes("No browser network assertion")
    && networkByCheck.get("browser_e2e")?.status === "verified"
    && networkByCheck.get("browser_network")?.status === "verified"
    && networkByCheck.get("browser_network")?.evidence.some(item => item.includes("assert:networkRequest"))
    && networkByCheck.get("browser_network_logs")?.status === "verified"
    && failedNetworkByCheck.get("browser_network")?.status === "not_verified"
    && genericAccessibilityByCheck.get("browser_e2e")?.status === "verified"
    && genericAccessibilityByCheck.get("accessibility")?.status === "unknown"
    && genericAccessibilityByCheck.get("aria")?.status === "unknown"
    && genericAccessibilityByCheck.get("browser_accessibility_snapshot")?.status === "unknown"
    && String(genericAccessibilityByCheck.get("accessibility")?.missingReason || "").includes("No accessibility/ARIA")
    && accessibilityByCheck.get("accessibility")?.status === "verified"
    && accessibilityByCheck.get("accessibility")?.evidence.some(item => item.includes("assert:accessibleNameEquals"))
    && accessibilityByCheck.get("aria")?.status === "verified"
    && accessibilityByCheck.get("browser_accessibility_snapshot")?.status === "verified"
    && failedAccessibilityByCheck.get("accessibility")?.status === "not_verified"
    && genericConsoleWarningByCheck.get("browser_e2e")?.status === "verified"
    && genericConsoleWarningByCheck.get("console_warnings")?.status === "unknown"
    && genericConsoleWarningByCheck.get("console_errors")?.status === "unknown"
    && String(genericConsoleWarningByCheck.get("console_warnings")?.missingReason || "").includes("No console warning assertion")
    && warningFreeConsoleByCheck.get("console_warnings")?.status === "verified"
    && warningFreeConsoleByCheck.get("console_warnings")?.evidence.some(item => item.includes("assert:consoleNoWarnings"))
    && warningFreeConsoleByCheck.get("console_errors")?.status === "verified"
    && warningConsoleByCheck.get("console_warnings")?.status === "not_verified"
    && warningConsoleByCheck.get("console_warnings")?.evidence.some(item => item.includes("deprecated API"))
    && warningConsoleByCheck.get("console_errors")?.status === "verified"
    && failedWarningAssertionByCheck.get("console_warnings")?.status === "not_verified"
    && failedWarningAssertionByCheck.get("console_errors")?.status === "verified"
    && failedConsoleErrorByCheck.get("console_errors")?.status === "not_verified"
    && failedConsoleErrorByCheck.get("console_errors")?.evidence.some(item => item.includes("Uncaught TypeError"))
    && computerUseConsoleByCheck.get("browser_e2e")?.status === "verified"
    && computerUseConsoleByCheck.get("console_warnings")?.status === "unknown"
    && computerUseConsoleByCheck.get("console_errors")?.status === "unknown"
    && genericInteractionByCheck.get("browser_e2e")?.status === "verified"
    && genericInteractionByCheck.get("browser_dialog")?.status === "unknown"
    && genericInteractionByCheck.get("browser_popup")?.status === "unknown"
    && genericInteractionByCheck.get("browser_dialog_log")?.status === "verified"
    && genericInteractionByCheck.get("browser_popup_log")?.status === "verified"
    && dialogInteractionByCheck.get("browser_dialog")?.status === "verified"
    && dialogInteractionByCheck.get("browser_dialog")?.evidence.some(item => item.includes("assert:dialogMessageIncludes"))
    && dialogInteractionByCheck.get("browser_popup")?.status === "unknown"
    && failedDialogInteractionByCheck.get("browser_dialog")?.status === "not_verified"
    && failedDialogInteractionByCheck.get("browser_dialog_log")?.status === "not_verified"
    && popupInteractionByCheck.get("browser_popup")?.status === "verified"
    && popupInteractionByCheck.get("browser_popup")?.evidence.some(item => item.includes("assert:popupTextIncludes"))
    && popupInteractionByCheck.get("browser_dialog")?.status === "unknown"
    && failedPopupInteractionByCheck.get("browser_popup")?.status === "not_verified"
    && failedPopupInteractionByCheck.get("browser_popup_log")?.status === "not_verified"
    && genericTransferByCheck.get("browser_e2e")?.status === "verified"
    && genericTransferByCheck.get("browser_upload")?.status === "unknown"
    && genericTransferByCheck.get("browser_download")?.status === "unknown"
    && uploadTransferByCheck.get("browser_upload")?.status === "verified"
    && uploadTransferByCheck.get("browser_upload")?.evidence.some(item => item.includes("action:uploadFile"))
    && uploadTransferByCheck.get("browser_download")?.status === "unknown"
    && failedUploadTransferByCheck.get("browser_upload")?.status === "not_verified"
    && failedUploadTransferByCheck.get("browser_upload")?.evidence.some(item => item.includes("uploadFile requires"))
    && downloadTransferByCheck.get("browser_download")?.status === "verified"
    && downloadTransferByCheck.get("browser_download")?.evidence.some(item => item.includes("assert:downloadedFile"))
    && downloadTransferByCheck.get("browser_upload")?.status === "unknown"
    && failedDownloadTransferByCheck.get("browser_download")?.status === "not_verified"
    && failedDownloadTransferByCheck.get("browser_download")?.evidence.some(item => item.includes("No downloads were observed"))
    && genericInputByCheck.get("browser_e2e")?.status === "verified"
    && genericInputByCheck.get("browser_clipboard")?.status === "unknown"
    && genericInputByCheck.get("browser_focus")?.status === "unknown"
    && genericInputByCheck.get("browser_keyboard")?.status === "unknown"
    && clipboardInputByCheck.get("browser_clipboard")?.status === "verified"
    && clipboardInputByCheck.get("browser_clipboard")?.evidence.some(item => item.includes("assert:clipboardTextEquals"))
    && clipboardInputByCheck.get("browser_focus")?.status === "unknown"
    && failedClipboardInputByCheck.get("browser_clipboard")?.status === "not_verified"
    && failedClipboardInputByCheck.get("browser_clipboard")?.evidence.some(item => item.includes("Clipboard text length"))
    && focusInputByCheck.get("browser_focus")?.status === "verified"
    && focusInputByCheck.get("browser_focus")?.evidence.some(item => item.includes("assert:focused"))
    && focusInputByCheck.get("browser_keyboard")?.status === "unknown"
    && failedFocusInputByCheck.get("browser_focus")?.status === "not_verified"
    && failedFocusInputByCheck.get("browser_focus")?.evidence.some(item => item.includes("Expected target to be focused"))
    && keyboardInputByCheck.get("browser_keyboard")?.status === "verified"
    && keyboardInputByCheck.get("browser_keyboard")?.evidence.some(item => item.includes("action:typeText"))
    && keyboardInputByCheck.get("browser_focus")?.status === "unknown"
    && failedKeyboardInputByCheck.get("browser_keyboard")?.status === "not_verified"
    && failedKeyboardInputByCheck.get("browser_keyboard")?.evidence.some(item => item.includes("press requires"))
    && genericVisualLayoutByCheck.get("browser_e2e")?.status === "verified"
    && genericVisualLayoutByCheck.get("screenshots")?.status === "verified"
    && genericVisualLayoutByCheck.get("browser_visual")?.status === "unknown"
    && genericVisualLayoutByCheck.get("browser_layout")?.status === "unknown"
    && visualAssertionByCheck.get("browser_visual")?.status === "verified"
    && visualAssertionByCheck.get("browser_visual")?.evidence.some(item => item.includes("assert:elementScreenshotNotBlank"))
    && visualAssertionByCheck.get("browser_layout")?.status === "unknown"
    && failedVisualAssertionByCheck.get("browser_visual")?.status === "not_verified"
    && failedVisualAssertionByCheck.get("browser_visual")?.evidence.some(item => item.includes("non-blank visual content"))
    && layoutAssertionByCheck.get("browser_layout")?.status === "verified"
    && layoutAssertionByCheck.get("browser_layout")?.evidence.some(item => item.includes("assert:inViewport"))
    && layoutAssertionByCheck.get("browser_visual")?.status === "unknown"
    && failedLayoutAssertionByCheck.get("browser_layout")?.status === "not_verified"
    && failedLayoutAssertionByCheck.get("browser_layout")?.evidence.some(item => item.includes("horizontal overflow"))
    && genericUiStructureByCheck.get("browser_e2e")?.status === "verified"
    && genericUiStructureByCheck.get("browser_form")?.status === "unknown"
    && genericUiStructureByCheck.get("form_state")?.status === "unknown"
    && genericUiStructureByCheck.get("input_value")?.status === "unknown"
    && genericUiStructureByCheck.get("selected")?.status === "unknown"
    && genericUiStructureByCheck.get("checked")?.status === "unknown"
    && genericUiStructureByCheck.get("enabled")?.status === "unknown"
    && genericUiStructureByCheck.get("browser_table")?.status === "unknown"
    && genericUiStructureByCheck.get("browser_list")?.status === "unknown"
    && genericUiStructureByCheck.get("browser_text_order")?.status === "unknown"
    && String(genericUiStructureByCheck.get("browser_form")?.missingReason || "").includes("No browser form")
    && String(genericUiStructureByCheck.get("browser_table")?.missingReason || "").includes("No browser table")
    && String(genericUiStructureByCheck.get("browser_list")?.missingReason || "").includes("No browser list")
    && String(genericUiStructureByCheck.get("browser_text_order")?.missingReason || "").includes("No browser text-order")
    && formFlowByCheck.get("browser_form")?.status === "verified"
    && formFlowByCheck.get("browser_form")?.evidence.some(item => item.includes("probe=acceptance_form_flow"))
    && formFlowByCheck.get("form_state")?.status === "unknown"
    && formStateByCheck.get("browser_form")?.status === "verified"
    && formStateByCheck.get("form_state")?.status === "verified"
    && formStateByCheck.get("input_value")?.status === "verified"
    && formStateByCheck.get("input_value")?.evidence.some(item => item.includes("assert:inputValueEquals"))
    && formStateByCheck.get("selected")?.status === "verified"
    && formStateByCheck.get("selected")?.evidence.some(item => item.includes("assert:selectedTextIncludes"))
    && formStateByCheck.get("checked")?.status === "verified"
    && formStateByCheck.get("checked")?.evidence.some(item => item.includes("assert:checked"))
    && formStateByCheck.get("enabled")?.status === "verified"
    && formStateByCheck.get("enabled")?.evidence.some(item => item.includes("assert:enabled"))
    && failedFormStateByCheck.get("form_state")?.status === "not_verified"
    && failedFormStateByCheck.get("input_value")?.status === "not_verified"
    && failedFormStateByCheck.get("input_value")?.evidence.some(item => item.includes("Expected input value"))
    && tableByCheck.get("browser_table")?.status === "verified"
    && tableByCheck.get("browser_table")?.evidence.some(item => item.includes("assert:tableRowIncludes"))
    && tableByCheck.get("browser_list")?.status === "unknown"
    && failedTableByCheck.get("browser_table")?.status === "not_verified"
    && failedTableByCheck.get("browser_table")?.evidence.some(item => item.includes("table cell Status"))
    && listByCheck.get("browser_list")?.status === "verified"
    && listByCheck.get("browser_list")?.evidence.some(item => item.includes("assert:elementCountAtLeast"))
    && listByCheck.get("browser_table")?.status === "unknown"
    && failedListByCheck.get("browser_list")?.status === "not_verified"
    && failedListByCheck.get("browser_list")?.evidence.some(item => item.includes("element count"))
    && textOrderByCheck.get("browser_text_order")?.status === "verified"
    && textOrderByCheck.get("browser_text_order")?.evidence.some(item => item.includes("assert:textOrder"))
    && textOrderByCheck.get("browser_list")?.status === "unknown"
    && failedTextOrderByCheck.get("browser_text_order")?.status === "not_verified"
    && failedTextOrderByCheck.get("browser_text_order")?.evidence.some(item => item.includes("Expected text order"))
    && genericPageStateByCheck.get("browser_e2e")?.status === "verified"
    && genericPageStateByCheck.get("browser_url")?.status === "unknown"
    && genericPageStateByCheck.get("browser_title")?.status === "unknown"
    && genericPageStateByCheck.get("browser_navigation")?.status === "unknown"
    && genericPageStateByCheck.get("browser_attribute")?.status === "unknown"
    && genericPageStateByCheck.get("browser_network_state")?.status === "unknown"
    && genericPageStateByCheck.get("browser_presence")?.status === "unknown"
    && genericPageStateByCheck.get("browser_visibility")?.status === "unknown"
    && String(genericPageStateByCheck.get("browser_url")?.missingReason || "").includes("No browser URL assertion")
    && String(genericPageStateByCheck.get("browser_title")?.missingReason || "").includes("No browser title assertion")
    && String(genericPageStateByCheck.get("browser_attribute")?.missingReason || "").includes("No browser DOM/attribute")
    && String(genericPageStateByCheck.get("browser_network_state")?.missingReason || "").includes("No browser online/offline")
    && String(genericPageStateByCheck.get("browser_presence")?.missingReason || "").includes("No browser presence/visibility")
    && urlTitleNavigationByCheck.get("browser_url")?.status === "verified"
    && urlTitleNavigationByCheck.get("browser_url")?.evidence.some(item => item.includes("assert:urlIncludes"))
    && urlTitleNavigationByCheck.get("browser_title")?.status === "verified"
    && urlTitleNavigationByCheck.get("browser_title")?.evidence.some(item => item.includes("assert:titleEquals"))
    && urlTitleNavigationByCheck.get("browser_navigation")?.status === "verified"
    && urlTitleNavigationByCheck.get("browser_navigation")?.evidence.some(item => item.includes("action:waitForUrl") || item.includes("assert:urlIncludes"))
    && failedUrlTitleNavigationByCheck.get("browser_url")?.status === "not_verified"
    && failedUrlTitleNavigationByCheck.get("browser_url")?.evidence.some(item => item.includes("Expected URL"))
    && failedUrlTitleNavigationByCheck.get("browser_title")?.status === "not_verified"
    && failedUrlTitleNavigationByCheck.get("browser_title")?.evidence.some(item => item.includes("Expected title"))
    && attributeByCheck.get("browser_attribute")?.status === "verified"
    && attributeByCheck.get("browser_attribute")?.evidence.some(item => item.includes("assert:attributeEquals"))
    && failedAttributeByCheck.get("browser_attribute")?.status === "not_verified"
    && failedAttributeByCheck.get("browser_attribute")?.evidence.some(item => item.includes("aria-expanded"))
    && networkStateByCheck.get("browser_network_state")?.status === "verified"
    && networkStateByCheck.get("browser_network_state")?.evidence.some(item => item.includes("assert:browserOffline"))
    && failedNetworkStateByCheck.get("browser_network_state")?.status === "not_verified"
    && failedNetworkStateByCheck.get("browser_network_state")?.evidence.some(item => item.includes("Expected browser to be online"))
    && presenceByCheck.get("browser_presence")?.status === "verified"
    && presenceByCheck.get("browser_presence")?.evidence.some(item => item.includes("assert:visible"))
    && presenceByCheck.get("browser_visibility")?.status === "verified"
    && presenceByCheck.get("browser_visibility")?.evidence.some(item => item.includes("assert:notPresent") || item.includes("assert:visible"))
    && failedPresenceByCheck.get("browser_presence")?.status === "not_verified"
    && failedPresenceByCheck.get("browser_presence")?.evidence.some(item => item.includes("Expected target to be hidden"))
    && failedPresenceByCheck.get("browser_visibility")?.status === "not_verified"
    && genericInteractionActionByCheck.get("browser_e2e")?.status === "verified"
    && genericInteractionActionByCheck.get("browser_hover")?.status === "unknown"
    && genericInteractionActionByCheck.get("browser_drag")?.status === "unknown"
    && genericInteractionActionByCheck.get("browser_scroll")?.status === "unknown"
    && genericInteractionActionByCheck.get("browser_history")?.status === "unknown"
    && genericInteractionActionByCheck.get("browser_reload")?.status === "unknown"
    && String(genericInteractionActionByCheck.get("browser_hover")?.missingReason || "").includes("No browser hover action")
    && String(genericInteractionActionByCheck.get("browser_drag")?.missingReason || "").includes("No browser drag/drop action")
    && String(genericInteractionActionByCheck.get("browser_scroll")?.missingReason || "").includes("No browser scroll action")
    && String(genericInteractionActionByCheck.get("browser_history")?.missingReason || "").includes("No browser history/reload")
    && hoverInteractionActionByCheck.get("browser_hover")?.status === "verified"
    && hoverInteractionActionByCheck.get("browser_hover")?.evidence.some(item => item.includes("action:hover"))
    && failedHoverInteractionActionByCheck.get("browser_hover")?.status === "not_verified"
    && failedHoverInteractionActionByCheck.get("browser_hover")?.evidence.some(item => item.includes("Expected hover target"))
    && dragInteractionActionByCheck.get("browser_drag")?.status === "verified"
    && dragInteractionActionByCheck.get("browser_drag")?.evidence.some(item => item.includes("action:dragTo"))
    && failedDragInteractionActionByCheck.get("browser_drag")?.status === "not_verified"
    && failedDragInteractionActionByCheck.get("browser_drag")?.evidence.some(item => item.includes("Drag destination missing"))
    && scrollInteractionActionByCheck.get("browser_scroll")?.status === "verified"
    && scrollInteractionActionByCheck.get("browser_scroll")?.evidence.some(item => item.includes("action:scroll"))
    && failedScrollInteractionActionByCheck.get("browser_scroll")?.status === "not_verified"
    && failedScrollInteractionActionByCheck.get("browser_scroll")?.evidence.some(item => item.includes("Scroll target missing"))
    && historyInteractionActionByCheck.get("browser_history")?.status === "verified"
    && historyInteractionActionByCheck.get("browser_history")?.evidence.some(item => item.includes("action:goBack"))
    && historyInteractionActionByCheck.get("browser_reload")?.status === "verified"
    && historyInteractionActionByCheck.get("browser_reload")?.evidence.some(item => item.includes("action:reload"))
    && failedHistoryInteractionActionByCheck.get("browser_history")?.status === "not_verified"
    && failedHistoryInteractionActionByCheck.get("browser_history")?.evidence.some(item => item.includes("History navigation failed"))
    && failedHistoryInteractionActionByCheck.get("browser_reload")?.status === "not_verified"
    && genericScriptWaitByCheck.get("browser_e2e")?.status === "verified"
    && genericScriptWaitByCheck.get("browser_js")?.status === "unknown"
    && genericScriptWaitByCheck.get("browser_script")?.status === "unknown"
    && genericScriptWaitByCheck.get("browser_wait")?.status === "unknown"
    && String(genericScriptWaitByCheck.get("browser_js")?.missingReason || "").includes("No browser JavaScript")
    && String(genericScriptWaitByCheck.get("browser_wait")?.missingReason || "").includes("No browser conditional wait")
    && scriptByCheck.get("browser_js")?.status === "verified"
    && scriptByCheck.get("browser_js")?.evidence.some(item => item.includes("assert:jsTruthy") || item.includes("action:evaluate"))
    && scriptByCheck.get("browser_script")?.status === "verified"
    && scriptByCheck.get("browser_script")?.evidence.some(item => item.includes("assert:jsEquals"))
    && scriptByCheck.get("browser_wait")?.status === "unknown"
    && failedScriptByCheck.get("browser_js")?.status === "not_verified"
    && failedScriptByCheck.get("browser_js")?.evidence.some(item => item.includes("JavaScript expression"))
    && failedScriptByCheck.get("browser_script")?.status === "not_verified"
    && waitByCheck.get("browser_wait")?.status === "verified"
    && waitByCheck.get("browser_wait")?.evidence.some(item => item.includes("action:waitForText"))
    && waitByCheck.get("browser_js")?.status === "unknown"
    && failedWaitByCheck.get("browser_wait")?.status === "not_verified"
    && failedWaitByCheck.get("browser_wait")?.evidence.some(item => item.includes("Timed out waiting"));
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
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
    failedLayoutAssertionCoverage,
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
    failedWaitCoverage,
  };
}


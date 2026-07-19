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
} from "./self-test-policy";
import { verifyTestAgentArtifactManifestFile } from "./artifact-verifier";
import { ACCEPTANCE_CLIPBOARD_FLOW_PROBE_TYPE, buildAcceptanceClipboardFlowBrowserChecks } from "./browser/acceptance-clipboard-flows";
import { ACCEPTANCE_CLICK_FLOW_PROBE_TYPE, buildAcceptanceClickFlowBrowserChecks } from "./browser/acceptance-click-flows";
import { buildAcceptanceDerivedBrowserAssertions } from "./browser/acceptance-derived-checks";
import { ACCEPTANCE_DIALOG_FLOW_PROBE_TYPE, buildAcceptanceDialogFlowBrowserChecks } from "./browser/acceptance-dialog-flows";
import { ACCEPTANCE_DRAG_FLOW_PROBE_TYPE, buildAcceptanceDragFlowBrowserChecks } from "./browser/acceptance-drag-flows";
import { ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE, buildAcceptanceDownloadFlowBrowserChecks } from "./browser/acceptance-download-flows";
import { ACCEPTANCE_FORM_FLOW_PROBE_TYPE, buildAcceptanceFormFlowBrowserChecks } from "./browser/acceptance-form-flows";
import { ACCEPTANCE_HISTORY_FLOW_PROBE_TYPE, buildAcceptanceHistoryFlowBrowserChecks } from "./browser/acceptance-history-flows";
import { ACCEPTANCE_HOVER_FLOW_PROBE_TYPE, buildAcceptanceHoverFlowBrowserChecks } from "./browser/acceptance-hover-flows";
import { ACCEPTANCE_KEYBOARD_FLOW_PROBE_TYPE, buildAcceptanceKeyboardFlowBrowserChecks } from "./browser/acceptance-keyboard-flows";
import { ACCEPTANCE_NETWORK_STATE_FLOW_PROBE_TYPE, buildAcceptanceNetworkStateFlowBrowserChecks } from "./browser/acceptance-network-state-flows";
import { MULTI_SESSION_BROWSER_PROBE_TYPE } from "./browser/multi-session";
import { ACCEPTANCE_POPUP_FLOW_PROBE_TYPE, buildAcceptancePopupFlowBrowserChecks } from "./browser/acceptance-popup-flows";
import { runBrowserSessionComparison } from "./browser/session-comparison";
import { ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE, buildAcceptanceRepeatedClickBrowserChecks } from "./browser/acceptance-repeated-click-checks";
import { ACCEPTANCE_RESPONSIVE_PROBE_TYPE, buildAcceptanceResponsiveBrowserChecks } from "./browser/acceptance-responsive-checks";
import { ACCEPTANCE_SCROLL_FLOW_PROBE_TYPE, buildAcceptanceScrollFlowBrowserChecks } from "./browser/acceptance-scroll-flows";
import { buildBrowserStabilitySummary } from "./browser/stability-summary";
import { ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE, buildAcceptanceUploadFlowBrowserChecks } from "./browser/acceptance-upload-flows";
import { AUTO_BROWSER_SMOKE_PROBE_TYPE, buildAcceptancePathBrowserSmokeChecks, buildAutoBrowserSmokeCheck, buildBrowserChecksForProject } from "./browser/auto-checks";
import { checkPlaywrightAvailability } from "./browser/playwright-provider";
import { buildSemanticLocatorPlan } from "./browser/semantic-locator";
import { createStaticBrowserToolExecutor } from "./browser/tool-executor";
import { formatTestAgentCliArtifactVerificationSummary, formatTestAgentCliExecutionPlanSummary, formatTestAgentCliReportSummary, formatTestAgentCliValidationSummary, runTestAgentCli } from "./cli";
import { cliOverrides, parseTestAgentCliArgs } from "./cli-options";
import { TEST_AGENT_MINIMAL_HANDOFF_EXAMPLE, TEST_AGENT_WEB_APP_HANDOFF_EXAMPLE, TEST_AGENT_WEB_APP_WORK_ORDER_EXAMPLE, validateTestAgentHandoffContract, validateTestAgentReportContract, validateTestAgentVerdictContract, validateTestAgentWorkOrderContract } from "./contract";
import { buildAcceptanceCoverage } from "./coverage";
import { buildAcceptanceSummary } from "./acceptance-summary";
import { buildTestAgentExecutionPlan } from "./execution-plan";
import { buildTestAgentMarkdownReport } from "./artifacts";
import { buildTestAgentReport } from "./result-builder";
import { buildRequiredCheckCoverage } from "./required-checks";
import { discoverTestAgentSelfTests, formatTestAgentSelfTestMatrixSummary, runTestAgentSelfTestMatrix } from "./self-test-matrix";
import { buildTestAgentVerdict } from "./verdict";
import { buildTestAgentWorkOrderFromHandoff } from "./work-order-builder";

export {
  runTestAgentBrowserAuthenticationContractSelfTest,
  runTestAgentPlaywrightAuthenticationSelfTest,
  runTestAgentPlaywrightMultiSessionAuthenticationSelfTest,
} from "./browser/authentication-self-test";
export {
  runTestAgentClaudeChromeExistingSessionSelfTest,
  runTestAgentChromeDevtoolsExistingSessionSelfTest,
  runTestAgentExistingSessionContractSelfTest,
  runTestAgentMixedBrowserProviderRoutingSelfTest,
} from "./browser/existing-session-self-test";
export {
  runTestAgentClaudeChromeRecoverySelfTest,
  runTestAgentUnsafeBrowserRecoverySelfTest,
  runTestAgentFailedBrowserRecoverySelfTest,
  runTestAgentChromeDevtoolsRecoverySelfTest,
} from "./browser/recovery-self-test";
export {
  runTestAgentPlaywrightActionEffectSelfTest,
  runTestAgentMultiSessionActionEffectSelfTest,
  runTestAgentCrossSessionActionEffectSelfTest,
  runTestAgentMcpActionEffectSelfTest,
} from "./browser/action-effect-self-test";
export { runTestAgentAdversarialEvidenceGateSelfTest } from "./adversarial-self-test";
export { runTestAgentAcceptanceEvidenceGateSelfTest } from "./acceptance-gate-self-test";
export { runTestAgentHttpConcurrencySelfTest } from "./http-concurrency-self-test";
export { runTestAgentCapabilityAwareProviderRoutingSelfTest } from "./browser/provider-routing-self-test";
export { runTestAgentHttpPageResourcesSelfTest } from "./http-page-resources-self-test";
export { runTestAgentBrowserCheckExecutionCoverageSelfTest } from "./browser/check-execution-coverage-self-test";
export { runTestAgentBrowserToolEvidenceLineageSelfTest } from "./browser/tool-evidence-lineage-self-test";
export { runTestAgentBrowserToolCallTimeoutSelfTest } from "./browser/tool-call-timeout-self-test";
export { runTestAgentBrowserEvidenceTemporalIntegritySelfTest } from "./browser/evidence-temporal-integrity-self-test";
export { runTestAgentBrowserResourceLifecycleSelfTest } from "./browser/resource-lifecycle-self-test";
export { runTestAgentInvocationSelfTest } from "./invocation-self-test";

export function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

export function writeTaskBoardFixtureServer(dir: string) {
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Handoff CLI Fixture</title></head>",
    "<body>",
    "<main>",
    "<h1>Task board</h1>",
    "<label for=\"task\">Task</label>",
    "<input id=\"task\" name=\"task\" />",
    "<button type=\"button\" id=\"add\">Add task</button>",
    "<ul id=\"tasks\" aria-label=\"Saved task list\"></ul>",
    "<p id=\"status\" role=\"status\">Ready</p>",
    "</main>",
    "<script>",
    "const input = document.getElementById('task');",
    "const list = document.getElementById('tasks');",
    "const status = document.getElementById('status');",
    "function readTasks() { try { return JSON.parse(localStorage.getItem('tasks') || '[]'); } catch { return []; } }",
    "function writeTasks(tasks) { localStorage.setItem('tasks', JSON.stringify(tasks)); }",
    "function render() {",
    "  const tasks = readTasks();",
    "  list.innerHTML = '';",
    "  for (const task of tasks) { const item = document.createElement('li'); item.textContent = task; list.appendChild(item); }",
    "  status.textContent = tasks.length ? 'Saved ' + tasks[tasks.length - 1] : 'Ready';",
    "}",
    "document.getElementById('add').addEventListener('click', () => {",
    "  const value = input.value.trim();",
    "  if (!value) { status.textContent = 'Task required'; return; }",
    "  const tasks = readTasks();",
    "  tasks.push(value);",
    "  writeTasks(tasks);",
    "  render();",
    "});",
    "render();",
    "</script>",
    "</body></html>`;",
    "http.createServer((req, res) => {",
    "  if (req.url === '/health') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ok:true})); return; }",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");
}

function sha256File(filePath: string) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function refreshManifestItemIntegrity(manifestPath: string, artifactType: string) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const files = manifest.files || [];
  const item = files.find((entry: any) => entry.type === artifactType);
  if (!item?.path) return manifest;
  const targetPath = path.resolve(item.path);
  const stat = fs.statSync(targetPath);
  const integrity = {
    exists: true,
    sizeBytes: stat.size,
    sha256: sha256File(targetPath),
  };
  for (const entry of files) {
    if (entry.type === artifactType || (entry.path && path.resolve(entry.path) === targetPath)) {
      entry.integrity = integrity;
    }
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  return manifest;
}

function pngChunk(type: string, data: Buffer) {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  chunk.writeUInt32BE(0, 8 + data.length);
  return chunk;
}

export function writeSolidRgbaPng(filePath: string, width: number, height: number, rgba: [number, number, number, number]) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const rows: Buffer[] = [];
  const pixel = Buffer.from(rgba);
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) pixel.copy(row, 1 + x * 4);
    rows.push(row);
  }
  const idat = zlib.deflateSync(Buffer.concat(rows));
  fs.writeFileSync(filePath, Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]));
}

export function buildStoredZip(entries: Array<{ name: string; data: Buffer | string }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf-8");
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf-8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const localData = Buffer.concat(localParts);
  const centralData = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralData.length, 12);
  eocd.writeUInt32LE(localData.length, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([localData, centralData, eocd]);
}

export function buildEmptyZip() {
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  return eocd;
}

export async function runTestAgentSelfTest(options: { includeBrowser?: boolean } = {}) {
  return require("./self-test-core").runTestAgentSelfTest(options);
}

export async function runTestAgentMcpProviderSelfTest() {
  return require("./self-test-core").runTestAgentMcpProviderSelfTest();
}

export async function runTestAgentClaudeChromeMcpSelfTest() {
  return require("./self-test-core").runTestAgentClaudeChromeMcpSelfTest();
}

export async function runTestAgentComputerUseMcpSelfTest() {
  return require("./self-test-core").runTestAgentComputerUseMcpSelfTest();
}

export function runTestAgentWorkOrderNormalizationSelfTest() {
  return require("./self-test-core").runTestAgentWorkOrderNormalizationSelfTest();
}

export async function runTestAgentSelfTestMatrixSelfTest() {
  return require("./self-test-core").runTestAgentSelfTestMatrixSelfTest();
}

export function runTestAgentHandoffBuilderSelfTest() {
  return require("./self-test-core").runTestAgentHandoffBuilderSelfTest();
}

export function runTestAgentHandoffContractSelfTest() {
  return require("./self-test-core").runTestAgentHandoffContractSelfTest();
}

export async function runTestAgentArtifactSelfTest() {
  return require("./self-test-core").runTestAgentArtifactSelfTest();
}

export async function runTestAgentVerdictSelfTest() {
  return require("./self-test-core").runTestAgentVerdictSelfTest();
}

export function runTestAgentFailureSummarySelfTest() {
  return require("./self-test-core").runTestAgentFailureSummarySelfTest();
}

export function runTestAgentBrowserProviderGapSummarySelfTest() {
  return require("./self-test-core").runTestAgentBrowserProviderGapSummarySelfTest();
}

export async function runTestAgentMcpLiveUrlFailClosedSelfTest() {
  return require("./credibility-self-tests").runTestAgentMcpLiveUrlFailClosedSelfTest();
}

export function runTestAgentUploadPathEscapeSelfTest() {
  return require("./credibility-self-tests").runTestAgentUploadPathEscapeSelfTest();
}

export function runTestAgentIndependentReviewDecisionAlignmentSelfTest() {
  return require("./credibility-self-tests").runTestAgentIndependentReviewDecisionAlignmentSelfTest();
}

export function runTestAgentProviderGapForcesPlaywrightRecheckSelfTest() {
  return require("./credibility-self-tests").runTestAgentProviderGapForcesPlaywrightRecheckSelfTest();
}

export function runTestAgentFlakyHardBlocksAcceptSelfTest() {
  return require("./credibility-self-tests").runTestAgentFlakyHardBlocksAcceptSelfTest();
}

export function runTestAgentEnvironmentPrepStructuredSelfTest() {
  return require("./credibility-self-tests").runTestAgentEnvironmentPrepStructuredSelfTest();
}

export function runTestAgentPetActivityKeySelfTest() {
  return require("./credibility-self-tests").runTestAgentPetActivityKeySelfTest();
}

export async function runTestAgentBrowserSessionComparisonSelfTest() {
  return require("./self-test-core").runTestAgentBrowserSessionComparisonSelfTest();
}

export function runTestAgentBrowserFlowSummarySelfTest() {
  return require("./self-test-core").runTestAgentBrowserFlowSummarySelfTest();
}

export function runTestAgentBrowserMultiSessionSummarySelfTest() {
  return require("./self-test-core").runTestAgentBrowserMultiSessionSummarySelfTest();
}

export function runTestAgentBrowserStabilitySummarySelfTest() {
  return require("./self-test-core").runTestAgentBrowserStabilitySummarySelfTest();
}

export function runTestAgentAcceptanceSummarySelfTest() {
  return require("./self-test-core").runTestAgentAcceptanceSummarySelfTest();
}

export async function runTestAgentArtifactManifestSelfTest() {
  return require("./self-test-core").runTestAgentArtifactManifestSelfTest();
}

export async function runTestAgentArtifactVerifierSelfTest() {
  return require("./self-test-core").runTestAgentArtifactVerifierSelfTest();
}

export async function runTestAgentMcpScreenshotArtifactSelfTest() {
  return require("./self-test-core").runTestAgentMcpScreenshotArtifactSelfTest();
}

export async function runTestAgentMcpFailureScreenshotSelfTest() {
  return require("./self-test-core").runTestAgentMcpFailureScreenshotSelfTest();
}

export async function runTestAgentBrowserEvidenceArtifactSelfTest() {
  return require("./self-test-core").runTestAgentBrowserEvidenceArtifactSelfTest();
}

export function runTestAgentCoverageSelfTest() {
  return require("./self-test-core").runTestAgentCoverageSelfTest();
}

export async function runTestAgentCommandPlannerSelfTest() {
  return require("./self-test-core").runTestAgentCommandPlannerSelfTest();
}

export async function runTestAgentExecutionPlanSelfTest() {
  return require("./self-test-core").runTestAgentExecutionPlanSelfTest();
}

export async function runTestAgentHttpApiSelfTest() {
  return require("./self-test-core").runTestAgentHttpApiSelfTest();
}

export async function runTestAgentAdversarialHttpSelfTest() {
  return require("./self-test-core").runTestAgentAdversarialHttpSelfTest();
}

export async function runTestAgentAdversarialBrowserSelfTest() {
  return require("./self-test-core").runTestAgentAdversarialBrowserSelfTest();
}

export async function runTestAgentBrowserProbeTemplateSelfTest() {
  return require("./self-test-core").runTestAgentBrowserProbeTemplateSelfTest();
}

export async function runTestAgentAutoBrowserSmokeSelfTest() {
  return require("./self-test-core").runTestAgentAutoBrowserSmokeSelfTest();
}

export function runTestAgentBrowserCheckSourceMetadataSelfTest() {
  return require("./self-test-browser-flows").runTestAgentBrowserCheckSourceMetadataSelfTest();
}

export async function runTestAgentAcceptanceNetworkStateFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceNetworkStateFlowSelfTest();
}

export async function runTestAgentAcceptanceHistoryFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceHistoryFlowSelfTest();
}

export async function runTestAgentMultiSessionBrowserSelfTest() {
  return require("./self-test-browser-flows").runTestAgentMultiSessionBrowserSelfTest();
}

export async function runTestAgentBrowserStabilitySelfTest() {
  return require("./self-test-browser-flows").runTestAgentBrowserStabilitySelfTest();
}

export async function runTestAgentAcceptanceDragFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceDragFlowSelfTest();
}

export async function runTestAgentAcceptanceClipboardFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceClipboardFlowSelfTest();
}

export async function runTestAgentAcceptanceDialogFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceDialogFlowSelfTest();
}

export async function runTestAgentAcceptancePopupFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptancePopupFlowSelfTest();
}

export async function runTestAgentAcceptanceKeyboardFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceKeyboardFlowSelfTest();
}

export async function runTestAgentAcceptanceHoverFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceHoverFlowSelfTest();
}

export async function runTestAgentAcceptanceScrollFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceScrollFlowSelfTest();
}

export async function runTestAgentAcceptanceRepeatedClickSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceRepeatedClickSelfTest();
}

export async function runTestAgentAcceptanceChineseRepeatedClickSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceChineseRepeatedClickSelfTest();
}

export async function runTestAgentBlankPageSmokeSelfTest() {
  return require("./self-test-browser-flows").runTestAgentBlankPageSmokeSelfTest();
}

export async function runTestAgentAcceptancePathSmokeSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptancePathSmokeSelfTest();
}

export async function runTestAgentAcceptancePathGroupingSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptancePathGroupingSelfTest();
}

export async function runTestAgentAcceptanceResponsiveViewportSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceResponsiveViewportSelfTest();
}

export async function runTestAgentAcceptanceChineseResponsiveViewportSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceChineseResponsiveViewportSelfTest();
}

export async function runTestAgentAcceptanceDownloadFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceDownloadFlowSelfTest();
}

export async function runTestAgentAcceptanceChineseDownloadFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceChineseDownloadFlowSelfTest();
}

export async function runTestAgentAcceptanceUploadFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceUploadFlowSelfTest();
}

export async function runTestAgentAcceptanceChineseUploadFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceChineseUploadFlowSelfTest();
}

export async function runTestAgentAcceptanceClickFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceClickFlowSelfTest();
}

export async function runTestAgentAcceptanceChineseClickFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceChineseClickFlowSelfTest();
}

export async function runTestAgentAcceptanceClickNavigationFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceClickNavigationFlowSelfTest();
}

export async function runTestAgentAcceptanceMultiClickFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceMultiClickFlowSelfTest();
}

export async function runTestAgentAcceptanceFormFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceFormFlowSelfTest();
}

export async function runTestAgentAcceptanceChineseFormFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceChineseFormFlowSelfTest();
}

export async function runTestAgentAcceptanceMultiFieldFormFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceMultiFieldFormFlowSelfTest();
}

export async function runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest();
}

export async function runTestAgentAcceptanceUncheckRadioFormFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceUncheckRadioFormFlowSelfTest();
}

export async function runTestAgentAcceptanceRedirectFormFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceRedirectFormFlowSelfTest();
}

export async function runTestAgentAcceptanceInvalidFormAdversarialSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceInvalidFormAdversarialSelfTest();
}

export async function runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest() {
  return require("./self-test-browser-flows").runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest();
}

export async function runTestAgentPlaywrightUrlIncludesWaitSelfTest() {
  return require("./self-test-browser-flows").runTestAgentPlaywrightUrlIncludesWaitSelfTest();
}

export async function runTestAgentPlaywrightFailureScreenshotSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentPlaywrightFailureScreenshotSelfTest();
}

export async function runTestAgentBrowserUrlTitleAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserUrlTitleAssertionSelfTest();
}

export async function runTestAgentBrowserConsoleAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserConsoleAssertionSelfTest();
}

export async function runTestAgentBrowserNetworkStateActionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserNetworkStateActionSelfTest();
}

export async function runTestAgentBrowserAccessibilityAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserAccessibilityAssertionSelfTest();
}

export async function runTestAgentBrowserAccessibilitySnapshotArtifactSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserAccessibilitySnapshotArtifactSelfTest();
}

export async function runTestAgentBrowserAriaStateAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserAriaStateAssertionSelfTest();
}

export async function runTestAgentBrowserNetworkAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserNetworkAssertionSelfTest();
}

export async function runTestAgentStructuredBrowserNetworkAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentStructuredBrowserNetworkAssertionSelfTest();
}

export async function runTestAgentNegativeBrowserNetworkAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentNegativeBrowserNetworkAssertionSelfTest();
}

export async function runTestAgentBrowserRequestMetadataAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserRequestMetadataAssertionSelfTest();
}

export async function runTestAgentBrowserInteractionSummarySelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserInteractionSummarySelfTest();
}

export function runTestAgentAcceptanceDerivedChecksSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentAcceptanceDerivedChecksSelfTest();
}

export async function runTestAgentAcceptanceDerivedAccessibilitySelfTest() {
  return require("./self-test-browser-assertions").runTestAgentAcceptanceDerivedAccessibilitySelfTest();
}

export async function runTestAgentAcceptanceDerivedStorageAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentAcceptanceDerivedStorageAssertionSelfTest();
}

export async function runTestAgentAcceptanceDerivedCookieAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentAcceptanceDerivedCookieAssertionSelfTest();
}

export async function runTestAgentAcceptanceDerivedNetworkAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentAcceptanceDerivedNetworkAssertionSelfTest();
}

export async function runTestAgentAcceptanceDerivedNegativeUiSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentAcceptanceDerivedNegativeUiSelfTest();
}

export function runTestAgentSemanticLocatorSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentSemanticLocatorSelfTest();
}

export function runTestAgentBrowserStateSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserStateSelfTest();
}

export async function runTestAgentBrowserScriptWaitAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserScriptWaitAssertionSelfTest();
}

export async function runTestAgentBrowserSelectStateSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserSelectStateSelfTest();
}

export async function runTestAgentBrowserInputValueAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserInputValueAssertionSelfTest();
}

export async function runTestAgentBrowserEnabledStateSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserEnabledStateSelfTest();
}

export async function runTestAgentBrowserFocusStateSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserFocusStateSelfTest();
}

export async function runTestAgentBrowserPresenceAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserPresenceAssertionSelfTest();
}

export async function runTestAgentBrowserElementCountSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserElementCountSelfTest();
}

export async function runTestAgentBrowserDialogAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserDialogAssertionSelfTest();
}

export async function runTestAgentBrowserPopupAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserPopupAssertionSelfTest();
}

export async function runTestAgentBrowserTableAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserTableAssertionSelfTest();
}

export async function runTestAgentBrowserDragToActionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserDragToActionSelfTest();
}

export async function runTestAgentBrowserHoverActionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserHoverActionSelfTest();
}

export async function runTestAgentBrowserHistoryNavigationActionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserHistoryNavigationActionSelfTest();
}

export async function runTestAgentBrowserScrollActionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserScrollActionSelfTest();
}

export async function runTestAgentBrowserAdvancedMouseActionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserAdvancedMouseActionSelfTest();
}

export async function runTestAgentBrowserKeyboardActionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserKeyboardActionSelfTest();
}

export async function runTestAgentBrowserStorageActionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserStorageActionSelfTest();
}

export async function runTestAgentBrowserCookieActionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserCookieActionSelfTest();
}

export async function runTestAgentBrowserClipboardAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserClipboardAssertionSelfTest();
}

export async function runTestAgentBrowserElementScreenshotAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserElementScreenshotAssertionSelfTest();
}

export async function runTestAgentBrowserTextOrderAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserTextOrderAssertionSelfTest();
}

export async function runTestAgentBrowserAttributeAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserAttributeAssertionSelfTest();
}

export async function runTestAgentBrowserComputedStyleAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserComputedStyleAssertionSelfTest();
}

export async function runTestAgentBrowserCookieAssertionSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentBrowserCookieAssertionSelfTest();
}

export async function runTestAgentPlaywrightDownloadArtifactSelfTest() {
  return require("./self-test-browser-assertions").runTestAgentPlaywrightDownloadArtifactSelfTest();
}

export async function runTestAgentPlaywrightFileUploadSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentPlaywrightFileUploadSelfTest();
}

export async function runTestAgentPlaywrightMultiFileUploadSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentPlaywrightMultiFileUploadSelfTest();
}

export async function runTestAgentPlaywrightViewportSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentPlaywrightViewportSelfTest();
}

export async function runTestAgentPlaywrightContextOptionsSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentPlaywrightContextOptionsSelfTest();
}

export async function runTestAgentPlaywrightInViewportSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentPlaywrightInViewportSelfTest();
}

export async function runTestAgentPlaywrightNoHorizontalOverflowSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentPlaywrightNoHorizontalOverflowSelfTest();
}

export async function runTestAgentBrowserPreflightSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentBrowserPreflightSelfTest();
}

export async function runTestAgentPlaywrightRealBrowserSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentPlaywrightRealBrowserSelfTest();
}

export async function runTestAgentPlaywrightResourceErrorSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentPlaywrightResourceErrorSelfTest();
}

export async function runTestAgentStandaloneCliRealWebSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentStandaloneCliRealWebSelfTest();
}

export async function runTestAgentStandaloneHandoffRealWebSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentStandaloneHandoffRealWebSelfTest();
}

export async function runTestAgentPlaywrightAvailabilitySelfTest() {
  return require("./self-test-playwright-cli").runTestAgentPlaywrightAvailabilitySelfTest();
}

export async function runTestAgentRequiredCheckCoverageSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentRequiredCheckCoverageSelfTest();
}

export async function runTestAgentCliSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentCliSelfTest();
}

export function runTestAgentContractSelfTest() {
  return require("./self-test-playwright-cli").runTestAgentContractSelfTest();
}

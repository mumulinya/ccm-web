"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTestAgentInvocationSelfTest = exports.runTestAgentBrowserResourceLifecycleSelfTest = exports.runTestAgentBrowserEvidenceTemporalIntegritySelfTest = exports.runTestAgentBrowserToolCallTimeoutSelfTest = exports.runTestAgentBrowserToolEvidenceLineageSelfTest = exports.runTestAgentBrowserCheckExecutionCoverageSelfTest = exports.runTestAgentHttpPageResourcesSelfTest = exports.runTestAgentCapabilityAwareProviderRoutingSelfTest = exports.runTestAgentHttpConcurrencySelfTest = exports.runTestAgentAcceptanceEvidenceGateSelfTest = exports.runTestAgentAdversarialEvidenceGateSelfTest = exports.runTestAgentMcpActionEffectSelfTest = exports.runTestAgentCrossSessionActionEffectSelfTest = exports.runTestAgentMultiSessionActionEffectSelfTest = exports.runTestAgentPlaywrightActionEffectSelfTest = exports.runTestAgentChromeDevtoolsRecoverySelfTest = exports.runTestAgentFailedBrowserRecoverySelfTest = exports.runTestAgentUnsafeBrowserRecoverySelfTest = exports.runTestAgentClaudeChromeRecoverySelfTest = exports.runTestAgentMixedBrowserProviderRoutingSelfTest = exports.runTestAgentExistingSessionContractSelfTest = exports.runTestAgentChromeDevtoolsExistingSessionSelfTest = exports.runTestAgentClaudeChromeExistingSessionSelfTest = exports.runTestAgentPlaywrightMultiSessionAuthenticationSelfTest = exports.runTestAgentPlaywrightAuthenticationSelfTest = exports.runTestAgentBrowserAuthenticationContractSelfTest = void 0;
exports.getFreePort = getFreePort;
exports.writeTaskBoardFixtureServer = writeTaskBoardFixtureServer;
exports.refreshManifestItemIntegrity = refreshManifestItemIntegrity;
exports.writeSolidRgbaPng = writeSolidRgbaPng;
exports.buildStoredZip = buildStoredZip;
exports.buildEmptyZip = buildEmptyZip;
exports.runTestAgentSelfTest = runTestAgentSelfTest;
exports.runTestAgentMcpProviderSelfTest = runTestAgentMcpProviderSelfTest;
exports.runTestAgentClaudeChromeMcpSelfTest = runTestAgentClaudeChromeMcpSelfTest;
exports.runTestAgentComputerUseMcpSelfTest = runTestAgentComputerUseMcpSelfTest;
exports.runTestAgentWorkOrderNormalizationSelfTest = runTestAgentWorkOrderNormalizationSelfTest;
exports.runTestAgentSelfTestMatrixSelfTest = runTestAgentSelfTestMatrixSelfTest;
exports.runTestAgentHandoffBuilderSelfTest = runTestAgentHandoffBuilderSelfTest;
exports.runTestAgentHandoffContractSelfTest = runTestAgentHandoffContractSelfTest;
exports.runTestAgentArtifactSelfTest = runTestAgentArtifactSelfTest;
exports.runTestAgentVerdictSelfTest = runTestAgentVerdictSelfTest;
exports.runTestAgentFailureSummarySelfTest = runTestAgentFailureSummarySelfTest;
exports.runTestAgentBrowserProviderGapSummarySelfTest = runTestAgentBrowserProviderGapSummarySelfTest;
exports.runTestAgentBrowserSessionComparisonSelfTest = runTestAgentBrowserSessionComparisonSelfTest;
exports.runTestAgentBrowserFlowSummarySelfTest = runTestAgentBrowserFlowSummarySelfTest;
exports.runTestAgentBrowserMultiSessionSummarySelfTest = runTestAgentBrowserMultiSessionSummarySelfTest;
exports.runTestAgentBrowserStabilitySummarySelfTest = runTestAgentBrowserStabilitySummarySelfTest;
exports.runTestAgentAcceptanceSummarySelfTest = runTestAgentAcceptanceSummarySelfTest;
exports.runTestAgentArtifactManifestSelfTest = runTestAgentArtifactManifestSelfTest;
exports.runTestAgentArtifactVerifierSelfTest = runTestAgentArtifactVerifierSelfTest;
exports.runTestAgentMcpScreenshotArtifactSelfTest = runTestAgentMcpScreenshotArtifactSelfTest;
exports.runTestAgentMcpFailureScreenshotSelfTest = runTestAgentMcpFailureScreenshotSelfTest;
exports.runTestAgentBrowserEvidenceArtifactSelfTest = runTestAgentBrowserEvidenceArtifactSelfTest;
exports.runTestAgentCoverageSelfTest = runTestAgentCoverageSelfTest;
exports.runTestAgentCommandPlannerSelfTest = runTestAgentCommandPlannerSelfTest;
exports.runTestAgentExecutionPlanSelfTest = runTestAgentExecutionPlanSelfTest;
exports.runTestAgentHttpApiSelfTest = runTestAgentHttpApiSelfTest;
exports.runTestAgentAdversarialHttpSelfTest = runTestAgentAdversarialHttpSelfTest;
exports.runTestAgentAdversarialBrowserSelfTest = runTestAgentAdversarialBrowserSelfTest;
exports.runTestAgentBrowserProbeTemplateSelfTest = runTestAgentBrowserProbeTemplateSelfTest;
exports.runTestAgentAutoBrowserSmokeSelfTest = runTestAgentAutoBrowserSmokeSelfTest;
exports.runTestAgentBrowserCheckSourceMetadataSelfTest = runTestAgentBrowserCheckSourceMetadataSelfTest;
exports.runTestAgentAcceptanceNetworkStateFlowSelfTest = runTestAgentAcceptanceNetworkStateFlowSelfTest;
exports.runTestAgentAcceptanceHistoryFlowSelfTest = runTestAgentAcceptanceHistoryFlowSelfTest;
exports.runTestAgentMultiSessionBrowserSelfTest = runTestAgentMultiSessionBrowserSelfTest;
exports.runTestAgentBrowserStabilitySelfTest = runTestAgentBrowserStabilitySelfTest;
exports.runTestAgentAcceptanceDragFlowSelfTest = runTestAgentAcceptanceDragFlowSelfTest;
exports.runTestAgentAcceptanceClipboardFlowSelfTest = runTestAgentAcceptanceClipboardFlowSelfTest;
exports.runTestAgentAcceptanceDialogFlowSelfTest = runTestAgentAcceptanceDialogFlowSelfTest;
exports.runTestAgentAcceptancePopupFlowSelfTest = runTestAgentAcceptancePopupFlowSelfTest;
exports.runTestAgentAcceptanceKeyboardFlowSelfTest = runTestAgentAcceptanceKeyboardFlowSelfTest;
exports.runTestAgentAcceptanceHoverFlowSelfTest = runTestAgentAcceptanceHoverFlowSelfTest;
exports.runTestAgentAcceptanceScrollFlowSelfTest = runTestAgentAcceptanceScrollFlowSelfTest;
exports.runTestAgentAcceptanceRepeatedClickSelfTest = runTestAgentAcceptanceRepeatedClickSelfTest;
exports.runTestAgentAcceptanceChineseRepeatedClickSelfTest = runTestAgentAcceptanceChineseRepeatedClickSelfTest;
exports.runTestAgentBlankPageSmokeSelfTest = runTestAgentBlankPageSmokeSelfTest;
exports.runTestAgentAcceptancePathSmokeSelfTest = runTestAgentAcceptancePathSmokeSelfTest;
exports.runTestAgentAcceptancePathGroupingSelfTest = runTestAgentAcceptancePathGroupingSelfTest;
exports.runTestAgentAcceptanceResponsiveViewportSelfTest = runTestAgentAcceptanceResponsiveViewportSelfTest;
exports.runTestAgentAcceptanceChineseResponsiveViewportSelfTest = runTestAgentAcceptanceChineseResponsiveViewportSelfTest;
exports.runTestAgentAcceptanceDownloadFlowSelfTest = runTestAgentAcceptanceDownloadFlowSelfTest;
exports.runTestAgentAcceptanceChineseDownloadFlowSelfTest = runTestAgentAcceptanceChineseDownloadFlowSelfTest;
exports.runTestAgentAcceptanceUploadFlowSelfTest = runTestAgentAcceptanceUploadFlowSelfTest;
exports.runTestAgentAcceptanceChineseUploadFlowSelfTest = runTestAgentAcceptanceChineseUploadFlowSelfTest;
exports.runTestAgentAcceptanceClickFlowSelfTest = runTestAgentAcceptanceClickFlowSelfTest;
exports.runTestAgentAcceptanceChineseClickFlowSelfTest = runTestAgentAcceptanceChineseClickFlowSelfTest;
exports.runTestAgentAcceptanceClickNavigationFlowSelfTest = runTestAgentAcceptanceClickNavigationFlowSelfTest;
exports.runTestAgentAcceptanceMultiClickFlowSelfTest = runTestAgentAcceptanceMultiClickFlowSelfTest;
exports.runTestAgentAcceptanceFormFlowSelfTest = runTestAgentAcceptanceFormFlowSelfTest;
exports.runTestAgentAcceptanceChineseFormFlowSelfTest = runTestAgentAcceptanceChineseFormFlowSelfTest;
exports.runTestAgentAcceptanceMultiFieldFormFlowSelfTest = runTestAgentAcceptanceMultiFieldFormFlowSelfTest;
exports.runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest = runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest;
exports.runTestAgentAcceptanceUncheckRadioFormFlowSelfTest = runTestAgentAcceptanceUncheckRadioFormFlowSelfTest;
exports.runTestAgentAcceptanceRedirectFormFlowSelfTest = runTestAgentAcceptanceRedirectFormFlowSelfTest;
exports.runTestAgentAcceptanceInvalidFormAdversarialSelfTest = runTestAgentAcceptanceInvalidFormAdversarialSelfTest;
exports.runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest = runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest;
exports.runTestAgentPlaywrightUrlIncludesWaitSelfTest = runTestAgentPlaywrightUrlIncludesWaitSelfTest;
exports.runTestAgentPlaywrightFailureScreenshotSelfTest = runTestAgentPlaywrightFailureScreenshotSelfTest;
exports.runTestAgentBrowserUrlTitleAssertionSelfTest = runTestAgentBrowserUrlTitleAssertionSelfTest;
exports.runTestAgentBrowserConsoleAssertionSelfTest = runTestAgentBrowserConsoleAssertionSelfTest;
exports.runTestAgentBrowserNetworkStateActionSelfTest = runTestAgentBrowserNetworkStateActionSelfTest;
exports.runTestAgentBrowserAccessibilityAssertionSelfTest = runTestAgentBrowserAccessibilityAssertionSelfTest;
exports.runTestAgentBrowserAccessibilitySnapshotArtifactSelfTest = runTestAgentBrowserAccessibilitySnapshotArtifactSelfTest;
exports.runTestAgentBrowserAriaStateAssertionSelfTest = runTestAgentBrowserAriaStateAssertionSelfTest;
exports.runTestAgentBrowserNetworkAssertionSelfTest = runTestAgentBrowserNetworkAssertionSelfTest;
exports.runTestAgentStructuredBrowserNetworkAssertionSelfTest = runTestAgentStructuredBrowserNetworkAssertionSelfTest;
exports.runTestAgentNegativeBrowserNetworkAssertionSelfTest = runTestAgentNegativeBrowserNetworkAssertionSelfTest;
exports.runTestAgentBrowserRequestMetadataAssertionSelfTest = runTestAgentBrowserRequestMetadataAssertionSelfTest;
exports.runTestAgentBrowserInteractionSummarySelfTest = runTestAgentBrowserInteractionSummarySelfTest;
exports.runTestAgentAcceptanceDerivedChecksSelfTest = runTestAgentAcceptanceDerivedChecksSelfTest;
exports.runTestAgentAcceptanceDerivedAccessibilitySelfTest = runTestAgentAcceptanceDerivedAccessibilitySelfTest;
exports.runTestAgentAcceptanceDerivedStorageAssertionSelfTest = runTestAgentAcceptanceDerivedStorageAssertionSelfTest;
exports.runTestAgentAcceptanceDerivedCookieAssertionSelfTest = runTestAgentAcceptanceDerivedCookieAssertionSelfTest;
exports.runTestAgentAcceptanceDerivedNetworkAssertionSelfTest = runTestAgentAcceptanceDerivedNetworkAssertionSelfTest;
exports.runTestAgentAcceptanceDerivedNegativeUiSelfTest = runTestAgentAcceptanceDerivedNegativeUiSelfTest;
exports.runTestAgentSemanticLocatorSelfTest = runTestAgentSemanticLocatorSelfTest;
exports.runTestAgentBrowserStateSelfTest = runTestAgentBrowserStateSelfTest;
exports.runTestAgentBrowserScriptWaitAssertionSelfTest = runTestAgentBrowserScriptWaitAssertionSelfTest;
exports.runTestAgentBrowserSelectStateSelfTest = runTestAgentBrowserSelectStateSelfTest;
exports.runTestAgentBrowserInputValueAssertionSelfTest = runTestAgentBrowserInputValueAssertionSelfTest;
exports.runTestAgentBrowserEnabledStateSelfTest = runTestAgentBrowserEnabledStateSelfTest;
exports.runTestAgentBrowserFocusStateSelfTest = runTestAgentBrowserFocusStateSelfTest;
exports.runTestAgentBrowserPresenceAssertionSelfTest = runTestAgentBrowserPresenceAssertionSelfTest;
exports.runTestAgentBrowserElementCountSelfTest = runTestAgentBrowserElementCountSelfTest;
exports.runTestAgentBrowserDialogAssertionSelfTest = runTestAgentBrowserDialogAssertionSelfTest;
exports.runTestAgentBrowserPopupAssertionSelfTest = runTestAgentBrowserPopupAssertionSelfTest;
exports.runTestAgentBrowserTableAssertionSelfTest = runTestAgentBrowserTableAssertionSelfTest;
exports.runTestAgentBrowserDragToActionSelfTest = runTestAgentBrowserDragToActionSelfTest;
exports.runTestAgentBrowserHoverActionSelfTest = runTestAgentBrowserHoverActionSelfTest;
exports.runTestAgentBrowserHistoryNavigationActionSelfTest = runTestAgentBrowserHistoryNavigationActionSelfTest;
exports.runTestAgentBrowserScrollActionSelfTest = runTestAgentBrowserScrollActionSelfTest;
exports.runTestAgentBrowserAdvancedMouseActionSelfTest = runTestAgentBrowserAdvancedMouseActionSelfTest;
exports.runTestAgentBrowserKeyboardActionSelfTest = runTestAgentBrowserKeyboardActionSelfTest;
exports.runTestAgentBrowserStorageActionSelfTest = runTestAgentBrowserStorageActionSelfTest;
exports.runTestAgentBrowserCookieActionSelfTest = runTestAgentBrowserCookieActionSelfTest;
exports.runTestAgentBrowserClipboardAssertionSelfTest = runTestAgentBrowserClipboardAssertionSelfTest;
exports.runTestAgentBrowserElementScreenshotAssertionSelfTest = runTestAgentBrowserElementScreenshotAssertionSelfTest;
exports.runTestAgentBrowserTextOrderAssertionSelfTest = runTestAgentBrowserTextOrderAssertionSelfTest;
exports.runTestAgentBrowserAttributeAssertionSelfTest = runTestAgentBrowserAttributeAssertionSelfTest;
exports.runTestAgentBrowserComputedStyleAssertionSelfTest = runTestAgentBrowserComputedStyleAssertionSelfTest;
exports.runTestAgentBrowserCookieAssertionSelfTest = runTestAgentBrowserCookieAssertionSelfTest;
exports.runTestAgentPlaywrightDownloadArtifactSelfTest = runTestAgentPlaywrightDownloadArtifactSelfTest;
exports.runTestAgentPlaywrightFileUploadSelfTest = runTestAgentPlaywrightFileUploadSelfTest;
exports.runTestAgentPlaywrightMultiFileUploadSelfTest = runTestAgentPlaywrightMultiFileUploadSelfTest;
exports.runTestAgentPlaywrightViewportSelfTest = runTestAgentPlaywrightViewportSelfTest;
exports.runTestAgentPlaywrightContextOptionsSelfTest = runTestAgentPlaywrightContextOptionsSelfTest;
exports.runTestAgentPlaywrightInViewportSelfTest = runTestAgentPlaywrightInViewportSelfTest;
exports.runTestAgentPlaywrightNoHorizontalOverflowSelfTest = runTestAgentPlaywrightNoHorizontalOverflowSelfTest;
exports.runTestAgentBrowserPreflightSelfTest = runTestAgentBrowserPreflightSelfTest;
exports.runTestAgentPlaywrightRealBrowserSelfTest = runTestAgentPlaywrightRealBrowserSelfTest;
exports.runTestAgentPlaywrightResourceErrorSelfTest = runTestAgentPlaywrightResourceErrorSelfTest;
exports.runTestAgentStandaloneCliRealWebSelfTest = runTestAgentStandaloneCliRealWebSelfTest;
exports.runTestAgentStandaloneHandoffRealWebSelfTest = runTestAgentStandaloneHandoffRealWebSelfTest;
exports.runTestAgentPlaywrightAvailabilitySelfTest = runTestAgentPlaywrightAvailabilitySelfTest;
exports.runTestAgentRequiredCheckCoverageSelfTest = runTestAgentRequiredCheckCoverageSelfTest;
exports.runTestAgentCliSelfTest = runTestAgentCliSelfTest;
exports.runTestAgentContractSelfTest = runTestAgentContractSelfTest;
const fs = __importStar(require("fs"));
const net = __importStar(require("net"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const zlib = __importStar(require("zlib"));
var authentication_self_test_1 = require("./browser/authentication-self-test");
Object.defineProperty(exports, "runTestAgentBrowserAuthenticationContractSelfTest", { enumerable: true, get: function () { return authentication_self_test_1.runTestAgentBrowserAuthenticationContractSelfTest; } });
Object.defineProperty(exports, "runTestAgentPlaywrightAuthenticationSelfTest", { enumerable: true, get: function () { return authentication_self_test_1.runTestAgentPlaywrightAuthenticationSelfTest; } });
Object.defineProperty(exports, "runTestAgentPlaywrightMultiSessionAuthenticationSelfTest", { enumerable: true, get: function () { return authentication_self_test_1.runTestAgentPlaywrightMultiSessionAuthenticationSelfTest; } });
var existing_session_self_test_1 = require("./browser/existing-session-self-test");
Object.defineProperty(exports, "runTestAgentClaudeChromeExistingSessionSelfTest", { enumerable: true, get: function () { return existing_session_self_test_1.runTestAgentClaudeChromeExistingSessionSelfTest; } });
Object.defineProperty(exports, "runTestAgentChromeDevtoolsExistingSessionSelfTest", { enumerable: true, get: function () { return existing_session_self_test_1.runTestAgentChromeDevtoolsExistingSessionSelfTest; } });
Object.defineProperty(exports, "runTestAgentExistingSessionContractSelfTest", { enumerable: true, get: function () { return existing_session_self_test_1.runTestAgentExistingSessionContractSelfTest; } });
Object.defineProperty(exports, "runTestAgentMixedBrowserProviderRoutingSelfTest", { enumerable: true, get: function () { return existing_session_self_test_1.runTestAgentMixedBrowserProviderRoutingSelfTest; } });
var recovery_self_test_1 = require("./browser/recovery-self-test");
Object.defineProperty(exports, "runTestAgentClaudeChromeRecoverySelfTest", { enumerable: true, get: function () { return recovery_self_test_1.runTestAgentClaudeChromeRecoverySelfTest; } });
Object.defineProperty(exports, "runTestAgentUnsafeBrowserRecoverySelfTest", { enumerable: true, get: function () { return recovery_self_test_1.runTestAgentUnsafeBrowserRecoverySelfTest; } });
Object.defineProperty(exports, "runTestAgentFailedBrowserRecoverySelfTest", { enumerable: true, get: function () { return recovery_self_test_1.runTestAgentFailedBrowserRecoverySelfTest; } });
Object.defineProperty(exports, "runTestAgentChromeDevtoolsRecoverySelfTest", { enumerable: true, get: function () { return recovery_self_test_1.runTestAgentChromeDevtoolsRecoverySelfTest; } });
var action_effect_self_test_1 = require("./browser/action-effect-self-test");
Object.defineProperty(exports, "runTestAgentPlaywrightActionEffectSelfTest", { enumerable: true, get: function () { return action_effect_self_test_1.runTestAgentPlaywrightActionEffectSelfTest; } });
Object.defineProperty(exports, "runTestAgentMultiSessionActionEffectSelfTest", { enumerable: true, get: function () { return action_effect_self_test_1.runTestAgentMultiSessionActionEffectSelfTest; } });
Object.defineProperty(exports, "runTestAgentCrossSessionActionEffectSelfTest", { enumerable: true, get: function () { return action_effect_self_test_1.runTestAgentCrossSessionActionEffectSelfTest; } });
Object.defineProperty(exports, "runTestAgentMcpActionEffectSelfTest", { enumerable: true, get: function () { return action_effect_self_test_1.runTestAgentMcpActionEffectSelfTest; } });
var adversarial_self_test_1 = require("./adversarial-self-test");
Object.defineProperty(exports, "runTestAgentAdversarialEvidenceGateSelfTest", { enumerable: true, get: function () { return adversarial_self_test_1.runTestAgentAdversarialEvidenceGateSelfTest; } });
var acceptance_gate_self_test_1 = require("./acceptance-gate-self-test");
Object.defineProperty(exports, "runTestAgentAcceptanceEvidenceGateSelfTest", { enumerable: true, get: function () { return acceptance_gate_self_test_1.runTestAgentAcceptanceEvidenceGateSelfTest; } });
var http_concurrency_self_test_1 = require("./http-concurrency-self-test");
Object.defineProperty(exports, "runTestAgentHttpConcurrencySelfTest", { enumerable: true, get: function () { return http_concurrency_self_test_1.runTestAgentHttpConcurrencySelfTest; } });
var provider_routing_self_test_1 = require("./browser/provider-routing-self-test");
Object.defineProperty(exports, "runTestAgentCapabilityAwareProviderRoutingSelfTest", { enumerable: true, get: function () { return provider_routing_self_test_1.runTestAgentCapabilityAwareProviderRoutingSelfTest; } });
var http_page_resources_self_test_1 = require("./http-page-resources-self-test");
Object.defineProperty(exports, "runTestAgentHttpPageResourcesSelfTest", { enumerable: true, get: function () { return http_page_resources_self_test_1.runTestAgentHttpPageResourcesSelfTest; } });
var check_execution_coverage_self_test_1 = require("./browser/check-execution-coverage-self-test");
Object.defineProperty(exports, "runTestAgentBrowserCheckExecutionCoverageSelfTest", { enumerable: true, get: function () { return check_execution_coverage_self_test_1.runTestAgentBrowserCheckExecutionCoverageSelfTest; } });
var tool_evidence_lineage_self_test_1 = require("./browser/tool-evidence-lineage-self-test");
Object.defineProperty(exports, "runTestAgentBrowserToolEvidenceLineageSelfTest", { enumerable: true, get: function () { return tool_evidence_lineage_self_test_1.runTestAgentBrowserToolEvidenceLineageSelfTest; } });
var tool_call_timeout_self_test_1 = require("./browser/tool-call-timeout-self-test");
Object.defineProperty(exports, "runTestAgentBrowserToolCallTimeoutSelfTest", { enumerable: true, get: function () { return tool_call_timeout_self_test_1.runTestAgentBrowserToolCallTimeoutSelfTest; } });
var evidence_temporal_integrity_self_test_1 = require("./browser/evidence-temporal-integrity-self-test");
Object.defineProperty(exports, "runTestAgentBrowserEvidenceTemporalIntegritySelfTest", { enumerable: true, get: function () { return evidence_temporal_integrity_self_test_1.runTestAgentBrowserEvidenceTemporalIntegritySelfTest; } });
var resource_lifecycle_self_test_1 = require("./browser/resource-lifecycle-self-test");
Object.defineProperty(exports, "runTestAgentBrowserResourceLifecycleSelfTest", { enumerable: true, get: function () { return resource_lifecycle_self_test_1.runTestAgentBrowserResourceLifecycleSelfTest; } });
var invocation_self_test_1 = require("./invocation-self-test");
Object.defineProperty(exports, "runTestAgentInvocationSelfTest", { enumerable: true, get: function () { return invocation_self_test_1.runTestAgentInvocationSelfTest; } });
function getFreePort() {
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
function writeTaskBoardFixtureServer(dir) {
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
function sha256File(filePath) {
    const hash = crypto.createHash("sha256");
    hash.update(fs.readFileSync(filePath));
    return hash.digest("hex");
}
function refreshManifestItemIntegrity(manifestPath, artifactType) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const files = manifest.files || [];
    const item = files.find((entry) => entry.type === artifactType);
    if (!item?.path)
        return manifest;
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
function pngChunk(type, data) {
    const chunk = Buffer.alloc(12 + data.length);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4, 4, "ascii");
    data.copy(chunk, 8);
    chunk.writeUInt32BE(0, 8 + data.length);
    return chunk;
}
function writeSolidRgbaPng(filePath, width, height, rgba) {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    const rows = [];
    const pixel = Buffer.from(rgba);
    for (let y = 0; y < height; y += 1) {
        const row = Buffer.alloc(1 + width * 4);
        row[0] = 0;
        for (let x = 0; x < width; x += 1)
            pixel.copy(row, 1 + x * 4);
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
function buildStoredZip(entries) {
    const localParts = [];
    const centralParts = [];
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
function buildEmptyZip() {
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    return eocd;
}
async function runTestAgentSelfTest(options = {}) {
    return require("./self-test-core").runTestAgentSelfTest(options);
}
async function runTestAgentMcpProviderSelfTest() {
    return require("./self-test-core").runTestAgentMcpProviderSelfTest();
}
async function runTestAgentClaudeChromeMcpSelfTest() {
    return require("./self-test-core").runTestAgentClaudeChromeMcpSelfTest();
}
async function runTestAgentComputerUseMcpSelfTest() {
    return require("./self-test-core").runTestAgentComputerUseMcpSelfTest();
}
function runTestAgentWorkOrderNormalizationSelfTest() {
    return require("./self-test-core").runTestAgentWorkOrderNormalizationSelfTest();
}
async function runTestAgentSelfTestMatrixSelfTest() {
    return require("./self-test-core").runTestAgentSelfTestMatrixSelfTest();
}
function runTestAgentHandoffBuilderSelfTest() {
    return require("./self-test-core").runTestAgentHandoffBuilderSelfTest();
}
function runTestAgentHandoffContractSelfTest() {
    return require("./self-test-core").runTestAgentHandoffContractSelfTest();
}
async function runTestAgentArtifactSelfTest() {
    return require("./self-test-core").runTestAgentArtifactSelfTest();
}
async function runTestAgentVerdictSelfTest() {
    return require("./self-test-core").runTestAgentVerdictSelfTest();
}
function runTestAgentFailureSummarySelfTest() {
    return require("./self-test-core").runTestAgentFailureSummarySelfTest();
}
function runTestAgentBrowserProviderGapSummarySelfTest() {
    return require("./self-test-core").runTestAgentBrowserProviderGapSummarySelfTest();
}
async function runTestAgentBrowserSessionComparisonSelfTest() {
    return require("./self-test-core").runTestAgentBrowserSessionComparisonSelfTest();
}
function runTestAgentBrowserFlowSummarySelfTest() {
    return require("./self-test-core").runTestAgentBrowserFlowSummarySelfTest();
}
function runTestAgentBrowserMultiSessionSummarySelfTest() {
    return require("./self-test-core").runTestAgentBrowserMultiSessionSummarySelfTest();
}
function runTestAgentBrowserStabilitySummarySelfTest() {
    return require("./self-test-core").runTestAgentBrowserStabilitySummarySelfTest();
}
function runTestAgentAcceptanceSummarySelfTest() {
    return require("./self-test-core").runTestAgentAcceptanceSummarySelfTest();
}
async function runTestAgentArtifactManifestSelfTest() {
    return require("./self-test-core").runTestAgentArtifactManifestSelfTest();
}
async function runTestAgentArtifactVerifierSelfTest() {
    return require("./self-test-core").runTestAgentArtifactVerifierSelfTest();
}
async function runTestAgentMcpScreenshotArtifactSelfTest() {
    return require("./self-test-core").runTestAgentMcpScreenshotArtifactSelfTest();
}
async function runTestAgentMcpFailureScreenshotSelfTest() {
    return require("./self-test-core").runTestAgentMcpFailureScreenshotSelfTest();
}
async function runTestAgentBrowserEvidenceArtifactSelfTest() {
    return require("./self-test-core").runTestAgentBrowserEvidenceArtifactSelfTest();
}
function runTestAgentCoverageSelfTest() {
    return require("./self-test-core").runTestAgentCoverageSelfTest();
}
async function runTestAgentCommandPlannerSelfTest() {
    return require("./self-test-core").runTestAgentCommandPlannerSelfTest();
}
async function runTestAgentExecutionPlanSelfTest() {
    return require("./self-test-core").runTestAgentExecutionPlanSelfTest();
}
async function runTestAgentHttpApiSelfTest() {
    return require("./self-test-core").runTestAgentHttpApiSelfTest();
}
async function runTestAgentAdversarialHttpSelfTest() {
    return require("./self-test-core").runTestAgentAdversarialHttpSelfTest();
}
async function runTestAgentAdversarialBrowserSelfTest() {
    return require("./self-test-core").runTestAgentAdversarialBrowserSelfTest();
}
async function runTestAgentBrowserProbeTemplateSelfTest() {
    return require("./self-test-core").runTestAgentBrowserProbeTemplateSelfTest();
}
async function runTestAgentAutoBrowserSmokeSelfTest() {
    return require("./self-test-core").runTestAgentAutoBrowserSmokeSelfTest();
}
function runTestAgentBrowserCheckSourceMetadataSelfTest() {
    return require("./self-test-browser-flows").runTestAgentBrowserCheckSourceMetadataSelfTest();
}
async function runTestAgentAcceptanceNetworkStateFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceNetworkStateFlowSelfTest();
}
async function runTestAgentAcceptanceHistoryFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceHistoryFlowSelfTest();
}
async function runTestAgentMultiSessionBrowserSelfTest() {
    return require("./self-test-browser-flows").runTestAgentMultiSessionBrowserSelfTest();
}
async function runTestAgentBrowserStabilitySelfTest() {
    return require("./self-test-browser-flows").runTestAgentBrowserStabilitySelfTest();
}
async function runTestAgentAcceptanceDragFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceDragFlowSelfTest();
}
async function runTestAgentAcceptanceClipboardFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceClipboardFlowSelfTest();
}
async function runTestAgentAcceptanceDialogFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceDialogFlowSelfTest();
}
async function runTestAgentAcceptancePopupFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptancePopupFlowSelfTest();
}
async function runTestAgentAcceptanceKeyboardFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceKeyboardFlowSelfTest();
}
async function runTestAgentAcceptanceHoverFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceHoverFlowSelfTest();
}
async function runTestAgentAcceptanceScrollFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceScrollFlowSelfTest();
}
async function runTestAgentAcceptanceRepeatedClickSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceRepeatedClickSelfTest();
}
async function runTestAgentAcceptanceChineseRepeatedClickSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceChineseRepeatedClickSelfTest();
}
async function runTestAgentBlankPageSmokeSelfTest() {
    return require("./self-test-browser-flows").runTestAgentBlankPageSmokeSelfTest();
}
async function runTestAgentAcceptancePathSmokeSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptancePathSmokeSelfTest();
}
async function runTestAgentAcceptancePathGroupingSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptancePathGroupingSelfTest();
}
async function runTestAgentAcceptanceResponsiveViewportSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceResponsiveViewportSelfTest();
}
async function runTestAgentAcceptanceChineseResponsiveViewportSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceChineseResponsiveViewportSelfTest();
}
async function runTestAgentAcceptanceDownloadFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceDownloadFlowSelfTest();
}
async function runTestAgentAcceptanceChineseDownloadFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceChineseDownloadFlowSelfTest();
}
async function runTestAgentAcceptanceUploadFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceUploadFlowSelfTest();
}
async function runTestAgentAcceptanceChineseUploadFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceChineseUploadFlowSelfTest();
}
async function runTestAgentAcceptanceClickFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceClickFlowSelfTest();
}
async function runTestAgentAcceptanceChineseClickFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceChineseClickFlowSelfTest();
}
async function runTestAgentAcceptanceClickNavigationFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceClickNavigationFlowSelfTest();
}
async function runTestAgentAcceptanceMultiClickFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceMultiClickFlowSelfTest();
}
async function runTestAgentAcceptanceFormFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceFormFlowSelfTest();
}
async function runTestAgentAcceptanceChineseFormFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceChineseFormFlowSelfTest();
}
async function runTestAgentAcceptanceMultiFieldFormFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceMultiFieldFormFlowSelfTest();
}
async function runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest();
}
async function runTestAgentAcceptanceUncheckRadioFormFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceUncheckRadioFormFlowSelfTest();
}
async function runTestAgentAcceptanceRedirectFormFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceRedirectFormFlowSelfTest();
}
async function runTestAgentAcceptanceInvalidFormAdversarialSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceInvalidFormAdversarialSelfTest();
}
async function runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest() {
    return require("./self-test-browser-flows").runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest();
}
async function runTestAgentPlaywrightUrlIncludesWaitSelfTest() {
    return require("./self-test-browser-flows").runTestAgentPlaywrightUrlIncludesWaitSelfTest();
}
async function runTestAgentPlaywrightFailureScreenshotSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentPlaywrightFailureScreenshotSelfTest();
}
async function runTestAgentBrowserUrlTitleAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserUrlTitleAssertionSelfTest();
}
async function runTestAgentBrowserConsoleAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserConsoleAssertionSelfTest();
}
async function runTestAgentBrowserNetworkStateActionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserNetworkStateActionSelfTest();
}
async function runTestAgentBrowserAccessibilityAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserAccessibilityAssertionSelfTest();
}
async function runTestAgentBrowserAccessibilitySnapshotArtifactSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserAccessibilitySnapshotArtifactSelfTest();
}
async function runTestAgentBrowserAriaStateAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserAriaStateAssertionSelfTest();
}
async function runTestAgentBrowserNetworkAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserNetworkAssertionSelfTest();
}
async function runTestAgentStructuredBrowserNetworkAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentStructuredBrowserNetworkAssertionSelfTest();
}
async function runTestAgentNegativeBrowserNetworkAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentNegativeBrowserNetworkAssertionSelfTest();
}
async function runTestAgentBrowserRequestMetadataAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserRequestMetadataAssertionSelfTest();
}
async function runTestAgentBrowserInteractionSummarySelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserInteractionSummarySelfTest();
}
function runTestAgentAcceptanceDerivedChecksSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentAcceptanceDerivedChecksSelfTest();
}
async function runTestAgentAcceptanceDerivedAccessibilitySelfTest() {
    return require("./self-test-browser-assertions").runTestAgentAcceptanceDerivedAccessibilitySelfTest();
}
async function runTestAgentAcceptanceDerivedStorageAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentAcceptanceDerivedStorageAssertionSelfTest();
}
async function runTestAgentAcceptanceDerivedCookieAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentAcceptanceDerivedCookieAssertionSelfTest();
}
async function runTestAgentAcceptanceDerivedNetworkAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentAcceptanceDerivedNetworkAssertionSelfTest();
}
async function runTestAgentAcceptanceDerivedNegativeUiSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentAcceptanceDerivedNegativeUiSelfTest();
}
function runTestAgentSemanticLocatorSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentSemanticLocatorSelfTest();
}
function runTestAgentBrowserStateSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserStateSelfTest();
}
async function runTestAgentBrowserScriptWaitAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserScriptWaitAssertionSelfTest();
}
async function runTestAgentBrowserSelectStateSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserSelectStateSelfTest();
}
async function runTestAgentBrowserInputValueAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserInputValueAssertionSelfTest();
}
async function runTestAgentBrowserEnabledStateSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserEnabledStateSelfTest();
}
async function runTestAgentBrowserFocusStateSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserFocusStateSelfTest();
}
async function runTestAgentBrowserPresenceAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserPresenceAssertionSelfTest();
}
async function runTestAgentBrowserElementCountSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserElementCountSelfTest();
}
async function runTestAgentBrowserDialogAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserDialogAssertionSelfTest();
}
async function runTestAgentBrowserPopupAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserPopupAssertionSelfTest();
}
async function runTestAgentBrowserTableAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserTableAssertionSelfTest();
}
async function runTestAgentBrowserDragToActionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserDragToActionSelfTest();
}
async function runTestAgentBrowserHoverActionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserHoverActionSelfTest();
}
async function runTestAgentBrowserHistoryNavigationActionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserHistoryNavigationActionSelfTest();
}
async function runTestAgentBrowserScrollActionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserScrollActionSelfTest();
}
async function runTestAgentBrowserAdvancedMouseActionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserAdvancedMouseActionSelfTest();
}
async function runTestAgentBrowserKeyboardActionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserKeyboardActionSelfTest();
}
async function runTestAgentBrowserStorageActionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserStorageActionSelfTest();
}
async function runTestAgentBrowserCookieActionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserCookieActionSelfTest();
}
async function runTestAgentBrowserClipboardAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserClipboardAssertionSelfTest();
}
async function runTestAgentBrowserElementScreenshotAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserElementScreenshotAssertionSelfTest();
}
async function runTestAgentBrowserTextOrderAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserTextOrderAssertionSelfTest();
}
async function runTestAgentBrowserAttributeAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserAttributeAssertionSelfTest();
}
async function runTestAgentBrowserComputedStyleAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserComputedStyleAssertionSelfTest();
}
async function runTestAgentBrowserCookieAssertionSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentBrowserCookieAssertionSelfTest();
}
async function runTestAgentPlaywrightDownloadArtifactSelfTest() {
    return require("./self-test-browser-assertions").runTestAgentPlaywrightDownloadArtifactSelfTest();
}
async function runTestAgentPlaywrightFileUploadSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentPlaywrightFileUploadSelfTest();
}
async function runTestAgentPlaywrightMultiFileUploadSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentPlaywrightMultiFileUploadSelfTest();
}
async function runTestAgentPlaywrightViewportSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentPlaywrightViewportSelfTest();
}
async function runTestAgentPlaywrightContextOptionsSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentPlaywrightContextOptionsSelfTest();
}
async function runTestAgentPlaywrightInViewportSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentPlaywrightInViewportSelfTest();
}
async function runTestAgentPlaywrightNoHorizontalOverflowSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentPlaywrightNoHorizontalOverflowSelfTest();
}
async function runTestAgentBrowserPreflightSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentBrowserPreflightSelfTest();
}
async function runTestAgentPlaywrightRealBrowserSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentPlaywrightRealBrowserSelfTest();
}
async function runTestAgentPlaywrightResourceErrorSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentPlaywrightResourceErrorSelfTest();
}
async function runTestAgentStandaloneCliRealWebSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentStandaloneCliRealWebSelfTest();
}
async function runTestAgentStandaloneHandoffRealWebSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentStandaloneHandoffRealWebSelfTest();
}
async function runTestAgentPlaywrightAvailabilitySelfTest() {
    return require("./self-test-playwright-cli").runTestAgentPlaywrightAvailabilitySelfTest();
}
async function runTestAgentRequiredCheckCoverageSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentRequiredCheckCoverageSelfTest();
}
async function runTestAgentCliSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentCliSelfTest();
}
function runTestAgentContractSelfTest() {
    return require("./self-test-playwright-cli").runTestAgentContractSelfTest();
}
//# sourceMappingURL=self-test.js.map
"use strict";
// Behavior-freeze extraction from self-test-browser-flows.ts (part-03.ts).
// Extracted functional module. The original entry remains a compatibility facade.
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
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const self_test_policy_1 = require("../self-test-policy");
const acceptance_click_flows_1 = require("../browser/acceptance-click-flows");
const acceptance_download_flows_1 = require("../browser/acceptance-download-flows");
const acceptance_form_flows_1 = require("../browser/acceptance-form-flows");
const acceptance_responsive_checks_1 = require("../browser/acceptance-responsive-checks");
const acceptance_upload_flows_1 = require("../browser/acceptance-upload-flows");
const auto_checks_1 = require("../browser/auto-checks");
const playwright_provider_1 = require("../browser/playwright-provider");
const artifacts_1 = require("../artifacts");
const self_test_1 = require("../self-test");
async function runTestAgentAcceptanceResponsiveViewportSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-responsive-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const responsiveUrl = `http://127.0.0.1:${port}/responsive`;
    const acceptanceCriteria = ['Mobile responsive page at /responsive shows "Mobile navigation ready" with no horizontal overflow.'];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
        "const responsive = `<!doctype html>",
        "<html><head><title>Responsive</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
        "<style>",
        "body { margin: 0; font-family: sans-serif; }",
        "main { box-sizing: border-box; width: 100%; max-width: 100%; padding: 16px; }",
        ".desktop { display: block; }",
        ".mobile { display: none; }",
        ".row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }",
        ".tile { min-width: 0; border: 1px solid #ccc; padding: 12px; }",
        "@media (max-width: 600px) { .desktop { display: none; } .mobile { display: block; } .row { grid-template-columns: 1fr; } }",
        "</style></head>",
        "<body><main>",
        "<h1>Responsive dashboard</h1>",
        "<p class=\"desktop\">Desktop navigation ready</p>",
        "<p class=\"mobile\" role=\"status\">Mobile navigation ready</p>",
        "<section class=\"row\"><article class=\"tile\">Overview</article><article class=\"tile\">Activity</article></section>",
        "</main></body></html>`;",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/responsive' ? responsive : root);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-responsive-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: `"${process.execPath}" server.js`,
        targetUrl: baseUrl,
        startupUrl: baseUrl,
        startupTimeoutMs: 30_000,
        env: { PORT: String(port) },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const responsiveChecks = (0, acceptance_responsive_checks_1.buildAcceptanceResponsiveBrowserChecks)(project, acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-responsive-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer mobile responsive browser checks from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["browser_e2e", "responsive", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "acceptance-responsive-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl: baseUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const responsiveCheck = responsiveChecks[0];
    const generatedResponsiveCheck = generatedChecks.find(check => check.probeType === acceptance_responsive_checks_1.ACCEPTANCE_RESPONSIVE_PROBE_TYPE);
    const browser = report.browserResults.find(item => item.probeType === acceptance_responsive_checks_1.ACCEPTANCE_RESPONSIVE_PROBE_TYPE);
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = responsiveChecks.length === 1
        && generatedResponsiveCheck?.url === responsiveUrl
        && responsiveCheck?.viewportWidth === 390
        && responsiveCheck?.viewportHeight === 844
        && responsiveCheck?.isMobile === true
        && responsiveCheck?.assertions?.some(assertion => assertion.type === "noHorizontalOverflow")
        && responsiveCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Mobile navigation ready")
        && responsiveCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/responsive")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.url === responsiveUrl
        && browser?.viewport?.width === 390
        && browser?.viewport?.height === 844
        && browser?.viewport?.isMobile === true
        && browser?.steps.some(step => step.name === "assert:noHorizontalOverflow" && step.status === "passed")
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Mobile navigation ready"))
        && browser?.pageTextPreview?.includes("Mobile navigation ready")
        && byCheck.get("responsive")?.status === "verified"
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        responsiveChecks,
        generatedChecks,
    };
}
async function runTestAgentAcceptanceChineseResponsiveViewportSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-chinese-responsive-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const responsiveUrl = `http://127.0.0.1:${port}/responsive`;
    const expectedText = "移动导航已就绪";
    const acceptanceCriteria = [`移动端响应式页面在 /responsive 显示 "${expectedText}"，并且没有横向滚动。`];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const root = '<!doctype html><title>首页</title><main><h1>首页</h1></main>';",
        "const responsive = `<!doctype html>",
        "<html><head><title>中文响应式</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
        "<style>",
        "body { margin: 0; font-family: sans-serif; }",
        "main { box-sizing: border-box; width: 100%; max-width: 100%; padding: 16px; }",
        ".desktop { display: block; }",
        ".mobile { display: none; }",
        ".row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }",
        ".tile { min-width: 0; border: 1px solid #ccc; padding: 12px; }",
        "@media (max-width: 600px) { .desktop { display: none; } .mobile { display: block; } .row { grid-template-columns: 1fr; } }",
        "</style></head>",
        "<body><main>",
        "<h1>响应式看板</h1>",
        "<p class=\"desktop\">桌面导航已就绪</p>",
        `<p class="mobile" role="status">${expectedText}</p>`,
        "<section class=\"row\"><article class=\"tile\">概览</article><article class=\"tile\">动态</article></section>",
        "</main></body></html>`;",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
        "  res.end(route === '/responsive' ? responsive : root);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-chinese-responsive-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: `"${process.execPath}" server.js`,
        targetUrl: baseUrl,
        startupUrl: baseUrl,
        startupTimeoutMs: 30_000,
        env: { PORT: String(port) },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const responsiveChecks = (0, acceptance_responsive_checks_1.buildAcceptanceResponsiveBrowserChecks)(project, acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-chinese-responsive-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer mobile responsive browser checks from Chinese acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["browser_e2e", "responsive", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "acceptance-chinese-responsive-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl: baseUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const responsiveCheck = responsiveChecks[0];
    const generatedResponsiveCheck = generatedChecks.find(check => check.probeType === acceptance_responsive_checks_1.ACCEPTANCE_RESPONSIVE_PROBE_TYPE);
    const browser = report.browserResults.find(item => item.probeType === acceptance_responsive_checks_1.ACCEPTANCE_RESPONSIVE_PROBE_TYPE);
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = responsiveChecks.length === 1
        && generatedResponsiveCheck?.url === responsiveUrl
        && responsiveCheck?.context?.generatedBy === acceptance_responsive_checks_1.ACCEPTANCE_RESPONSIVE_PROBE_TYPE
        && responsiveCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
        && responsiveCheck?.viewportWidth === 390
        && responsiveCheck?.viewportHeight === 844
        && responsiveCheck?.isMobile === true
        && responsiveCheck?.assertions?.some(assertion => assertion.type === "noHorizontalOverflow")
        && responsiveCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === expectedText)
        && responsiveCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/responsive")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.context?.generatedBy === acceptance_responsive_checks_1.ACCEPTANCE_RESPONSIVE_PROBE_TYPE
        && browser?.url === responsiveUrl
        && browser?.viewport?.width === 390
        && browser?.viewport?.height === 844
        && browser?.viewport?.isMobile === true
        && browser?.steps.some(step => step.name === "assert:noHorizontalOverflow" && step.status === "passed")
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes(expectedText))
        && browser?.pageTextPreview?.includes(expectedText)
        && byCheck.get("responsive")?.status === "verified"
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        responsiveChecks,
        generatedChecks,
    };
}
async function runTestAgentAcceptanceDownloadFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-download-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const exportsUrl = `http://127.0.0.1:${port}/exports`;
    const acceptanceCriteria = ['At /exports, click "Export CSV", then downloads "tasks.csv" containing "Ship TestAgent".'];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const exportsPage = `<!doctype html>",
        "<html><head><title>Exports</title></head>",
        "<body><main>",
        "<h1>Exports</h1>",
        "<button type=\"button\" id=\"export\">Export CSV</button>",
        "<p id=\"status\" role=\"status\">Ready</p>",
        "</main>",
        "<script>",
        "document.getElementById('export').addEventListener('click', () => {",
        "  const csv = 'title,status\\\\nShip TestAgent,done\\\\n';",
        "  const blob = new Blob([csv], { type: 'text/csv' });",
        "  const link = document.createElement('a');",
        "  link.href = URL.createObjectURL(blob);",
        "  link.download = 'tasks.csv';",
        "  document.body.appendChild(link);",
        "  link.click();",
        "  document.getElementById('status').textContent = 'Export started';",
        "  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);",
        "});",
        "</script>",
        "</body></html>`;",
        "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/exports' ? exportsPage : root);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-download-flow-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: `"${process.execPath}" server.js`,
        targetUrl: baseUrl,
        startupUrl: baseUrl,
        startupTimeoutMs: 30_000,
        env: { PORT: String(port) },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const downloadChecks = (0, acceptance_download_flows_1.buildAcceptanceDownloadFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-download-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer a browser download flow from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "browser_download", "browser_artifacts", "screenshots", "console_errors"],
        projects: [{
                name: "acceptance-download-flow-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl: baseUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const flowCheck = downloadChecks[0];
    const downloadArtifact = (browser?.browserArtifacts || []).find(item => item.type === "download");
    const downloadText = downloadArtifact?.path && fs.existsSync(downloadArtifact.path) ? fs.readFileSync(downloadArtifact.path, "utf-8") : "";
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = downloadChecks.length === 1
        && flowCheck?.probeType === acceptance_download_flows_1.ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE
        && flowCheck?.url === exportsUrl
        && flowCheck?.actions?.some(action => action.type === "goto" && action.url === exportsUrl)
        && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Export CSV")
        && flowCheck?.assertions?.some(assertion => assertion.type === "downloadedFile" && assertion.fileName === "tasks.csv" && assertion.contentIncludes === "Ship TestAgent")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_download_flows_1.ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE
        && browser?.url === exportsUrl
        && browser?.finalUrl === exportsUrl
        && browser?.pageTextPreview?.includes("Export started")
        && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("Export CSV"))
        && browser?.steps.some(step => step.name === "assert:downloadedFile" && step.status === "passed" && String(step.detail || "").includes("filename=tasks.csv") && String(step.detail || "").includes("Ship TestAgent"))
        && downloadArtifact?.path
        && fs.existsSync(downloadArtifact.path)
        && downloadText.includes("Ship TestAgent,done")
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("browser_download")?.status === "verified"
        && byCheck.get("browser_artifacts")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        downloadChecks,
        downloadArtifact,
    };
}
async function runTestAgentAcceptanceChineseDownloadFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-chinese-download-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const exportsUrl = `http://127.0.0.1:${port}/exports`;
    const acceptanceCriteria = ['在 /exports 点击 "导出 CSV"，然后下载 "tasks.csv"，内容包含 "Ship TestAgent"。'];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const exportsPage = `<!doctype html>",
        "<html><head><title>导出</title></head>",
        "<body><main>",
        "<h1>导出</h1>",
        "<button type=\"button\" id=\"export\">导出 CSV</button>",
        "<p id=\"status\" role=\"status\">准备就绪</p>",
        "</main>",
        "<script>",
        "document.getElementById('export').addEventListener('click', () => {",
        "  const csv = 'title,status\\\\nShip TestAgent,done\\\\n';",
        "  const blob = new Blob([csv], { type: 'text/csv' });",
        "  const link = document.createElement('a');",
        "  link.href = URL.createObjectURL(blob);",
        "  link.download = 'tasks.csv';",
        "  document.body.appendChild(link);",
        "  link.click();",
        "  document.getElementById('status').textContent = '导出已开始';",
        "  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);",
        "});",
        "</script>",
        "</body></html>`;",
        "const root = '<!doctype html><title>首页</title><main><h1>首页</h1></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
        "  res.end(route === '/exports' ? exportsPage : root);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-chinese-download-flow-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: `"${process.execPath}" server.js`,
        targetUrl: baseUrl,
        startupUrl: baseUrl,
        startupTimeoutMs: 30_000,
        env: { PORT: String(port) },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const downloadChecks = (0, acceptance_download_flows_1.buildAcceptanceDownloadFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-chinese-download-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer browser download checks from Chinese acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "browser_download", "browser_artifacts", "screenshots", "console_errors"],
        projects: [{
                name: project.name,
                workDir: dir,
                runCommand: project.runCommand,
                targetUrl: baseUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const flowCheck = downloadChecks[0];
    const downloadArtifact = (browser?.browserArtifacts || []).find(item => item.type === "download");
    const downloadText = downloadArtifact?.path && fs.existsSync(downloadArtifact.path) ? fs.readFileSync(downloadArtifact.path, "utf-8") : "";
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = downloadChecks.length === 1
        && flowCheck?.probeType === acceptance_download_flows_1.ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE
        && flowCheck?.url === exportsUrl
        && flowCheck?.context?.generatedBy === acceptance_download_flows_1.ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE
        && flowCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
        && flowCheck?.actions?.some(action => action.type === "goto" && action.url === exportsUrl)
        && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "导出 CSV")
        && flowCheck?.assertions?.some(assertion => assertion.type === "downloadedFile" && assertion.fileName === "tasks.csv" && assertion.contentIncludes === "Ship TestAgent")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_download_flows_1.ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE
        && browser?.url === exportsUrl
        && browser?.finalUrl === exportsUrl
        && browser?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
        && browser?.pageTextPreview?.includes("导出已开始")
        && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("导出 CSV"))
        && browser?.steps.some(step => step.name === "assert:downloadedFile" && step.status === "passed" && String(step.detail || "").includes("filename=tasks.csv") && String(step.detail || "").includes("Ship TestAgent"))
        && downloadArtifact?.path
        && fs.existsSync(downloadArtifact.path)
        && downloadText.includes("Ship TestAgent,done")
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("browser_download")?.status === "verified"
        && byCheck.get("browser_artifacts")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        downloadChecks,
        downloadArtifact,
    };
}
async function runTestAgentAcceptanceUploadFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-upload-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const uploadUrl = `http://127.0.0.1:${port}/upload`;
    const payload = "Ship TestAgent upload payload";
    const expectedText = `Uploaded notes.txt: ${payload}`;
    const acceptanceCriteria = [`At /upload, upload "notes.txt" containing "${payload}" to "Attachment", click "Upload", then shows "${expectedText}".`];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const uploadPage = `<!doctype html>",
        "<html><head><title>Upload</title></head>",
        "<body><main>",
        "<h1>Upload</h1>",
        "<label for=\"attachment\">Attachment</label>",
        "<input id=\"attachment\" name=\"attachment\" type=\"file\" />",
        "<button type=\"button\" id=\"upload\">Upload</button>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "</main>",
        "<script>",
        "document.getElementById('upload').addEventListener('click', async () => {",
        "  const input = document.getElementById('attachment');",
        "  const file = input.files && input.files[0];",
        "  if (!file) { document.getElementById('status').textContent = 'Missing file'; return; }",
        "  const text = await file.text();",
        "  document.body.dataset.fileName = file.name;",
        "  document.body.dataset.fileText = text;",
        "  document.getElementById('status').textContent = 'Uploaded ' + file.name + ': ' + text;",
        "});",
        "</script>",
        "</body></html>`;",
        "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/upload' ? uploadPage : root);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-upload-flow-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: `"${process.execPath}" server.js`,
        targetUrl: baseUrl,
        startupUrl: baseUrl,
        startupTimeoutMs: 30_000,
        env: { PORT: String(port) },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const uploadChecks = (0, acceptance_upload_flows_1.buildAcceptanceUploadFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-upload-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer a browser upload flow from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "acceptance-upload-flow-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl: baseUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const flowCheck = uploadChecks[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const uploadAction = flowCheck?.actions?.find(action => action.type === "uploadFile");
    const interaction = report.browserInteractionSummary?.[0];
    const pass = uploadChecks.length === 1
        && flowCheck?.probeType === acceptance_upload_flows_1.ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE
        && flowCheck?.url === uploadUrl
        && flowCheck?.actions?.some(action => action.type === "goto" && action.url === uploadUrl)
        && uploadAction?.label === "Attachment"
        && uploadAction?.fileName === "notes.txt"
        && uploadAction?.fileContent === payload
        && uploadAction?.mediaType === "text/plain"
        && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Upload")
        && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === expectedText)
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_upload_flows_1.ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE
        && browser?.url === uploadUrl
        && browser?.finalUrl === uploadUrl
        && browser?.pageTextPreview?.includes(expectedText)
        && browser?.steps.some(step => step.name === "action:uploadFile" && step.status === "passed" && String(step.detail || "").includes("label=Attachment") && String(step.detail || "").includes("file=notes.txt"))
        && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("Upload"))
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes(expectedText))
        && interaction?.actionTypes?.uploadFile === 1
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        uploadChecks,
    };
}
async function runTestAgentAcceptanceChineseUploadFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-chinese-upload-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const uploadUrl = `http://127.0.0.1:${port}/upload`;
    const payload = "中文上传内容";
    const expectedText = `已上传 notes.txt: ${payload}`;
    const acceptanceCriteria = [`在 /upload 上传 "notes.txt" 内容为 "${payload}" 到 "附件"，点击 "上传"，然后显示 "${expectedText}"。`];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const uploadPage = `<!doctype html>",
        "<html><head><title>中文上传</title></head>",
        "<body><main>",
        "<h1>中文上传</h1>",
        "<label for=\"attachment\">附件</label>",
        "<input id=\"attachment\" name=\"attachment\" type=\"file\" />",
        "<button type=\"button\" id=\"upload\">上传</button>",
        "<p id=\"status\" role=\"status\">等待上传</p>",
        "</main>",
        "<script>",
        "document.getElementById('upload').addEventListener('click', async () => {",
        "  const input = document.getElementById('attachment');",
        "  const file = input.files && input.files[0];",
        "  if (!file) { document.getElementById('status').textContent = '缺少文件'; return; }",
        "  const text = await file.text();",
        "  document.body.dataset.fileName = file.name;",
        "  document.body.dataset.fileText = text;",
        "  document.getElementById('status').textContent = '已上传 ' + file.name + ': ' + text;",
        "});",
        "</script>",
        "</body></html>`;",
        "const root = '<!doctype html><title>首页</title><main><h1>首页</h1></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
        "  res.end(route === '/upload' ? uploadPage : root);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-chinese-upload-flow-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: `"${process.execPath}" server.js`,
        targetUrl: baseUrl,
        startupUrl: baseUrl,
        startupTimeoutMs: 30_000,
        env: { PORT: String(port) },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const uploadChecks = (0, acceptance_upload_flows_1.buildAcceptanceUploadFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-chinese-upload-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer a browser upload flow from Chinese acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "browser_upload", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "acceptance-chinese-upload-flow-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl: baseUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const flowCheck = uploadChecks[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const uploadAction = flowCheck?.actions?.find(action => action.type === "uploadFile");
    const interaction = report.browserInteractionSummary?.[0];
    const pass = uploadChecks.length === 1
        && flowCheck?.probeType === acceptance_upload_flows_1.ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE
        && flowCheck?.url === uploadUrl
        && flowCheck?.context?.generatedBy === acceptance_upload_flows_1.ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE
        && flowCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
        && uploadAction?.label === "附件"
        && uploadAction?.fileName === "notes.txt"
        && uploadAction?.fileContent === payload
        && uploadAction?.mediaType === "text/plain"
        && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "上传")
        && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === expectedText)
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_upload_flows_1.ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE
        && browser?.context?.generatedBy === acceptance_upload_flows_1.ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE
        && browser?.url === uploadUrl
        && browser?.finalUrl === uploadUrl
        && browser?.pageTextPreview?.includes(expectedText)
        && browser?.steps.some(step => step.name === "action:uploadFile" && step.status === "passed" && String(step.detail || "").includes("label=附件") && String(step.detail || "").includes("file=notes.txt"))
        && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("上传"))
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes(expectedText))
        && interaction?.actionTypes?.uploadFile === 1
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("browser_upload")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        uploadChecks,
    };
}
async function runTestAgentAcceptanceClickFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-click-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const menuUrl = `http://127.0.0.1:${port}/menu`;
    const acceptanceCriteria = ['At /menu, click "Open settings", then shows "Settings panel ready".'];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Click Flow Fixture</title></head>",
        "<body>",
        "<main>",
        "<h1>Menu</h1>",
        "<button type=\"button\" id=\"open\">Open settings</button>",
        "<section id=\"panel\" hidden>",
        "<h2>Settings</h2>",
        "<p>Settings panel ready</p>",
        "</section>",
        "</main>",
        "<script>",
        "document.getElementById('open').addEventListener('click', () => {",
        "  document.getElementById('panel').hidden = false;",
        "});",
        "</script>",
        "</body></html>`;",
        "const server = http.createServer((req, res) => {",
        "  res.writeHead(200, {'content-type': 'text/html'});",
        "  res.end(html);",
        "});",
        "server.listen(process.env.PORT || 0, '127.0.0.1');",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-click-flow-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: `"${process.execPath}" server.js`,
        targetUrl: baseUrl,
        startupUrl: baseUrl,
        startupTimeoutMs: 30_000,
        env: { PORT: String(port) },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const clickChecks = (0, acceptance_click_flows_1.buildAcceptanceClickFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-click-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer a browser click flow from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: "acceptance-click-flow-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl: baseUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(report);
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const clickCheck = clickChecks[0];
    const hasAction = (type, detail) => {
        return browser?.steps.some(step => step.name === `action:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
    };
    const hasAssertion = (type, detail) => {
        return browser?.steps.some(step => step.name === `assert:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
    };
    const pass = clickChecks.length === 1
        && clickCheck?.probeType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
        && clickCheck?.url === menuUrl
        && clickCheck?.context?.generatedBy === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
        && clickCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
        && clickCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Open settings")
        && clickCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Settings panel ready")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
        && browser?.context?.generatedBy === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
        && browser?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
        && browser?.url === menuUrl
        && browser?.pageTextPreview?.includes("Settings panel ready")
        && hasAction("click", "role=button; name=Open settings")
        && hasAssertion("text", "Settings panel ready")
        && hasAssertion("urlIncludes", "/menu")
        && report.evidence.some(item => item.type === "browser" && item.detail?.includes("source=acceptance_click_flow"))
        && markdown.includes("**Acceptance source:**")
        && markdown.includes(acceptanceCriteria[0])
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        clickChecks,
        markdown,
    };
}
async function runTestAgentAcceptanceChineseClickFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-chinese-click-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const menuUrl = `http://127.0.0.1:${port}/menu`;
    const acceptanceCriteria = ['在 /menu 点击 "打开设置"，然后显示 "设置面板就绪"。'];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>菜单</title></head>",
        "<body>",
        "<main>",
        "<h1>菜单</h1>",
        "<button type=\"button\" id=\"open\">打开设置</button>",
        "<section id=\"panel\" hidden>",
        "<h2>设置</h2>",
        "<p>设置面板就绪</p>",
        "</section>",
        "</main>",
        "<script>",
        "document.getElementById('open').addEventListener('click', () => {",
        "  document.getElementById('panel').hidden = false;",
        "});",
        "</script>",
        "</body></html>`;",
        "const home = '<!doctype html><title>首页</title><main><h1>首页</h1></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});",
        "  res.end(route === '/menu' ? html : home);",
        "}).listen(process.env.PORT || 0, '127.0.0.1');",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-chinese-click-flow-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: `"${process.execPath}" server.js`,
        targetUrl: baseUrl,
        startupUrl: baseUrl,
        startupTimeoutMs: 30_000,
        env: { PORT: String(port) },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const clickChecks = (0, acceptance_click_flows_1.buildAcceptanceClickFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-chinese-click-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer a browser click flow from Chinese acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: project.name,
                workDir: dir,
                runCommand: project.runCommand,
                targetUrl: baseUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const clickCheck = clickChecks[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = clickChecks.length === 1
        && clickCheck?.probeType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
        && clickCheck?.url === menuUrl
        && clickCheck?.context?.generatedBy === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
        && clickCheck?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
        && clickCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "打开设置")
        && clickCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "设置面板就绪")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
        && browser?.context?.acceptanceCriteria?.[0] === acceptanceCriteria[0]
        && browser?.url === menuUrl
        && browser?.pageTextPreview?.includes("设置面板就绪")
        && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("打开设置"))
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("设置面板就绪"))
        && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/menu"))
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        clickChecks,
    };
}
async function runTestAgentAcceptanceClickNavigationFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-click-navigation-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const menuUrl = `http://127.0.0.1:${port}/menu`;
    const settingsUrl = `http://127.0.0.1:${port}/settings`;
    const acceptanceCriteria = ["At /menu, click the Settings link, then navigates to /settings."];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const menu = `<!doctype html>",
        "<html><head><title>Menu</title></head>",
        "<body><main>",
        "<h1>Menu</h1>",
        "<nav><a href=\"/settings\">Settings</a></nav>",
        "</main></body></html>`;",
        "const settings = `<!doctype html>",
        "<html><head><title>Settings</title></head>",
        "<body><main><h1>Settings</h1><p>Settings route ready</p></main></body></html>`;",
        "const home = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  if (route === '/menu') return res.end(menu);",
        "  if (route === '/settings') return res.end(settings);",
        "  return res.end(home);",
        "}).listen(process.env.PORT, '127.0.0.1');",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-click-navigation-flow-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: `"${process.execPath}" server.js`,
        targetUrl: baseUrl,
        startupUrl: baseUrl,
        startupTimeoutMs: 30_000,
        env: { PORT: String(port) },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const clickChecks = (0, acceptance_click_flows_1.buildAcceptanceClickFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-click-navigation-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer a browser link navigation flow from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: "acceptance-click-navigation-flow-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl: baseUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const clickCheck = clickChecks[0];
    const hasAction = (type, detail) => {
        return browser?.steps.some(step => step.name === `action:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
    };
    const hasAssertion = (type, detail) => {
        return browser?.steps.some(step => step.name === `assert:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
    };
    const pass = clickChecks.length === 1
        && clickCheck?.probeType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
        && clickCheck?.url === menuUrl
        && clickCheck?.actions?.some(action => action.type === "click" && action.role === "link" && action.name === "Settings")
        && clickCheck?.actions?.some(action => action.type === "waitForUrl" && action.text === "/settings")
        && clickCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/settings")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
        && browser?.url === menuUrl
        && browser?.finalUrl === settingsUrl
        && browser?.pageTextPreview?.includes("Settings route ready")
        && hasAction("click", "role=link; name=Settings")
        && hasAction("waitForUrl", "/settings")
        && hasAssertion("urlIncludes", "/settings")
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        clickChecks,
    };
}
async function runTestAgentAcceptanceMultiClickFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-multi-click-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const menuUrl = `http://127.0.0.1:${port}/menu`;
    const acceptanceCriteria = ['At /menu, click "Open settings", click "Advanced", then shows "Advanced settings ready".'];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Multi Click Fixture</title></head>",
        "<body><main>",
        "<h1>Menu</h1>",
        "<button type=\"button\" id=\"open\">Open settings</button>",
        "<section id=\"settings\" hidden>",
        "<button type=\"button\" id=\"advanced\">Advanced</button>",
        "</section>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "</main>",
        "<script>",
        "document.getElementById('open').addEventListener('click', () => {",
        "  document.getElementById('settings').hidden = false;",
        "  document.getElementById('status').textContent = 'Settings opened';",
        "});",
        "document.getElementById('advanced').addEventListener('click', () => {",
        "  document.getElementById('status').textContent = 'Advanced settings ready';",
        "});",
        "</script>",
        "</body></html>`;",
        "const home = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/menu' ? html : home);",
        "}).listen(process.env.PORT, '127.0.0.1');",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-multi-click-flow-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: `"${process.execPath}" server.js`,
        targetUrl: baseUrl,
        startupUrl: baseUrl,
        startupTimeoutMs: 30_000,
        env: { PORT: String(port) },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const clickChecks = (0, acceptance_click_flows_1.buildAcceptanceClickFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-multi-click-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer a multi-click browser flow from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: "acceptance-multi-click-flow-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl: baseUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const clickCheck = clickChecks[0];
    const clickActions = clickCheck?.actions?.filter(action => action.type === "click") || [];
    const hasAction = (detail) => {
        return browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
    };
    const hasAssertion = (type, detail) => {
        return browser?.steps.some(step => step.name === `assert:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
    };
    const pass = clickChecks.length === 1
        && clickCheck?.probeType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
        && clickCheck?.url === menuUrl
        && clickActions.length === 2
        && clickActions[0]?.role === "button"
        && clickActions[0]?.name === "Open settings"
        && clickActions[1]?.role === "button"
        && clickActions[1]?.name === "Advanced"
        && clickCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Advanced settings ready")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_click_flows_1.ACCEPTANCE_CLICK_FLOW_PROBE_TYPE
        && browser?.url === menuUrl
        && browser?.pageTextPreview?.includes("Advanced settings ready")
        && hasAction("role=button; name=Open settings")
        && hasAction("role=button; name=Advanced")
        && hasAssertion("text", "Advanced settings ready")
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        clickChecks,
    };
}
async function runTestAgentAcceptanceFormFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-form-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const tasksUrl = `http://127.0.0.1:${port}/tasks`;
    const acceptanceCriteria = ['At /tasks, enter "Buy milk" into "Task", click "Add task", then shows "Buy milk".'];
    (0, self_test_1.writeTaskBoardFixtureServer)(dir);
    const project = {
        name: "acceptance-form-flow-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: `"${process.execPath}" server.js`,
        targetUrl: baseUrl,
        startupUrl: baseUrl,
        startupTimeoutMs: 30_000,
        env: { PORT: String(port) },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const flowChecks = (0, acceptance_form_flows_1.buildAcceptanceFormFlowBrowserChecks)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-form-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer a simple browser form flow from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "acceptance-form-flow-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl: baseUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const flowCheck = flowChecks[0];
    const hasAction = (type, detail) => {
        return browser?.steps.some(step => step.name === `action:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
    };
    const hasAssertion = (type, detail) => {
        return browser?.steps.some(step => step.name === `assert:${type}` && step.status === "passed" && String(step.detail || "").includes(detail)) === true;
    };
    const pass = flowChecks.length === 1
        && flowCheck?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && flowCheck?.url === tasksUrl
        && flowCheck?.actions?.some(action => action.type === "fill" && action.label === "Task" && action.value === "Buy milk")
        && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Add task")
        && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Buy milk")
        && report.status === "passed"
        && report.httpResults.some(item => item.name === "Page HTTP probe" && item.status === "passed")
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && browser?.url === tasksUrl
        && browser?.finalUrl === tasksUrl
        && browser?.pageTextPreview?.includes("Buy milk")
        && hasAction("fill", "label=Task")
        && hasAction("click", "role=button; name=Add task")
        && hasAssertion("text", "Buy milk")
        && hasAssertion("urlIncludes", "/tasks")
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        flowChecks,
    };
}
//# sourceMappingURL=part-03.js.map
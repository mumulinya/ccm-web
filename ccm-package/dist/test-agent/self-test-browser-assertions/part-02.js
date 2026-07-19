"use strict";
// Behavior-freeze extraction from self-test-browser-assertions.ts (part-02.ts).
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
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const self_test_policy_1 = require("../self-test-policy");
const artifact_verifier_1 = require("../artifact-verifier");
const acceptance_derived_checks_1 = require("../browser/acceptance-derived-checks");
const acceptance_form_flows_1 = require("../browser/acceptance-form-flows");
const auto_checks_1 = require("../browser/auto-checks");
const playwright_provider_1 = require("../browser/playwright-provider");
const semantic_locator_1 = require("../browser/semantic-locator");
const self_test_1 = require("../self-test");
async function runTestAgentNegativeBrowserNetworkAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-negative-network-assertion-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const targetUrl = `http://127.0.0.1:${port}/tasks`;
    const apiUrl = `http://127.0.0.1:${port}/api/tasks`;
    const debugUrl = `http://127.0.0.1:${port}/api/debug`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Negative Network Fixture</title></head>",
        "<body>",
        "<main>",
        "<h1>Tasks</h1>",
        "<button type=\"button\" id=\"save\">Save task</button>",
        "<p id=\"status\" role=\"status\">Idle</p>",
        "</main>",
        "<script>",
        "document.getElementById('save').addEventListener('click', async () => {",
        "  const response = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Buy milk' }) });",
        "  const data = await response.json();",
        "  document.getElementById('status').textContent = data.ok ? 'Saved without debug call' : 'Save failed';",
        "});",
        "</script>",
        "</body></html>`;",
        "http.createServer((req, res) => {",
        "  if (req.url === '/api/tasks' && req.method === 'POST') {",
        "    let body = '';",
        "    req.on('data', chunk => { body += chunk; });",
        "    req.on('end', () => { res.writeHead(201, {'content-type':'application/json'}); res.end(JSON.stringify({ ok: true, received: body })); });",
        "    return;",
        "  }",
        "  if (req.url === '/api/debug') {",
        "    res.writeHead(500, {'content-type':'application/json'});",
        "    res.end(JSON.stringify({ ok: false, debug: true }));",
        "    return;",
        "  }",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(html);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `negative-browser-network-assertion-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove unwanted browser network calls did not happen.",
        acceptanceCriteria: ["Saving a task calls /api/tasks and does not call /api/debug."],
        requiredChecks: ["browser_e2e", "browser_network_logs", "screenshots", "console_errors"],
        projects: [{
                name: "negative-browser-network-assertion-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                browserChecks: [{
                        name: "Debug API is not called",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Save task", exact: true },
                        ],
                        assertions: [
                            { type: "text", text: "Saved without debug call" },
                            { type: "networkRequest", method: "POST", urlIncludes: "/api/tasks" },
                            { type: "networkResponse", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks" },
                            { type: "networkRequestNot", method: "POST", url_includes: "/api/debug", settle_ms: 250 },
                            { type: "networkResponseNot", status_code: 500, resource_type: "fetch", url_includes: "/api/debug", settle_ms: 250 },
                            { type: "networkRequestNotIncludes", text: `POST ${debugUrl}`, settle_ms: 250 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const networkLogPath = String(browser?.networkLogPath || "");
    const networkLog = fs.existsSync(networkLogPath) ? fs.readFileSync(networkLogPath, "utf-8") : "";
    const interaction = report.browserInteractionSummary?.[0];
    const pass = report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl === targetUrl
        && browser?.pageTextPreview?.includes("Saved without debug call")
        && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("urlIncludes=/api/tasks"))
        && browser?.steps.some(step => step.name === "assert:networkResponse" && step.status === "passed" && String(step.detail || "").includes("status=201"))
        && browser?.steps.some(step => step.name === "assert:networkRequestNot" && step.status === "passed" && String(step.detail || "").includes("urlIncludes=/api/debug"))
        && browser?.steps.some(step => step.name === "assert:networkResponseNot" && step.status === "passed" && String(step.detail || "").includes("status=500"))
        && browser?.steps.some(step => step.name === "assert:networkRequestNotIncludes" && step.status === "passed" && String(step.detail || "").includes(`POST ${debugUrl}`))
        && browser?.networkRequests?.some(item => item.includes(`request POST ${apiUrl}`))
        && browser?.networkRequests?.some(item => item.includes(`response 201 fetch ${apiUrl}`))
        && !browser?.networkRequests?.some(item => item.includes(debugUrl))
        && networkLog.includes(`request POST ${apiUrl}`)
        && !networkLog.includes(debugUrl)
        && interaction?.assertionTypes?.networkRequestNot === 1
        && interaction?.assertionTypes?.networkResponseNot === 1
        && interaction?.assertionTypes?.networkRequestNotIncludes === 1
        && report.requiredCheckCoverage.some(item => item.check === "browser_network_logs" && item.status === "verified")
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        networkLog,
    };
}
async function runTestAgentBrowserRequestMetadataAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-request-metadata-assertion-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const targetUrl = `http://127.0.0.1:${port}/tasks`;
    const apiUrl = `http://127.0.0.1:${port}/api/tasks`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Request Metadata Fixture</title></head>",
        "<body>",
        "<main>",
        "<h1>Tasks</h1>",
        "<button type=\"button\" id=\"save\">Save task</button>",
        "<p id=\"status\" role=\"status\">Idle</p>",
        "</main>",
        "<script>",
        "document.getElementById('save').addEventListener('click', async () => {",
        "  const payload = { title: 'Buy milk', task: { title: 'Buy milk', priority: 2 }, tags: ['home', 'urgent'], clientNonce: 'client-nonce-42' };",
        "  const response = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-agent': 'metadata-check' }, body: JSON.stringify(payload) });",
        "  const data = await response.json();",
        "  document.getElementById('status').textContent = data.ok ? 'Saved with request metadata' : 'Save failed';",
        "});",
        "</script>",
        "</body></html>`;",
        "http.createServer((req, res) => {",
        "  if (req.url === '/api/tasks' && req.method === 'POST') {",
        "    let body = '';",
        "    req.on('data', chunk => { body += chunk; });",
        "    req.on('end', () => { res.writeHead(201, {'content-type':'application/json'}); res.end(JSON.stringify({ ok: true, saved: { title: 'Buy milk', id: 7 }, received: body, header: req.headers['x-test-agent'] })); });",
        "    return;",
        "  }",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(html);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `browser-request-metadata-assertion-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can assert browser request headers and body.",
        acceptanceCriteria: ["Saving a task sends JSON body metadata and does not send a password."],
        requiredChecks: ["browser_e2e", "browser_network_logs", "screenshots", "console_errors"],
        projects: [{
                name: "browser-request-metadata-assertion-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                browserChecks: [{
                        name: "Request metadata is observed",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Save task", exact: true },
                        ],
                        assertions: [
                            { type: "text", text: "Saved with request metadata" },
                            { type: "networkRequest", method: "POST", urlIncludes: "/api/tasks", headerName: "content-type", headerValueIncludes: "application/json", bodyIncludes: "Buy milk" },
                            { type: "networkRequest", method: "POST", urlIncludes: "/api/tasks", headerName: "x-test-agent", headerValueIncludes: "metadata-check", bodyIncludes: "client-nonce-42" },
                            { type: "networkRequest", method: "POST", urlIncludes: "/api/tasks", bodyJsonPath: "task.title", bodyJsonEquals: "Buy milk" },
                            { type: "networkRequest", method: "POST", urlIncludes: "/api/tasks", body_json_path: "task.priority", body_json_equals: 2 },
                            { type: "networkRequest", method: "POST", urlIncludes: "/api/tasks", bodyJsonPath: "tags[1]", bodyJsonIncludes: "urgent" },
                            { type: "networkRequestNot", method: "POST", urlIncludes: "/api/tasks", bodyIncludes: "password", settleMs: 250 },
                            { type: "networkRequestNot", method: "POST", urlIncludes: "/api/tasks", bodyJsonPath: "password", settleMs: 250 },
                            { type: "networkRequestNot", method: "POST", urlIncludes: "/api/tasks", headerName: "authorization", settleMs: 250 },
                            { type: "networkResponse", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks" },
                            { type: "networkResponse", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks", headerName: "content-type", headerValueIncludes: "application/json", bodyJsonPath: "ok", bodyJsonEquals: true },
                            { type: "networkResponse", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks", bodyJsonPath: "saved.title", bodyJsonEquals: "Buy milk" },
                            { type: "networkResponse", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks", bodyJsonPath: "saved.id", bodyJsonEquals: 7 },
                            { type: "networkResponse", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks", bodyJsonPath: "received", bodyJsonIncludes: "client-nonce-42" },
                            { type: "networkResponseNot", status: 201, resourceType: "fetch", urlIncludes: "/api/tasks", bodyJsonPath: "error", settleMs: 250 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const networkLogPath = String(browser?.networkLogPath || "");
    const networkLog = fs.existsSync(networkLogPath) ? fs.readFileSync(networkLogPath, "utf-8") : "";
    const interaction = report.browserInteractionSummary?.[0];
    const metadataLine = browser?.networkRequests?.find(item => item.startsWith(`request_details POST ${apiUrl}`)) || "";
    const responseMetadataLine = browser?.networkRequests?.find(item => item.startsWith(`response_details 201 fetch ${apiUrl}`)) || "";
    const pass = report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl === targetUrl
        && browser?.pageTextPreview?.includes("Saved with request metadata")
        && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("header=content-type") && String(step.detail || "").includes("bodyIncludes=Buy milk"))
        && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("header=x-test-agent") && String(step.detail || "").includes("client-nonce-42"))
        && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=task.title") && String(step.detail || "").includes('bodyJsonEquals="Buy milk"'))
        && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=task.priority") && String(step.detail || "").includes("bodyJsonEquals=2"))
        && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=tags[1]") && String(step.detail || "").includes("bodyJsonIncludes=urgent"))
        && browser?.steps.some(step => step.name === "assert:networkRequestNot" && step.status === "passed" && String(step.detail || "").includes("bodyIncludes=password"))
        && browser?.steps.some(step => step.name === "assert:networkRequestNot" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=password"))
        && browser?.steps.some(step => step.name === "assert:networkRequestNot" && step.status === "passed" && String(step.detail || "").includes("header=authorization"))
        && browser?.steps.some(step => step.name === "assert:networkResponse" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=ok") && String(step.detail || "").includes("bodyJsonEquals=true"))
        && browser?.steps.some(step => step.name === "assert:networkResponse" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=saved.title"))
        && browser?.steps.some(step => step.name === "assert:networkResponse" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=saved.id") && String(step.detail || "").includes("bodyJsonEquals=7"))
        && browser?.steps.some(step => step.name === "assert:networkResponse" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=received") && String(step.detail || "").includes("client-nonce-42"))
        && browser?.steps.some(step => step.name === "assert:networkResponseNot" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=error"))
        && metadataLine.includes('"content-type":"application/json"')
        && metadataLine.includes('"x-test-agent":"metadata-check"')
        && metadataLine.includes("Buy milk")
        && metadataLine.includes('"priority":2')
        && metadataLine.includes('"urgent"')
        && metadataLine.includes("client-nonce-42")
        && !metadataLine.includes("password")
        && responseMetadataLine.includes('"ok":true')
        && responseMetadataLine.includes('"title":"Buy milk"')
        && responseMetadataLine.includes('"id":7')
        && responseMetadataLine.includes("client-nonce-42")
        && networkLog.includes(`request POST ${apiUrl}`)
        && networkLog.includes(`request_details POST ${apiUrl}`)
        && networkLog.includes(`response_details 201 fetch ${apiUrl}`)
        && interaction?.assertionTypes?.networkRequest === 5
        && interaction?.assertionTypes?.networkRequestNot === 3
        && interaction?.assertionTypes?.networkResponse === 5
        && interaction?.assertionTypes?.networkResponseNot === 1
        && report.requiredCheckCoverage.some(item => item.check === "browser_network_logs" && item.status === "verified")
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        networkLog,
    };
}
async function runTestAgentBrowserInteractionSummarySelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-interaction-summary-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const tasksUrl = `http://127.0.0.1:${port}/tasks`;
    const acceptanceCriteria = ['At /tasks, enter "Buy milk" into "Task", click "Add task", then shows "Buy milk".'];
    (0, self_test_1.writeTaskBoardFixtureServer)(dir);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `browser-interaction-summary-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent records browser interaction summaries for real browser actions.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "browser-interaction-summary-self-test",
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
    const summary = report.browserInteractionSummary[0];
    const markdownPath = String(report.metadata.artifactFiles?.reportMarkdownPath || "");
    const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
    const verdictPath = String(report.metadata.artifactFiles?.verdictJsonPath || "");
    const verdict = fs.existsSync(verdictPath) ? JSON.parse(fs.readFileSync(verdictPath, "utf-8")) : null;
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const artifactVerification = fs.existsSync(manifestPath) ? (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath) : null;
    const pass = report.status === "passed"
        && report.browserResults.length === 1
        && summary?.project === "browser-interaction-summary-self-test"
        && summary?.name.includes("/tasks")
        && summary?.provider === "playwright"
        && summary?.status === "passed"
        && summary?.url === tasksUrl
        && summary?.finalUrl === tasksUrl
        && summary?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && summary?.actionCount === 4
        && summary?.assertionCount === 5
        && summary?.passedActions === 4
        && summary?.failedActions === 0
        && summary?.passedAssertions === 5
        && summary?.failedAssertions === 0
        && summary?.actionTypes?.goto === 1
        && summary?.actionTypes?.fill === 1
        && summary?.actionTypes?.click === 1
        && summary?.actionTypes?.waitForTimeout === 1
        && summary?.assertionTypes?.pageNotBlank === 1
        && summary?.assertionTypes?.text === 1
        && summary?.assertionTypes?.urlIncludes === 1
        && summary?.assertionTypes?.consoleNoErrors === 1
        && summary?.assertionTypes?.networkNoErrors === 1
        && summary?.actionSteps?.some(step => step.name === "action:fill" && String(step.detail || "").includes("label=Task"))
        && summary?.actionSteps?.some(step => step.name === "action:click" && String(step.detail || "").includes("Add task"))
        && Array.isArray(summary?.failedSteps)
        && summary.failedSteps.length === 0
        && markdown.includes("## Browser Interaction Summary")
        && markdown.includes("actions=4 passed=4 failed=0")
        && markdown.includes("assertions=5 passed=5 failed=0")
        && markdown.includes("fill:1")
        && verdict?.evidenceSummary?.browserActions === 4
        && verdict?.evidenceSummary?.browserFailedActions === 0
        && verdict?.evidenceSummary?.browserAssertions === 5
        && verdict?.evidenceSummary?.browserFailedAssertions === 0
        && JSON.stringify(verdict?.browserInteractionSummary || []) === JSON.stringify(report.browserInteractionSummary)
        && artifactVerification?.status === "passed"
        && artifactVerification?.items?.some(item => item.type === "verdict_consistency" && item.status === "passed");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        summary,
        verdict,
        artifactVerification,
    };
}
function runTestAgentAcceptanceDerivedChecksSelfTest() {
    const criteria = [
        'Dashboard displays "Saved successfully" after submit.',
        "User remains on /settings/profile.",
        "Do not infer vague behavior without quoted text.",
    ];
    const derived = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertions)(criteria);
    const autoCheck = (0, auto_checks_1.buildAutoBrowserSmokeCheck)({
        name: "acceptance-derived-self-test",
        workDir: process.cwd(),
        runCommand: "",
        devServerCommand: "",
        targetUrl: "http://example.test/settings/profile",
        startupUrl: "http://example.test/settings/profile",
        startupTimeoutMs: 1000,
        env: {},
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    }, criteria);
    return {
        pass: derived.length === 2
            && derived.some(item => item.reason === "quoted_text" && item.assertion.type === "text" && item.assertion.text === "Saved successfully")
            && derived.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/settings/profile")
            && autoCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Saved successfully") === true
            && autoCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/settings/profile") === true
            && autoCheck?.assertions?.some(assertion => assertion.type === "consoleNoErrors") === true,
        derived,
        autoCheck,
    };
}
async function runTestAgentAcceptanceDerivedAccessibilitySelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-derived-accessibility-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const targetUrl = `http://127.0.0.1:${port}/`;
    const settingsUrl = `http://127.0.0.1:${port}/settings`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Derived Accessibility</title><link rel=\"icon\" href=\"data:,\"></head>",
        "<body><main>",
        "<h1>Settings</h1>",
        "<p id=\"save-help\">Saves profile changes for the current user.</p>",
        "<button id=\"save\" type=\"button\" aria-label=\"Save profile\" aria-describedby=\"save-help\">Save</button>",
        "<button id=\"menu\" type=\"button\" aria-expanded=\"true\">Menu</button>",
        "<button id=\"bold\" type=\"button\" aria-pressed=\"true\">Bold</button>",
        "<label for=\"email\">Email</label><input id=\"email\" aria-invalid=\"true\" aria-required=\"true\" />",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const acceptanceCriteria = [
        'At /settings, button "Save" must have accessible name "Save profile".',
        'At /settings, button "Save" accessible description includes "Saves profile changes".',
        'At /settings, button "Menu" has aria-expanded true.',
        'At /settings, button "Bold" has aria-pressed true.',
        'At /settings, field "Email" has aria-invalid true and aria-required true.',
    ];
    const project = {
        name: "acceptance-derived-accessibility-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: "",
        targetUrl,
        startupUrl: targetUrl,
        startupTimeoutMs: 1000,
        env: { PORT: port },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const derived = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertions)(acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-derived-accessibility-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent derives accessibility browser assertions from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: project.name,
                workDir: dir,
                runCommand: project.runCommand,
                targetUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const pass = derived.some(item => item.reason === "accessible_name" && item.assertion.type === "accessibleNameEquals" && item.assertion.value === "Save profile")
        && derived.some(item => item.reason === "accessible_description" && item.assertion.type === "accessibleDescriptionIncludes" && item.assertion.value === "Saves profile changes")
        && derived.some(item => item.reason === "aria_state" && item.assertion.type === "ariaExpanded")
        && derived.some(item => item.reason === "aria_state" && item.assertion.type === "ariaPressed")
        && derived.some(item => item.reason === "aria_state" && item.assertion.type === "ariaInvalid")
        && derived.some(item => item.reason === "aria_state" && item.assertion.type === "ariaRequired")
        && !derived.some(item => item.reason === "quoted_text" && item.assertion.text === "Save profile")
        && generatedChecks.length === 1
        && generatedChecks[0].url === settingsUrl
        && generatedChecks[0].assertions.some(assertion => assertion.type === "accessibleNameEquals")
        && generatedChecks[0].assertions.some(assertion => assertion.type === "accessibleDescriptionIncludes")
        && generatedChecks[0].assertions.some(assertion => assertion.type === "ariaExpanded")
        && generatedChecks[0].assertions.some(assertion => assertion.type === "ariaPressed")
        && generatedChecks[0].assertions.some(assertion => assertion.type === "ariaInvalid")
        && generatedChecks[0].assertions.some(assertion => assertion.type === "ariaRequired")
        && report.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl === settingsUrl
        && browser?.steps.some(step => step.name === "assert:accessibleNameEquals" && step.status === "passed")
        && browser?.steps.some(step => step.name === "assert:accessibleDescriptionIncludes" && step.status === "passed")
        && browser?.steps.some(step => step.name === "assert:ariaExpanded" && step.status === "passed")
        && browser?.steps.some(step => step.name === "assert:ariaPressed" && step.status === "passed")
        && browser?.steps.some(step => step.name === "assert:ariaInvalid" && step.status === "passed")
        && browser?.steps.some(step => step.name === "assert:ariaRequired" && step.status === "passed")
        && report.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        derived,
        generatedChecks,
        report,
    };
}
async function runTestAgentAcceptanceDerivedStorageAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-derived-storage-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const targetUrl = `http://127.0.0.1:${port}/`;
    const appUrl = `http://127.0.0.1:${port}/app`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Derived Storage</title><link rel=\"icon\" href=\"data:,\"></head>",
        "<body><main>",
        "<h1>Storage fixture</h1>",
        "<p id=\"status\">Storage fixture ready</p>",
        "<script>",
        "localStorage.setItem('profile.saved', 'yes');",
        "localStorage.setItem('feature.flag', 'enabled');",
        "sessionStorage.setItem('draft.notice', 'Resume draft active');",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const acceptanceCriteria = [
        'At /app, localStorage key "profile.saved" equals "yes".',
        'At /app, sessionStorage key "draft.notice" includes "draft".',
        'At /app, storage key "feature.flag" equals "enabled".',
    ];
    const project = {
        name: "acceptance-derived-storage-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: "",
        targetUrl,
        startupUrl: targetUrl,
        startupTimeoutMs: 1000,
        env: { PORT: port },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const derived = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertions)(acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-derived-storage-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent derives Web Storage browser assertions from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["browser_e2e", "browser_storage", "screenshots", "console_errors"],
        projects: [{
                name: project.name,
                workDir: dir,
                runCommand: project.runCommand,
                targetUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const generatedAssertions = generatedChecks[0]?.assertions || [];
    const quotedTexts = new Set(derived.filter(item => item.reason === "quoted_text").map(item => item.assertion.text));
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = derived.some(item => item.reason === "web_storage" && item.assertion.type === "localStorageEquals" && item.assertion.key === "profile.saved" && item.assertion.value === "yes")
        && derived.some(item => item.reason === "web_storage" && item.assertion.type === "sessionStorageIncludes" && item.assertion.key === "draft.notice" && item.assertion.value === "draft")
        && derived.some(item => item.reason === "web_storage" && item.assertion.type === "localStorageEquals" && item.assertion.key === "feature.flag" && item.assertion.value === "enabled")
        && derived.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/app")
        && !["profile.saved", "yes", "draft.notice", "draft", "feature.flag", "enabled"].some(text => quotedTexts.has(text))
        && generatedChecks.length === 1
        && generatedChecks[0].url === appUrl
        && generatedAssertions.some(assertion => assertion.type === "localStorageEquals" && assertion.key === "profile.saved" && assertion.value === "yes")
        && generatedAssertions.some(assertion => assertion.type === "sessionStorageIncludes" && assertion.key === "draft.notice" && assertion.value === "draft")
        && generatedAssertions.some(assertion => assertion.type === "localStorageEquals" && assertion.key === "feature.flag" && assertion.value === "enabled")
        && report.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl === appUrl
        && browser?.steps.filter(step => step.name === "assert:localStorageEquals" && step.status === "passed").length === 2
        && browser?.steps.some(step => step.name === "assert:sessionStorageIncludes" && step.status === "passed")
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("browser_storage")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        derived,
        generatedChecks,
        report,
    };
}
async function runTestAgentAcceptanceDerivedCookieAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-derived-cookie-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const targetUrl = `http://127.0.0.1:${port}/`;
    const appUrl = `http://127.0.0.1:${port}/app`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Derived Cookie</title><link rel=\"icon\" href=\"data:,\"></head>",
        "<body><main>",
        "<h1>Cookie fixture</h1>",
        "<p id=\"status\">Cookie fixture ready</p>",
        "</main></body></html>`;",
        "http.createServer((req, res) => {",
        "  res.writeHead(200, {",
        "    'content-type':'text/html',",
        "    'set-cookie':[",
        "      'ccm_session=verified-token-123; Path=/; SameSite=Lax',",
        "      'theme=dark-mode; Path=/; SameSite=Lax',",
        "      'analytics_id=visit-42; Path=/; SameSite=Lax'",
        "    ]",
        "  });",
        "  res.end(html);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const acceptanceCriteria = [
        'At /app, cookie "ccm_session" equals "verified-token-123".',
        'At /app, cookie "theme" includes "dark".',
        'At /app, cookie "analytics_id" exists.',
    ];
    const project = {
        name: "acceptance-derived-cookie-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: "",
        targetUrl,
        startupUrl: targetUrl,
        startupTimeoutMs: 1000,
        env: { PORT: port },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const derived = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertions)(acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-derived-cookie-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent derives browser cookie assertions from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["browser_e2e", "browser_cookie", "screenshots", "console_errors"],
        projects: [{
                name: project.name,
                workDir: dir,
                runCommand: project.runCommand,
                targetUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const generatedAssertions = generatedChecks[0]?.assertions || [];
    const quotedTexts = new Set(derived.filter(item => item.reason === "quoted_text").map(item => item.assertion.text));
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = derived.some(item => item.reason === "browser_cookie" && item.assertion.type === "cookieValueEquals" && item.assertion.key === "ccm_session" && item.assertion.value === "verified-token-123")
        && derived.some(item => item.reason === "browser_cookie" && item.assertion.type === "cookieValueIncludes" && item.assertion.key === "theme" && item.assertion.value === "dark")
        && derived.some(item => item.reason === "browser_cookie" && item.assertion.type === "cookieExists" && item.assertion.key === "analytics_id")
        && derived.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/app")
        && !["ccm_session", "verified-token-123", "theme", "dark", "analytics_id"].some(text => quotedTexts.has(text))
        && generatedChecks.length === 1
        && generatedChecks[0].url === appUrl
        && generatedAssertions.some(assertion => assertion.type === "cookieValueEquals" && assertion.key === "ccm_session" && assertion.value === "verified-token-123")
        && generatedAssertions.some(assertion => assertion.type === "cookieValueIncludes" && assertion.key === "theme" && assertion.value === "dark")
        && generatedAssertions.some(assertion => assertion.type === "cookieExists" && assertion.key === "analytics_id")
        && report.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl === appUrl
        && browser?.steps.some(step => step.name === "assert:cookieValueEquals" && step.status === "passed")
        && browser?.steps.some(step => step.name === "assert:cookieValueIncludes" && step.status === "passed")
        && browser?.steps.some(step => step.name === "assert:cookieExists" && step.status === "passed")
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("browser_cookie")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        derived,
        generatedChecks,
        report,
    };
}
async function runTestAgentAcceptanceDerivedNetworkAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-derived-network-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const targetUrl = `http://127.0.0.1:${port}/`;
    const tasksUrl = `http://127.0.0.1:${port}/tasks`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Derived Network</title><link rel=\"icon\" href=\"data:,\"></head>",
        "<body><main>",
        "<h1>Task form</h1>",
        "<label for=\"task\">Task</label>",
        "<input id=\"task\" />",
        "<button id=\"add\" type=\"button\">Add task</button>",
        "<p id=\"status\">Ready</p>",
        "<script>",
        "document.getElementById('add').addEventListener('click', async () => {",
        "  const title = document.getElementById('task').value;",
        "  const response = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title }) });",
        "  const data = await response.json();",
        "  document.getElementById('status').textContent = response.status === 201 ? 'Saved ' + data.title : 'Save failed';",
        "});",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  if (route === '/api/tasks' && req.method === 'POST') {",
        "    let body = '';",
        "    req.on('data', chunk => { body += chunk; });",
        "    req.on('end', () => {",
        "      let title = '';",
        "      try { title = JSON.parse(body).title || ''; } catch {}",
        "      res.writeHead(201, {'content-type':'application/json'});",
        "      res.end(JSON.stringify({ ok: true, title }));",
        "    });",
        "    return;",
        "  }",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(html);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const acceptanceCriteria = [
        'At /tasks, fill "Task" with "Buy milk", click "Add task", then show "Saved Buy milk" and send a POST request to /api/tasks and receive a 201 API response.',
    ];
    const project = {
        name: "acceptance-derived-network-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: "",
        targetUrl,
        startupUrl: targetUrl,
        startupTimeoutMs: 1000,
        env: { PORT: port },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const derived = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertions)(acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-derived-network-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent derives browser network assertions from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["browser_e2e", "browser_network", "screenshots", "console_errors"],
        projects: [{
                name: project.name,
                workDir: dir,
                runCommand: project.runCommand,
                targetUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const generatedAssertions = generatedChecks[0]?.assertions || [];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = derived.some(item => item.reason === "browser_network" && item.assertion.type === "networkRequest" && item.assertion.method === "POST" && item.assertion.urlIncludes === "/api/tasks")
        && derived.some(item => item.reason === "browser_network" && item.assertion.type === "networkResponse" && item.assertion.status === 201 && item.assertion.urlIncludes === "/api/tasks")
        && derived.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/tasks")
        && !derived.some(item => item.reason === "explicit_url_path" && item.assertion.text === "/api/tasks")
        && generatedChecks.length === 1
        && generatedChecks[0].url === tasksUrl
        && generatedAssertions.some(assertion => assertion.type === "networkRequest" && assertion.method === "POST" && assertion.urlIncludes === "/api/tasks")
        && generatedAssertions.some(assertion => assertion.type === "networkResponse" && assertion.status === 201 && assertion.urlIncludes === "/api/tasks")
        && report.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl === tasksUrl
        && browser?.pageTextPreview?.includes("Saved Buy milk")
        && browser?.steps.some(step => step.name === "assert:networkRequest" && step.status === "passed" && String(step.detail || "").includes("method=POST") && String(step.detail || "").includes("urlIncludes=/api/tasks"))
        && browser?.steps.some(step => step.name === "assert:networkResponse" && step.status === "passed" && String(step.detail || "").includes("status=201") && String(step.detail || "").includes("urlIncludes=/api/tasks"))
        && browser?.networkRequests?.some(item => item.includes("request POST") && item.includes("/api/tasks"))
        && browser?.networkRequests?.some(item => item.includes("response 201") && item.includes("/api/tasks"))
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("browser_network")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        derived,
        generatedChecks,
        report,
    };
}
async function runTestAgentAcceptanceDerivedNegativeUiSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-derived-negative-ui-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const targetUrl = `http://127.0.0.1:${port}/`;
    const dashboardUrl = `http://127.0.0.1:${port}/dashboard`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Derived Negative UI</title><link rel=\"icon\" href=\"data:,\"></head>",
        "<body><main>",
        "<h1>Dashboard</h1>",
        "<p>Ready dashboard</p>",
        "<section hidden>Debug panel</section>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const acceptanceCriteria = [
        'At /dashboard, "Debug panel" should not be visible.',
        'At /dashboard, "Obsolete task" must not be present.',
    ];
    const project = {
        name: "acceptance-derived-negative-ui-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        devServerCommand: "",
        targetUrl,
        startupUrl: targetUrl,
        startupTimeoutMs: 1000,
        env: { PORT: port },
        changedFiles: [],
        verificationCommands: [],
        httpChecks: [],
        adversarialHttpChecks: [],
        adversarialBrowserChecks: [],
        browserChecks: [],
        agentSummary: "",
        risks: [],
    };
    const derived = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertions)(acceptanceCriteria);
    const generatedChecks = (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `acceptance-derived-negative-ui-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent derives negative UI browser assertions from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: project.name,
                workDir: dir,
                runCommand: project.runCommand,
                targetUrl,
                env: { PORT: port },
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const generatedAssertions = generatedChecks[0]?.assertions || [];
    const quotedTexts = new Set(derived.filter(item => item.reason === "quoted_text").map(item => item.assertion.text));
    const pass = derived.some(item => item.reason === "negative_ui" && item.assertion.type === "notVisible" && item.assertion.text === "Debug panel")
        && derived.some(item => item.reason === "negative_ui" && item.assertion.type === "notPresent" && item.assertion.text === "Obsolete task")
        && derived.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/dashboard")
        && !quotedTexts.has("Debug panel")
        && !quotedTexts.has("Obsolete task")
        && generatedChecks.length === 1
        && generatedChecks[0].url === dashboardUrl
        && generatedAssertions.some(assertion => assertion.type === "notVisible" && assertion.text === "Debug panel")
        && generatedAssertions.some(assertion => assertion.type === "notPresent" && assertion.text === "Obsolete task")
        && report.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl === dashboardUrl
        && browser?.steps.some(step => step.name === "assert:notVisible" && step.status === "passed" && String(step.detail || "").includes("Debug panel"))
        && browser?.steps.some(step => step.name === "assert:notPresent" && step.status === "passed" && String(step.detail || "").includes("Obsolete task"))
        && report.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        derived,
        generatedChecks,
        report,
    };
}
function runTestAgentSemanticLocatorSelfTest() {
    const { workOrder, issues } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `semantic-locator-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: ["Browser semantic locators normalize"],
        requiredChecks: ["browser_e2e"],
        projects: [{
                name: "semantic-locator-self-test",
                workDir: process.cwd(),
                browser_checks: [{
                        title: "semantic browser targets",
                        steps: [
                            { action: "click", test_id: "save-button" },
                            { action: "fill", label: "Email", value: "ada@example.test", exact: true },
                            { action: "press_key", key_text: "Enter" },
                        ],
                        expectations: [
                            { assertion: "visible", role: "button", name: "Save" },
                            { assertion: "element_text_includes", data_testid: "toast", value: "Saved" },
                        ],
                    }],
            }],
    });
    const check = workOrder.projects[0].browserChecks[0];
    const actionPlans = check.actions.map(action => (0, semantic_locator_1.buildSemanticLocatorPlan)(action));
    const assertionPlans = check.assertions.map(assertion => (0, semantic_locator_1.buildSemanticLocatorPlan)(assertion));
    return {
        pass: issues.every(issue => issue.severity !== "error")
            && actionPlans[0]?.kind === "testId"
            && actionPlans[0]?.value === "save-button"
            && actionPlans[1]?.kind === "label"
            && actionPlans[1]?.exact === true
            && actionPlans[2] === null
            && assertionPlans[0]?.kind === "role"
            && assertionPlans[0]?.name === "Save"
            && assertionPlans[1]?.kind === "testId"
            && assertionPlans[1]?.value === "toast",
        actionPlans,
        assertionPlans,
        issues,
    };
}
function runTestAgentBrowserStateSelfTest() {
    const { workOrder, issues } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `browser-state-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: ["Browser state checks normalize"],
        requiredChecks: ["browser_e2e"],
        projects: [{
                name: "browser-state-self-test",
                workDir: process.cwd(),
                browser_checks: [{
                        title: "state survives refresh",
                        steps: [
                            { action: "goto", url: "http://example.test/" },
                            { action: "evaluate", expression: "localStorage.setItem('profile.saved', 'yes')" },
                            { action: "refresh" },
                            { action: "go_back" },
                            { action: "go_forward" },
                        ],
                        expectations: [
                            { assertion: "local_storage_equals", key: "profile.saved", value: "yes" },
                            { assertion: "js_truthy", expression: "Boolean(localStorage.getItem('profile.saved'))" },
                            { assertion: "js_equals", expression: "document.readyState", value: "complete" },
                        ],
                    }],
            }],
    });
    const check = workOrder.projects[0].browserChecks[0];
    const actionTypes = check.actions.map(action => action.type);
    const assertionTypes = check.assertions.map(assertion => assertion.type);
    return {
        pass: issues.every(issue => issue.severity !== "error")
            && actionTypes.join(",") === "goto,evaluate,reload,goBack,goForward"
            && assertionTypes.join(",") === "localStorageEquals,jsTruthy,jsEquals"
            && check.assertions[0].key === "profile.saved"
            && check.assertions[1].expression === "Boolean(localStorage.getItem('profile.saved'))",
        actionTypes,
        assertionTypes,
        issues,
    };
}
async function runTestAgentBrowserScriptWaitAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-script-wait-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const targetUrl = `http://127.0.0.1:${port}/script-wait`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Script Wait Fixture</title></head>",
        "<body><main>",
        "<h1>Script wait</h1>",
        "<p id=\"status\" role=\"status\">Loading async state</p>",
        "<script>",
        "setTimeout(() => {",
        "  document.body.dataset.asyncState = 'ready';",
        "  document.getElementById('status').textContent = 'Async state ready';",
        "}, 150);",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `browser-script-wait-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove browser JavaScript state after conditional waits.",
        acceptanceCriteria: ["Async browser state becomes ready and is verified with JavaScript assertions."],
        requiredChecks: ["browser_e2e", "browser_js", "browser_script", "browser_wait", "console_errors"],
        projects: [{
                name: "browser-script-wait-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                browserChecks: [{
                        name: "Async state is verified with script and wait evidence",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "evaluate", text: "localStorage.setItem('script.wait.seed', 'ready')" },
                            { type: "waitForText", text: "Async state ready", timeoutMs: 3000 },
                        ],
                        assertions: [
                            { type: "jsTruthy", expression: "document.body.dataset.asyncState === 'ready'" },
                            { type: "jsEquals", expression: "localStorage.getItem('script.wait.seed')", value: "ready" },
                            { type: "text", text: "Async state ready" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = report.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.steps.some(step => step.name === "action:evaluate" && step.status === "passed")
        && browser?.steps.some(step => step.name === "action:waitForText" && step.status === "passed" && String(step.detail || "").includes("Async state ready"))
        && browser?.steps.some(step => step.name === "assert:jsTruthy" && step.status === "passed" && String(step.detail || "").includes("asyncState"))
        && browser?.steps.some(step => step.name === "assert:jsEquals" && step.status === "passed" && String(step.detail || "").includes("script.wait.seed"))
        && byCheck.get("browser_js")?.status === "verified"
        && byCheck.get("browser_script")?.status === "verified"
        && byCheck.get("browser_wait")?.status === "verified";
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        report,
    };
}
async function runTestAgentBrowserSelectStateSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-select-state-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const targetUrl = `http://127.0.0.1:${port}/settings`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Select State Fixture</title></head>",
        "<body><main>",
        "<h1>Settings</h1>",
        "<label for=\"priority\">Priority</label>",
        "<select id=\"priority\" name=\"priority\">",
        "<option value=\"priority-low\">Low</option>",
        "<option value=\"priority-high\">High</option>",
        "</select>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `browser-select-state-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent selects by visible label and checks the resulting DOM state.",
        acceptanceCriteria: ['At /settings, select "High" in "Priority".'],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                name: "browser-select-state-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                browserChecks: [{
                        name: "Select option state is observable",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "selectOption", label: "Priority", value: "High", exact: true },
                        ],
                        assertions: [
                            { type: "selectedValue", label: "Priority", value: "priority-high", exact: true },
                            { type: "selectedTextIncludes", label: "Priority", text: "High", exact: true },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                    }],
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const pass = report.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl === targetUrl
        && browser?.steps.some(step => step.name === "action:selectOption" && step.status === "passed" && String(step.detail || "").includes("label=Priority"))
        && browser?.steps.some(step => step.name === "assert:selectedValue" && step.status === "passed" && String(step.detail || "").includes("expected=priority-high"))
        && browser?.steps.some(step => step.name === "assert:selectedTextIncludes" && step.status === "passed" && String(step.detail || "").includes("expected=High"))
        && report.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
    };
}
async function runTestAgentBrowserInputValueAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-input-value-assertion-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await (0, self_test_1.getFreePort)();
    const targetUrl = `http://127.0.0.1:${port}/profile`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Input Value Fixture</title></head>",
        "<body><main>",
        "<h1>Profile</h1>",
        "<label for=\"displayName\">Display name</label>",
        "<input id=\"displayName\" name=\"displayName\" />",
        "<button type=\"button\" id=\"save\">Save</button>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "<script>",
        "document.getElementById('save').addEventListener('click', () => {",
        "  const value = document.getElementById('displayName').value;",
        "  document.getElementById('status').textContent = value ? 'Saved profile' : 'Missing name';",
        "});",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-input-value-assertion-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const browserCheck = {
        name: "Profile input value is observable",
        url: targetUrl,
        actions: [
            { type: "goto", url: targetUrl },
            { type: "fill", label: "Display name", value: "Ada Lovelace", exact: true },
            { type: "click", role: "button", name: "Save", exact: true },
        ],
        assertions: [
            { type: "text", text: "Saved profile" },
            { assertion: "input_value_equals", label: "Display name", value: "Ada Lovelace", exact: true },
            { assertion: "input_includes", label: "Display name", value: "Lovelace", exact: true },
            { type: "consoleNoErrors" },
            { type: "networkNoErrors" },
        ],
        screenshot: true,
    };
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `browser-input-value-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove a filled input value after a real browser flow.",
        acceptanceCriteria: ["Saving a profile keeps the display name in the input."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [browserCheck],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
        id: `browser-input-value-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when an input value does not match the expected value.",
        acceptanceCriteria: ["Saving a profile keeps a different display name in the input."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        ...browserCheck,
                        assertions: [
                            { type: "text", text: "Saved profile" },
                            { type: "inputValueEquals", label: "Display name", value: "Grace", exact: true },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                    }],
            }],
        options: {
            artifactDir: failArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const passBrowser = passReport.browserResults[0];
    const failBrowser = failReport.browserResults[0];
    const failInputValue = failBrowser?.steps.find(step => step.name === "assert:inputValueEquals");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && passBrowser?.steps.some(step => step.name === "assert:inputValueEquals" && step.status === "passed" && String(step.detail || "").includes("label=Display name") && String(step.detail || "").includes("expected length=12"))
        && passBrowser?.steps.some(step => step.name === "assert:inputValueIncludes" && step.status === "passed" && String(step.detail || "").includes("expected substring length=8"))
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failInputValue?.status === "failed"
        && String(failInputValue?.error || "").includes("actual length=12")
        && !String(failInputValue?.error || "").includes("Ada Lovelace")
        && !String(failInputValue?.error || "").includes("Grace")
        && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        passReport,
        failReport,
    };
}
//# sourceMappingURL=part-02.js.map
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
exports.runTestAgentSelfTest = runTestAgentSelfTest;
exports.runTestAgentMcpProviderSelfTest = runTestAgentMcpProviderSelfTest;
exports.runTestAgentClaudeChromeMcpSelfTest = runTestAgentClaudeChromeMcpSelfTest;
exports.runTestAgentComputerUseMcpSelfTest = runTestAgentComputerUseMcpSelfTest;
exports.runTestAgentWorkOrderNormalizationSelfTest = runTestAgentWorkOrderNormalizationSelfTest;
exports.runTestAgentHandoffBuilderSelfTest = runTestAgentHandoffBuilderSelfTest;
exports.runTestAgentHandoffContractSelfTest = runTestAgentHandoffContractSelfTest;
exports.runTestAgentArtifactSelfTest = runTestAgentArtifactSelfTest;
exports.runTestAgentVerdictSelfTest = runTestAgentVerdictSelfTest;
exports.runTestAgentArtifactManifestSelfTest = runTestAgentArtifactManifestSelfTest;
exports.runTestAgentArtifactVerifierSelfTest = runTestAgentArtifactVerifierSelfTest;
exports.runTestAgentMcpScreenshotArtifactSelfTest = runTestAgentMcpScreenshotArtifactSelfTest;
exports.runTestAgentBrowserEvidenceArtifactSelfTest = runTestAgentBrowserEvidenceArtifactSelfTest;
exports.runTestAgentCoverageSelfTest = runTestAgentCoverageSelfTest;
exports.runTestAgentCommandPlannerSelfTest = runTestAgentCommandPlannerSelfTest;
exports.runTestAgentExecutionPlanSelfTest = runTestAgentExecutionPlanSelfTest;
exports.runTestAgentHttpApiSelfTest = runTestAgentHttpApiSelfTest;
exports.runTestAgentAdversarialHttpSelfTest = runTestAgentAdversarialHttpSelfTest;
exports.runTestAgentAdversarialBrowserSelfTest = runTestAgentAdversarialBrowserSelfTest;
exports.runTestAgentBrowserProbeTemplateSelfTest = runTestAgentBrowserProbeTemplateSelfTest;
exports.runTestAgentAutoBrowserSmokeSelfTest = runTestAgentAutoBrowserSmokeSelfTest;
exports.runTestAgentBlankPageSmokeSelfTest = runTestAgentBlankPageSmokeSelfTest;
exports.runTestAgentAcceptancePathSmokeSelfTest = runTestAgentAcceptancePathSmokeSelfTest;
exports.runTestAgentAcceptancePathGroupingSelfTest = runTestAgentAcceptancePathGroupingSelfTest;
exports.runTestAgentAcceptanceDownloadFlowSelfTest = runTestAgentAcceptanceDownloadFlowSelfTest;
exports.runTestAgentAcceptanceUploadFlowSelfTest = runTestAgentAcceptanceUploadFlowSelfTest;
exports.runTestAgentAcceptanceFormFlowSelfTest = runTestAgentAcceptanceFormFlowSelfTest;
exports.runTestAgentAcceptanceMultiFieldFormFlowSelfTest = runTestAgentAcceptanceMultiFieldFormFlowSelfTest;
exports.runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest = runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest;
exports.runTestAgentAcceptanceUncheckRadioFormFlowSelfTest = runTestAgentAcceptanceUncheckRadioFormFlowSelfTest;
exports.runTestAgentAcceptanceRedirectFormFlowSelfTest = runTestAgentAcceptanceRedirectFormFlowSelfTest;
exports.runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest = runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest;
exports.runTestAgentPlaywrightUrlIncludesWaitSelfTest = runTestAgentPlaywrightUrlIncludesWaitSelfTest;
exports.runTestAgentBrowserUrlTitleAssertionSelfTest = runTestAgentBrowserUrlTitleAssertionSelfTest;
exports.runTestAgentBrowserConsoleAssertionSelfTest = runTestAgentBrowserConsoleAssertionSelfTest;
exports.runTestAgentBrowserNetworkStateActionSelfTest = runTestAgentBrowserNetworkStateActionSelfTest;
exports.runTestAgentBrowserAccessibilityAssertionSelfTest = runTestAgentBrowserAccessibilityAssertionSelfTest;
exports.runTestAgentBrowserNetworkAssertionSelfTest = runTestAgentBrowserNetworkAssertionSelfTest;
exports.runTestAgentStructuredBrowserNetworkAssertionSelfTest = runTestAgentStructuredBrowserNetworkAssertionSelfTest;
exports.runTestAgentNegativeBrowserNetworkAssertionSelfTest = runTestAgentNegativeBrowserNetworkAssertionSelfTest;
exports.runTestAgentBrowserRequestMetadataAssertionSelfTest = runTestAgentBrowserRequestMetadataAssertionSelfTest;
exports.runTestAgentBrowserInteractionSummarySelfTest = runTestAgentBrowserInteractionSummarySelfTest;
exports.runTestAgentAcceptanceDerivedChecksSelfTest = runTestAgentAcceptanceDerivedChecksSelfTest;
exports.runTestAgentSemanticLocatorSelfTest = runTestAgentSemanticLocatorSelfTest;
exports.runTestAgentBrowserStateSelfTest = runTestAgentBrowserStateSelfTest;
exports.runTestAgentBrowserSelectStateSelfTest = runTestAgentBrowserSelectStateSelfTest;
exports.runTestAgentBrowserInputValueAssertionSelfTest = runTestAgentBrowserInputValueAssertionSelfTest;
exports.runTestAgentBrowserEnabledStateSelfTest = runTestAgentBrowserEnabledStateSelfTest;
exports.runTestAgentBrowserFocusStateSelfTest = runTestAgentBrowserFocusStateSelfTest;
exports.runTestAgentBrowserElementCountSelfTest = runTestAgentBrowserElementCountSelfTest;
exports.runTestAgentBrowserDialogAssertionSelfTest = runTestAgentBrowserDialogAssertionSelfTest;
exports.runTestAgentBrowserPopupAssertionSelfTest = runTestAgentBrowserPopupAssertionSelfTest;
exports.runTestAgentBrowserTableAssertionSelfTest = runTestAgentBrowserTableAssertionSelfTest;
exports.runTestAgentBrowserDragToActionSelfTest = runTestAgentBrowserDragToActionSelfTest;
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
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const zlib = __importStar(require("zlib"));
const child_process_1 = require("child_process");
const agent_1 = require("./agent");
const artifact_verifier_1 = require("./artifact-verifier");
const acceptance_derived_checks_1 = require("./browser/acceptance-derived-checks");
const acceptance_download_flows_1 = require("./browser/acceptance-download-flows");
const acceptance_form_flows_1 = require("./browser/acceptance-form-flows");
const acceptance_upload_flows_1 = require("./browser/acceptance-upload-flows");
const auto_checks_1 = require("./browser/auto-checks");
const playwright_provider_1 = require("./browser/playwright-provider");
const semantic_locator_1 = require("./browser/semantic-locator");
const tool_executor_1 = require("./browser/tool-executor");
const cli_1 = require("./cli");
const cli_options_1 = require("./cli-options");
const contract_1 = require("./contract");
const coverage_1 = require("./coverage");
const execution_plan_1 = require("./execution-plan");
const work_order_builder_1 = require("./work-order-builder");
const work_order_1 = require("./work-order");
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
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-selftest-"));
    const port = await getFreePort();
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = '<!doctype html><title>TestAgent self-test</title><button id=\"ok\">Ready</button>';",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, agent_1.runTestAgent)({
        id: `self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent command and optional browser execution.",
        acceptanceCriteria: ["Command verification runs", ...(options.includeBrowser ? ["Browser can open the test page"] : [])],
        requiredChecks: options.includeBrowser ? ["commands", "browser_e2e", "screenshots", "console_errors"] : ["commands"],
        projects: [{
                name: "self-test",
                workDir: dir,
                verificationCommands: [`"${process.execPath}" -e "console.log('command ok')"`],
                runCommand: options.includeBrowser ? `"${process.execPath}" server.js` : "",
                targetUrl: options.includeBrowser ? `http://127.0.0.1:${port}` : "",
                env: { PORT: port },
                browserChecks: options.includeBrowser ? [{
                        name: "self-test page loads",
                        url: `http://127.0.0.1:${port}`,
                        assertions: [{ type: "text", text: "Ready" }, { type: "consoleNoErrors" }],
                        screenshot: true,
                    }] : [],
            }],
    });
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass: options.includeBrowser ? report.status === "passed" : report.commandResults.some(item => item.status === "passed"),
        report,
    };
}
async function runTestAgentMcpProviderSelfTest() {
    const calls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName, input) => {
            calls.push({ toolName, input });
            if (toolName.endsWith("browser_snapshot"))
                return "Ready\nMCP browser tools are invoked";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return "request GET http://example.test/\nrequest_details GET http://example.test/ headers={\"x-test-agent\":\"mcp-metadata\"} body={\"clientNonce\":\"client-nonce-mcp\"}\nresponse 200 document http://example.test/\nresponse_details 200 document http://example.test/ headers={\"content-type\":\"application/json\"} body={\"ok\":true,\"message\":\"MCP ready\"}";
            if (toolName.endsWith("browser_take_screenshot"))
                return { path: "fake-screenshot.png" };
            return { ok: true };
        },
    });
    const report = await (0, agent_1.runTestAgent)({
        id: `mcp-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent MCP browser provider path.",
        acceptanceCriteria: ["MCP browser tools are invoked", "Tool calls are recorded"],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: "mcp-self-test",
                workDir: process.cwd(),
                browserChecks: [{
                        name: "MCP navigation",
                        url: "http://example.test/",
                        actions: [{ type: "goto", url: "http://example.test/" }],
                        assertions: [
                            { type: "text", text: "Ready" },
                            { type: "networkRequest", method: "GET", urlIncludes: "http://example.test/" },
                            { type: "networkRequest", method: "GET", urlIncludes: "http://example.test/", headerName: "x-test-agent", headerValueIncludes: "mcp-metadata", bodyIncludes: "client-nonce-mcp" },
                            { type: "networkRequest", method: "GET", urlIncludes: "http://example.test/", bodyJsonPath: "clientNonce", bodyJsonIncludes: "nonce-mcp" },
                            { type: "networkResponse", status: 200, resourceType: "document", urlIncludes: "http://example.test/" },
                            { type: "networkResponse", status: 200, resourceType: "document", urlIncludes: "http://example.test/", bodyJsonPath: "message", bodyJsonEquals: "MCP ready" },
                            { type: "networkRequestNot", method: "POST", urlIncludes: "/api/debug" },
                            { type: "networkResponseNotIncludes", text: "500 fetch http://example.test/api/debug" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: { browserProvider: "mcp" },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    return {
        pass: report.status === "passed"
            && report.browserToolCalls.length >= 2
            && calls.length >= 2
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkRequest" && step.status === "passed")
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkRequest" && step.status === "passed" && String(step.detail || "").includes("bodyIncludes=client-nonce-mcp"))
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkRequest" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=clientNonce"))
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkResponse" && step.status === "passed")
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkResponse" && step.status === "passed" && String(step.detail || "").includes("bodyJsonPath=message"))
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkRequestNot" && step.status === "passed")
            && report.browserResults[0]?.steps.some(step => step.name === "playwright:networkResponseNotIncludes" && step.status === "passed"),
        report,
        calls,
    };
}
async function runTestAgentClaudeChromeMcpSelfTest() {
    const calls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__claude-in-chrome__tabs_create_mcp",
            "mcp__claude-in-chrome__navigate",
            "mcp__claude-in-chrome__get_page_text",
            "mcp__claude-in-chrome__read_console_messages",
            "mcp__claude-in-chrome__read_network_requests",
            "mcp__claude-in-chrome__gif_creator",
        ],
        onCall: (toolName, input) => {
            calls.push({ toolName, input });
            if (toolName.endsWith("tabs_create_mcp"))
                return { tabId: 42 };
            if (toolName.endsWith("get_page_text"))
                return "Chrome Ready\nClaude in Chrome verifier";
            if (toolName.endsWith("read_console_messages"))
                return [];
            if (toolName.endsWith("read_network_requests"))
                return [];
            if (toolName.endsWith("gif_creator"))
                return { frame: "fake-frame.png" };
            return { ok: true };
        },
    });
    const report = await (0, agent_1.runTestAgent)({
        id: `chrome-mcp-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent Claude in Chrome MCP adapter path.",
        acceptanceCriteria: ["Claude in Chrome MCP tools are invoked", "tabId is propagated"],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: "chrome-mcp-self-test",
                workDir: process.cwd(),
                browserChecks: [{
                        name: "Claude Chrome navigation",
                        url: "http://example.test/chrome",
                        actions: [{ type: "goto", url: "http://example.test/chrome" }],
                        assertions: [{ type: "text", text: "Chrome Ready" }, { type: "urlIncludes", text: "/chrome" }, { type: "consoleNoErrors" }],
                        screenshot: true,
                    }],
            }],
        options: { browserProvider: "mcp" },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const passedTabId = report.browserToolCalls.some(call => call.toolName.endsWith("navigate") && call.input.tabId === 42);
    return {
        pass: report.status === "passed" && passedTabId && calls.length >= 4,
        report,
        calls,
    };
}
async function runTestAgentComputerUseMcpSelfTest() {
    const calls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__computer-use__request_access",
            "mcp__computer-use__left_click",
            "mcp__computer-use__type",
            "mcp__computer-use__key",
            "mcp__computer-use__scroll",
            "mcp__computer-use__wait",
            "mcp__computer-use__screenshot",
        ],
        onCall: (toolName, input) => {
            calls.push({ toolName, input });
            if (toolName.endsWith("screenshot"))
                return { image: "fake-computer-use-screenshot.png" };
            return { ok: true };
        },
    });
    const report = await (0, agent_1.runTestAgent)({
        id: `computer-use-mcp-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent Computer Use MCP adapter path.",
        acceptanceCriteria: ["Computer Use MCP tools are invoked", "desktop action tool calls are recorded"],
        requiredChecks: ["browser_e2e", "screenshots"],
        projects: [{
                name: "computer-use-mcp-self-test",
                workDir: process.cwd(),
                browserChecks: [{
                        name: "Computer Use desktop action chain",
                        url: "computer-use://active-session",
                        actions: [
                            { type: "requestAccess", apps: [{ displayName: "Browser", bundleId: "com.example.Browser" }] },
                            { type: "click", coordinate: [120, 180] },
                            { type: "fill", text: "hello from TestAgent" },
                            { type: "press", key: "enter" },
                            { type: "scroll", direction: "down", amount: 2, coordinate: [240, 320] },
                            { type: "waitForTimeout", value: "10" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: { browserProvider: "mcp" },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const usedComputerUse = report.browserToolCalls.every(call => call.toolName.startsWith("mcp__computer-use__"));
    const tookScreenshot = report.browserToolCalls.some(call => call.toolName.endsWith("screenshot"));
    return {
        pass: report.status === "passed" && usedComputerUse && tookScreenshot && calls.length >= 6,
        report,
        calls,
    };
}
function runTestAgentWorkOrderNormalizationSelfTest() {
    const normalized = (0, work_order_1.normalizeTestAgentWorkOrder)({
        id: `work-order-normalization-self-test-${process.pid}-${Date.now()}`,
        original_user_goal: "Verify work order aliases normalize before execution.",
        acceptance_criteria: ["Browser aliases normalize"],
        required_checks: ["browser_e2e"],
        projects: [{
                name: "normalization-self-test",
                work_dir: process.cwd(),
                browser_checks: [{
                        title: "snake case browser check",
                        target_url: "http://example.test/",
                        steps: [
                            { action: "request_access", apps: [{ display_name: "Browser", bundle_id: "com.example.Browser" }] },
                            { action: "open_application", bundle_id: "com.example.Browser" },
                            { action: "go_offline" },
                            { action: "set_online" },
                            { action: "press_key", key_text: "enter" },
                            { action: "wait_for_url", text: "example.test/dashboard" },
                            { action: "wait_for_timeout", value: "10" },
                        ],
                        expectations: [
                            { assertion: "url_includes", text: "example.test" },
                            { assertion: "browser_offline" },
                            { assertion: "online_state", value: "online" },
                            { assertion: "accessible_name_equals", role: "button", name: "Save", value: "Save profile" },
                            { assertion: "accessible_description_includes", role: "button", name: "Save", value: "profile changes" },
                            { assertion: "aria_snapshot_includes", role: "button", name: "Save", text: "Save profile" },
                            { assertion: "console_message_contains", text: "ready" },
                            { assertion: "console_not_contains", text: "deprecated" },
                            { assertion: "no_console_warning" },
                            { assertion: "console_no_errors" },
                        ],
                    }],
            }],
    });
    const invalid = (0, work_order_1.normalizeTestAgentWorkOrder)({
        id: `work-order-invalid-self-test-${process.pid}-${Date.now()}`,
        projects: [{
                name: "invalid-normalization-self-test",
                workDir: process.cwd(),
                browserChecks: [{ actions: [{ type: "teleport" }] }],
            }],
    });
    const check = normalized.workOrder.projects[0].browserChecks[0];
    const actionTypes = check.actions.map(action => action.type);
    const assertionTypes = check.assertions.map(assertion => assertion.type);
    return {
        pass: normalized.issues.every(issue => issue.severity !== "error")
            && actionTypes.join(",") === "requestAccess,openApplication,setOffline,setOnline,press,waitForUrl,waitForTimeout"
            && assertionTypes.join(",") === "urlIncludes,browserOffline,onlineState,accessibleNameEquals,accessibleDescriptionIncludes,ariaSnapshotIncludes,consoleIncludes,consoleNotIncludes,consoleNoWarnings,consoleNoErrors"
            && invalid.issues.some(issue => issue.code === "invalid_browser_action_type"),
        normalized,
        invalid,
    };
}
function runTestAgentHandoffBuilderSelfTest() {
    const built = (0, work_order_builder_1.buildTestAgentWorkOrderFromHandoff)({
        taskId: "handoff-task-42",
        groupId: "handoff-group",
        originalUserGoal: "Ship the task board feature and prove it works in a browser.",
        acceptanceCriteria: [
            'Task board shows "Ready" at /tasks.',
        ],
        completedTasks: [
            "Task creation flow implemented",
        ],
        completedByProjectAgents: ["frontend-agent", "api-agent"],
        projects: [{
                name: "handoff-web",
                workDir: process.cwd(),
                runCommand: "npm run dev -- --host 127.0.0.1",
                targetUrl: "http://127.0.0.1:5173/tasks",
                changedFiles: ["src/App.tsx", "src/api/tasks.ts"],
                verificationCommands: ["npm test"],
                httpChecks: [{
                        name: "Tasks page HTTP",
                        url: "http://127.0.0.1:5173/tasks",
                        assertions: [{ type: "status", status: 200 }],
                    }],
                adversarialBrowserProbeTemplates: [{
                        kind: "repeated_click",
                        name: "Repeated add task click",
                        url: "http://127.0.0.1:5173/tasks",
                        target: { role: "button", name: "Add task" },
                        expectedText: "Ready",
                    }],
                completedTasks: ["Task list persists after save"],
                risks: ["Local storage behavior must be checked in browser."],
            }],
        options: {
            browserProvider: "playwright",
            collectBrowserArtifacts: true,
        },
    });
    const validation = (0, contract_1.validateTestAgentWorkOrderContract)(built.workOrder);
    const normalized = (0, work_order_1.normalizeTestAgentWorkOrder)(built.workOrder);
    const required = new Set(built.workOrder.requiredChecks || []);
    const project = built.workOrder.projects?.[0];
    const metadata = built.workOrder.metadata || {};
    const minimalExample = (0, work_order_builder_1.buildTestAgentWorkOrderFromHandoff)(contract_1.TEST_AGENT_MINIMAL_HANDOFF_EXAMPLE);
    const webExample = (0, work_order_builder_1.buildTestAgentWorkOrderFromHandoff)(contract_1.TEST_AGENT_WEB_APP_HANDOFF_EXAMPLE);
    const minimalValidation = (0, contract_1.validateTestAgentWorkOrderContract)(minimalExample.workOrder);
    const webValidation = (0, contract_1.validateTestAgentWorkOrderContract)(webExample.workOrder);
    const webRequired = new Set(webExample.workOrder.requiredChecks || []);
    const webProject = webExample.workOrder.projects?.[0];
    const webMetadata = webExample.workOrder.metadata || {};
    return {
        pass: built.warnings.length === 0
            && validation.valid
            && normalized.issues.every(issue => issue.severity !== "error")
            && built.workOrder.schema === "ccm-test-agent-work-order-v1"
            && built.workOrder.issuedBy === "group-main-agent"
            && built.workOrder.acceptanceCriteria?.some(item => item.includes("Task creation flow implemented"))
            && built.workOrder.acceptanceCriteria?.some(item => item.includes("Task list persists after save"))
            && required.has("commands")
            && required.has("http")
            && required.has("browser_e2e")
            && required.has("screenshots")
            && required.has("console_errors")
            && required.has("browser_snapshots")
            && required.has("browser_console_logs")
            && required.has("browser_network_logs")
            && required.has("browser_trace")
            && required.has("browser_har")
            && required.has("adversarial")
            && project.agentSummary.includes("Task list persists after save")
            && project.changedFiles.length === 2
            && metadata.handoffSource === "test-agent-handoff-builder"
            && metadata.completedByProjectAgents.length === 2
            && minimalExample.warnings.length === 0
            && minimalValidation.valid
            && minimalExample.workOrder.projects?.[0]?.verificationCommands?.includes("npm test")
            && minimalExample.workOrder.metadata?.handoffSource === "group-main-agent-example"
            && webExample.warnings.length === 0
            && webValidation.valid
            && webExample.workOrder.acceptanceCriteria?.some(item => item.includes("Frontend login form"))
            && webExample.workOrder.acceptanceCriteria?.some(item => item.includes("Invalid auth response"))
            && webRequired.has("commands")
            && webRequired.has("http")
            && webRequired.has("browser_e2e")
            && webRequired.has("screenshots")
            && webRequired.has("browser_trace")
            && webRequired.has("browser_har")
            && webRequired.has("adversarial")
            && webProject.changedFiles.length === 3
            && webProject.browserChecks.length === 1
            && webProject.adversarialBrowserProbeTemplates.length === 1
            && webMetadata.completedByProjectAgents.length === 2
            && webMetadata.handoffSource === "group-main-agent-example",
        built,
        validation,
        normalized,
        examples: {
            minimal: { built: minimalExample, validation: minimalValidation },
            webApp: { built: webExample, validation: webValidation },
        },
    };
}
function runTestAgentHandoffContractSelfTest() {
    const minimal = (0, contract_1.validateTestAgentHandoffContract)(contract_1.TEST_AGENT_MINIMAL_HANDOFF_EXAMPLE, { browserProvider: "none" });
    const web = (0, contract_1.validateTestAgentHandoffContract)(contract_1.TEST_AGENT_WEB_APP_HANDOFF_EXAMPLE);
    const singleProject = (0, contract_1.validateTestAgentHandoffContract)({
        taskId: "single-project-handoff-contract-self-test",
        originalUserGoal: "Verify a handoff can use a single project object.",
        completedTasks: ["Single project handoff shape is accepted."],
        project: {
            name: "single-project",
            workDir: process.cwd(),
            verificationCommands: [`"${process.execPath}" -e "console.log('single project handoff ok')"`],
        },
        options: {
            browserProvider: "none",
        },
    });
    const warning = (0, contract_1.validateTestAgentHandoffContract)({
        taskId: "warning-handoff-contract-self-test",
        originalUserGoal: "Verify handoff builder warnings are returned by contract validation.",
        completedTasks: ["Warning handoff includes executable evidence but omits workDir."],
        projects: [{
                name: "warning-project",
                verificationCommands: [`"${process.execPath}" -e "console.log('warning handoff ok')"`],
            }],
        options: {
            browserProvider: "none",
        },
    });
    const missingProjects = (0, contract_1.validateTestAgentHandoffContract)({
        originalUserGoal: "This handoff is missing project targets.",
        completedTasks: ["No project target supplied."],
    });
    const invalidProjectsType = (0, contract_1.validateTestAgentHandoffContract)({
        originalUserGoal: "This handoff has the wrong projects type.",
        projects: "not-an-array",
    });
    const invalidNestedHttp = (0, contract_1.validateTestAgentHandoffContract)({
        originalUserGoal: "This handoff has an invalid nested HTTP check.",
        acceptanceCriteria: ["Nested HTTP contract errors are surfaced."],
        projects: [{
                name: "invalid-http-project",
                workDir: process.cwd(),
                httpChecks: [{
                        name: "Missing URL",
                        assertions: [{ type: "status", status: 200 }],
                    }],
            }],
    });
    const missingProjectError = missingProjects.errors.find(issue => issue.path === "projects");
    const invalidProjectsTypeError = invalidProjectsType.errors.find(issue => issue.path === "projects");
    const invalidNestedHttpError = invalidNestedHttp.errors.find(issue => String(issue.path || "").includes("httpChecks"));
    return {
        pass: minimal.valid
            && minimal.workOrder?.schema === "ccm-test-agent-work-order-v1"
            && minimal.normalized?.options.browserProvider === "none"
            && minimal.builderWarnings.length === 0
            && web.valid
            && web.workOrder?.metadata?.handoffSource === "group-main-agent-example"
            && web.workOrder?.requiredChecks?.includes("browser_e2e")
            && web.workOrder?.requiredChecks?.includes("browser_trace")
            && web.builderWarnings.length === 0
            && singleProject.valid
            && singleProject.workOrder?.projects?.length === 1
            && singleProject.workOrder?.projects?.[0]?.name === "single-project"
            && singleProject.workOrder?.requiredChecks?.includes("commands")
            && warning.valid
            && warning.builderWarnings.some(item => item.includes("missing workDir"))
            && warning.warnings.some(item => item.code === "handoff_builder_warning" && item.message.includes("missing workDir"))
            && warning.normalized?.metadata?.handoffWarnings?.some((item) => item.includes("missing workDir"))
            && !missingProjects.valid
            && missingProjectError?.code === "contract_custom"
            && !invalidProjectsType.valid
            && invalidProjectsTypeError?.code === "contract_invalid_type"
            && !invalidNestedHttp.valid
            && invalidNestedHttpError?.code === "contract_custom",
        minimal,
        web,
        singleProject,
        warning,
        missingProjects,
        invalidProjectsType,
        invalidNestedHttp,
    };
}
async function runTestAgentArtifactSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-artifacts-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const report = await (0, agent_1.runTestAgent)({
        id: `artifact-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent writes report artifacts.",
        acceptanceCriteria: ["Report artifacts are written"],
        requiredChecks: ["commands"],
        projects: [{
                name: "artifact-self-test",
                workDir: dir,
                verificationCommands: [`"${process.execPath}" -e "console.log('artifact ok')"`],
            }],
        options: { artifactDir },
    });
    const files = report.metadata.artifactFiles;
    const jsonPath = String(files?.reportJsonPath || "");
    const markdownPath = String(files?.reportMarkdownPath || "");
    const verdictPath = String(files?.verdictJsonPath || "");
    const jsonText = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, "utf-8") : "";
    const markdownText = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
    const verdict = fs.existsSync(verdictPath) ? JSON.parse(fs.readFileSync(verdictPath, "utf-8")) : null;
    const verdictValidation = (0, contract_1.validateTestAgentVerdictContract)(verdict);
    const pass = report.status === "passed"
        && jsonText.includes(report.id)
        && markdownText.includes("# TestAgent Report")
        && verdict?.schema === "ccm-test-agent-verdict-v1"
        && verdict?.reportId === report.id
        && verdict?.canAccept === true
        && verdict?.recommendation === "accept"
        && verdict?.artifacts?.verdictJsonPath === verdictPath
        && verdictValidation.valid
        && markdownText.includes("## Command Details")
        && markdownText.includes("**Output observed:**")
        && markdownText.includes("artifact ok")
        && report.evidence.some(item => item.path === jsonPath)
        && report.evidence.some(item => item.path === markdownPath)
        && report.evidence.some(item => item.path === verdictPath);
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        files: { jsonPath, markdownPath, verdictPath },
        verdict,
        verdictValidation,
    };
}
async function runTestAgentVerdictSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-verdict-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const report = await (0, agent_1.runTestAgent)({
        id: `verdict-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent verdict marks failing evidence as rework.",
        acceptanceCriteria: ["Failing command produces a rework verdict"],
        requiredChecks: ["commands"],
        projects: [{
                name: "verdict-self-test",
                workDir: dir,
                verificationCommands: [`"${process.execPath}" -e "console.error('verdict failure'); process.exit(7)"`],
            }],
        options: { artifactDir, browserProvider: "none" },
    });
    const verdictPath = String(report.metadata.artifactFiles?.verdictJsonPath || "");
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const verdict = fs.existsSync(verdictPath) ? JSON.parse(fs.readFileSync(verdictPath, "utf-8")) : null;
    const validation = (0, contract_1.validateTestAgentVerdictContract)(verdict);
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
    const manifestVerdict = (manifest?.files || []).find((item) => item.type === "verdict_json");
    const pass = report.status === "failed"
        && report.recommendation === "rework"
        && verdict?.schema === "ccm-test-agent-verdict-v1"
        && verdict?.status === "failed"
        && verdict?.canAccept === false
        && verdict?.needsRework === true
        && verdict?.needsHuman === false
        && verdict?.failedRequiredChecks?.some((item) => item.check === "commands")
        && verdict?.risks?.some((item) => item.includes("command failed"))
        && verdict?.nextActions?.some((item) => item.includes("Route the task back for rework"))
        && verdict?.evidenceSummary?.commands?.failed === 1
        && verdict?.artifacts?.manifestPath === manifestPath
        && validation.valid
        && manifestVerdict?.integrity?.exists === true
        && typeof manifestVerdict?.integrity?.sha256 === "string";
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        verdict,
        validation,
        manifest,
    };
}
async function runTestAgentArtifactManifestSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-manifest-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName) => {
            if (toolName.endsWith("browser_snapshot"))
                return "Manifest Ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return { path: "manifest-screenshot.png" };
            return { ok: true };
        },
    });
    const report = await (0, agent_1.runTestAgent)({
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
    const files = report.metadata.artifactFiles;
    const manifestPath = String(files?.manifestPath || "");
    const transcriptPath = String(report.metadata.browserToolTranscriptPath || "");
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
    const manifestFiles = manifest?.files || [];
    const manifestTypes = new Set(manifestFiles.map((item) => String(item.type)));
    const reportJsonEntry = manifestFiles.find((item) => item.type === "report_json");
    const verdictEntry = manifestFiles.find((item) => item.type === "verdict_json");
    const screenshotEntry = manifestFiles.find((item) => item.type === "screenshot");
    const manifestEntry = manifestFiles.find((item) => item.type === "artifact_manifest");
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
        && manifestFiles.every((item) => item.integrity?.exists === true)
        && typeof reportJsonEntry?.integrity?.sha256 === "string"
        && reportJsonEntry.integrity.sha256.length === 64
        && typeof verdictEntry?.integrity?.sha256 === "string"
        && verdictEntry.integrity.sha256.length === 64
        && typeof screenshotEntry?.integrity?.sha256 === "string"
        && screenshotEntry.integrity.sha256.length === 64
        && manifestEntry?.integrity?.exists === true
        && manifestEntry?.integrity?.error === "sha256 omitted for self-referential artifact.";
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        manifest,
    };
}
async function runTestAgentArtifactVerifierSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-artifact-verifier-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const report = await (0, agent_1.runTestAgent)({
        id: `artifact-verifier-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent artifact manifest can be independently checked.",
        acceptanceCriteria: ["Artifact verifier detects intact and tampered files"],
        requiredChecks: ["commands"],
        projects: [{
                name: "artifact-verifier-self-test",
                workDir: dir,
                verificationCommands: [`"${process.execPath}" -e "console.log('verifier ok')"`],
            }],
        options: { artifactDir, browserProvider: "none" },
    });
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const markdownPath = String(report.metadata.artifactFiles?.reportMarkdownPath || "");
    const verdictPath = String(report.metadata.artifactFiles?.verdictJsonPath || "");
    const verification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const summary = (0, cli_1.formatTestAgentCliArtifactVerificationSummary)(verification);
    const cliStdout = [];
    const cliStderr = [];
    const cliResult = await (0, cli_1.runTestAgentCli)(["--verify-artifacts", manifestPath, "--summary"], {
        stdout: { write: message => cliStdout.push(String(message)) },
        stderr: { write: message => cliStderr.push(String(message)) },
    });
    const verdict = JSON.parse(fs.readFileSync(verdictPath, "utf-8"));
    verdict.reportId = `${verdict.reportId}-tampered`;
    verdict.canAccept = !verdict.canAccept;
    fs.writeFileSync(verdictPath, `${JSON.stringify(verdict, null, 2)}\n`, "utf-8");
    refreshManifestItemIntegrity(manifestPath, "verdict_json");
    const semanticTampered = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const semanticSummary = (0, cli_1.formatTestAgentCliArtifactVerificationSummary)(semanticTampered);
    fs.appendFileSync(markdownPath, "\nTAMPERED\n", "utf-8");
    const tampered = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const tamperedStdout = [];
    const tamperedResult = await (0, cli_1.runTestAgentCli)(["--verify-artifacts", manifestPath, "--summary"], {
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        verification,
        semanticTampered,
        tampered,
    };
}
async function runTestAgentMcpScreenshotArtifactSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-mcp-screenshot-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName) => {
            if (toolName.endsWith("browser_snapshot"))
                return "Screenshot artifact ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return { image: `data:image/png;base64,${onePixelPng}` };
            return { ok: true };
        },
    });
    const report = await (0, agent_1.runTestAgent)({
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
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
    const manifestScreenshot = (manifest?.files || []).find((item) => item.type === "screenshot");
    const verification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const screenshotMetadata = verification.items.find(item => item.type === "screenshot_png_metadata");
    const screenshotContent = verification.items.find(item => item.type === "screenshot_png_content");
    writeSolidRgbaPng(screenshotPath, 4, 4, [255, 255, 255, 255]);
    refreshManifestItemIntegrity(manifestPath, "screenshot");
    const blank = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const blankScreenshotContent = blank.items.find(item => item.type === "screenshot_png_content");
    fs.writeFileSync(screenshotPath, "not a png screenshot\n", "utf-8");
    refreshManifestItemIntegrity(manifestPath, "screenshot");
    const tampered = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
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
async function runTestAgentBrowserEvidenceArtifactSelfTest() {
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
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName) => {
            if (toolName.endsWith("browser_snapshot"))
                return "Evidence artifacts ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return {
                    image: `data:image/png;base64,${onePixelPng}`,
                    trace: `data:application/zip;base64,${traceBase64}`,
                    harPath,
                    videoPath,
                };
            return { ok: true };
        },
    });
    const report = await (0, agent_1.runTestAgent)({
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
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
    const verification = manifestPath ? (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath) : null;
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const manifestTypes = new Set((manifest?.files || []).map((item) => item.type));
    const traceMetadata = verification?.items.find(item => item.type === "browser_trace_zip");
    const harMetadata = verification?.items.find(item => item.type === "browser_har_metadata");
    const videoMetadata = verification?.items.find(item => item.type === "browser_video_container");
    const copiedTrace = artifacts.find(item => item.type === "trace")?.path || "";
    if (copiedTrace) {
        fs.writeFileSync(copiedTrace, buildEmptyZip());
        refreshManifestItemIntegrity(manifestPath, "browser_trace");
    }
    const emptyTrace = manifestPath ? (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath) : null;
    const emptyTraceMetadata = emptyTrace?.items.find(item => item.type === "browser_trace_zip");
    if (copiedTrace) {
        fs.writeFileSync(copiedTrace, buildStoredZip([{ name: "trace.trace", data: "" }]));
        refreshManifestItemIntegrity(manifestPath, "browser_trace");
    }
    const noEventTrace = manifestPath ? (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath) : null;
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
    const tamperedHar = manifestPath ? (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath) : null;
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
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
function runTestAgentCoverageSelfTest() {
    const { workOrder } = (0, work_order_1.normalizeTestAgentWorkOrder)({
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
    const coverage = (0, coverage_1.buildAcceptanceCoverage)({
        workOrder,
        status: "partial",
        issues: [],
        commandResults: [{
                ...baseCommand,
                status: "passed",
                stdout: "Login page renders",
                output: "Login page renders",
            }],
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
async function runTestAgentCommandPlannerSelfTest() {
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
    const report = await (0, agent_1.runTestAgent)({
        id: `command-planner-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent auto-discovers package scripts for required checks.",
        acceptanceCriteria: ["Auto-discovered verification commands run"],
        requiredChecks: ["build", "unit_tests", "typecheck", "lint"],
        projects: [{
                name: "command-planner-self-test",
                workDir: dir,
            }],
    });
    const planned = report.metadata.autoDiscoveredVerificationCommands;
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        planned,
    };
}
async function runTestAgentExecutionPlanSelfTest() {
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
    const workOrder = (0, work_order_builder_1.buildTestAgentWorkOrderFromHandoff)({
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
    const validation = (0, contract_1.validateTestAgentWorkOrderContract)(workOrder);
    const plan = (0, execution_plan_1.buildTestAgentExecutionPlan)(workOrder, {}, validation);
    const summary = (0, cli_1.formatTestAgentCliExecutionPlanSummary)(plan);
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
    const cliStdout = [];
    const cliStderr = [];
    let runAgentCalled = false;
    const cliResult = await (0, cli_1.runTestAgentCli)([
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
        && browserCheck?.autoGenerated === true
        && browserCheck?.screenshot === true
        && plan.summary.expectedArtifactTypes.includes("browser_trace")
        && plan.summary.expectedArtifactTypes.includes("browser_har")
        && plan.summary.expectedArtifactTypes.includes("screenshot")
        && summary.includes("TestAgent execution plan: valid")
        && summary.includes("Commands: 3")
        && cliResult.exitCode === 0
        && !runAgentCalled
        && cliStderr.length === 0
        && cliSummary.includes("TestAgent execution plan: valid")
        && cliSummary.includes("Commands: 0")
        && cliSummary.includes("Browser checks: 1");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        validation,
        plan,
        summary,
        cliResult,
        cliSummary,
        runAgentCalled,
    };
}
async function runTestAgentHttpApiSelfTest() {
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
    const report = await (0, agent_1.runTestAgent)({
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
    };
}
async function runTestAgentAdversarialHttpSelfTest() {
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
    const report = await (0, agent_1.runTestAgent)({
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
    };
}
async function runTestAgentAdversarialBrowserSelfTest() {
    const calls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName, input) => {
            calls.push({ toolName, input });
            if (toolName.endsWith("browser_snapshot"))
                return "Login\nInvalid password\nPlease try again";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return { path: "adversarial-browser.png" };
            return { ok: true };
        },
    });
    const report = await (0, agent_1.runTestAgent)({
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
async function runTestAgentBrowserProbeTemplateSelfTest() {
    const calls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
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
            if (toolName.endsWith("browser_snapshot"))
                return [
                    "Login",
                    "Invalid password",
                    "Counter stable",
                    "Saved draft",
                ].join("\n");
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return { path: `${input.filename || "template-check"}.png` };
            return { ok: true };
        },
    });
    const report = await (0, agent_1.runTestAgent)({
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
async function runTestAgentAutoBrowserSmokeSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-auto-browser-smoke-selftest-"));
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/dashboard`;
    const artifactDir = path.join(dir, "artifacts");
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = '<!doctype html><title>Auto smoke</title><main><h1>Dashboard</h1><p>Ready for verification</p></main>';",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const calls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName, input) => {
            calls.push({ toolName, input });
            if (toolName.endsWith("browser_snapshot"))
                return "Dashboard\nReady for verification";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return { path: "auto-smoke.png" };
            return { ok: true };
        },
    });
    const acceptanceCriteria = ['Target URL opens with "Ready for verification" at /dashboard'];
    const derivedAssertions = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertions)(acceptanceCriteria);
    const autoCheck = (0, auto_checks_1.buildAutoBrowserSmokeCheck)({
        name: "auto-browser-smoke-self-test",
        workDir: dir,
        runCommand: "",
        devServerCommand: "",
        targetUrl,
        startupUrl: targetUrl,
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
    }, acceptanceCriteria);
    const report = await (0, agent_1.runTestAgent)({
        id: `auto-browser-smoke-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent auto-generates a browser smoke check from targetUrl.",
        acceptanceCriteria,
        requiredChecks: ["browser_e2e", "screenshots", "console_errors", "browser_snapshots", "browser_console_logs", "browser_network_logs"],
        projects: [{
                name: "auto-browser-smoke-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
            }],
        options: { browserProvider: "mcp", artifactDir },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const result = report.browserResults[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = autoCheck?.probeType === auto_checks_1.AUTO_BROWSER_SMOKE_PROBE_TYPE
        && autoCheck?.assertions?.some(assertion => assertion.type === "pageNotBlank") === true
        && derivedAssertions.some(item => item.reason === "quoted_text" && item.assertion.type === "text" && item.assertion.text === "Ready for verification")
        && derivedAssertions.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/dashboard")
        && autoCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Ready for verification") === true
        && autoCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/dashboard") === true
        && report.status === "passed"
        && report.devServerResults.some(item => item.status === "started" || item.status === "already_running")
        && report.httpResults.some(item => item.name === "Page HTTP probe" && item.status === "passed")
        && report.browserResults.length === 1
        && result?.name === "Auto browser smoke: auto-browser-smoke-self-test"
        && result?.probeType === auto_checks_1.AUTO_BROWSER_SMOKE_PROBE_TYPE
        && result?.status === "passed"
        && result?.pageTextPreview?.includes("Ready for verification")
        && result?.steps.some(step => step.name.includes("pageNotBlank") && step.status === "passed")
        && result?.steps.some(step => step.name.includes("text") && step.status === "passed" && step.detail === "Ready for verification")
        && result?.steps.some(step => step.name.includes("urlIncludes") && step.status === "passed" && step.detail === "/dashboard")
        && result?.screenshots.length === 1
        && (result?.pageSnapshots || []).length === 1
        && !!result?.consoleLogPath
        && !!result?.networkLogPath
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && byCheck.get("console_errors")?.status === "verified"
        && byCheck.get("browser_snapshots")?.status === "verified"
        && byCheck.get("browser_console_logs")?.status === "verified"
        && byCheck.get("browser_network_logs")?.status === "verified"
        && report.acceptanceCoverage.every(item => item.status === "verified")
        && calls.some(call => call.toolName.endsWith("browser_navigate"))
        && calls.some(call => call.toolName.endsWith("browser_snapshot"));
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        calls,
        autoCheck,
        derivedAssertions,
    };
}
async function runTestAgentBlankPageSmokeSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-blank-page-smoke-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/blank-shell`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = '<!doctype html><title>Blank Shell</title><div id=\"app\"></div>';",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, agent_1.runTestAgent)({
        id: `blank-page-smoke-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent does not accept an empty app shell as a completed web feature.",
        acceptanceCriteria: ["The delivered page must contain visible user-facing content."],
        requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots"],
        projects: [{
                name: "blank-page-smoke-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
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
    const pageNotBlank = browser?.steps.find(step => step.name === "assert:pageNotBlank");
    const markdownPath = String(report.metadata.artifactFiles?.reportMarkdownPath || "");
    const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = report.status === "failed"
        && report.recommendation === "rework"
        && report.httpResults.some(item => item.name === "Page HTTP probe" && item.status === "passed")
        && browser?.provider === "playwright"
        && browser?.status === "failed"
        && browser?.name === "Auto browser smoke: blank-page-smoke-self-test"
        && browser?.probeType === auto_checks_1.AUTO_BROWSER_SMOKE_PROBE_TYPE
        && pageNotBlank?.status === "failed"
        && String(pageNotBlank?.error || "").includes("no visible text")
        && browser?.screenshots.some(item => fs.existsSync(item))
        && (browser?.pageSnapshots || []).some(item => fs.existsSync(item))
        && byCheck.get("http")?.status === "verified"
        && byCheck.get("browser_e2e")?.status === "not_verified"
        && byCheck.get("screenshots")?.status === "verified"
        && markdown.includes("assert:pageNotBlank")
        && markdown.includes("Expected page to have visible user-facing content");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        pageNotBlank,
    };
}
async function runTestAgentAcceptancePathSmokeSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-path-smoke-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const tasksUrl = `http://127.0.0.1:${port}/tasks`;
    const acceptanceCriteria = ['Task board shows "Tasks Ready" at /tasks.'];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
        "const tasks = '<!doctype html><title>Tasks</title><main><h1>Tasks Ready</h1><button>Add task</button></main>';",
        "http.createServer((req, res) => {",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(req.url === '/tasks' ? tasks : root);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const pathChecks = (0, auto_checks_1.buildAcceptancePathBrowserSmokeChecks)({
        name: "acceptance-path-smoke-self-test",
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
    }, acceptanceCriteria);
    const report = await (0, agent_1.runTestAgent)({
        id: `acceptance-path-smoke-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer browser smoke paths from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "acceptance-path-smoke-self-test",
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
    const pass = pathChecks.length === 1
        && pathChecks[0].url === tasksUrl
        && pathChecks[0].actions?.some(action => action.type === "goto" && action.url === tasksUrl)
        && report.status === "passed"
        && report.httpResults.some(item => item.name === "Page HTTP probe" && item.status === "passed")
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.name.includes("/tasks")
        && browser?.url === tasksUrl
        && browser?.finalUrl === tasksUrl
        && browser?.pageTextPreview?.includes("Tasks Ready")
        && browser?.steps.some(step => step.name === "assert:pageNotBlank" && step.status === "passed")
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Tasks Ready"))
        && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/tasks"))
        && byCheck.get("http")?.status === "verified"
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
        pathChecks,
    };
}
async function runTestAgentAcceptancePathGroupingSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-path-grouping-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const tasksUrl = `http://127.0.0.1:${port}/tasks`;
    const settingsUrl = `http://127.0.0.1:${port}/settings`;
    const acceptanceCriteria = [
        'Task board shows "Tasks Ready" at /tasks.',
        'Settings page shows "Settings Saved" at /settings.',
    ];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
        "const tasks = '<!doctype html><title>Tasks</title><main><h1>Tasks Ready</h1><button>Add task</button></main>';",
        "const settings = '<!doctype html><title>Settings</title><main><h1>Settings Saved</h1><button>Save</button></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/tasks' ? tasks : route === '/settings' ? settings : root);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const pathChecks = (0, auto_checks_1.buildAcceptancePathBrowserSmokeChecks)({
        name: "acceptance-path-grouping-self-test",
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
    }, acceptanceCriteria);
    const report = await (0, agent_1.runTestAgent)({
        id: `acceptance-path-grouping-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent keeps acceptance-derived browser assertions scoped to their route.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "acceptance-path-grouping-self-test",
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
    const tasksCheck = pathChecks.find(check => check.url === tasksUrl);
    const settingsCheck = pathChecks.find(check => check.url === settingsUrl);
    const tasksBrowser = report.browserResults.find(item => item.url === tasksUrl);
    const settingsBrowser = report.browserResults.find(item => item.url === settingsUrl);
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const hasAssertion = (check, type, value) => {
        return check?.assertions?.some(assertion => assertion.type === type && String(assertion.text || assertion.value || "").includes(value)) === true;
    };
    const browserHasStep = (browser, name, value) => {
        return browser?.steps.some(step => step.name === name && step.status === "passed" && String(step.detail || "").includes(value)) === true;
    };
    const pass = pathChecks.length === 2
        && hasAssertion(tasksCheck, "text", "Tasks Ready")
        && hasAssertion(tasksCheck, "urlIncludes", "/tasks")
        && !hasAssertion(tasksCheck, "text", "Settings Saved")
        && hasAssertion(settingsCheck, "text", "Settings Saved")
        && hasAssertion(settingsCheck, "urlIncludes", "/settings")
        && !hasAssertion(settingsCheck, "text", "Tasks Ready")
        && report.status === "passed"
        && report.browserResults.length === 2
        && tasksBrowser?.status === "passed"
        && settingsBrowser?.status === "passed"
        && tasksBrowser?.pageTextPreview?.includes("Tasks Ready")
        && !tasksBrowser?.pageTextPreview?.includes("Settings Saved")
        && settingsBrowser?.pageTextPreview?.includes("Settings Saved")
        && !settingsBrowser?.pageTextPreview?.includes("Tasks Ready")
        && browserHasStep(tasksBrowser, "assert:text", "Tasks Ready")
        && browserHasStep(settingsBrowser, "assert:text", "Settings Saved")
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
        pathChecks,
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
    const port = await getFreePort();
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
    const report = await (0, agent_1.runTestAgent)({
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
    const port = await getFreePort();
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
    const report = await (0, agent_1.runTestAgent)({
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
    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const tasksUrl = `http://127.0.0.1:${port}/tasks`;
    const acceptanceCriteria = ['At /tasks, enter "Buy milk" into "Task", click "Add task", then shows "Buy milk".'];
    writeTaskBoardFixtureServer(dir);
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
    const report = await (0, agent_1.runTestAgent)({
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
async function runTestAgentAcceptanceMultiFieldFormFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-multi-field-form-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const loginUrl = `http://127.0.0.1:${port}/login`;
    const acceptanceCriteria = ['At /login, enter "ada@example.test" into "Email" and enter "correct horse battery staple" into "Password", click "Sign in", then shows "Dashboard".'];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const login = `<!doctype html>",
        "<html><head><title>Login</title></head>",
        "<body>",
        "<main>",
        "<h1>Sign in</h1>",
        "<label for=\"email\">Email</label>",
        "<input id=\"email\" name=\"email\" />",
        "<label for=\"password\">Password</label>",
        "<input id=\"password\" name=\"password\" type=\"password\" />",
        "<button type=\"button\" id=\"signin\">Sign in</button>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "</main>",
        "<script>",
        "document.getElementById('signin').addEventListener('click', () => {",
        "  const email = document.getElementById('email').value;",
        "  const password = document.getElementById('password').value;",
        "  document.getElementById('status').textContent = email && password ? 'Dashboard' : 'Missing credentials';",
        "});",
        "</script>",
        "</body></html>`;",
        "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/login' ? login : root);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-multi-field-form-flow-self-test",
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
    const report = await (0, agent_1.runTestAgent)({
        id: `acceptance-multi-field-form-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer a multi-field browser form flow from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "acceptance-multi-field-form-flow-self-test",
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
    const flowCheck = flowChecks[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const fillActions = flowCheck?.actions?.filter(action => action.type === "fill") || [];
    const browserFillSteps = browser?.steps.filter(step => step.name === "action:fill" && step.status === "passed") || [];
    const hasAction = (detail) => {
        return browserFillSteps.some(step => String(step.detail || "").includes(detail));
    };
    const pass = flowChecks.length === 1
        && flowCheck?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && flowCheck?.url === loginUrl
        && (flowCheck?.actions?.length || 0) >= 5
        && fillActions.length === 2
        && fillActions[0]?.label === "Email"
        && fillActions[0]?.value === "ada@example.test"
        && fillActions[1]?.label === "Password"
        && fillActions[1]?.value === "correct horse battery staple"
        && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Sign in")
        && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Dashboard")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && browser?.url === loginUrl
        && browser?.finalUrl === loginUrl
        && browser?.pageTextPreview?.includes("Dashboard")
        && !browser?.pageTextPreview?.includes("Missing credentials")
        && browserFillSteps.length === 2
        && hasAction("label=Email")
        && hasAction("label=Password")
        && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("Sign in"))
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Dashboard"))
        && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/login"))
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
async function runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-select-checkbox-form-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const settingsUrl = `http://127.0.0.1:${port}/settings`;
    const acceptanceCriteria = ['At /settings, select "High" in "Priority", check "Notify team", enter "Quarterly plan" into "Title", click "Save", then shows "Saved Quarterly plan High notify".'];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const settings = `<!doctype html>",
        "<html><head><title>Settings</title></head>",
        "<body>",
        "<main>",
        "<h1>Settings</h1>",
        "<label for=\"title\">Title</label>",
        "<input id=\"title\" name=\"title\" />",
        "<label for=\"priority\">Priority</label>",
        "<select id=\"priority\" name=\"priority\">",
        "<option value=\"priority-low\">Low</option>",
        "<option value=\"priority-high\">High</option>",
        "</select>",
        "<label><input id=\"notify\" name=\"notify\" type=\"checkbox\" /> Notify team</label>",
        "<button type=\"button\" id=\"save\">Save</button>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "</main>",
        "<script>",
        "document.getElementById('save').addEventListener('click', () => {",
        "  const title = document.getElementById('title').value;",
        "  const priority = document.getElementById('priority').selectedOptions[0].textContent;",
        "  const notify = document.getElementById('notify').checked ? 'notify' : 'quiet';",
        "  document.getElementById('status').textContent = title ? 'Saved ' + title + ' ' + priority + ' ' + notify : 'Missing title';",
        "});",
        "</script>",
        "</body></html>`;",
        "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/settings' ? settings : root);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-select-checkbox-form-flow-self-test",
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
    const report = await (0, agent_1.runTestAgent)({
        id: `acceptance-select-checkbox-form-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer select and checkbox controls from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "acceptance-select-checkbox-form-flow-self-test",
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
    const flowCheck = flowChecks[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const actionTypes = flowCheck?.actions?.map(action => action.type).join(",") || "";
    const browserActionNames = browser?.steps.filter(step => step.kind === "action" && step.status === "passed").map(step => step.name).join(",") || "";
    const pass = flowChecks.length === 1
        && flowCheck?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && flowCheck?.url === settingsUrl
        && actionTypes.includes("selectOption")
        && actionTypes.includes("check")
        && flowCheck?.actions?.some(action => action.type === "selectOption" && action.label === "Priority" && action.value === "High")
        && flowCheck?.actions?.some(action => action.type === "check" && action.label === "Notify team")
        && flowCheck?.actions?.some(action => action.type === "fill" && action.label === "Title" && action.value === "Quarterly plan")
        && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Save")
        && flowCheck?.assertions?.some(assertion => assertion.type === "selectedTextIncludes" && assertion.label === "Priority" && assertion.text === "High")
        && flowCheck?.assertions?.some(assertion => assertion.type === "checked" && assertion.label === "Notify team")
        && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Saved Quarterly plan High notify")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && browser?.url === settingsUrl
        && browser?.finalUrl === settingsUrl
        && browser?.pageTextPreview?.includes("Saved Quarterly plan High notify")
        && !browser?.pageTextPreview?.includes("Missing title")
        && browserActionNames.includes("action:selectOption")
        && browserActionNames.includes("action:check")
        && browser?.steps.some(step => step.name === "action:selectOption" && String(step.detail || "").includes("label=Priority"))
        && browser?.steps.some(step => step.name === "action:check" && String(step.detail || "").includes("label=Notify team"))
        && browser?.steps.some(step => step.name === "action:fill" && String(step.detail || "").includes("label=Title"))
        && browser?.steps.some(step => step.name === "assert:selectedTextIncludes" && step.status === "passed" && String(step.detail || "").includes("label=Priority") && String(step.detail || "").includes("expected=High"))
        && browser?.steps.some(step => step.name === "assert:checked" && step.status === "passed" && String(step.detail || "").includes("label=Notify team"))
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Saved Quarterly plan High notify"))
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
async function runTestAgentAcceptanceUncheckRadioFormFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-uncheck-radio-form-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const preferencesUrl = `http://127.0.0.1:${port}/preferences`;
    const acceptanceCriteria = ['At /preferences, uncheck "Newsletter", choose the radio option "Email", click "Save", then shows "Saved Email newsletter off".'];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const preferences = `<!doctype html>",
        "<html><head><title>Preferences</title></head>",
        "<body>",
        "<main>",
        "<h1>Preferences</h1>",
        "<label><input id=\"newsletter\" type=\"checkbox\" checked /> Newsletter</label>",
        "<fieldset><legend>Contact method</legend>",
        "<label><input type=\"radio\" name=\"contact\" value=\"Email\" /> Email</label>",
        "<label><input type=\"radio\" name=\"contact\" value=\"SMS\" checked /> SMS</label>",
        "</fieldset>",
        "<button type=\"button\" id=\"save\">Save</button>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "</main>",
        "<script>",
        "document.getElementById('save').addEventListener('click', () => {",
        "  const newsletter = document.getElementById('newsletter').checked ? 'on' : 'off';",
        "  const contact = document.querySelector('input[name=contact]:checked')?.value || 'none';",
        "  document.getElementById('status').textContent = 'Saved ' + contact + ' newsletter ' + newsletter;",
        "});",
        "</script>",
        "</body></html>`;",
        "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/preferences' ? preferences : root);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-uncheck-radio-form-flow-self-test",
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
    const report = await (0, agent_1.runTestAgent)({
        id: `acceptance-uncheck-radio-form-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer uncheck and radio controls from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "acceptance-uncheck-radio-form-flow-self-test",
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
    const flowCheck = flowChecks[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = flowChecks.length === 1
        && flowCheck?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && flowCheck?.url === preferencesUrl
        && flowCheck?.actions?.some(action => action.type === "uncheck" && action.label === "Newsletter")
        && flowCheck?.actions?.some(action => action.type === "check" && action.label === "Email")
        && !flowCheck?.actions?.some(action => action.type === "selectOption")
        && flowCheck?.actions?.some(action => action.type === "click" && action.role === "button" && action.name === "Save")
        && flowCheck?.assertions?.some(assertion => assertion.type === "notChecked" && assertion.label === "Newsletter")
        && flowCheck?.assertions?.some(assertion => assertion.type === "checked" && assertion.label === "Email")
        && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Saved Email newsletter off")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && browser?.url === preferencesUrl
        && browser?.finalUrl === preferencesUrl
        && browser?.pageTextPreview?.includes("Saved Email newsletter off")
        && !browser?.pageTextPreview?.includes("Saved SMS newsletter on")
        && browser?.steps.some(step => step.name === "action:uncheck" && step.status === "passed" && String(step.detail || "").includes("label=Newsletter"))
        && browser?.steps.some(step => step.name === "action:check" && step.status === "passed" && String(step.detail || "").includes("label=Email"))
        && browser?.steps.some(step => step.name === "assert:notChecked" && step.status === "passed" && String(step.detail || "").includes("label=Newsletter"))
        && browser?.steps.some(step => step.name === "assert:checked" && step.status === "passed" && String(step.detail || "").includes("label=Email"))
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Saved Email newsletter off"))
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
async function runTestAgentAcceptanceRedirectFormFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-redirect-form-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const loginUrl = `http://127.0.0.1:${port}/login`;
    const dashboardUrl = `http://127.0.0.1:${port}/dashboard`;
    const acceptanceCriteria = ['At /login, enter "ada@example.test" into "Email" and enter "correct horse battery staple" into "Password", click "Sign in", then navigates to /dashboard and shows "Dashboard".'];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const login = `<!doctype html>",
        "<html><head><title>Login</title></head>",
        "<body>",
        "<main>",
        "<h1>Sign in</h1>",
        "<label for=\"email\">Email</label>",
        "<input id=\"email\" name=\"email\" />",
        "<label for=\"password\">Password</label>",
        "<input id=\"password\" name=\"password\" type=\"password\" />",
        "<button type=\"button\" id=\"signin\">Sign in</button>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "</main>",
        "<script>",
        "document.getElementById('signin').addEventListener('click', () => {",
        "  const email = document.getElementById('email').value;",
        "  const password = document.getElementById('password').value;",
        "  if (email && password) setTimeout(() => { window.location.href = '/dashboard'; }, 350);",
        "  else document.getElementById('status').textContent = 'Missing credentials';",
        "});",
        "</script>",
        "</body></html>`;",
        "const dashboard = '<!doctype html><title>Dashboard</title><main><h1>Dashboard</h1><p role=\"status\">Signed in</p></main>';",
        "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/login' ? login : route === '/dashboard' ? dashboard : root);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-redirect-form-flow-self-test",
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
    const report = await (0, agent_1.runTestAgent)({
        id: `acceptance-redirect-form-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer a post-submit redirect browser form flow.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "acceptance-redirect-form-flow-self-test",
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
    const flowCheck = flowChecks[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const fillActions = flowCheck?.actions?.filter(action => action.type === "fill") || [];
    const pass = flowChecks.length === 1
        && flowCheck?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && flowCheck?.url === loginUrl
        && flowCheck?.actions?.some(action => action.type === "goto" && action.url === loginUrl)
        && fillActions.length === 2
        && flowCheck?.actions?.some(action => action.type === "waitForUrl" && action.text === "/dashboard")
        && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Dashboard")
        && flowCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/dashboard")
        && !flowCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/login")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && browser?.url === loginUrl
        && browser?.finalUrl === dashboardUrl
        && browser?.pageTextPreview?.includes("Dashboard")
        && !browser?.pageTextPreview?.includes("Missing credentials")
        && browser?.steps.some(step => step.name === "action:waitForUrl" && step.status === "passed" && String(step.detail || "").includes("/dashboard"))
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Dashboard"))
        && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/dashboard"))
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
async function runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-acceptance-refresh-persistence-form-flow-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const tasksUrl = `http://127.0.0.1:${port}/tasks`;
    const acceptanceCriteria = ['At /tasks, enter "Ship TestAgent" into "Task", click "Save", then still shows "Ship TestAgent" after refresh.'];
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Tasks</title></head>",
        "<body>",
        "<main>",
        "<h1>Tasks</h1>",
        "<label for=\"task\">Task</label>",
        "<input id=\"task\" name=\"task\" />",
        "<button type=\"button\" id=\"save\">Save</button>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "<ul id=\"tasks\"></ul>",
        "</main>",
        "<script>",
        "function readTasks() { try { return JSON.parse(localStorage.getItem('tasks') || '[]'); } catch { return []; } }",
        "function writeTasks(tasks) { localStorage.setItem('tasks', JSON.stringify(tasks)); }",
        "function render() {",
        "  const tasks = readTasks();",
        "  document.getElementById('tasks').innerHTML = tasks.map(task => '<li>' + task + '</li>').join('');",
        "  if (tasks.length) document.getElementById('status').textContent = 'Saved ' + tasks[tasks.length - 1];",
        "}",
        "document.getElementById('save').addEventListener('click', () => {",
        "  const value = document.getElementById('task').value;",
        "  if (!value) { document.getElementById('status').textContent = 'Missing task'; return; }",
        "  const tasks = readTasks();",
        "  tasks.push(value);",
        "  writeTasks(tasks);",
        "  render();",
        "});",
        "render();",
        "</script>",
        "</body></html>`;",
        "const root = '<!doctype html><title>Home</title><main><h1>Home</h1></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/tasks' ? html : root);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const project = {
        name: "acceptance-refresh-persistence-form-flow-self-test",
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
    const report = await (0, agent_1.runTestAgent)({
        id: `acceptance-refresh-persistence-form-flow-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can infer refresh persistence checks from acceptance criteria.",
        acceptanceCriteria,
        requiredChecks: ["http", "browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "acceptance-refresh-persistence-form-flow-self-test",
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
    const flowCheck = flowChecks[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const clickIndex = flowCheck?.actions?.findIndex(action => action.type === "click") ?? -1;
    const reloadIndex = flowCheck?.actions?.findIndex(action => action.type === "reload") ?? -1;
    const pass = flowChecks.length === 1
        && flowCheck?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && flowCheck?.url === tasksUrl
        && clickIndex >= 0
        && reloadIndex > clickIndex
        && flowCheck?.actions?.some(action => action.type === "fill" && action.label === "Task" && action.value === "Ship TestAgent")
        && flowCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Ship TestAgent")
        && flowCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/tasks")
        && report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.probeType === acceptance_form_flows_1.ACCEPTANCE_FORM_FLOW_PROBE_TYPE
        && browser?.url === tasksUrl
        && browser?.finalUrl === tasksUrl
        && browser?.pageTextPreview?.includes("Ship TestAgent")
        && !browser?.pageTextPreview?.includes("Missing task")
        && browser?.steps.some(step => step.name === "action:reload" && step.status === "passed")
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Ship TestAgent"))
        && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/tasks"))
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
async function runTestAgentPlaywrightUrlIncludesWaitSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-url-includes-wait-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/start`;
    const doneUrl = `http://127.0.0.1:${port}/done`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const start = `<!doctype html>",
        "<html><head><title>Start</title></head>",
        "<body><main><h1>Start</h1><button type=\"button\" id=\"continue\">Continue</button></main>",
        "<script>",
        "document.getElementById('continue').addEventListener('click', () => {",
        "  setTimeout(() => { window.location.href = '/done'; }, 350);",
        "});",
        "</script>",
        "</body></html>`;",
        "const done = '<!doctype html><title>Done</title><main><h1>Done</h1><p role=\"status\">Completed</p></main>';",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/done' ? done : start);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, agent_1.runTestAgent)({
        id: `playwright-url-includes-wait-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify urlIncludes waits for delayed browser navigation.",
        acceptanceCriteria: ["Clicking Continue eventually navigates to /done and shows Done."],
        requiredChecks: ["browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "playwright-url-includes-wait-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                browserChecks: [{
                        name: "Delayed URL assertion waits",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Continue", exact: true },
                        ],
                        assertions: [
                            { type: "urlIncludes", text: "/done", timeoutMs: 5_000 },
                            { type: "text", text: "Done" },
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
            browserTimeoutMs: 10_000,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.url === targetUrl
        && browser?.finalUrl === doneUrl
        && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("Continue"))
        && browser?.steps.some(step => step.name === "assert:urlIncludes" && step.status === "passed" && String(step.detail || "").includes("/done"))
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Done"))
        && browser?.pageTextPreview?.includes("Done")
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
    };
}
async function runTestAgentBrowserUrlTitleAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-url-title-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const settingsUrl = `http://127.0.0.1:${port}/settings?tab=profile#details`;
    const loginUrl = `http://127.0.0.1:${port}/login`;
    const delayedUrl = `http://127.0.0.1:${port}/delayed`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const settings = '<!doctype html><html><head><title>Settings Profile | CCM</title></head><body><main><h1>Settings Profile</h1><p role=\"status\">Profile ready</p></main></body></html>';",
        "const login = '<!doctype html><html><head><title>Login | CCM</title></head><body><main><h1>Login</h1><p role=\"status\">Login required</p></main></body></html>';",
        "const delayed = `<!doctype html><html><head><title>Loading Title | CCM</title></head><body><main><h1>Delayed Title</h1><p role=\"status\">Waiting for title</p></main><script>setTimeout(() => { document.title = 'Done Title | CCM'; document.querySelector('[role=status]').textContent = 'Title done'; }, 250);</script></body></html>`;",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/login' ? login : route === '/delayed' ? delayed : settings);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-url-title-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl: settingsUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-url-title-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can assert exact and negative browser URL/title state.",
        acceptanceCriteria: ["Settings route has the exact profile URL and title, and delayed title updates are detected."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Exact URL and title match",
                        url: settingsUrl,
                        actions: [
                            { type: "goto", url: settingsUrl },
                        ],
                        assertions: [
                            { assertion: "url_equals", url: "/settings?tab=profile#details" },
                            { assertion: "url_not_contains", value: "/login" },
                            { assertion: "title_equals", title: "Settings Profile | CCM" },
                            { assertion: "title_not_contains", text: "Login" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }, {
                        name: "Delayed title assertion waits",
                        url: delayedUrl,
                        actions: [
                            { type: "goto", url: delayedUrl },
                        ],
                        assertions: [
                            { type: "urlEquals", url: "/delayed" },
                            { type: "titleEquals", title: "Done Title | CCM", timeoutMs: 3000 },
                            { type: "titleNotIncludes", text: "Loading", timeoutMs: 3000 },
                            { type: "text", text: "Title done" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-url-title-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when exact or negative browser URL/title assertions are wrong.",
        acceptanceCriteria: ["Login route must not include /login and must have the Settings title."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                targetUrl: loginUrl,
                browserChecks: [{
                        name: "Wrong URL/title expectations fail",
                        url: loginUrl,
                        actions: [
                            { type: "goto", url: loginUrl },
                        ],
                        assertions: [
                            { type: "urlNotIncludes", text: "/login", timeoutMs: 800 },
                            { type: "titleEquals", title: "Settings Profile | CCM", timeoutMs: 800 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: failArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const exactBrowser = passReport.browserResults[0];
    const delayedBrowser = passReport.browserResults[1];
    const failBrowser = failReport.browserResults[0];
    const failUrl = failBrowser?.steps.find(step => step.name === "assert:urlNotIncludes");
    const pass = passReport.status === "passed"
        && exactBrowser?.provider === "playwright"
        && delayedBrowser?.provider === "playwright"
        && exactBrowser?.status === "passed"
        && delayedBrowser?.status === "passed"
        && exactBrowser?.steps.some(step => step.name === "assert:urlEquals" && step.status === "passed" && String(step.detail || "").includes("/settings?tab=profile#details"))
        && exactBrowser?.steps.some(step => step.name === "assert:urlNotIncludes" && step.status === "passed" && String(step.detail || "").includes("/login"))
        && exactBrowser?.steps.some(step => step.name === "assert:titleEquals" && step.status === "passed" && String(step.detail || "").includes("Settings Profile"))
        && exactBrowser?.steps.some(step => step.name === "assert:titleNotIncludes" && step.status === "passed" && String(step.detail || "").includes("Login"))
        && delayedBrowser?.steps.some(step => step.name === "assert:titleEquals" && step.status === "passed" && String(step.detail || "").includes("Done Title"))
        && delayedBrowser?.steps.some(step => step.name === "assert:titleNotIncludes" && step.status === "passed" && String(step.detail || "").includes("Loading"))
        && delayedBrowser?.title === "Done Title | CCM"
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failUrl?.status === "failed"
        && String(failUrl?.error || "").includes("Expected URL not to include")
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
async function runTestAgentBrowserConsoleAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-console-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const mcpArtifactDir = path.join(dir, "mcp-artifacts");
    const port = await getFreePort();
    const passUrl = `http://127.0.0.1:${port}/pass`;
    const failUrl = `http://127.0.0.1:${port}/fail`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const pass = `<!doctype html><html><head><title>Console Pass Fixture</title></head><body><main><h1>Console verification</h1><p role=\"status\">Console page ready</p></main><script>setTimeout(() => { console.info('test-agent: feature-ready dashboard'); console.log('test-agent: audit trail saved'); }, 150);</script></body></html>`;",
        "const fail = `<!doctype html><html><head><title>Console Warning Fixture</title></head><body><main><h1>Console warning verification</h1><p role=\"status\">Warning page ready</p></main><script>setTimeout(() => { console.warn('deprecated console warning from fixture'); }, 50);</script></body></html>`;",
        "http.createServer((req, res) => {",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(String(req.url || '').startsWith('/fail') ? fail : pass);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-console-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl: passUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-console-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can assert browser console messages and warnings.",
        acceptanceCriteria: ["The page emits the feature-ready console signal without warnings or errors."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Console signal is observed",
                        url: passUrl,
                        actions: [
                            { type: "goto", url: passUrl },
                        ],
                        assertions: [
                            { type: "text", text: "Console page ready" },
                            { assertion: "console_message_contains", messageIncludes: "feature-ready dashboard", timeoutMs: 3000 },
                            { assertion: "console_not_contains", value: "deprecated console warning", settleMs: 250 },
                            { assertion: "no_console_warning", settleMs: 250 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-console-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when warning console telemetry is present.",
        acceptanceCriteria: ["The page should not emit deprecated warning telemetry."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                targetUrl: failUrl,
                browserChecks: [{
                        name: "Console warning is reported",
                        url: failUrl,
                        actions: [
                            { type: "goto", url: failUrl },
                        ],
                        assertions: [
                            { type: "consoleIncludes", text: "deprecated console warning", timeoutMs: 3000 },
                            { type: "consoleNoWarnings", settleMs: 300 },
                            { type: "consoleNotIncludes", text: "deprecated console warning", settleMs: 100 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: failArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const mcpCalls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName, input) => {
            mcpCalls.push({ toolName, input });
            if (toolName.endsWith("browser_snapshot"))
                return "MCP Console Ready";
            if (toolName.endsWith("browser_console_messages"))
                return "info: mcp feature-ready signal\nlog: mcp audit trail";
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return { path: "fake-console-screenshot.png" };
            return { ok: true };
        },
    });
    const mcpReport = await (0, agent_1.runTestAgent)({
        id: `browser-console-mcp-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent MCP adapters expose console message assertions.",
        acceptanceCriteria: ["MCP console messages can be asserted without treating info logs as errors."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: "browser-console-mcp-self-test",
                workDir: process.cwd(),
                browserChecks: [{
                        name: "MCP console telemetry",
                        url: "http://example.test/console",
                        actions: [{ type: "goto", url: "http://example.test/console" }],
                        assertions: [
                            { type: "text", text: "MCP Console Ready" },
                            { type: "consoleIncludes", text: "mcp feature-ready signal" },
                            { type: "consoleNotIncludes", text: "mcp warning", settleMs: 10 },
                            { type: "consoleNoWarnings", settleMs: 10 },
                            { type: "consoleNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: mcpArtifactDir,
            browserProvider: "mcp",
        },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const passBrowser = passReport.browserResults[0];
    const failBrowser = failReport.browserResults[0];
    const mcpBrowser = mcpReport.browserResults[0];
    const failNoWarnings = failBrowser?.steps.find(step => step.name === "assert:consoleNoWarnings");
    const failNotIncludes = failBrowser?.steps.find(step => step.name === "assert:consoleNotIncludes");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && passBrowser?.steps.some(step => step.name === "assert:consoleIncludes" && step.status === "passed")
        && passBrowser?.steps.some(step => step.name === "assert:consoleNotIncludes" && step.status === "passed")
        && passBrowser?.steps.some(step => step.name === "assert:consoleNoWarnings" && step.status === "passed")
        && passBrowser?.consoleMessages?.some(line => line.includes("feature-ready dashboard"))
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failBrowser?.steps.some(step => step.name === "assert:consoleIncludes" && step.status === "passed")
        && failNoWarnings?.status === "failed"
        && String(failNoWarnings?.error || "").includes("Unexpected browser console telemetry")
        && failNotIncludes?.status === "failed"
        && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified")
        && mcpReport.status === "passed"
        && mcpBrowser?.provider === "mcp"
        && mcpBrowser?.status === "passed"
        && mcpBrowser?.steps.some(step => step.name === "playwright:consoleIncludes" && step.status === "passed")
        && mcpBrowser?.steps.some(step => step.name === "playwright:consoleNoWarnings" && step.status === "passed")
        && mcpBrowser?.steps.some(step => step.name === "playwright:consoleNoErrors" && step.status === "passed")
        && mcpBrowser?.consoleMessages?.some(line => line.includes("mcp feature-ready signal"))
        && mcpCalls.some(call => call.toolName.endsWith("browser_console_messages"));
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        passReport,
        failReport,
        mcpReport,
        mcpCalls,
    };
}
async function runTestAgentBrowserNetworkStateActionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-network-state-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const mcpArtifactDir = path.join(dir, "mcp-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/network-state`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Network State Fixture</title><link rel=\"icon\" href=\"data:,\"></head>",
        "<body><main>",
        "<h1>Network state verification</h1>",
        "<p id=\"status\" role=\"status\">Checking network</p>",
        "<button type=\"button\" id=\"refresh\">Refresh network status</button>",
        "<script>",
        "const status = document.getElementById('status');",
        "function render() { status.textContent = navigator.onLine ? 'Browser online' : 'Browser offline'; }",
        "window.addEventListener('online', render);",
        "window.addEventListener('offline', render);",
        "document.getElementById('refresh').addEventListener('click', render);",
        "render();",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-network-state-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-network-state-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can emulate browser offline and online network state.",
        acceptanceCriteria: ["The app detects offline state and can return to online state."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Browser can enter offline state",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { action: "go_offline" },
                            { type: "click", role: "button", name: "Refresh network status", exact: true },
                        ],
                        assertions: [
                            { assertion: "browser_offline" },
                            { type: "text", text: "Browser offline" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }, {
                        name: "Browser can return online",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "setOffline" },
                            { type: "click", role: "button", name: "Refresh network status", exact: true },
                            { action: "set_online" },
                            { type: "click", role: "button", name: "Refresh network status", exact: true },
                        ],
                        assertions: [
                            { assertion: "online_state", value: "online" },
                            { type: "text", text: "Browser online" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-network-state-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when expected online state is wrong.",
        acceptanceCriteria: ["Offline browser state must not be accepted as online."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Wrong online expectation fails",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "setOffline" },
                            { type: "click", role: "button", name: "Refresh network status", exact: true },
                        ],
                        assertions: [
                            { type: "browserOnline", timeoutMs: 800 },
                            { type: "text", text: "Browser online", timeoutMs: 800 },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: failArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const calls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName, input) => {
            calls.push({ toolName, input });
            if (toolName.endsWith("browser_snapshot"))
                return "Network State Ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            return { ok: true };
        },
    });
    const mcpReport = await (0, agent_1.runTestAgent)({
        id: `browser-network-state-mcp-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent reports MCP offline emulation as unsupported.",
        acceptanceCriteria: ["MCP provider should not fake offline browser context support."],
        requiredChecks: ["browser_e2e"],
        projects: [{
                name: "browser-network-state-mcp-self-test",
                workDir: process.cwd(),
                browserChecks: [{
                        name: "MCP offline action is explicit unsupported",
                        url: "http://example.test/network-state",
                        actions: [
                            { type: "goto", url: "http://example.test/network-state" },
                            { type: "setOffline" },
                        ],
                        assertions: [
                            { type: "browserOffline" },
                        ],
                        screenshot: false,
                    }],
            }],
        options: {
            artifactDir: mcpArtifactDir,
            browserProvider: "mcp",
        },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const offlineBrowser = passReport.browserResults[0];
    const onlineBrowser = passReport.browserResults[1];
    const failBrowser = failReport.browserResults[0];
    const mcpBrowser = mcpReport.browserResults[0];
    const offlineAction = offlineBrowser?.steps.find(step => step.name === "action:setOffline");
    const onlineAction = onlineBrowser?.steps.find(step => step.name === "action:setOnline");
    const offlineAssertion = offlineBrowser?.steps.find(step => step.name === "assert:browserOffline");
    const onlineAssertion = onlineBrowser?.steps.find(step => step.name === "assert:onlineState");
    const failAssertion = failBrowser?.steps.find(step => step.name === "assert:browserOnline");
    const mcpOfflineAction = mcpBrowser?.steps.find(step => step.name === "playwright:setOffline");
    const pass = passReport.status === "passed"
        && offlineBrowser?.provider === "playwright"
        && onlineBrowser?.provider === "playwright"
        && offlineBrowser?.status === "passed"
        && onlineBrowser?.status === "passed"
        && offlineAction?.status === "passed"
        && String(offlineAction?.detail || "").includes("offline")
        && offlineAssertion?.status === "passed"
        && String(offlineAssertion?.detail || "").includes("offline")
        && offlineBrowser?.pageTextPreview?.includes("Browser offline")
        && onlineAction?.status === "passed"
        && String(onlineAction?.detail || "").includes("online")
        && onlineAssertion?.status === "passed"
        && String(onlineAssertion?.detail || "").includes("online")
        && onlineBrowser?.pageTextPreview?.includes("Browser online")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failAssertion?.status === "failed"
        && String(failAssertion?.error || "").includes("Expected browser to be online")
        && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified")
        && mcpReport.status === "failed"
        && mcpBrowser?.provider === "mcp"
        && mcpBrowser?.status === "failed"
        && mcpOfflineAction?.status === "failed"
        && String(mcpOfflineAction?.error || "").includes("offline/online emulation")
        && calls.some(call => call.toolName.endsWith("browser_navigate"));
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        passReport,
        failReport,
        mcpReport,
    };
}
async function runTestAgentBrowserAccessibilityAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-accessibility-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const mcpArtifactDir = path.join(dir, "mcp-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/accessibility`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Accessibility Fixture</title><link rel=\"icon\" href=\"data:,\"></head>",
        "<body><main>",
        "<h1>Profile accessibility</h1>",
        "<p id=\"save-help\">Saves profile changes and announces completion.</p>",
        "<button id=\"save\" type=\"button\" aria-label=\"Save profile changes\" aria-describedby=\"save-help\">Save</button>",
        "<label for=\"email\">Email address</label>",
        "<input id=\"email\" aria-describedby=\"email-help\" />",
        "<p id=\"email-help\">We will send updates to this address.</p>",
        "<p id=\"status\" role=\"status\">Ready</p>",
        "<script>",
        "document.getElementById('save').addEventListener('click', () => {",
        "  document.getElementById('status').textContent = 'Saved for accessibility';",
        "});",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-accessibility-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-accessibility-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove accessible names, descriptions, and ARIA snapshots.",
        acceptanceCriteria: ["Profile save controls expose accessible names and descriptions."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Profile form accessibility is exposed",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Save profile changes", exact: true },
                        ],
                        assertions: [
                            { assertion: "accessible_name_equals", role: "button", name: "Save profile changes", value: "Save profile changes", exact: true },
                            { assertion: "accessible_description_includes", role: "button", name: "Save profile changes", value: "announces completion", exact: true },
                            { assertion: "accessible_name_includes", selector: "#email", value: "Email address" },
                            { assertion: "accessible_description_equals", selector: "#email", description: "We will send updates to this address." },
                            { assertion: "aria_snapshot_includes", role: "button", name: "Save profile changes", text: "Save profile changes", exact: true },
                            { type: "text", text: "Saved for accessibility" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-accessibility-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when accessible name expectations are wrong.",
        acceptanceCriteria: ["The save button should be named Delete profile."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Wrong accessible name is reported",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                        ],
                        assertions: [
                            { type: "accessibleNameEquals", role: "button", name: "Save profile changes", value: "Delete profile", timeoutMs: 800, exact: true },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: failArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const calls = [];
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName, input) => {
            calls.push({ toolName, input });
            if (toolName.endsWith("browser_snapshot"))
                return "- button \"Save profile changes\"\n- textbox \"Email address\"";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            return { ok: true };
        },
    });
    const mcpReport = await (0, agent_1.runTestAgent)({
        id: `browser-accessibility-mcp-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent MCP accessibility behavior is explicit.",
        acceptanceCriteria: ["MCP can best-effort assert ARIA snapshots but not precise accessible names."],
        requiredChecks: ["browser_e2e"],
        projects: [{
                name: "browser-accessibility-mcp-self-test",
                workDir: process.cwd(),
                browserChecks: [{
                        name: "MCP accessibility support boundary",
                        url: "http://example.test/accessibility",
                        actions: [{ type: "goto", url: "http://example.test/accessibility" }],
                        assertions: [
                            { type: "ariaSnapshotIncludes", text: "Save profile changes" },
                            { type: "accessibleNameEquals", role: "button", name: "Save profile changes", value: "Save profile changes" },
                        ],
                        screenshot: false,
                    }],
            }],
        options: {
            artifactDir: mcpArtifactDir,
            browserProvider: "mcp",
        },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const passBrowser = passReport.browserResults[0];
    const failBrowser = failReport.browserResults[0];
    const mcpBrowser = mcpReport.browserResults[0];
    const nameStep = passBrowser?.steps.find(step => step.name === "assert:accessibleNameEquals");
    const nameIncludesStep = passBrowser?.steps.find(step => step.name === "assert:accessibleNameIncludes");
    const descriptionEqualsStep = passBrowser?.steps.find(step => step.name === "assert:accessibleDescriptionEquals");
    const descriptionIncludesStep = passBrowser?.steps.find(step => step.name === "assert:accessibleDescriptionIncludes");
    const snapshotStep = passBrowser?.steps.find(step => step.name === "assert:ariaSnapshotIncludes");
    const failNameStep = failBrowser?.steps.find(step => step.name === "assert:accessibleNameEquals");
    const mcpSnapshotStep = mcpBrowser?.steps.find(step => step.name === "playwright:ariaSnapshotIncludes");
    const mcpNameStep = mcpBrowser?.steps.find(step => step.name === "playwright:accessibleNameEquals");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && nameStep?.status === "passed"
        && String(nameStep?.detail || "").includes("accessible name")
        && nameIncludesStep?.status === "passed"
        && descriptionEqualsStep?.status === "passed"
        && String(descriptionEqualsStep?.detail || "").includes("accessible description")
        && descriptionIncludesStep?.status === "passed"
        && snapshotStep?.status === "passed"
        && String(snapshotStep?.detail || "").includes("aria snapshot")
        && passBrowser?.pageTextPreview?.includes("Saved for accessibility")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failNameStep?.status === "failed"
        && String(failNameStep?.error || "").includes("actual length")
        && !String(failNameStep?.error || "").includes("Delete profile")
        && failReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "not_verified")
        && mcpReport.status === "failed"
        && mcpBrowser?.provider === "mcp"
        && mcpBrowser?.status === "failed"
        && mcpSnapshotStep?.status === "passed"
        && mcpNameStep?.status === "failed"
        && String(mcpNameStep?.error || "").includes("cannot compute precise accessible name")
        && calls.some(call => call.toolName.endsWith("browser_snapshot"));
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        passReport,
        failReport,
        mcpReport,
    };
}
async function runTestAgentBrowserNetworkAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-network-assertion-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/tasks`;
    const apiUrl = `http://127.0.0.1:${port}/api/tasks`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Network Fixture</title></head>",
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
        "  document.getElementById('status').textContent = data.ok ? 'Saved via API' : 'Save failed';",
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
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(html);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, agent_1.runTestAgent)({
        id: `browser-network-assertion-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can assert browser network API evidence.",
        acceptanceCriteria: ["Saving a task calls the API and shows Saved via API."],
        requiredChecks: ["browser_e2e", "browser_network_logs", "screenshots", "console_errors"],
        projects: [{
                name: "browser-network-assertion-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                browserChecks: [{
                        name: "Save task API call is observed",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Save task", exact: true },
                        ],
                        assertions: [
                            { type: "text", text: "Saved via API" },
                            { type: "networkRequestIncludes", text: `POST ${apiUrl}` },
                            { type: "networkResponseIncludes", text: `201 fetch ${apiUrl}` },
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
        && browser?.pageTextPreview?.includes("Saved via API")
        && browser?.steps.some(step => step.name === "assert:networkRequestIncludes" && step.status === "passed" && String(step.detail || "").includes(`POST ${apiUrl}`))
        && browser?.steps.some(step => step.name === "assert:networkResponseIncludes" && step.status === "passed" && String(step.detail || "").includes(`201 fetch ${apiUrl}`))
        && browser?.networkRequests?.some(item => item.includes(`request POST ${apiUrl}`))
        && browser?.networkRequests?.some(item => item.includes(`response 201 fetch ${apiUrl}`))
        && networkLog.includes(`request POST ${apiUrl}`)
        && networkLog.includes(`response 201 fetch ${apiUrl}`)
        && interaction?.assertionTypes?.networkRequestIncludes === 1
        && interaction?.assertionTypes?.networkResponseIncludes === 1
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
async function runTestAgentStructuredBrowserNetworkAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-structured-network-assertion-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/tasks`;
    const apiUrl = `http://127.0.0.1:${port}/api/tasks`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Structured Network Fixture</title></head>",
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
        "  document.getElementById('status').textContent = data.ok ? 'Saved with structured network evidence' : 'Save failed';",
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
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(html);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, agent_1.runTestAgent)({
        id: `structured-browser-network-assertion-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can assert structured browser network API evidence.",
        acceptanceCriteria: ["Saving a task sends a POST request to /api/tasks and receives a 201 API response."],
        requiredChecks: ["browser_e2e", "browser_network_logs", "screenshots", "console_errors"],
        projects: [{
                name: "structured-browser-network-assertion-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                browserChecks: [{
                        name: "Structured API call evidence is observed",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Save task", exact: true },
                        ],
                        assertions: [
                            { type: "text", text: "Saved with structured network evidence" },
                            { type: "networkRequest", method: "post", url_includes: "/api/tasks" },
                            { type: "networkResponse", status_code: 201, resource_type: "fetch", url_includes: "/api/tasks" },
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
    const requestStep = browser?.steps.find(step => step.name === "assert:networkRequest");
    const responseStep = browser?.steps.find(step => step.name === "assert:networkResponse");
    const pass = report.status === "passed"
        && report.browserResults.length === 1
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl === targetUrl
        && browser?.pageTextPreview?.includes("Saved with structured network evidence")
        && requestStep?.status === "passed"
        && String(requestStep?.detail || "").includes("method=POST")
        && String(requestStep?.detail || "").includes("urlIncludes=/api/tasks")
        && responseStep?.status === "passed"
        && String(responseStep?.detail || "").includes("status=201")
        && String(responseStep?.detail || "").includes("resourceType=fetch")
        && browser?.networkRequests?.some(item => item.includes(`request POST ${apiUrl}`))
        && browser?.networkRequests?.some(item => item.includes(`response 201 fetch ${apiUrl}`))
        && networkLog.includes(`request POST ${apiUrl}`)
        && networkLog.includes(`response 201 fetch ${apiUrl}`)
        && interaction?.assertionTypes?.networkRequest === 1
        && interaction?.assertionTypes?.networkResponse === 1
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
    const port = await getFreePort();
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
    const report = await (0, agent_1.runTestAgent)({
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
    const port = await getFreePort();
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
    const report = await (0, agent_1.runTestAgent)({
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
    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}/`;
    const tasksUrl = `http://127.0.0.1:${port}/tasks`;
    const acceptanceCriteria = ['At /tasks, enter "Buy milk" into "Task", click "Add task", then shows "Buy milk".'];
    writeTaskBoardFixtureServer(dir);
    const report = await (0, agent_1.runTestAgent)({
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
function runTestAgentSemanticLocatorSelfTest() {
    const { workOrder, issues } = (0, work_order_1.normalizeTestAgentWorkOrder)({
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
    const { workOrder, issues } = (0, work_order_1.normalizeTestAgentWorkOrder)({
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
    const port = await getFreePort();
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
    const report = await (0, agent_1.runTestAgent)({
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
    const port = await getFreePort();
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
    const passReport = await (0, agent_1.runTestAgent)({
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
    const failReport = await (0, agent_1.runTestAgent)({
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
async function runTestAgentBrowserEnabledStateSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-enabled-state-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/signup`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Enabled State Fixture</title></head>",
        "<body><main>",
        "<h1>Signup</h1>",
        "<label for=\"email\">Email</label>",
        "<input id=\"email\" name=\"email\" />",
        "<button type=\"button\" id=\"submit\" disabled>Create account</button>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "<script>",
        "const email = document.getElementById('email');",
        "const submit = document.getElementById('submit');",
        "email.addEventListener('input', () => { submit.disabled = !email.value.includes('@'); });",
        "submit.addEventListener('click', () => { document.getElementById('status').textContent = 'Ready to create account'; });",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-enabled-state-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-enabled-state-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove a button starts disabled and becomes enabled after valid input.",
        acceptanceCriteria: ["Create account is disabled until an email is entered, then enabled."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Submit button enabled state follows input",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                        ],
                        assertions: [
                            { assertion: "is_disabled", role: "button", name: "Create account", exact: true },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }, {
                        name: "Submit button becomes enabled",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "fill", label: "Email", value: "ada@example.test", exact: true },
                        ],
                        assertions: [
                            { assertion: "clickable", role: "button", name: "Create account", exact: true },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-enabled-state-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when a disabled button is incorrectly expected to be enabled.",
        acceptanceCriteria: ["Create account is enabled immediately."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Submit button should not be immediately enabled",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                        ],
                        assertions: [
                            { type: "enabled", role: "button", name: "Create account", exact: true },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: failArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const passDisabledBrowser = passReport.browserResults[0];
    const passEnabledBrowser = passReport.browserResults[1];
    const failBrowser = failReport.browserResults[0];
    const failEnabled = failBrowser?.steps.find(step => step.name === "assert:enabled");
    const pass = passReport.status === "passed"
        && passReport.browserResults.length === 2
        && passDisabledBrowser?.provider === "playwright"
        && passEnabledBrowser?.provider === "playwright"
        && passDisabledBrowser?.status === "passed"
        && passEnabledBrowser?.status === "passed"
        && passDisabledBrowser?.steps.some(step => step.name === "assert:disabled" && step.status === "passed" && String(step.detail || "").includes("Create account"))
        && passEnabledBrowser?.steps.some(step => step.name === "assert:enabled" && step.status === "passed" && String(step.detail || "").includes("Create account"))
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failEnabled?.status === "failed"
        && String(failEnabled?.error || "").includes("Expected target to be enabled")
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
async function runTestAgentBrowserFocusStateSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-focus-state-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/profile`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Focus Fixture</title></head>",
        "<body><main>",
        "<h1>Profile</h1>",
        "<label for=\"email\">Email</label>",
        "<input id=\"email\" name=\"email\" />",
        "<button type=\"button\" id=\"save\">Save</button>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "<script>",
        "document.getElementById('save').addEventListener('click', () => { document.getElementById('status').textContent = 'Saved'; });",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-focus-state-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-focus-state-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove browser focus state before and after input.",
        acceptanceCriteria: ["Email is not focused on load and becomes focused after editing."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Email starts unfocused",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                        ],
                        assertions: [
                            { assertion: "not_focused", label: "Email", exact: true },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }, {
                        name: "Email becomes focused after fill",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "fill", label: "Email", value: "ada@example.test", exact: true },
                        ],
                        assertions: [
                            { assertion: "has_focus", label: "Email", exact: true },
                            { type: "inputValueEquals", label: "Email", value: "ada@example.test", exact: true },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-focus-state-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when focus is on the input but expected on another control.",
        acceptanceCriteria: ["Save is focused after editing Email."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Save button is not focused after fill",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "fill", label: "Email", value: "ada@example.test", exact: true },
                        ],
                        assertions: [
                            { type: "focused", role: "button", name: "Save", exact: true, timeoutMs: 800 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: failArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const unfocusedBrowser = passReport.browserResults[0];
    const focusedBrowser = passReport.browserResults[1];
    const failBrowser = failReport.browserResults[0];
    const failFocus = failBrowser?.steps.find(step => step.name === "assert:focused");
    const pass = passReport.status === "passed"
        && passReport.browserResults.length === 2
        && unfocusedBrowser?.provider === "playwright"
        && focusedBrowser?.provider === "playwright"
        && unfocusedBrowser?.status === "passed"
        && focusedBrowser?.status === "passed"
        && unfocusedBrowser?.steps.some(step => step.name === "assert:notFocused" && step.status === "passed" && String(step.detail || "").includes("label=Email"))
        && focusedBrowser?.steps.some(step => step.name === "assert:focused" && step.status === "passed" && String(step.detail || "").includes("label=Email"))
        && focusedBrowser?.steps.some(step => step.name === "assert:inputValueEquals" && step.status === "passed" && String(step.detail || "").includes("label=Email"))
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failFocus?.status === "failed"
        && String(failFocus?.error || "").includes("Expected target to be focused")
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
async function runTestAgentBrowserElementCountSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-element-count-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/tasks`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Element Count Fixture</title></head>",
        "<body><main>",
        "<h1>Tasks</h1>",
        "<label for=\"task\">Task</label>",
        "<input id=\"task\" name=\"task\" />",
        "<button type=\"button\" id=\"add\">Add task</button>",
        "<ul aria-label=\"Task list\" id=\"tasks\"></ul>",
        "<script>",
        "document.getElementById('add').addEventListener('click', () => {",
        "  const input = document.getElementById('task');",
        "  if (!input.value) return;",
        "  const item = document.createElement('li');",
        "  item.textContent = input.value;",
        "  document.getElementById('tasks').appendChild(item);",
        "  input.value = '';",
        "});",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-element-count-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-element-count-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove list item counts before and after adding tasks.",
        acceptanceCriteria: ["The task list starts empty and has two items after adding two tasks."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Task list starts empty",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                        ],
                        assertions: [
                            { assertion: "element_count", role: "listitem", count: 0 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }, {
                        name: "Task list has two items",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "fill", label: "Task", value: "First task", exact: true },
                            { type: "click", role: "button", name: "Add task", exact: true },
                            { type: "fill", label: "Task", value: "Second task", exact: true },
                            { type: "click", role: "button", name: "Add task", exact: true },
                        ],
                        assertions: [
                            { type: "text", text: "Second task" },
                            { type: "elementCountEquals", role: "listitem", expectedCount: 2 },
                            { assertion: "count_at_least", role: "listitem", minCount: 2 },
                            { assertion: "count_at_most", role: "listitem", maxCount: 2 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-element-count-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when a list has fewer items than expected.",
        acceptanceCriteria: ["The task list has two items after adding one task."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Task list should not have two items after one add",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "fill", label: "Task", value: "Only task", exact: true },
                            { type: "click", role: "button", name: "Add task", exact: true },
                        ],
                        assertions: [
                            { type: "text", text: "Only task" },
                            { type: "elementCountEquals", role: "listitem", count: 2 },
                            { type: "elementCountAtMost", role: "listitem", maxCount: 0 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: failArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const emptyBrowser = passReport.browserResults[0];
    const twoItemBrowser = passReport.browserResults[1];
    const failBrowser = failReport.browserResults[0];
    const failCount = failBrowser?.steps.find(step => step.name === "assert:elementCountEquals");
    const failAtMost = failBrowser?.steps.find(step => step.name === "assert:elementCountAtMost");
    const pass = passReport.status === "passed"
        && passReport.browserResults.length === 2
        && emptyBrowser?.provider === "playwright"
        && twoItemBrowser?.provider === "playwright"
        && emptyBrowser?.status === "passed"
        && twoItemBrowser?.status === "passed"
        && emptyBrowser?.steps.some(step => step.name === "assert:elementCountEquals" && step.status === "passed" && String(step.detail || "").includes("expected count=0"))
        && twoItemBrowser?.steps.some(step => step.name === "assert:elementCountEquals" && step.status === "passed" && String(step.detail || "").includes("expected count=2"))
        && twoItemBrowser?.steps.some(step => step.name === "assert:elementCountAtLeast" && step.status === "passed" && String(step.detail || "").includes("min count=2"))
        && twoItemBrowser?.steps.some(step => step.name === "assert:elementCountAtMost" && step.status === "passed" && String(step.detail || "").includes("max count=2"))
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failCount?.status === "failed"
        && String(failCount?.error || "").includes("actual count=1")
        && failAtMost?.status === "failed"
        && String(failAtMost?.error || "").includes("actual count=1")
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
async function runTestAgentBrowserDialogAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-dialog-assertion-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/dialogs`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Dialog Fixture</title></head>",
        "<body><main>",
        "<h1>Dialog verification</h1>",
        "<button type=\"button\" id=\"alertButton\">Show alert</button>",
        "<button type=\"button\" id=\"confirmButton\">Show confirm</button>",
        "<button type=\"button\" id=\"promptButton\">Show prompt</button>",
        "<p id=\"status\" role=\"status\">Ready</p>",
        "<script>",
        "document.getElementById('alertButton').addEventListener('click', () => { alert('Saved profile dialog'); document.getElementById('status').textContent = 'Alert handled'; });",
        "document.getElementById('confirmButton').addEventListener('click', () => { const ok = confirm('Confirm shipping dialog'); document.getElementById('status').textContent = ok ? 'Confirm accepted' : 'Confirm dismissed'; });",
        "document.getElementById('promptButton').addEventListener('click', () => { const value = prompt('Name prompt dialog', 'Ada'); document.getElementById('status').textContent = 'Prompt handled ' + String(value || ''); });",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-dialog-assertion-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-dialog-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove native browser dialogs appear during a real browser flow.",
        acceptanceCriteria: ["Clicking dialog buttons shows alert, confirm, and prompt messages."],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Dialog messages are observable",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Show alert", exact: true },
                            { type: "click", role: "button", name: "Show confirm", exact: true },
                            { type: "click", role: "button", name: "Show prompt", exact: true },
                        ],
                        assertions: [
                            { assertion: "alert_message_includes", value: "Saved profile", dialog_type: "alert" },
                            { assertion: "dialog_type_equals", value: "confirm" },
                            { type: "dialogMessageIncludes", text: "Name prompt", dialogType: "prompt" },
                            { type: "dialogAppeared", dialogType: "prompt" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-dialog-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when a browser dialog message does not match.",
        acceptanceCriteria: ["Clicking alert shows an unrelated message."],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Dialog message mismatch is reported",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Show alert", exact: true },
                        ],
                        assertions: [
                            { type: "dialogMessageIncludes", text: "Unrelated message", dialogType: "alert", timeoutMs: 800 },
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
    const browser = passReport.browserResults[0];
    const failBrowser = failReport.browserResults[0];
    const failDialog = failBrowser?.steps.find(step => step.name === "assert:dialogMessageIncludes");
    const dialogLog = browser?.dialogLogPath && fs.existsSync(browser.dialogLogPath) ? fs.readFileSync(browser.dialogLogPath, "utf-8") : "";
    const pass = passReport.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.steps.some(step => step.name === "assert:dialogMessageIncludes" && step.status === "passed" && String(step.detail || "").includes("dialogType=alert"))
        && browser?.steps.some(step => step.name === "assert:dialogTypeEquals" && step.status === "passed" && String(step.detail || "").includes("dialogType=confirm"))
        && browser?.steps.some(step => step.name === "assert:dialogAppeared" && step.status === "passed" && String(step.detail || "").includes("dialogType=prompt"))
        && (browser?.dialogMessages || []).some(item => item.includes("dialog alert") && item.includes("accepted=yes"))
        && (browser?.dialogMessages || []).some(item => item.includes("dialog confirm") && item.includes("accepted=yes"))
        && (browser?.dialogMessages || []).some(item => item.includes("dialog prompt") && item.includes("accepted=yes"))
        && !!browser?.dialogLogPath
        && dialogLog.includes("Saved profile dialog")
        && dialogLog.includes("Confirm shipping dialog")
        && dialogLog.includes("Name prompt dialog")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failDialog?.status === "failed"
        && String(failDialog?.error || "").includes("Observed dialogs")
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
        dialogLog,
    };
}
async function runTestAgentBrowserPopupAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-popup-assertion-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/app`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const app = `<!doctype html>",
        "<html><head><title>Popup App Fixture</title></head>",
        "<body><main>",
        "<h1>Popup App</h1>",
        "<a id=\"help\" href=\"/help\" target=\"_blank\" rel=\"noopener\">Open help center</a>",
        "<p role=\"status\">Ready to open help</p>",
        "</main></body></html>`;",
        "const help = `<!doctype html>",
        "<html><head><title>Help Center Popup</title></head>",
        "<body><main>",
        "<h1>Help Center Popup</h1>",
        "<p>Support article for CCM TestAgent popup verification.</p>",
        "</main></body></html>`;",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/help' ? help : app);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-popup-assertion-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-popup-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove a real browser interaction opens a help popup page.",
        acceptanceCriteria: ["Clicking Open help center opens a popup at /help with the Help Center Popup content."],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Help center popup opens",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "link", name: "Open help center", exact: true },
                        ],
                        assertions: [
                            { assertion: "popup_opened" },
                            { assertion: "popup_url_includes", url: "/help" },
                            { assertion: "popup_title_includes", title: "Help Center" },
                            { assertion: "popup_text_includes", text: "Support article for CCM TestAgent" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-popup-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when a popup does not contain expected text.",
        acceptanceCriteria: ["Clicking Open help center opens a popup containing Billing Console."],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Wrong popup text is reported",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "link", name: "Open help center", exact: true },
                        ],
                        assertions: [
                            { type: "popupTextIncludes", text: "Billing Console", timeoutMs: 800 },
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
    const popupLog = passBrowser?.popupLogPath && fs.existsSync(passBrowser.popupLogPath) ? fs.readFileSync(passBrowser.popupLogPath, "utf-8") : "";
    const manifestPath = String(passReport.metadata.artifactFiles?.manifestPath || "");
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
    const failPopup = failBrowser?.steps.find(step => step.name === "assert:popupTextIncludes");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && passBrowser?.steps.some(step => step.name === "assert:popupOpened" && step.status === "passed")
        && passBrowser?.steps.some(step => step.name === "assert:popupUrlIncludes" && step.status === "passed" && String(step.detail || "").includes("expected URL substring length=5"))
        && passBrowser?.steps.some(step => step.name === "assert:popupTitleIncludes" && step.status === "passed" && String(step.detail || "").includes("expected title substring length=11"))
        && passBrowser?.steps.some(step => step.name === "assert:popupTextIncludes" && step.status === "passed" && String(step.detail || "").includes("expected text substring length=33"))
        && (passBrowser?.popupMessages || []).some(item => item.includes("/help") && item.includes("Help Center Popup"))
        && !!passBrowser?.popupLogPath
        && popupLog.includes("/help")
        && popupLog.includes("Support article for CCM TestAgent popup verification")
        && manifest?.files?.some((item) => item.type === "browser_popup_log" && item.path === passBrowser.popupLogPath)
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failPopup?.status === "failed"
        && String(failPopup?.error || "").includes("Observed popups: 1")
        && !String(failPopup?.error || "").includes("Support article")
        && !String(failPopup?.error || "").includes("Billing Console")
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
        popupLog,
        manifest,
    };
}
async function runTestAgentBrowserTableAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-table-assertion-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/orders`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Orders Table Fixture</title></head>",
        "<body><main>",
        "<h1>Orders</h1>",
        "<button type=\"button\" id=\"markPaid\">Mark Grace paid</button>",
        "<table id=\"orders\" aria-label=\"Orders table\">",
        "<thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>",
        "<tbody>",
        "<tr><td>A-100</td><td>Ada Lovelace</td><td>Shipped</td><td>$42.00</td></tr>",
        "<tr><td>B-200</td><td>Grace Hopper</td><td id=\"graceStatus\">Draft</td><td>$18.50</td></tr>",
        "</tbody>",
        "</table>",
        "<p role=\"status\" id=\"status\">Ready</p>",
        "<script>",
        "document.getElementById('markPaid').addEventListener('click', () => {",
        "  document.getElementById('graceStatus').textContent = 'Paid';",
        "  document.getElementById('status').textContent = 'Grace order paid';",
        "});",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-table-assertion-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-table-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove table row and cell content after a real browser interaction.",
        acceptanceCriteria: ["Orders table shows Ada shipped and Grace paid after clicking the payment action."],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Order table data is observable",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Mark Grace paid", exact: true },
                        ],
                        assertions: [
                            { assertion: "table_row_includes", table_selector: "#orders", row_text: "A-100", values: ["Ada Lovelace", "Shipped"] },
                            { assertion: "table_cell_text_equals", table: "#orders", row: "B-200", header: "Status", value: "Paid" },
                            { assertion: "table_cell_includes", table: "#orders", row: "B-200", header: "Total", value: "18.50" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-table-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when a table cell has the wrong value.",
        acceptanceCriteria: ["Grace order status is shipped before payment."],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Order table mismatch is reported",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                        ],
                        assertions: [
                            { type: "tableCellTextEquals", tableSelector: "#orders", rowText: "B-200", columnName: "Status", value: "Shipped", timeoutMs: 800 },
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
    const browser = passReport.browserResults[0];
    const failBrowser = failReport.browserResults[0];
    const failCell = failBrowser?.steps.find(step => step.name === "assert:tableCellTextEquals");
    const pass = passReport.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.steps.some(step => step.name === "assert:tableRowIncludes" && step.status === "passed" && String(step.detail || "").includes("expected text count=2"))
        && browser?.steps.some(step => step.name === "assert:tableCellTextEquals" && step.status === "passed" && String(step.detail || "").includes("column=Status"))
        && browser?.steps.some(step => step.name === "assert:tableCellTextIncludes" && step.status === "passed" && String(step.detail || "").includes("column=Total"))
        && browser?.pageTextPreview?.includes("Grace order paid")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failCell?.status === "failed"
        && String(failCell?.error || "").includes("Cell text did not equal")
        && !String(failCell?.error || "").includes("Draft")
        && !String(failCell?.error || "").includes("Shipped")
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
async function runTestAgentBrowserDragToActionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-drag-to-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/board`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Drag Board Fixture</title>",
        "<style>",
        ".board { display: flex; gap: 24px; font-family: sans-serif; }",
        ".column { width: 260px; min-height: 180px; border: 1px solid #888; padding: 12px; }",
        ".card { padding: 10px; margin: 8px 0; border: 1px solid #333; background: #fff; cursor: grab; }",
        "</style></head>",
        "<body><main>",
        "<h1>Drag board</h1>",
        "<div class=\"board\">",
        "<section class=\"column\" data-testid=\"todo-column\" aria-label=\"Todo column\"><h2>Todo</h2>",
        "<article class=\"card\" draggable=\"true\" data-testid=\"task-card\" data-task-id=\"ship-testagent\">Ship TestAgent drag support</article>",
        "</section>",
        "<section class=\"column\" data-testid=\"done-column\" aria-label=\"Done column\"><h2>Done</h2>",
        "<div data-testid=\"done-list\" aria-label=\"Done tasks\"></div>",
        "</section>",
        "</div>",
        "<p role=\"status\" id=\"status\">Waiting for drag</p>",
        "<script>",
        "const card = document.querySelector('[data-testid=task-card]');",
        "const doneColumn = document.querySelector('[data-testid=done-column]');",
        "card.addEventListener('dragstart', event => {",
        "  event.dataTransfer.setData('text/plain', card.dataset.taskId);",
        "  event.dataTransfer.effectAllowed = 'move';",
        "});",
        "doneColumn.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; });",
        "doneColumn.addEventListener('drop', event => {",
        "  event.preventDefault();",
        "  if (event.dataTransfer.getData('text/plain') !== 'ship-testagent') return;",
        "  document.querySelector('[data-testid=done-list]').appendChild(card);",
        "  document.getElementById('status').textContent = 'Moved Ship TestAgent drag support to Done';",
        "});",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-drag-to-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-drag-to-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can perform real browser drag and drop on a board.",
        acceptanceCriteria: ["Dragging the TestAgent task to Done moves the card and shows the moved status."],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Task card can be dragged to Done",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { action: "drag_to", text: "Ship TestAgent drag support", destination_test_id: "done-column" },
                        ],
                        assertions: [
                            { type: "text", text: "Moved Ship TestAgent drag support to Done" },
                            { type: "elementTextIncludes", testId: "done-list", text: "Ship TestAgent drag support" },
                            { type: "elementCountEquals", testId: "task-card", count: 1 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-drag-to-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when a drag destination cannot be found.",
        acceptanceCriteria: ["Dragging the TestAgent task to a missing destination is reported as failed."],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Missing drag target fails",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "dragTo", text: "Ship TestAgent drag support", destinationTestId: "missing-column", timeoutMs: 800 },
                        ],
                        assertions: [
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
    const browser = passReport.browserResults[0];
    const failBrowser = failReport.browserResults[0];
    const failDrag = failBrowser?.steps.find(step => step.name === "action:dragTo");
    const pass = passReport.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.steps.some(step => step.name === "action:dragTo" && step.status === "passed" && String(step.detail || "").includes("done-column"))
        && browser?.steps.some(step => step.name === "assert:elementTextIncludes" && step.status === "passed" && String(step.detail || "").includes("testId=done-list"))
        && browser?.pageTextPreview?.includes("Moved Ship TestAgent drag support to Done")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failDrag?.status === "failed"
        && String(failDrag?.detail || "").includes("missing-column")
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
async function runTestAgentBrowserScrollActionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-scroll-action-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/landing`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Scroll Fixture</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
        "<style>",
        "body { margin: 0; font-family: sans-serif; }",
        "header { min-height: 900px; padding: 32px; background: #f3f4f6; }",
        "#cta { display: inline-block; margin: 24px 32px 80px; padding: 14px 20px; background: #111827; color: white; }",
        "</style></head>",
        "<body><main>",
        "<header><h1>Scroll verification</h1><p>CTA starts below the first viewport.</p></header>",
        "<button id=\"cta\" data-testid=\"below-fold-cta\">Continue setup</button>",
        "<p id=\"status\" role=\"status\">Ready after scroll</p>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-scroll-action-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-scroll-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can perform a real browser page scroll before checking below-fold UI.",
        acceptanceCriteria: ["Scrolling down brings the Continue setup CTA into the mobile viewport."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Scroll reveals below-fold CTA",
                        url: targetUrl,
                        viewport_width: 390,
                        viewport_height: 640,
                        is_mobile: true,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { action: "scroll_down", amount: 920 },
                        ],
                        assertions: [
                            { assertion: "element_in_viewport", test_id: "below-fold-cta" },
                            { type: "jsTruthy", expression: "window.scrollY > 500" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-scroll-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when insufficient scroll does not reveal the CTA.",
        acceptanceCriteria: ["A tiny scroll brings the Continue setup CTA into the mobile viewport."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Insufficient scroll keeps CTA below viewport",
                        url: targetUrl,
                        viewport_width: 390,
                        viewport_height: 640,
                        is_mobile: true,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "scroll", direction: "down", amount: 10 },
                        ],
                        assertions: [
                            { type: "inViewport", testId: "below-fold-cta", timeoutMs: 800 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
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
    const scrollStep = passBrowser?.steps.find(step => step.name === "action:scroll");
    const viewportStep = passBrowser?.steps.find(step => step.name === "assert:inViewport");
    const failViewport = failBrowser?.steps.find(step => step.name === "assert:inViewport");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && passBrowser?.viewport?.width === 390
        && passBrowser?.viewport?.height === 640
        && scrollStep?.status === "passed"
        && String(scrollStep?.detail || "").includes("page; down 920px")
        && viewportStep?.status === "passed"
        && String(viewportStep?.detail || "").includes("testId=below-fold-cta")
        && passBrowser?.steps.some(step => step.name === "assert:jsTruthy" && step.status === "passed")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failBrowser?.steps.some(step => step.name === "action:scroll" && step.status === "passed" && String(step.detail || "").includes("page; down 10px"))
        && failViewport?.status === "failed"
        && String(failViewport?.error || "").includes("viewport=390x640")
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
async function runTestAgentBrowserAdvancedMouseActionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-advanced-mouse-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/tasks`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Advanced Mouse Fixture</title>",
        "<style>",
        ".task { display:block; width:260px; padding:12px; margin:24px; border:1px solid #333; }",
        "#menu[hidden] { display:none; }",
        "#menu { margin: 12px 24px; padding: 8px; border: 1px solid #555; width: 240px; }",
        "</style></head>",
        "<body><main>",
        "<h1>Task list</h1>",
        "<article class=\"task\" data-testid=\"task-alpha\" tabindex=\"0\">Project Alpha</article>",
        "<div id=\"menu\" role=\"menu\" hidden><button role=\"menuitem\">Archive Project Alpha</button></div>",
        "<p id=\"edit-state\">Not editing</p>",
        "<p id=\"status\" role=\"status\">Ready</p>",
        "<script>",
        "const task = document.querySelector('[data-testid=task-alpha]');",
        "task.addEventListener('dblclick', () => { document.getElementById('edit-state').textContent = 'Editing Project Alpha'; });",
        "task.addEventListener('contextmenu', event => { event.preventDefault(); document.getElementById('menu').hidden = false; document.getElementById('status').textContent = 'Context menu opened for Project Alpha'; });",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-advanced-mouse-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-advanced-mouse-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can perform real browser double-click and right-click interactions.",
        acceptanceCriteria: ["Double-clicking Project Alpha enters edit mode and right-clicking opens the archive menu."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Advanced mouse actions update task UI",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { action: "double_click", test_id: "task-alpha" },
                            { action: "right_click", testId: "task-alpha" },
                        ],
                        assertions: [
                            { type: "text", text: "Editing Project Alpha" },
                            { type: "text", text: "Context menu opened for Project Alpha" },
                            { type: "visible", role: "menuitem", name: "Archive Project Alpha", exact: true },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-advanced-mouse-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when a right-click menu does not contain the expected destructive action.",
        acceptanceCriteria: ["Right-clicking Project Alpha shows Delete Project Alpha."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Missing context menu item is reported",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "rightClick", testId: "task-alpha" },
                        ],
                        assertions: [
                            { type: "visible", role: "menuitem", name: "Delete Project Alpha", exact: true, timeoutMs: 800 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
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
    const doubleClickStep = passBrowser?.steps.find(step => step.name === "action:doubleClick");
    const rightClickStep = passBrowser?.steps.find(step => step.name === "action:rightClick");
    const failVisible = failBrowser?.steps.find(step => step.name === "assert:visible");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && doubleClickStep?.status === "passed"
        && String(doubleClickStep?.detail || "").includes("testId=task-alpha")
        && rightClickStep?.status === "passed"
        && String(rightClickStep?.detail || "").includes("testId=task-alpha")
        && passBrowser?.steps.some(step => step.name === "assert:visible" && step.status === "passed" && String(step.detail || "").includes("role=menuitem"))
        && passBrowser?.pageTextPreview?.includes("Context menu opened for Project Alpha")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failBrowser?.steps.some(step => step.name === "action:rightClick" && step.status === "passed")
        && failVisible?.status === "failed"
        && String(failVisible?.detail || "").includes("role=menuitem")
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
async function runTestAgentBrowserKeyboardActionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-keyboard-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/search`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Keyboard Fixture</title></head>",
        "<body><main>",
        "<h1>Keyboard verification</h1>",
        "<label for=\"search\">Search</label>",
        "<input id=\"search\" aria-label=\"Search\" />",
        "<p id=\"focus-state\">Search not focused</p>",
        "<p id=\"result\" role=\"status\">No query submitted</p>",
        "<div data-testid=\"command-menu\" hidden>Command menu ready</div>",
        "<p id=\"shortcut-state\">No shortcut</p>",
        "<script>",
        "const input = document.getElementById('search');",
        "const focusState = document.getElementById('focus-state');",
        "const result = document.getElementById('result');",
        "const command = document.querySelector('[data-testid=command-menu]');",
        "const shortcutState = document.getElementById('shortcut-state');",
        "input.addEventListener('focus', () => { focusState.textContent = 'Search focused'; });",
        "input.addEventListener('input', () => { result.textContent = 'Typed ' + input.value; });",
        "input.addEventListener('keydown', event => {",
        "  if (event.key === 'Enter') { result.textContent = 'Submitted ' + input.value; }",
        "  if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'k') {",
        "    event.preventDefault();",
        "    command.hidden = false;",
        "    shortcutState.textContent = 'Shortcut Control+Alt+K received';",
        "  }",
        "});",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-keyboard-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-keyboard-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can focus a control, type real keyboard text, press Enter, and send a shortcut.",
        acceptanceCriteria: ["Search can be completed with keyboard-only actions and Control+Alt+K opens the command menu."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Keyboard actions submit search and open shortcut menu",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { action: "set_focus", label: "Search", exact: true },
                            { action: "type_text", label: "Search", value: "alpha", delay: 1 },
                            { action: "press_key", label: "Search", key: "Enter" },
                            { action: "hotkey", value: "Control+Alt+K" },
                        ],
                        assertions: [
                            { type: "focused", label: "Search", exact: true },
                            { type: "inputValueEquals", label: "Search", value: "alpha", exact: true },
                            { type: "text", text: "Submitted alpha" },
                            { type: "visible", testId: "command-menu" },
                            { type: "text", text: "Shortcut Control+Alt+K received" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-keyboard-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when keyboard input submits the wrong search value.",
        acceptanceCriteria: ["Keyboard search submits alpha."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Wrong keyboard input is reported",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "focus", label: "Search", exact: true },
                            { type: "typeText", label: "Search", value: "beta" },
                            { type: "press", label: "Search", key: "Enter" },
                        ],
                        assertions: [
                            { type: "text", text: "Submitted alpha", timeoutMs: 800 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
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
    const focusStep = passBrowser?.steps.find(step => step.name === "action:focus");
    const typeStep = passBrowser?.steps.find(step => step.name === "action:typeText");
    const pressSteps = passBrowser?.steps.filter(step => step.name === "action:press") || [];
    const failText = failBrowser?.steps.find(step => step.name === "assert:text");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && focusStep?.status === "passed"
        && String(focusStep?.detail || "").includes("label=Search")
        && typeStep?.status === "passed"
        && String(typeStep?.detail || "").includes("text length=5")
        && pressSteps.length === 2
        && pressSteps[0]?.status === "passed"
        && String(pressSteps[0]?.detail || "").includes("label=Search")
        && pressSteps[1]?.status === "passed"
        && String(pressSteps[1]?.detail || "").includes("Control+Alt+K")
        && passBrowser?.steps.some(step => step.name === "assert:inputValueEquals" && step.status === "passed")
        && passBrowser?.steps.some(step => step.name === "assert:visible" && step.status === "passed" && String(step.detail || "").includes("testId=command-menu"))
        && passBrowser?.pageTextPreview?.includes("Shortcut Control+Alt+K received")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failBrowser?.steps.some(step => step.name === "action:typeText" && step.status === "passed")
        && failText?.status === "failed"
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
async function runTestAgentBrowserStorageActionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-storage-action-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/preferences`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Storage Fixture</title></head>",
        "<body><main>",
        "<h1>Preference gate</h1>",
        "<p id=\"welcome\" role=\"status\">Loading</p>",
        "<p id=\"notice\">Loading</p>",
        "<script>",
        "function render() {",
        "  const dismissed = localStorage.getItem('feature.welcomeDismissed');",
        "  const notice = sessionStorage.getItem('session.notice');",
        "  document.getElementById('welcome').textContent = dismissed === 'yes' ? 'Welcome hidden' : 'Welcome shown';",
        "  document.getElementById('notice').textContent = notice ? 'Session notice ' + notice : 'No session notice';",
        "}",
        "render();",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-storage-action-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-storage-action-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can seed and clear browser Web Storage before checking app behavior.",
        acceptanceCriteria: [
            "Seeded localStorage hides the welcome message after reload.",
            "Seeded sessionStorage shows the session notice after reload.",
            "Clearing storage resets the app state after reload.",
        ],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Seed Web Storage state before reload",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { action: "set_local_storage", key: "feature.welcomeDismissed", value: "yes" },
                            { action: "set_session_storage", storageKey: "session.notice", value: "Resume draft" },
                            { type: "reload" },
                        ],
                        assertions: [
                            { type: "text", text: "Welcome hidden" },
                            { type: "text", text: "Session notice Resume draft" },
                            { type: "localStorageEquals", key: "feature.welcomeDismissed", value: "yes" },
                            { type: "sessionStorageIncludes", key: "session.notice", value: "draft" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }, {
                        name: "Clear Web Storage state before reload",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "setLocalStorage", key: "feature.welcomeDismissed", value: "yes" },
                            { type: "setSessionStorage", key: "session.notice", value: "Resume draft" },
                            { action: "clear_local_storage", key: "feature.welcomeDismissed" },
                            { action: "clear_session_storage" },
                            { type: "reload" },
                        ],
                        assertions: [
                            { type: "text", text: "Welcome shown" },
                            { type: "text", text: "No session notice" },
                            { type: "jsTruthy", expression: "localStorage.getItem('feature.welcomeDismissed') === null" },
                            { type: "jsTruthy", expression: "sessionStorage.getItem('session.notice') === null" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-storage-action-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when seeded storage does not satisfy the expected app state.",
        acceptanceCriteria: ["Seeded localStorage hides the welcome message."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Wrong storage value is reported",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "setLocalStorage", key: "feature.welcomeDismissed", value: "no" },
                            { type: "reload" },
                        ],
                        assertions: [
                            { type: "text", text: "Welcome hidden", timeoutMs: 800 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: failArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const seedBrowser = passReport.browserResults[0];
    const clearBrowser = passReport.browserResults[1];
    const failBrowser = failReport.browserResults[0];
    const seedLocalStep = seedBrowser?.steps.find(step => step.name === "action:setLocalStorage");
    const seedSessionStep = seedBrowser?.steps.find(step => step.name === "action:setSessionStorage");
    const clearSteps = clearBrowser?.steps.filter(step => step.name === "action:clearStorage") || [];
    const failText = failBrowser?.steps.find(step => step.name === "assert:text");
    const pass = passReport.status === "passed"
        && seedBrowser?.provider === "playwright"
        && clearBrowser?.provider === "playwright"
        && seedBrowser?.status === "passed"
        && clearBrowser?.status === "passed"
        && seedLocalStep?.status === "passed"
        && String(seedLocalStep?.detail || "").includes("localStorage")
        && String(seedLocalStep?.detail || "").includes("feature.welcomeDismissed")
        && seedSessionStep?.status === "passed"
        && String(seedSessionStep?.detail || "").includes("sessionStorage")
        && seedBrowser?.steps.some(step => step.name === "assert:localStorageEquals" && step.status === "passed")
        && seedBrowser?.steps.some(step => step.name === "assert:sessionStorageIncludes" && step.status === "passed")
        && clearSteps.length === 2
        && clearSteps.every(step => step.status === "passed")
        && clearBrowser?.steps.some(step => step.name === "assert:jsTruthy" && step.status === "passed")
        && clearBrowser?.pageTextPreview?.includes("No session notice")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failBrowser?.steps.some(step => step.name === "action:setLocalStorage" && step.status === "passed")
        && failText?.status === "failed"
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
async function runTestAgentBrowserCookieActionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-cookie-action-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/account`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "function cookieValue(header, name) {",
        "  const found = String(header || '').split(';').map(part => part.trim()).find(part => part.startsWith(name + '='));",
        "  return found ? decodeURIComponent(found.slice(name.length + 1)) : '';",
        "}",
        "http.createServer((req, res) => {",
        "  const token = cookieValue(req.headers.cookie, 'ccm_auth');",
        "  const signedIn = token === 'seeded-token-42';",
        "  const html = `<!doctype html>",
        "<html><head><title>Cookie Action Fixture</title></head>",
        "<body><main>",
        "<h1>Cookie account</h1>",
        "<p role=\"status\">${signedIn ? 'Signed in as seeded-token-42' : 'Signed out'}</p>",
        "<p id=\"token-state\">${token ? 'Cookie token present' : 'No cookie token'}</p>",
        "</main></body></html>`;",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(html);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-cookie-action-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-cookie-action-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can seed and clear browser cookies before checking app behavior.",
        acceptanceCriteria: [
            "Seeded ccm_auth cookie signs the user in after reload.",
            "Clearing ccm_auth signs the user out after reload.",
        ],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Seed auth cookie before reload",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { action: "set_cookie", cookieName: "ccm_auth", value: "seeded-token-42", http_only: true, same_site: "Lax" },
                            { type: "reload" },
                        ],
                        assertions: [
                            { type: "text", text: "Signed in as seeded-token-42" },
                            { assertion: "has_cookie", key: "ccm_auth" },
                            { assertion: "cookie_includes", key: "ccm_auth", value: "seeded-token" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }, {
                        name: "Clear auth cookie before reload",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "setCookie", key: "ccm_auth", value: "seeded-token-42", httpOnly: true, sameSite: "Lax" },
                            { type: "reload" },
                            { action: "clear_cookie", cookieName: "ccm_auth" },
                            { type: "reload" },
                        ],
                        assertions: [
                            { type: "text", text: "Signed out" },
                            { type: "text", text: "No cookie token" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-cookie-action-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when the seeded cookie does not produce the expected app state.",
        acceptanceCriteria: ["Seeded ccm_auth cookie signs the user in."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Wrong auth cookie is reported",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "setCookie", key: "ccm_auth", value: "wrong-token" },
                            { type: "reload" },
                        ],
                        assertions: [
                            { type: "text", text: "Signed in as seeded-token-42", timeoutMs: 800 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: failArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const seedBrowser = passReport.browserResults[0];
    const clearBrowser = passReport.browserResults[1];
    const failBrowser = failReport.browserResults[0];
    const seedCookieStep = seedBrowser?.steps.find(step => step.name === "action:setCookie");
    const clearCookieStep = clearBrowser?.steps.find(step => step.name === "action:clearCookies");
    const failText = failBrowser?.steps.find(step => step.name === "assert:text");
    const pass = passReport.status === "passed"
        && seedBrowser?.provider === "playwright"
        && clearBrowser?.provider === "playwright"
        && seedBrowser?.status === "passed"
        && clearBrowser?.status === "passed"
        && seedCookieStep?.status === "passed"
        && String(seedCookieStep?.detail || "").includes("cookie=ccm_auth")
        && seedBrowser?.steps.some(step => step.name === "assert:cookieExists" && step.status === "passed")
        && seedBrowser?.steps.some(step => step.name === "assert:cookieValueIncludes" && step.status === "passed")
        && clearCookieStep?.status === "passed"
        && String(clearCookieStep?.detail || "").includes("cookie count=1")
        && clearBrowser?.pageTextPreview?.includes("Signed out")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failBrowser?.steps.some(step => step.name === "action:setCookie" && step.status === "passed")
        && failText?.status === "failed"
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
async function runTestAgentBrowserClipboardAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-clipboard-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/clipboard`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Clipboard Fixture</title></head>",
        "<body><main>",
        "<h1>Clipboard verification</h1>",
        "<button type=\"button\" id=\"copyInvite\">Copy invite</button>",
        "<p role=\"status\" id=\"status\">Ready</p>",
        "<script>",
        "document.getElementById('copyInvite').addEventListener('click', async () => {",
        "  await navigator.clipboard.writeText('Invite Code: TEAM-42');",
        "  document.getElementById('status').textContent = 'Copied invite code TEAM-42';",
        "});",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-clipboard-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-clipboard-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove browser clipboard contents after real copy interactions.",
        acceptanceCriteria: ["Clicking Copy invite shows Copied invite code TEAM-42."],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Copy invite writes clipboard",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Copy invite", exact: true },
                        ],
                        assertions: [
                            { type: "text", text: "Copied invite code TEAM-42" },
                            { assertion: "clipboard_text_equals", value: "Invite Code: TEAM-42" },
                            { assertion: "clipboard_includes", value: "TEAM-42" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }, {
                        name: "TestAgent can seed clipboard",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { action: "write_clipboard", value: "Seeded clipboard note" },
                        ],
                        assertions: [
                            { type: "clipboardTextEquals", value: "Seeded clipboard note" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-clipboard-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when clipboard text is different from expected.",
        acceptanceCriteria: ["Copy invite writes the wrong clipboard value."],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Clipboard mismatch is reported",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Copy invite", exact: true },
                        ],
                        assertions: [
                            { type: "clipboardTextEquals", value: "Wrong clipboard value", timeoutMs: 800 },
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
    const copyBrowser = passReport.browserResults[0];
    const seedBrowser = passReport.browserResults[1];
    const failBrowser = failReport.browserResults[0];
    const failClipboard = failBrowser?.steps.find(step => step.name === "assert:clipboardTextEquals");
    const pass = passReport.status === "passed"
        && copyBrowser?.provider === "playwright"
        && copyBrowser?.status === "passed"
        && copyBrowser?.steps.some(step => step.name === "assert:clipboardTextEquals" && step.status === "passed" && String(step.detail || "").includes("expected length=20"))
        && copyBrowser?.steps.some(step => step.name === "assert:clipboardTextIncludes" && step.status === "passed" && String(step.detail || "").includes("expected substring length=7"))
        && seedBrowser?.provider === "playwright"
        && seedBrowser?.status === "passed"
        && seedBrowser?.steps.some(step => step.name === "action:setClipboard" && step.status === "passed" && String(step.detail || "").includes("clipboard text length=21"))
        && seedBrowser?.steps.some(step => step.name === "assert:clipboardTextEquals" && step.status === "passed")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failClipboard?.status === "failed"
        && String(failClipboard?.error || "").includes("actual length=20")
        && !String(failClipboard?.error || "").includes("Invite Code")
        && !String(failClipboard?.error || "").includes("Wrong clipboard value")
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
async function runTestAgentBrowserElementScreenshotAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-element-screenshot-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/visual`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Visual Fixture</title>",
        "<style>",
        "body { font-family: sans-serif; }",
        "#chart { width: 180px; height: 100px; }",
        "#blank { width: 180px; height: 100px; background: #fff; }",
        "</style></head>",
        "<body><main>",
        "<h1>Visual verification</h1>",
        "<canvas id=\"chart\" width=\"180\" height=\"100\" aria-label=\"Revenue chart\"></canvas>",
        "<div id=\"blank\" aria-label=\"Blank preview\"></div>",
        "<p role=\"status\">Chart ready</p>",
        "<script>",
        "const ctx = document.getElementById('chart').getContext('2d');",
        "ctx.fillStyle = '#0ea5e9'; ctx.fillRect(0, 0, 180, 100);",
        "ctx.fillStyle = '#22c55e'; ctx.fillRect(18, 50, 36, 35);",
        "ctx.fillStyle = '#f97316'; ctx.fillRect(72, 28, 36, 57);",
        "ctx.fillStyle = '#111827'; ctx.fillRect(126, 12, 36, 73);",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-element-screenshot-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-element-screenshot-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove an element region has visible rendered pixels.",
        acceptanceCriteria: ['Page shows "Chart ready" and the chart canvas is visually non-blank.'],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Chart canvas has visual content",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                        ],
                        assertions: [
                            { type: "text", text: "Chart ready" },
                            { assertion: "element_screenshot_not_blank", selector: "#chart", minUniqueColors: 3, minNonWhitePixels: 100 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-element-screenshot-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when an element region is visually blank.",
        acceptanceCriteria: ["Blank preview should have visible chart pixels."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Blank preview is rejected",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                        ],
                        assertions: [
                            { type: "elementScreenshotNotBlank", selector: "#blank", minNonWhitePixels: 1, timeoutMs: 800 },
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
    const visualStep = passBrowser?.steps.find(step => step.name === "assert:elementScreenshotNotBlank");
    const failVisual = failBrowser?.steps.find(step => step.name === "assert:elementScreenshotNotBlank");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && visualStep?.status === "passed"
        && String(visualStep?.detail || "").includes("minUniqueColors=3")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failVisual?.status === "failed"
        && String(failVisual?.error || "").includes("nonWhitePixels=0")
        && String(failVisual?.error || "").includes("uniqueColors=1")
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
async function runTestAgentBrowserTextOrderAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-text-order-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/tasks`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Text Order Fixture</title></head>",
        "<body><main>",
        "<h1>Task sort</h1>",
        "<button type=\"button\" id=\"sortDesc\">Sort descending</button>",
        "<ol id=\"task-list\" aria-label=\"Task list\">",
        "<li>Alpha</li>",
        "<li>Bravo</li>",
        "<li>Charlie</li>",
        "</ol>",
        "<p role=\"status\" id=\"status\">Initial Alpha Bravo Charlie</p>",
        "<script>",
        "const list = document.getElementById('task-list');",
        "document.getElementById('sortDesc').addEventListener('click', () => {",
        "  const items = Array.from(list.querySelectorAll('li'));",
        "  items.reverse().forEach(item => list.appendChild(item));",
        "  document.getElementById('status').textContent = 'Sorted Charlie Bravo Alpha';",
        "});",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-text-order-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-text-order-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove a list is sorted in the real browser UI.",
        acceptanceCriteria: ["Clicking Sort descending reorders the task list to Charlie, Bravo, Alpha."],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Task list sorts descending",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Sort descending", exact: true },
                        ],
                        assertions: [
                            { assertion: "text_order", selector: "#task-list", texts: ["Charlie", "Bravo", "Alpha"] },
                            { type: "text", text: "Sorted Charlie Bravo Alpha" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-text-order-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when the observed list order does not match expected order.",
        acceptanceCriteria: ["Clicking Sort descending leaves the list in Alpha, Bravo, Charlie order."],
        requiredChecks: ["browser_e2e", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Wrong task list order is rejected",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Sort descending", exact: true },
                        ],
                        assertions: [
                            { type: "textOrder", selector: "#task-list", texts: ["Alpha", "Bravo", "Charlie"], timeoutMs: 800 },
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
    const passOrder = passBrowser?.steps.find(step => step.name === "assert:textOrder");
    const failOrder = failBrowser?.steps.find(step => step.name === "assert:textOrder");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && passOrder?.status === "passed"
        && String(passOrder?.detail || "").includes("expected text count=3")
        && passBrowser?.pageTextPreview?.includes("Sorted Charlie Bravo Alpha")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failOrder?.status === "failed"
        && String(failOrder?.error || "").includes("foundCount=1")
        && String(failOrder?.error || "").includes("missingIndex=1")
        && !String(failOrder?.error || "").includes("Charlie Bravo Alpha")
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
async function runTestAgentBrowserAttributeAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-attribute-assertion-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/menu`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Attribute Fixture</title></head>",
        "<body><main>",
        "<h1>Menu</h1>",
        "<button id=\"menu\" type=\"button\" aria-expanded=\"false\" data-state=\"closed\">Menu</button>",
        "<section id=\"panel\" hidden>Panel content</section>",
        "<script>",
        "document.getElementById('menu').addEventListener('click', () => {",
        "  const button = document.getElementById('menu');",
        "  const open = button.getAttribute('aria-expanded') !== 'true';",
        "  button.setAttribute('aria-expanded', open ? 'true' : 'false');",
        "  button.setAttribute('data-state', open ? 'open active' : 'closed');",
        "  document.getElementById('panel').hidden = !open;",
        "});",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-attribute-assertion-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-attribute-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove ARIA/data attribute state before and after interaction.",
        acceptanceCriteria: ["Menu starts collapsed and expands after click."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Menu starts collapsed",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                        ],
                        assertions: [
                            { assertion: "attribute_equals", role: "button", name: "Menu", attribute: "aria-expanded", value: "false", exact: true },
                            { assertion: "attr_includes", role: "button", name: "Menu", attribute: "data-state", value: "closed", exact: true },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }, {
                        name: "Menu expands after click",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Menu", exact: true },
                        ],
                        assertions: [
                            { type: "attributeEquals", role: "button", name: "Menu", attributeName: "aria-expanded", value: "true", exact: true },
                            { type: "attributeIncludes", role: "button", name: "Menu", attribute_name: "data-state", value: "active", exact: true },
                            { type: "text", text: "Panel content" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-attribute-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when an ARIA attribute has the wrong final state.",
        acceptanceCriteria: ["Menu remains collapsed after click."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Menu should not still be collapsed after click",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Menu", exact: true },
                        ],
                        assertions: [
                            { type: "attributeEquals", role: "button", name: "Menu", attribute: "aria-expanded", value: "false", exact: true },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: failArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const collapsedBrowser = passReport.browserResults[0];
    const expandedBrowser = passReport.browserResults[1];
    const failBrowser = failReport.browserResults[0];
    const failAttribute = failBrowser?.steps.find(step => step.name === "assert:attributeEquals");
    const pass = passReport.status === "passed"
        && passReport.browserResults.length === 2
        && collapsedBrowser?.provider === "playwright"
        && expandedBrowser?.provider === "playwright"
        && collapsedBrowser?.status === "passed"
        && expandedBrowser?.status === "passed"
        && collapsedBrowser?.steps.some(step => step.name === "assert:attributeEquals" && step.status === "passed" && String(step.detail || "").includes("attribute=aria-expanded"))
        && collapsedBrowser?.steps.some(step => step.name === "assert:attributeIncludes" && step.status === "passed" && String(step.detail || "").includes("attribute=data-state"))
        && expandedBrowser?.steps.some(step => step.name === "assert:attributeEquals" && step.status === "passed" && String(step.detail || "").includes("expected length=4"))
        && expandedBrowser?.steps.some(step => step.name === "assert:attributeIncludes" && step.status === "passed" && String(step.detail || "").includes("expected substring length=6"))
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failAttribute?.status === "failed"
        && String(failAttribute?.error || "").includes("actual length=4")
        && !String(failAttribute?.error || "").includes("true")
        && !String(failAttribute?.error || "").includes("false")
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
async function runTestAgentBrowserComputedStyleAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-computed-style-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/status`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Computed Style Fixture</title>",
        "<style>",
        "body { font-family: sans-serif; }",
        "#badge { display: inline-flex; padding: 6px 10px; border-radius: 4px; background-color: rgb(229, 231, 235); color: rgb(17, 24, 39); }",
        "#badge.active { background-color: rgb(34, 197, 94); color: rgb(255, 255, 255); }",
        "</style></head>",
        "<body><main>",
        "<h1>Release status</h1>",
        "<span id=\"badge\" data-testid=\"status-badge\">Draft</span>",
        "<button id=\"publish\" type=\"button\">Publish</button>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "<script>",
        "document.getElementById('publish').addEventListener('click', () => {",
        "  const badge = document.getElementById('badge');",
        "  badge.classList.add('active');",
        "  badge.textContent = 'Published';",
        "  document.getElementById('status').textContent = 'Published with active styling';",
        "});",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-computed-style-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-computed-style-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove a UI state change applied the expected computed CSS.",
        acceptanceCriteria: ["Publishing changes the badge to the active green style with white text."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Published badge has active computed style",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Publish", exact: true },
                        ],
                        assertions: [
                            { type: "text", text: "Published with active styling" },
                            { assertion: "style_equals", test_id: "status-badge", property: "background-color", value: "rgb(34, 197, 94)" },
                            { assertion: "computed_style_includes", testId: "status-badge", cssProperty: "color", value: "255, 255, 255" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-computed-style-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when the computed badge style is not the expected color.",
        acceptanceCriteria: ["Publishing changes the badge to a red active style."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Wrong computed style is reported",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Publish", exact: true },
                        ],
                        assertions: [
                            { type: "computedStyleEquals", testId: "status-badge", property: "backgroundColor", value: "rgb(239, 68, 68)", timeoutMs: 800 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
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
    const styleEquals = passBrowser?.steps.find(step => step.name === "assert:computedStyleEquals");
    const styleIncludes = passBrowser?.steps.find(step => step.name === "assert:computedStyleIncludes");
    const failStyle = failBrowser?.steps.find(step => step.name === "assert:computedStyleEquals");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && styleEquals?.status === "passed"
        && String(styleEquals?.detail || "").includes("property=background-color")
        && String(styleEquals?.detail || "").includes("expected length=16")
        && styleIncludes?.status === "passed"
        && String(styleIncludes?.detail || "").includes("property=color")
        && String(styleIncludes?.detail || "").includes("expected substring length=13")
        && passBrowser?.pageTextPreview?.includes("Published with active styling")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failStyle?.status === "failed"
        && String(failStyle?.error || "").includes("property=background-color")
        && String(failStyle?.error || "").includes("actual length=16")
        && !String(failStyle?.error || "").includes("rgb(34")
        && !String(failStyle?.error || "").includes("rgb(239")
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
async function runTestAgentBrowserCookieAssertionSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-cookie-assertion-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/login`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Cookie Fixture</title></head>",
        "<body><main>",
        "<h1>Cookie Login</h1>",
        "<button id=\"login\">Sign in</button>",
        "<p id=\"status\">Signed out</p>",
        "<script>",
        "document.getElementById('login').addEventListener('click', async () => {",
        "  const response = await fetch('/api/login', { method: 'POST' });",
        "  document.getElementById('status').textContent = response.ok ? 'Signed in' : 'Sign in failed';",
        "});",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  if (route === '/api/login') {",
        "    res.writeHead(200, {'content-type':'text/plain', 'set-cookie':'ccm_session=verified-token-123; Path=/; SameSite=Lax'});",
        "    res.end('ok');",
        "    return;",
        "  }",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(html);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "browser-cookie-assertion-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const browserCheck = {
        name: "Login sets session cookie",
        url: targetUrl,
        actions: [
            { type: "goto", url: targetUrl },
            { type: "click", text: "Sign in", exact: true },
            { type: "waitForText", text: "Signed in" },
        ],
        assertions: [
            { type: "text", text: "Signed in" },
            { assertion: "has_cookie", key: "ccm_session" },
            { assertion: "cookie_includes", key: "ccm_session", value: "verified-token" },
            { type: "consoleNoErrors" },
            { type: "networkNoErrors" },
        ],
        screenshot: true,
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `browser-cookie-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove a login flow sets a session cookie.",
        acceptanceCriteria: ["Signing in sets the ccm_session cookie."],
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
    const failReport = await (0, agent_1.runTestAgent)({
        id: `browser-cookie-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when a session cookie value does not match the expected shape.",
        acceptanceCriteria: ["Signing in sets a cookie containing another-token."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        ...browserCheck,
                        assertions: [
                            { type: "text", text: "Signed in" },
                            { type: "cookieExists", key: "ccm_session" },
                            { type: "cookieValueIncludes", key: "ccm_session", value: "another-token" },
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
    const failCookieValue = failBrowser?.steps.find(step => step.name === "assert:cookieValueIncludes");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && passBrowser?.steps.some(step => step.name === "assert:cookieExists" && step.status === "passed" && String(step.detail || "").includes("cookie=ccm_session"))
        && passBrowser?.steps.some(step => step.name === "assert:cookieValueIncludes" && step.status === "passed" && String(step.detail || "").includes("expected substring length=14"))
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failCookieValue?.status === "failed"
        && String(failCookieValue?.error || "").includes("cookie=ccm_session")
        && !String(failCookieValue?.error || "").includes("verified-token-123")
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
async function runTestAgentPlaywrightDownloadArtifactSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-download-artifact-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/exports`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Export Fixture</title></head>",
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
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, agent_1.runTestAgent)({
        id: `playwright-download-artifact-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove a browser download happened and preserve the file as evidence.",
        acceptanceCriteria: ["Clicking Export CSV downloads tasks.csv containing Ship TestAgent."],
        requiredChecks: ["browser_e2e", "browser_download", "browser_artifacts", "console_errors"],
        projects: [{
                name: "playwright-download-artifact-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                browserChecks: [{
                        name: "CSV export download",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "click", role: "button", name: "Export CSV", exact: true },
                        ],
                        assertions: [
                            { type: "downloadedFile", fileName: "tasks.csv", contentIncludes: "Ship TestAgent", minBytes: 20 },
                            { type: "text", text: "Export started" },
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
    const downloadArtifact = (browser?.browserArtifacts || []).find(item => item.type === "download");
    const downloadText = downloadArtifact?.path && fs.existsSync(downloadArtifact.path) ? fs.readFileSync(downloadArtifact.path, "utf-8") : "";
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
    const manifestDownload = (manifest?.files || []).find((item) => item.source === "playwright:download");
    const interaction = report.browserInteractionSummary?.[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = report.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl === targetUrl
        && browser?.pageTextPreview?.includes("Export started")
        && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("Export CSV"))
        && browser?.steps.some(step => step.name === "assert:downloadedFile" && step.status === "passed" && String(step.detail || "").includes("filename=tasks.csv") && String(step.detail || "").includes("Ship TestAgent"))
        && downloadArtifact?.path
        && downloadArtifact?.mediaType === "text/csv"
        && fs.existsSync(downloadArtifact.path)
        && downloadText.includes("title,status")
        && downloadText.includes("Ship TestAgent,done")
        && manifestDownload?.path === downloadArtifact.path
        && byCheck.get("browser_download")?.status === "verified"
        && byCheck.get("browser_artifacts")?.status === "verified"
        && interaction?.assertionTypes?.downloadedFile === 1
        && report.acceptanceCoverage.every(item => item.status === "verified");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        downloadArtifact,
        manifest,
    };
}
async function runTestAgentPlaywrightFileUploadSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-file-upload-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/upload`;
    const payload = "Ship TestAgent upload payload";
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Upload Fixture</title></head>",
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
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, agent_1.runTestAgent)({
        id: `playwright-file-upload-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can upload a file in a real browser session.",
        acceptanceCriteria: ["Uploading notes.txt shows the uploaded file name and content."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: "playwright-file-upload-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                browserChecks: [{
                        name: "File upload reads selected file",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { action: "attach_file", label: "Attachment", file_name: "notes.txt", file_content: payload, media_type: "text/plain", exact: true },
                            { type: "click", role: "button", name: "Upload", exact: true },
                        ],
                        assertions: [
                            { type: "text", text: "Uploaded notes.txt" },
                            { type: "text", text: payload },
                            { type: "jsEquals", expression: "document.body.dataset.fileName", value: "notes.txt" },
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
    const interaction = report.browserInteractionSummary?.[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = report.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl === targetUrl
        && browser?.pageTextPreview?.includes("Uploaded notes.txt")
        && browser?.pageTextPreview?.includes(payload)
        && browser?.steps.some(step => step.name === "action:uploadFile" && step.status === "passed" && String(step.detail || "").includes("label=Attachment") && String(step.detail || "").includes("file=notes.txt"))
        && browser?.steps.some(step => step.name === "action:click" && step.status === "passed" && String(step.detail || "").includes("Upload"))
        && browser?.steps.some(step => step.name === "assert:jsEquals" && step.status === "passed" && String(step.detail || "").includes("document.body.dataset.fileName"))
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
    };
}
async function runTestAgentPlaywrightMultiFileUploadSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-multi-file-upload-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/upload`;
    const notesPayload = "Ship TestAgent multi upload notes";
    const metadataPayload = JSON.stringify({ project: "TestAgent", count: 2 });
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Multi Upload Fixture</title></head>",
        "<body><main>",
        "<h1>Multi Upload</h1>",
        "<label for=\"attachments\">Attachments</label>",
        "<input id=\"attachments\" name=\"attachments\" type=\"file\" multiple />",
        "<button type=\"button\" id=\"upload\">Upload files</button>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "<ul id=\"files\"></ul>",
        "</main>",
        "<script>",
        "document.getElementById('upload').addEventListener('click', async () => {",
        "  const input = document.getElementById('attachments');",
        "  const files = Array.from(input.files || []);",
        "  if (!files.length) { document.getElementById('status').textContent = 'Missing files'; return; }",
        "  const rows = await Promise.all(files.map(async file => ({ name: file.name, text: await file.text() })));",
        "  document.body.dataset.fileCount = String(rows.length);",
        "  document.body.dataset.fileNames = rows.map(row => row.name).join(',');",
        "  document.getElementById('status').textContent = 'Uploaded ' + rows.length + ' files: ' + rows.map(row => row.name).join(', ');",
        "  document.getElementById('files').innerHTML = rows.map(row => '<li>' + row.name + ': ' + row.text + '</li>').join('');",
        "});",
        "</script>",
        "</body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, agent_1.runTestAgent)({
        id: `playwright-multi-file-upload-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can upload multiple files in one real browser action.",
        acceptanceCriteria: ["Uploading two files shows both uploaded file names and contents."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                name: "playwright-multi-file-upload-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                browserChecks: [{
                        name: "Multi-file upload reads all selected files",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            {
                                action: "upload_file",
                                label: "Attachments",
                                exact: true,
                                files: [
                                    { file_name: "notes.txt", file_content: notesPayload, media_type: "text/plain" },
                                    { file_name: "meta.json", file_content: metadataPayload, media_type: "application/json" },
                                ],
                            },
                            { type: "click", role: "button", name: "Upload files", exact: true },
                        ],
                        assertions: [
                            { type: "text", text: "Uploaded 2 files" },
                            { type: "text", text: "notes.txt" },
                            { type: "text", text: "meta.json" },
                            { type: "text", text: notesPayload },
                            { type: "text", text: metadataPayload },
                            { type: "jsEquals", expression: "document.body.dataset.fileCount", value: "2" },
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
    const interaction = report.browserInteractionSummary?.[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const pass = report.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl === targetUrl
        && browser?.pageTextPreview?.includes("Uploaded 2 files")
        && browser?.pageTextPreview?.includes("notes.txt")
        && browser?.pageTextPreview?.includes("meta.json")
        && browser?.pageTextPreview?.includes(notesPayload)
        && browser?.pageTextPreview?.includes(metadataPayload)
        && browser?.steps.some(step => step.name === "action:uploadFile" && step.status === "passed" && String(step.detail || "").includes("file=notes.txt, meta.json"))
        && browser?.steps.some(step => step.name === "assert:jsEquals" && step.status === "passed" && String(step.detail || "").includes("document.body.dataset.fileCount"))
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
    };
}
async function runTestAgentPlaywrightViewportSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-viewport-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/responsive`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Responsive Fixture</title>",
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
        "<style>",
        ".mobile-only { display: none; }",
        ".desktop-only { display: block; }",
        "@media (max-width: 600px) { .mobile-only { display: block; } .desktop-only { display: none; } }",
        "</style>",
        "</head>",
        "<body><main>",
        "<h1>Responsive Dashboard</h1>",
        "<nav class=\"desktop-only\">Desktop navigation</nav>",
        "<nav class=\"mobile-only\">Mobile navigation ready</nav>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, agent_1.runTestAgent)({
        id: `playwright-viewport-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can run a browser check with a mobile viewport.",
        acceptanceCriteria: ["At mobile width, the responsive page shows Mobile navigation ready."],
        requiredChecks: ["browser_e2e", "screenshots", "browser_snapshots", "console_errors"],
        projects: [{
                name: "playwright-viewport-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                browserChecks: [{
                        name: "Mobile responsive navigation",
                        url: targetUrl,
                        viewport_width: 390,
                        viewport_height: 844,
                        is_mobile: true,
                        actions: [
                            { type: "goto", url: targetUrl },
                        ],
                        assertions: [
                            { type: "text", text: "Mobile navigation ready" },
                            { type: "notVisible", text: "Desktop navigation" },
                            { type: "jsTruthy", expression: "window.innerWidth <= 420" },
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
    const markdownPath = String(report.metadata.artifactFiles?.reportMarkdownPath || "");
    const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
    const pass = report.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl === targetUrl
        && browser?.viewport?.width === 390
        && browser?.viewport?.height === 844
        && browser?.viewport?.isMobile === true
        && browser?.pageTextPreview?.includes("Mobile navigation ready")
        && browser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Mobile navigation ready"))
        && browser?.steps.some(step => step.name === "assert:notVisible" && step.status === "passed" && String(step.detail || "").includes("Desktop navigation"))
        && browser?.steps.some(step => step.name === "assert:jsTruthy" && step.status === "passed" && String(step.detail || "").includes("window.innerWidth <= 420"))
        && markdown.includes("Viewport: 390x844 mobile")
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && byCheck.get("browser_snapshots")?.status === "verified"
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
async function runTestAgentPlaywrightContextOptionsSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-context-options-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/context`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Context Options Fixture</title></head>",
        "<body><main>",
        "<h1>Browser context</h1>",
        "<p id=\"locale\">Locale pending</p>",
        "<p id=\"timezone\">Timezone pending</p>",
        "<p id=\"color\">Color pending</p>",
        "<p id=\"motion\">Motion pending</p>",
        "<p id=\"geo\">Geo pending</p>",
        "<script>",
        "document.getElementById('locale').textContent = 'Locale ' + Intl.DateTimeFormat().resolvedOptions().locale;",
        "document.getElementById('timezone').textContent = 'Timezone ' + Intl.DateTimeFormat().resolvedOptions().timeZone;",
        "document.getElementById('color').textContent = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark scheme' : 'Light scheme';",
        "document.getElementById('motion').textContent = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Reduced motion' : 'Motion allowed';",
        "navigator.geolocation.getCurrentPosition(",
        "  position => { document.getElementById('geo').textContent = 'Geo ' + position.coords.latitude.toFixed(2) + ',' + position.coords.longitude.toFixed(2); },",
        "  error => { document.getElementById('geo').textContent = 'Geo error ' + error.code; }",
        ");",
        "</script>",
        "</main></body></html>`;",
        "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "playwright-context-options-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `playwright-context-options-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can run Playwright checks with browser context locale, timezone, media, and geolocation options.",
        acceptanceCriteria: ["Browser context exposes French locale, Tokyo timezone, dark color scheme, reduced motion, and configured geolocation."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Browser context options are applied",
                        url: targetUrl,
                        context: {
                            locale: "fr-FR",
                            timezone: "Asia/Tokyo",
                            color_scheme: "dark",
                            reduced_motion: "reduce",
                            permissions: ["geolocation"],
                            geolocation: { latitude: 35.681236, longitude: 139.767125, accuracy: 10 },
                        },
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "waitForText", text: "Geo 35.68,139.77", timeoutMs: 4000 },
                        ],
                        assertions: [
                            { type: "text", text: "Locale fr-FR" },
                            { type: "text", text: "Timezone Asia/Tokyo" },
                            { type: "text", text: "Dark scheme" },
                            { type: "text", text: "Reduced motion" },
                            { type: "text", text: "Geo 35.68,139.77" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `playwright-context-options-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when browser context options do not match expected app behavior.",
        acceptanceCriteria: ["Browser context exposes UTC timezone."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Wrong timezone expectation is reported",
                        url: targetUrl,
                        context: {
                            locale: "fr-FR",
                            timezone_id: "Asia/Tokyo",
                            permissions: ["geolocation"],
                            geolocation: { lat: 35.681236, lng: 139.767125 },
                        },
                        actions: [
                            { type: "goto", url: targetUrl },
                        ],
                        assertions: [
                            { type: "text", text: "Timezone UTC", timeoutMs: 800 },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
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
    const failText = failBrowser?.steps.find(step => step.name === "assert:text");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && passBrowser?.contextOptions?.locale === "fr-FR"
        && passBrowser?.contextOptions?.timezoneId === "Asia/Tokyo"
        && passBrowser?.contextOptions?.colorScheme === "dark"
        && passBrowser?.contextOptions?.reducedMotion === "reduce"
        && passBrowser?.contextOptions?.permissions?.includes("geolocation") === true
        && passBrowser?.contextOptions?.geolocation?.latitude === 35.681236
        && passBrowser?.steps.some(step => step.name === "action:waitForText" && step.status === "passed")
        && passBrowser?.steps.some(step => step.name === "assert:text" && step.status === "passed" && String(step.detail || "").includes("Geo 35.68"))
        && passBrowser?.pageTextPreview?.includes("Dark scheme")
        && passReport.requiredCheckCoverage.some(item => item.check === "browser_e2e" && item.status === "verified")
        && passReport.acceptanceCoverage.every(item => item.status === "verified")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failBrowser?.contextOptions?.timezoneId === "Asia/Tokyo"
        && failText?.status === "failed"
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
async function runTestAgentPlaywrightInViewportSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-in-viewport-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const goodUrl = `http://127.0.0.1:${port}/good`;
    const badUrl = `http://127.0.0.1:${port}/bad`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const head = '<!doctype html><html><head><title>Viewport Fixture</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /></head><body style=\"margin:0\"><main>';",
        "const tail = '</main></body></html>';",
        "const good = head + '<h1>Ready</h1><button data-testid=\"cta\" style=\"margin:24px;padding:12px 18px\">Visible CTA</button>' + tail;",
        "const bad = head + '<h1>Needs scroll</h1><div style=\"height:900px\"></div><button data-testid=\"cta\" style=\"margin:24px;padding:12px 18px\">Below Fold CTA</button>' + tail;",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/bad' ? bad : good);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "playwright-in-viewport-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl: goodUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `playwright-in-viewport-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove an important mobile control is in the viewport.",
        acceptanceCriteria: ["The CTA is visible in the mobile viewport."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "CTA is in mobile viewport",
                        url: goodUrl,
                        viewport_width: 390,
                        viewport_height: 640,
                        is_mobile: true,
                        actions: [{ type: "goto", url: goodUrl }],
                        assertions: [
                            { type: "text", text: "Visible CTA" },
                            { assertion: "element_in_viewport", testId: "cta" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `playwright-in-viewport-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails when an important mobile control is below the viewport.",
        acceptanceCriteria: ["The CTA must be visible without scrolling."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                targetUrl: badUrl,
                browserChecks: [{
                        name: "CTA is below mobile viewport",
                        url: badUrl,
                        viewport_width: 390,
                        viewport_height: 640,
                        is_mobile: true,
                        actions: [{ type: "goto", url: badUrl }],
                        assertions: [
                            { type: "text", text: "Below Fold CTA" },
                            { type: "inViewport", testId: "cta" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
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
    const viewportFailure = failBrowser?.steps.find(step => step.name === "assert:inViewport");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && passBrowser?.viewport?.width === 390
        && passBrowser?.viewport?.height === 640
        && passBrowser?.steps.some(step => step.name === "assert:inViewport" && step.status === "passed" && String(step.detail || "").includes("testId=cta"))
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failBrowser?.viewport?.width === 390
        && failBrowser?.viewport?.height === 640
        && viewportFailure?.status === "failed"
        && String(viewportFailure?.error || "").includes("viewport=390x640")
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
async function runTestAgentPlaywrightNoHorizontalOverflowSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-no-horizontal-overflow-selftest-"));
    const passArtifactDir = path.join(dir, "pass-artifacts");
    const failArtifactDir = path.join(dir, "fail-artifacts");
    const port = await getFreePort();
    const goodUrl = `http://127.0.0.1:${port}/good`;
    const badUrl = `http://127.0.0.1:${port}/bad`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const head = '<!doctype html><html><head><title>Overflow Fixture</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /></head><body><main>';",
        "const tail = '</main></body></html>';",
        "const good = head + '<h1>Responsive Good</h1><p style=\"max-width:100%;overflow-wrap:anywhere\">Mobile layout fits cleanly</p>' + tail;",
        "const bad = head + '<h1>Responsive Bad</h1><div style=\"width:900px;height:40px;background:#ddd\">Wide overflowing panel</div>' + tail;",
        "http.createServer((req, res) => {",
        "  const route = String(req.url || '/').split('?')[0];",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(route === '/bad' ? bad : good);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const baseProject = {
        name: "playwright-no-horizontal-overflow-self-test",
        workDir: dir,
        runCommand: `"${process.execPath}" server.js`,
        targetUrl: goodUrl,
        env: { PORT: port },
    };
    const passReport = await (0, agent_1.runTestAgent)({
        id: `playwright-no-horizontal-overflow-pass-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can prove mobile layout has no horizontal overflow.",
        acceptanceCriteria: ["The responsive page fits at mobile width."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                browserChecks: [{
                        name: "Good mobile layout has no x overflow",
                        url: goodUrl,
                        viewport_width: 390,
                        viewport_height: 844,
                        is_mobile: true,
                        actions: [{ type: "goto", url: goodUrl }],
                        assertions: [
                            { type: "text", text: "Mobile layout fits cleanly" },
                            { assertion: "no_horizontal_overflow" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir: passArtifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
        },
    }, { browserProvider: "playwright" });
    const failReport = await (0, agent_1.runTestAgent)({
        id: `playwright-no-horizontal-overflow-fail-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent fails a mobile layout that overflows horizontally.",
        acceptanceCriteria: ["The responsive page must not overflow at mobile width."],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
        projects: [{
                ...baseProject,
                targetUrl: badUrl,
                browserChecks: [{
                        name: "Bad mobile layout has x overflow",
                        url: badUrl,
                        viewport_width: 390,
                        viewport_height: 844,
                        is_mobile: true,
                        actions: [{ type: "goto", url: badUrl }],
                        assertions: [
                            { type: "text", text: "Wide overflowing panel" },
                            { type: "noHorizontalOverflow" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
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
    const overflowFailure = failBrowser?.steps.find(step => step.name === "assert:noHorizontalOverflow");
    const pass = passReport.status === "passed"
        && passBrowser?.provider === "playwright"
        && passBrowser?.status === "passed"
        && passBrowser?.viewport?.width === 390
        && passBrowser?.steps.some(step => step.name === "assert:noHorizontalOverflow" && step.status === "passed")
        && failReport.status === "failed"
        && failBrowser?.provider === "playwright"
        && failBrowser?.status === "failed"
        && failBrowser?.viewport?.width === 390
        && overflowFailure?.status === "failed"
        && String(overflowFailure?.error || "").includes("overflowPx=")
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
async function runTestAgentBrowserPreflightSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-preflight-selftest-"));
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_console_messages",
            "mcp__playwright__browser_network_requests",
        ],
        onCall: (toolName) => {
            if (toolName.endsWith("browser_snapshot"))
                return "Preflight Ready";
            if (toolName.endsWith("browser_console_messages"))
                return [];
            if (toolName.endsWith("browser_network_requests"))
                return [];
            if (toolName.endsWith("browser_take_screenshot"))
                return { path: "preflight.png" };
            return { ok: true };
        },
    });
    const artifactDir = path.join(dir, "artifacts");
    const report = await (0, agent_1.runTestAgent)({
        id: `browser-preflight-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent records browser provider preflight.",
        acceptanceCriteria: ["Browser provider preflight is recorded"],
        requiredChecks: ["browser_e2e"],
        projects: [{
                name: "browser-preflight-self-test",
                workDir: dir,
                browserChecks: [{
                        name: "MCP preflight browser check",
                        url: "http://example.test/",
                        actions: [{ type: "goto", url: "http://example.test/" }],
                        assertions: [{ type: "text", text: "Preflight Ready" }],
                    }],
            }],
        options: { artifactDir, browserProvider: "mcp" },
    }, { browserProvider: "mcp", browserToolExecutor: executor });
    const preflight = report.metadata.browserProviderPreflight;
    const markdownPath = String(report.metadata.artifactFiles?.reportMarkdownPath || "");
    const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
    const pass = report.status === "passed"
        && Array.isArray(preflight)
        && preflight.some(item => item.provider === "mcp" && item.available === true && item.tools?.includes("mcp__playwright__browser_navigate"))
        && preflight.some(item => item.provider === "playwright")
        && markdown.includes("## Browser Provider Preflight")
        && markdown.includes("mcp__playwright__browser_navigate");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        preflight,
    };
}
async function runTestAgentPlaywrightRealBrowserSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-real-playwright-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/profile`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Real Playwright TestAgent</title></head>",
        "<body>",
        "<main>",
        "<h1>Profile</h1>",
        "<label for=\"name\">Name</label>",
        "<input id=\"name\" name=\"name\" />",
        "<button type=\"button\" id=\"save\">Save</button>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "</main>",
        "<script>",
        "document.getElementById('save').addEventListener('click', () => {",
        "  const value = document.getElementById('name').value;",
        "  localStorage.setItem('profile.saved', value);",
        "  document.getElementById('status').textContent = 'Saved ' + value;",
        "});",
        "</script>",
        "</body></html>`;",
        "http.createServer((req, res) => {",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(html);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, agent_1.runTestAgent)({
        id: `real-playwright-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent can operate a real browser through Playwright.",
        acceptanceCriteria: ['Profile page displays "Saved Ada" at /profile'],
        requiredChecks: ["browser_e2e", "screenshots", "console_errors", "browser_snapshots", "browser_console_logs", "browser_network_logs"],
        projects: [{
                name: "real-playwright-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                browserChecks: [{
                        name: "Real profile save flow",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "fill", label: "Name", value: "Ada" },
                            { type: "click", role: "button", name: "Save" },
                        ],
                        assertions: [
                            { type: "text", text: "Saved Ada" },
                            { type: "localStorageEquals", key: "profile.saved", value: "Ada" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: { artifactDir, browserProvider: "playwright" },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const markdownPath = String(report.metadata.artifactFiles?.reportMarkdownPath || "");
    const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
    const pass = report.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl?.includes("/profile")
        && browser?.pageTextPreview?.includes("Saved Ada")
        && browser?.steps.some(step => step.name === "action:fill" && step.status === "passed")
        && browser?.steps.some(step => step.name === "action:click" && step.status === "passed")
        && browser?.steps.some(step => step.name === "assert:localStorageEquals" && step.status === "passed")
        && browser?.screenshots.length === 1
        && fs.existsSync(browser.screenshots[0])
        && (browser?.pageSnapshots || []).length >= 1
        && !!browser?.consoleLogPath
        && !!browser?.networkLogPath
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("screenshots")?.status === "verified"
        && byCheck.get("console_errors")?.status === "verified"
        && markdown.includes("Real profile save flow")
        && !!report.metadata.playwrightLaunch?.launchAttempt;
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
async function runTestAgentPlaywrightResourceErrorSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-resource-error-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/app`;
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head>",
        "<title>Resource Error Fixture</title>",
        "</head>",
        "<body><main><h1>Resource fixture</h1><p role=\"status\">Ready despite broken fetch</p></main>",
        "<script>",
        "fetch('/api/missing').then(response => { document.body.dataset.missingStatus = String(response.status); });",
        "</script>",
        "</body>",
        "</html>`;",
        "http.createServer((req, res) => {",
        "  if (req.url === '/api/missing') { res.writeHead(404, {'content-type':'application/json'}); res.end(JSON.stringify({ error: 'missing' })); return; }",
        "  res.writeHead(200, {'content-type':'text/html'});",
        "  res.end(html);",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
    const report = await (0, agent_1.runTestAgent)({
        id: `playwright-resource-error-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify TestAgent catches same-origin browser resource failures.",
        acceptanceCriteria: ["A missing same-origin script must fail network verification even when page text renders."],
        requiredChecks: ["browser_e2e", "network", "browser_network_logs", "screenshots"],
        projects: [{
                name: "playwright-resource-error-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                browserChecks: [{
                        name: "Missing same-origin fetch is detected",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "waitForTimeout", value: "300" },
                        ],
                        assertions: [
                            { type: "text", text: "Ready despite broken fetch" },
                            { type: "jsEquals", expression: "document.body.dataset.missingStatus", value: "404" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
            failOnHttpResourceError: true,
        },
    }, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const networkErrors = browser?.networkErrors || [];
    const networkLogPath = String(browser?.networkLogPath || "");
    const networkLog = fs.existsSync(networkLogPath) ? fs.readFileSync(networkLogPath, "utf-8") : "";
    const markdownPath = String(report.metadata.artifactFiles?.reportMarkdownPath || "");
    const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
    const verdictPath = String(report.metadata.artifactFiles?.verdictJsonPath || "");
    const verdict = fs.existsSync(verdictPath) ? JSON.parse(fs.readFileSync(verdictPath, "utf-8")) : null;
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const artifactVerification = fs.existsSync(manifestPath) ? (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath) : null;
    const cliSummary = (0, cli_1.formatTestAgentCliReportSummary)(report);
    const networkSummary = report.browserNetworkSummary?.[0];
    const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
    const http = report.httpResults[0];
    const pass = report.status === "failed"
        && report.recommendation === "rework"
        && http?.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "failed"
        && browser?.steps.some(step => step.name === "assert:jsEquals" && step.status === "passed")
        && browser?.steps.some(step => step.name === "assert:networkNoErrors" && step.status === "failed" && String(step.error || "").includes("/api/missing"))
        && networkErrors.some(item => item.includes("http_resource_error 404 fetch") && item.includes("/api/missing"))
        && !networkErrors.some(item => item.includes("favicon.ico"))
        && networkLog.includes("response 404 fetch")
        && networkLog.includes("/api/missing")
        && networkSummary?.errorCount === 1
        && networkSummary?.failedResponseCount === 1
        && networkSummary?.statusCodes?.["404"] === 1
        && networkSummary?.resourceTypes?.fetch === 1
        && networkSummary?.failureKinds?.http_resource_error === 1
        && networkSummary?.failedUrls?.some(item => item.includes("/api/missing"))
        && networkSummary?.networkLogPath === networkLogPath
        && markdown.includes("## Browser Network Summary")
        && markdown.includes("errors=1")
        && markdown.includes("/api/missing")
        && cliSummary.includes("Browser network: errors:1")
        && verdict?.browserNetworkSummary?.[0]?.errorCount === 1
        && verdict?.evidenceSummary?.browserNetworkErrors === 1
        && artifactVerification?.status === "passed"
        && artifactVerification?.items?.some(item => item.type === "verdict_consistency" && item.status === "passed")
        && byCheck.get("network")?.status === "not_verified"
        && byCheck.get("browser_network_logs")?.status === "not_verified";
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        availability,
        networkErrors,
        networkLog,
        networkSummary,
        verdict,
        artifactVerification,
        cliSummary,
    };
}
async function runTestAgentStandaloneCliRealWebSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available) {
        return {
            pass: false,
            availability,
            reason: availability.reason,
        };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-standalone-cli-real-web-selftest-"));
    const artifactDir = path.join(dir, "artifacts");
    const workOrderPath = path.join(dir, "work-order.json");
    const port = await getFreePort();
    const targetUrl = `http://127.0.0.1:${port}/app`;
    const cliPath = path.join(__dirname, "cli.js");
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const html = `<!doctype html>",
        "<html><head><title>Standalone CLI Fixture</title></head>",
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
    const workOrder = {
        schema: "ccm-test-agent-work-order-v1",
        id: `standalone-cli-real-web-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify standalone TestAgent CLI can validate a real web feature in a browser.",
        acceptanceCriteria: [
            'Task board saves "Ship TestAgent" and still shows it after refresh at /app',
        ],
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
                name: "standalone-cli-real-web-self-test",
                workDir: dir,
                verificationCommands: [`"${process.execPath}" -e "console.log('standalone fixture command ok')"`],
                runCommand: `"${process.execPath}" server.js`,
                targetUrl,
                env: { PORT: port },
                httpChecks: [{
                        name: "Task board HTTP probe",
                        url: targetUrl,
                        assertions: [
                            { type: "status", status: 200 },
                            { type: "textIncludes", text: "Task board" },
                        ],
                    }],
                browserChecks: [{
                        name: "Standalone CLI task board flow",
                        url: targetUrl,
                        actions: [
                            { type: "goto", url: targetUrl },
                            { type: "fill", selector: "#task", value: "Ship TestAgent" },
                            { type: "click", role: "button", name: "Add task" },
                            { type: "reload" },
                        ],
                        assertions: [
                            { type: "text", text: "Ship TestAgent" },
                            { type: "localStorageIncludes", key: "tasks", value: "Ship TestAgent" },
                            { type: "urlIncludes", text: "/app" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            browserProvider: "playwright",
            collectBrowserArtifacts: true,
        },
    };
    fs.writeFileSync(workOrderPath, JSON.stringify(workOrder, null, 2), "utf-8");
    const runResult = (0, child_process_1.spawnSync)(process.execPath, [
        cliPath,
        workOrderPath,
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
        ? (0, child_process_1.spawnSync)(process.execPath, [
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
    const byCheck = new Map((report?.requiredCheckCoverage || []).map((item) => [item.check, item]));
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
        && report?.commandResults?.some((item) => item.status === "passed" && String(item.output || "").includes("standalone fixture command ok"))
        && report?.httpResults?.some((item) => item.status === "passed" && item.name === "Task board HTTP probe")
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl?.includes("/app")
        && browser?.pageTextPreview?.includes("Ship TestAgent")
        && browser?.steps?.some((step) => step.name === "action:reload" && step.status === "passed")
        && browser?.steps?.some((step) => step.name === "assert:localStorageIncludes" && step.status === "passed")
        && browser?.screenshots?.some((item) => fs.existsSync(item))
        && browserArtifacts.some((item) => item.type === "trace" && fs.existsSync(item.path))
        && browserArtifacts.some((item) => item.type === "har" && fs.existsSync(item.path))
        && byCheck.get("commands")?.status === "verified"
        && byCheck.get("http")?.status === "verified"
        && byCheck.get("browser_e2e")?.status === "verified"
        && byCheck.get("browser_trace")?.status === "verified"
        && byCheck.get("browser_har")?.status === "verified"
        && manifest?.summary?.browserTraces >= 1
        && manifest?.summary?.browserHars >= 1
        && verifyResult?.status === 0
        && verifyStdout.includes("TestAgent artifact verification: passed");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
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
async function runTestAgentStandaloneHandoffRealWebSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
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
    const runResult = (0, child_process_1.spawnSync)(process.execPath, [
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
        ? (0, child_process_1.spawnSync)(process.execPath, [
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
    const byCheck = new Map((report?.requiredCheckCoverage || []).map((item) => [item.check, item]));
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
        && report?.commandResults?.some((item) => item.status === "passed" && String(item.output || "").includes("handoff fixture command ok"))
        && report?.httpResults?.some((item) => item.status === "passed" && item.name === "Handoff task board HTTP probe")
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser?.finalUrl?.includes("/app")
        && browser?.pageTextPreview?.includes("Ship handoff browser test")
        && browser?.steps?.some((step) => step.name === "action:reload" && step.status === "passed")
        && browser?.steps?.some((step) => step.name === "assert:localStorageIncludes" && step.status === "passed")
        && browser?.screenshots?.some((item) => fs.existsSync(item))
        && browserArtifacts.some((item) => item.type === "trace" && fs.existsSync(item.path))
        && browserArtifacts.some((item) => item.type === "har" && fs.existsSync(item.path))
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
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
async function runTestAgentPlaywrightAvailabilitySelfTest() {
    let closed = false;
    let fallbackClosed = false;
    const available = await (0, playwright_provider_1.checkPlaywrightAvailability)(() => ({
        chromium: {
            launch: async () => ({
                close: async () => { closed = true; },
            }),
        },
    }));
    const unavailable = await (0, playwright_provider_1.checkPlaywrightAvailability)(() => ({
        chromium: {
            launch: async () => {
                throw new Error("missing chromium binary");
            },
        },
    }));
    const fallback = await (0, playwright_provider_1.checkPlaywrightAvailability)(() => ({
        chromium: {
            launch: async (options = {}) => {
                if (options.channel === "msedge") {
                    return { close: async () => { fallbackClosed = true; } };
                }
                throw new Error(`missing ${options.channel || "bundled"}`);
            },
        },
    }));
    const availableDiagnostics = available.diagnostics || {};
    const unavailableDiagnostics = unavailable.diagnostics || {};
    const fallbackDiagnostics = fallback.diagnostics || {};
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
async function runTestAgentRequiredCheckCoverageSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-required-coverage-selftest-"));
    const report = await (0, agent_1.runTestAgent)({
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
    const pass = report.status === "partial"
        && byCheck.get("commands")?.status === "verified"
        && byCheck.get("screenshots")?.status === "unknown"
        && !!byCheck.get("screenshots")?.missingReason
        && report.risks.some(item => item.includes("required check screenshots"));
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
    };
}
async function runTestAgentCliSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-cli-selftest-"));
    const workOrderPath = path.join(dir, "work-order.json");
    const handoffPath = path.join(dir, "handoff.json");
    const invalidHandoffPath = path.join(dir, "invalid-handoff.json");
    const warningHandoffPath = path.join(dir, "warning-handoff.json");
    const artifactDir = path.join(dir, "artifacts");
    const handoffArtifactDir = path.join(dir, "handoff-artifacts");
    const workOrder = {
        schema: "ccm-test-agent-work-order-v1",
        id: `cli-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify standalone TestAgent CLI execution.",
        acceptanceCriteria: ["CLI can validate and execute a work order file"],
        requiredChecks: ["commands"],
        projects: [{
                name: "cli-self-test",
                workDir: dir,
                verificationCommands: [`"${process.execPath}" -e "console.log('cli command ok')"`],
            }],
    };
    const handoff = {
        taskId: `cli-handoff-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify standalone TestAgent CLI can consume a handoff file.",
        acceptanceCriteria: ["Handoff input becomes a runnable TestAgent work order"],
        completedTasks: ["CLI handoff conversion implemented"],
        completedByProjectAgents: ["handoff-builder-agent"],
        projects: [{
                name: "cli-handoff-self-test",
                workDir: dir,
                verificationCommands: [`"${process.execPath}" -e "console.log('handoff cli command ok')"`],
                completedTasks: ["Handoff command evidence produced"],
            }],
        options: {
            browserProvider: "none",
        },
    };
    const warningHandoff = {
        taskId: `cli-warning-handoff-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify handoff builder diagnostics are surfaced by the CLI.",
        projects: [{
                name: "warning-handoff-self-test",
                verificationCommands: [`"${process.execPath}" -e "console.log('warning handoff command ok')"`],
            }],
        options: {
            browserProvider: "none",
        },
    };
    fs.writeFileSync(workOrderPath, JSON.stringify(workOrder, null, 2), "utf-8");
    fs.writeFileSync(handoffPath, JSON.stringify(handoff, null, 2), "utf-8");
    fs.writeFileSync(invalidHandoffPath, "null", "utf-8");
    fs.writeFileSync(warningHandoffPath, JSON.stringify(warningHandoff, null, 2), "utf-8");
    const parsed = (0, cli_options_1.parseTestAgentCliArgs)([
        workOrderPath,
        "--summary",
        "--artifact-dir",
        artifactDir,
        "--browser-provider",
        "none",
        "--no-auto-discover",
    ]);
    const handoffParsed = (0, cli_options_1.parseTestAgentCliArgs)([
        "--from-handoff",
        handoffPath,
        "--summary",
        "--artifact-dir",
        handoffArtifactDir,
        "--browser-provider",
        "none",
        "--no-auto-discover",
    ]);
    const invalid = (0, cli_options_1.parseTestAgentCliArgs)([workOrderPath, "--browser-provider", "unknown"]);
    const invalidHandoffCombo = (0, cli_options_1.parseTestAgentCliArgs)([workOrderPath, "--from-handoff", handoffPath]);
    const overrides = (0, cli_options_1.cliOverrides)(parsed.options);
    const handoffOverrides = (0, cli_options_1.cliOverrides)(handoffParsed.options);
    const contractValidation = (0, contract_1.validateTestAgentWorkOrderContract)(workOrder, overrides);
    const validationSummary = (0, cli_1.formatTestAgentCliValidationSummary)(contractValidation);
    const validateStdout = [];
    const validateStderr = [];
    const validateResult = await (0, cli_1.runTestAgentCli)([
        workOrderPath,
        "--validate-only",
        "--summary",
        "--artifact-dir",
        artifactDir,
        "--browser-provider",
        "none",
    ], {
        stdout: { write: message => validateStdout.push(String(message)) },
        stderr: { write: message => validateStderr.push(String(message)) },
    });
    const runStdout = [];
    const runStderr = [];
    const runResult = await (0, cli_1.runTestAgentCli)([
        workOrderPath,
        "--summary",
        "--artifact-dir",
        artifactDir,
        "--browser-provider",
        "none",
        "--no-auto-discover",
    ], {
        stdout: { write: message => runStdout.push(String(message)) },
        stderr: { write: message => runStderr.push(String(message)) },
    });
    const reportJsonPath = path.join(artifactDir, "report.json");
    const report = fs.existsSync(reportJsonPath) ? JSON.parse(fs.readFileSync(reportJsonPath, "utf-8")) : null;
    const reportSummary = report ? (0, cli_1.formatTestAgentCliReportSummary)(report) : "";
    const handoffValidateStdout = [];
    const handoffValidateStderr = [];
    const handoffValidateResult = await (0, cli_1.runTestAgentCli)([
        "--from-handoff",
        handoffPath,
        "--validate-only",
        "--summary",
        "--artifact-dir",
        handoffArtifactDir,
        "--browser-provider",
        "none",
    ], {
        stdout: { write: message => handoffValidateStdout.push(String(message)) },
        stderr: { write: message => handoffValidateStderr.push(String(message)) },
    });
    const handoffRunStdout = [];
    const handoffRunStderr = [];
    const handoffRunResult = await (0, cli_1.runTestAgentCli)([
        "--from-handoff",
        handoffPath,
        "--summary",
        "--artifact-dir",
        handoffArtifactDir,
        "--browser-provider",
        "none",
        "--no-auto-discover",
    ], {
        stdout: { write: message => handoffRunStdout.push(String(message)) },
        stderr: { write: message => handoffRunStderr.push(String(message)) },
    });
    const handoffReportJsonPath = path.join(handoffArtifactDir, "report.json");
    const handoffReport = fs.existsSync(handoffReportJsonPath) ? JSON.parse(fs.readFileSync(handoffReportJsonPath, "utf-8")) : null;
    const handoffReportSummary = handoffReport ? (0, cli_1.formatTestAgentCliReportSummary)(handoffReport) : "";
    const invalidHandoffStdout = [];
    const invalidHandoffStderr = [];
    const invalidHandoffResult = await (0, cli_1.runTestAgentCli)([
        "--from-handoff",
        invalidHandoffPath,
        "--validate-only",
    ], {
        stdout: { write: message => invalidHandoffStdout.push(String(message)) },
        stderr: { write: message => invalidHandoffStderr.push(String(message)) },
    });
    const warningHandoffStdout = [];
    const warningHandoffStderr = [];
    const warningHandoffResult = await (0, cli_1.runTestAgentCli)([
        "--from-handoff",
        warningHandoffPath,
        "--validate-only",
        "--browser-provider",
        "none",
        "--no-auto-discover",
    ], {
        stdout: { write: message => warningHandoffStdout.push(String(message)) },
        stderr: { write: message => warningHandoffStderr.push(String(message)) },
    });
    let warningHandoffValidation = null;
    try {
        warningHandoffValidation = JSON.parse(warningHandoffStdout.join(""));
    }
    catch { }
    const pass = parsed.errors.length === 0
        && parsed.options.workOrderPath === workOrderPath
        && parsed.options.summary === true
        && parsed.options.json === false
        && parsed.options.artifactDir === artifactDir
        && parsed.options.browserProvider === "none"
        && parsed.options.autoDiscoverVerificationCommands === false
        && handoffParsed.errors.length === 0
        && handoffParsed.options.handoffPath === handoffPath
        && handoffParsed.options.workOrderPath === ""
        && handoffParsed.options.artifactDir === handoffArtifactDir
        && handoffOverrides.artifactDir === handoffArtifactDir
        && handoffOverrides.browserProvider === "none"
        && invalid.errors.some(error => error.includes("Unsupported browser provider"))
        && invalidHandoffCombo.errors.some(error => error.includes("--from-handoff cannot be combined"))
        && overrides.artifactDir === artifactDir
        && overrides.browserProvider === "none"
        && overrides.autoDiscoverVerificationCommands === false
        && contractValidation.valid
        && validationSummary.includes("TestAgent work order: valid")
        && validationSummary.includes("Browser provider: none")
        && validateResult.exitCode === 0
        && validateStdout.join("").includes("TestAgent work order: valid")
        && validateStderr.length === 0
        && runResult.exitCode === 0
        && runStdout.join("").includes("TestAgent report: passed")
        && runStdout.join("").includes("Commands: passed:1")
        && runStderr.length === 0
        && report?.status === "passed"
        && reportSummary.includes("Artifacts:")
        && handoffValidateResult.exitCode === 0
        && handoffValidateStdout.join("").includes("TestAgent work order: valid")
        && handoffValidateStdout.join("").includes("Projects: cli-handoff-self-test")
        && handoffValidateStderr.length === 0
        && handoffRunResult.exitCode === 0
        && handoffRunStdout.join("").includes("TestAgent report: passed")
        && handoffRunStdout.join("").includes("Commands: passed:1")
        && handoffRunStderr.length === 0
        && handoffReport?.status === "passed"
        && handoffReport?.requiredChecks?.includes("commands")
        && handoffReport?.metadata?.handoffSource === "test-agent-handoff-builder"
        && handoffReport?.metadata?.completedByProjectAgents?.includes("handoff-builder-agent")
        && handoffReportSummary.includes("Artifacts:")
        && invalidHandoffResult.exitCode === 2
        && invalidHandoffStdout.length === 0
        && invalidHandoffStderr.join("").includes("root value must be a JSON object")
        && warningHandoffResult.exitCode === 0
        && warningHandoffStderr.length === 0
        && warningHandoffValidation?.valid === true
        && warningHandoffValidation?.warnings?.some((item) => item.code === "handoff_builder_warning" && String(item.message || "").includes("missing workDir"))
        && warningHandoffValidation?.warnings?.some((item) => item.code === "handoff_builder_warning" && String(item.message || "").includes("No acceptance criteria"))
        && warningHandoffValidation?.normalized?.metadata?.handoffWarnings?.some((item) => item.includes("missing workDir"));
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        parsed,
        handoffParsed,
        invalid,
        invalidHandoffCombo,
        validateResult,
        runResult,
        handoffValidateResult,
        handoffRunResult,
        invalidHandoffResult,
        warningHandoffResult,
        validationSummary,
        reportSummary,
        handoffReportSummary,
        invalidHandoffError: invalidHandoffStderr.join(""),
        warningHandoffValidation,
    };
}
function runTestAgentContractSelfTest() {
    const workOrderValidation = (0, contract_1.validateTestAgentWorkOrderContract)(contract_1.TEST_AGENT_WEB_APP_WORK_ORDER_EXAMPLE);
    const invalidWorkOrderValidation = (0, contract_1.validateTestAgentWorkOrderContract)({
        schema: "ccm-test-agent-work-order-v1",
        id: `contract-invalid-self-test-${process.pid}-${Date.now()}`,
    });
    const now = new Date().toISOString();
    const reportValidation = (0, contract_1.validateTestAgentReportContract)({
        schema: "ccm-test-agent-report-v1",
        agent: "test-agent",
        id: `contract-report-self-test-${process.pid}-${Date.now()}`,
        workOrderId: "contract-work-order",
        taskId: "contract-task",
        groupId: "contract-group",
        status: "passed",
        recommendation: "accept",
        summary: "Contract report validates.",
        startedAt: now,
        finishedAt: now,
        durationMs: 0,
        artifactDir: process.cwd(),
        requiredChecks: [],
        commandResults: [],
        devServerResults: [],
        httpResults: [],
        browserResults: [],
        browserToolCalls: [],
        requiredCheckCoverage: [],
        acceptanceCoverage: [],
        evidence: [],
        risks: [],
        blockedReasons: [],
        issues: [],
        metadata: {},
    });
    const verdictValidation = (0, contract_1.validateTestAgentVerdictContract)({
        schema: "ccm-test-agent-verdict-v1",
        agent: "test-agent",
        reportId: "contract-report",
        workOrderId: "contract-work-order",
        taskId: "contract-task",
        groupId: "contract-group",
        status: "passed",
        recommendation: "accept",
        canAccept: true,
        needsRework: false,
        needsHuman: false,
        summary: "Verdict contract validates.",
        failedRequiredChecks: [],
        unknownRequiredChecks: [],
        failedAcceptanceCriteria: [],
        unknownAcceptanceCriteria: [],
        blockedReasons: [],
        risks: [],
        nextActions: ["Accept the delivery if it matches the user-facing goal."],
        evidenceSummary: {
            commands: { passed: 1 },
            devServers: {},
            httpChecks: {},
            browserChecks: {},
            browserToolCalls: {},
            artifacts: 4,
        },
        keyEvidence: [],
        artifacts: {
            artifactDir: process.cwd(),
            reportJsonPath: "report.json",
            reportMarkdownPath: "report.md",
            verdictJsonPath: "verdict.json",
            manifestPath: "artifact-manifest.json",
        },
        metadata: {},
    });
    return {
        pass: workOrderValidation.valid
            && workOrderValidation.normalized?.schema === "ccm-test-agent-work-order-v1"
            && workOrderValidation.normalized?.projects[0].browserChecks.length === 1
            && workOrderValidation.normalized?.projects[0].adversarialBrowserChecks.length === 1
            && !invalidWorkOrderValidation.valid
            && invalidWorkOrderValidation.errors.some(issue => issue.path === "projects")
            && reportValidation.valid
            && verdictValidation.valid,
        workOrderValidation,
        invalidWorkOrderValidation,
        reportValidation,
        verdictValidation,
    };
}
//# sourceMappingURL=self-test.js.map
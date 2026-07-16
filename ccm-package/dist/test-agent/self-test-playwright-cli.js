"use strict";
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
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const self_test_policy_1 = require("./self-test-policy");
const artifact_verifier_1 = require("./artifact-verifier");
const playwright_provider_1 = require("./browser/playwright-provider");
const tool_executor_1 = require("./browser/tool-executor");
const cli_1 = require("./cli");
const cli_options_1 = require("./cli-options");
const contract_1 = require("./contract");
const required_checks_1 = require("./required-checks");
const verdict_1 = require("./verdict");
const self_test_1 = require("./self-test");
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
    const port = await (0, self_test_1.getFreePort)();
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
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const port = await (0, self_test_1.getFreePort)();
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
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const port = await (0, self_test_1.getFreePort)();
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
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const verdict = (0, verdict_1.buildTestAgentVerdict)(report);
    const cliSummary = (0, cli_1.formatTestAgentCliReportSummary)(report);
    const reportValidation = (0, contract_1.validateTestAgentReportContract)(report);
    const verdictValidation = (0, contract_1.validateTestAgentVerdictContract)(verdict);
    const markdownPath = String(report.metadata.artifactFiles?.reportMarkdownPath || "");
    const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
    const providerSummary = report.browserProviderSummary;
    const mcpProviderSummary = providerSummary.items.find(item => item.provider === "mcp");
    const pass = report.status === "passed"
        && Array.isArray(preflight)
        && preflight.some(item => item.provider === "mcp" && item.available === true && item.tools?.includes("mcp__playwright__browser_navigate"))
        && preflight.some(item => item.provider === "playwright")
        && providerSummary.status === "used"
        && providerSummary.preferred === "mcp"
        && providerSummary.selectedProvider === "mcp"
        && providerSummary.availableProviders.includes("mcp")
        && providerSummary.attemptedProviders.includes("mcp")
        && providerSummary.fallbackUsed === false
        && mcpProviderSummary?.selected === true
        && mcpProviderSummary?.attempted === true
        && mcpProviderSummary?.passed === 1
        && mcpProviderSummary?.tools?.includes("mcp__playwright__browser_navigate")
        && verdict.browserProviderSummary?.selectedProvider === "mcp"
        && cliSummary.includes("Browser providers: status=used; preferred=mcp; selected=mcp")
        && markdown.includes("## Browser Provider Summary")
        && markdown.includes("selected=yes")
        && markdown.includes("## Browser Provider Preflight")
        && markdown.includes("mcp__playwright__browser_navigate")
        && reportValidation.valid
        && verdictValidation.valid;
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        verdict,
        preflight,
        providerSummary,
        cliSummary,
        reportValidation,
        verdictValidation,
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
    const port = await (0, self_test_1.getFreePort)();
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
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const port = await (0, self_test_1.getFreePort)();
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
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const port = await (0, self_test_1.getFreePort)();
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
                adversarialBrowserChecks: [{
                        name: "Standalone CLI rejects an empty task",
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
    const port = await (0, self_test_1.getFreePort)();
    const targetUrl = `http://127.0.0.1:${port}/app`;
    const cliPath = path.join(__dirname, "cli.js");
    (0, self_test_1.writeTaskBoardFixtureServer)(dir);
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
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const { workOrder: networkWorkOrder } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `required-browser-network-coverage-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: ["Browser network evidence is tracked separately from generic browser evidence."],
        requiredChecks: ["browser_e2e", "browser_network", "browser_network_logs"],
        projects: [{ name: "required-browser-network-coverage-self-test", workDir: dir }],
    });
    const genericBrowserCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "Ready" }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                networkRequests: [],
            }],
    });
    const networkBrowserCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "assertion", name: "assert:networkRequest", status: "passed", detail: "method=POST urlIncludes=/api/tasks" },
                    { kind: "assertion", name: "assert:networkResponse", status: "passed", detail: "status=201 urlIncludes=/api/tasks" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                networkRequests: ["request POST http://example.test/api/tasks", "response 201 fetch http://example.test/api/tasks"],
                networkLogPath: path.join(dir, "browser.network.log"),
            }],
    });
    const failedNetworkBrowserCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected browser network telemetry to match method=POST urlIncludes=/api/tasks.",
                steps: [{ kind: "assertion", name: "assert:networkRequest", status: "failed", detail: "method=POST urlIncludes=/api/tasks", error: "Expected browser network telemetry to match method=POST urlIncludes=/api/tasks." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                networkRequests: [],
            }],
    });
    const { workOrder: accessibilityWorkOrder } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `required-accessibility-coverage-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: ["Accessibility evidence is tracked separately from generic browser evidence."],
        requiredChecks: ["browser_e2e", "accessibility", "aria", "browser_accessibility_snapshot"],
        projects: [{ name: "required-accessibility-coverage-self-test", workDir: dir }],
    });
    const genericAccessibilityCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "Settings" }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                browserArtifacts: [],
            }],
    });
    const accessibilityBrowserCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "assertion", name: "assert:accessibleNameEquals", status: "passed", detail: "button name=Save profile" },
                    { kind: "assertion", name: "assert:ariaExpanded", status: "passed", detail: "aria-expanded=true" },
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
            }],
    });
    const failedAccessibilityCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected accessible name to equal Save profile.",
                steps: [{ kind: "assertion", name: "assert:accessibleNameEquals", status: "failed", detail: "button name=Save profile", error: "Expected accessible name to equal Save profile." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                browserArtifacts: [],
            }],
    });
    const { workOrder: consoleWarningWorkOrder } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `required-console-warning-coverage-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: ["Console warning evidence is tracked separately from generic browser evidence."],
        requiredChecks: ["browser_e2e", "console_warnings", "console_errors"],
        projects: [{ name: "required-console-warning-coverage-self-test", workDir: dir }],
    });
    const genericConsoleWarningCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "Ready" }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const warningFreeConsoleCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:consoleNoWarnings", status: "passed", detail: "no console warning messages" }],
                screenshots: [],
                consoleMessages: ["[log] feature ready"],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                consoleLogPath: path.join(dir, "warning-free.console.log"),
            }],
    });
    const warningConsoleCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "Ready" }],
                screenshots: [],
                consoleMessages: ["[warning] deprecated API used"],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                consoleLogPath: path.join(dir, "warning.console.log"),
            }],
    });
    const failedWarningAssertionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:consoleNoWarnings", status: "failed", detail: "no console warning messages", error: "Unexpected browser console telemetry matched no console warning messages: warning: deprecated API" }],
                screenshots: [],
                consoleMessages: ["warning: deprecated API"],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                consoleLogPath: path.join(dir, "failed-warning.console.log"),
            }],
    });
    const failedConsoleErrorCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "Ready" }],
                screenshots: [],
                consoleMessages: ["error: Uncaught TypeError: boom"],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                consoleLogPath: path.join(dir, "console-error.console.log"),
            }],
    });
    const computerUseConsoleCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "mcp",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "action", name: "computer-use:goto", status: "passed", detail: "http://example.test/app typed into the active browser" }],
                screenshots: [],
                consoleMessages: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                consoleLogPath: path.join(dir, "computer-use.console.log"),
            }],
    });
    const { workOrder: browserInteractionWorkOrder } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `required-browser-interaction-coverage-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: ["Dialog and popup evidence is tracked separately from generic browser evidence."],
        requiredChecks: ["browser_e2e", "browser_dialog", "browser_popup", "browser_dialog_log", "browser_popup_log"],
        projects: [{ name: "required-browser-interaction-coverage-self-test", workDir: dir }],
    });
    const genericInteractionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "Ready" }],
                screenshots: [],
                consoleMessages: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                dialogMessages: [],
                popupMessages: [],
                dialogLogPath: path.join(dir, "generic.dialogs.log"),
                popupLogPath: path.join(dir, "generic.popups.log"),
            }],
    });
    const dialogInteractionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:dialogMessageIncludes", status: "passed", detail: "dialogType=alert; expected message substring length=12" }],
                screenshots: [],
                consoleMessages: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                dialogMessages: ["dialog alert message=\"Saved profile\" accepted=yes"],
                popupMessages: [],
                dialogLogPath: path.join(dir, "dialog.dialogs.log"),
            }],
    });
    const failedDialogInteractionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected browser dialog matching dialogType=alert.",
                steps: [{ kind: "assertion", name: "assert:dialogMessageIncludes", status: "failed", detail: "dialogType=alert; expected message substring length=9", error: "Observed dialogs: confirm: wrong type" }],
                screenshots: [],
                consoleMessages: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                dialogMessages: ["dialog confirm message=\"Confirm shipping\" accepted=yes"],
                popupMessages: [],
                dialogLogPath: path.join(dir, "failed-dialog.dialogs.log"),
            }],
    });
    const popupInteractionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:popupTextIncludes", status: "passed", detail: "any popup; expected text substring length=12" }],
                screenshots: [],
                consoleMessages: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                dialogMessages: [],
                popupMessages: ["popup url=http://example.test/help title=\"Help Center\" text=\"Support article\""],
                popupLogPath: path.join(dir, "popup.popups.log"),
            }],
    });
    const failedPopupInteractionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected browser popup matching any popup.",
                steps: [{ kind: "assertion", name: "assert:popupTextIncludes", status: "failed", detail: "any popup; expected text substring length=15", error: "Observed popups: 1" }],
                screenshots: [],
                consoleMessages: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                dialogMessages: [],
                popupMessages: ["popup url=http://example.test/help title=\"Help Center\" text=\"Support article\""],
                popupLogPath: path.join(dir, "failed-popup.popups.log"),
            }],
    });
    const { workOrder: transferWorkOrder } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `required-transfer-coverage-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: ["Upload and download evidence is tracked separately from generic browser evidence."],
        requiredChecks: ["browser_e2e", "browser_upload", "browser_download"],
        projects: [{ name: "required-transfer-coverage-self-test", workDir: dir }],
    });
    const genericTransferCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "Files" }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                browserArtifacts: [],
            }],
    });
    const uploadTransferCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                probeType: "acceptance_upload_flow",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "action", name: "action:uploadFile", status: "passed", detail: "label=Attachment; files=notes.txt" },
                    { kind: "assertion", name: "assert:text", status: "passed", detail: "Uploaded notes.txt" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                browserArtifacts: [],
            }],
    });
    const failedUploadTransferCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "uploadFile requires filePath/file_path/path or fileContent/file_content/content.",
                steps: [{ kind: "action", name: "action:uploadFile", status: "failed", detail: "label=Attachment", error: "uploadFile requires filePath/file_path/path or fileContent/file_content/content." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                browserArtifacts: [],
            }],
    });
    const downloadTransferCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:downloadedFile", status: "passed", detail: "filename=tasks.csv; contentIncludes=Ship TestAgent" }],
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
            }],
    });
    const failedDownloadTransferCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected downloaded file matching filename=tasks.csv.",
                steps: [{ kind: "assertion", name: "assert:downloadedFile", status: "failed", detail: "filename=tasks.csv", error: "No downloads were observed." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
                browserArtifacts: [],
            }],
    });
    const { workOrder: inputWorkOrder } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `required-input-coverage-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: ["Keyboard, focus, and clipboard evidence is tracked separately from generic browser evidence."],
        requiredChecks: ["browser_e2e", "browser_clipboard", "browser_focus", "browser_keyboard"],
        projects: [{ name: "required-input-coverage-self-test", workDir: dir }],
    });
    const genericInputCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "Input Ready" }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const clipboardInputCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "action", name: "action:setClipboard", status: "passed", detail: "text length=12" },
                    { kind: "assertion", name: "assert:clipboardTextEquals", status: "passed", detail: "expected length=12" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedClipboardInputCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Clipboard text did not match expected length.",
                steps: [{ kind: "assertion", name: "assert:clipboardTextEquals", status: "failed", detail: "expected length=12", error: "Clipboard text length 4 did not equal expected length 12." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const focusInputCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "action", name: "action:focus", status: "passed", detail: "label=Email" },
                    { kind: "assertion", name: "assert:focused", status: "passed", detail: "label=Email" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedFocusInputCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected target to be focused.",
                steps: [{ kind: "assertion", name: "assert:focused", status: "failed", detail: "role=button; name=Save", error: "Expected target to be focused." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const keyboardInputCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "action", name: "action:typeText", status: "passed", detail: "label=Search; text length=5" },
                    { kind: "action", name: "action:press", status: "passed", detail: "Enter" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedKeyboardInputCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "press requires key/text/value.",
                steps: [{ kind: "action", name: "action:press", status: "failed", detail: "", error: "press requires key/text/value." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const { workOrder: visualLayoutWorkOrder } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `required-visual-layout-coverage-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: ["Visual and layout evidence is tracked separately from generic browser and screenshot evidence."],
        requiredChecks: ["browser_e2e", "screenshots", "browser_visual", "browser_layout"],
        projects: [{ name: "required-visual-layout-coverage-self-test", workDir: dir }],
    });
    const genericVisualLayoutCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "Chart ready" }],
                screenshots: [path.join(dir, "visual.png")],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const visualAssertionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:elementScreenshotNotBlank", status: "passed", detail: "selector=#chart; minUniqueColors=3" }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedVisualAssertionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Element screenshot was visually blank.",
                steps: [{ kind: "assertion", name: "assert:elementScreenshotNotBlank", status: "failed", detail: "selector=#chart; minNonWhitePixels=100", error: "Expected element screenshot to contain non-blank visual content." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const layoutAssertionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "assertion", name: "assert:inViewport", status: "passed", detail: "testId=cta" },
                    { kind: "assertion", name: "assert:noHorizontalOverflow", status: "passed", detail: "scrollWidth=390 clientWidth=390" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedLayoutAssertionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected no horizontal overflow.",
                steps: [{ kind: "assertion", name: "assert:noHorizontalOverflow", status: "failed", detail: "scrollWidth=900 clientWidth=390", error: "Page has horizontal overflow." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const { workOrder: uiStructureWorkOrder } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `required-ui-structure-coverage-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: ["Form, table, list, and text-order evidence is tracked separately from generic browser evidence."],
        requiredChecks: ["browser_e2e", "browser_form", "form_state", "input_value", "selected", "checked", "enabled", "browser_table", "browser_list", "browser_text_order"],
        projects: [{ name: "required-ui-structure-coverage-self-test", workDir: dir }],
    });
    const genericUiStructureCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "Dashboard Ready" }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const formFlowCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                probeType: "acceptance_form_flow",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "action", name: "action:fill", status: "passed", detail: "label=Display name; value length=12" },
                    { kind: "action", name: "action:click", status: "passed", detail: "role=button; name=Save" },
                    { kind: "assertion", name: "assert:text", status: "passed", detail: "Saved profile" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const formStateCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "assertion", name: "assert:inputValueEquals", status: "passed", detail: "label=Display name; expected length=12" },
                    { kind: "assertion", name: "assert:selectedTextIncludes", status: "passed", detail: "label=Priority; expected=High" },
                    { kind: "assertion", name: "assert:checked", status: "passed", detail: "label=Notify team" },
                    { kind: "assertion", name: "assert:enabled", status: "passed", detail: "role=button; name=Save" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedFormStateCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected input value to equal Ada Lovelace.",
                steps: [{ kind: "assertion", name: "assert:inputValueEquals", status: "failed", detail: "label=Display name; expected length=12", error: "Expected input value to equal Ada Lovelace." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const tableCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "assertion", name: "assert:tableRowIncludes", status: "passed", detail: "selector=#orders; expected text count=2" },
                    { kind: "assertion", name: "assert:tableCellTextEquals", status: "passed", detail: "column=Status; expected=Shipped" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedTableCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected table cell Status to equal Shipped.",
                steps: [{ kind: "assertion", name: "assert:tableCellTextEquals", status: "failed", detail: "column=Status; expected=Shipped", error: "Expected table cell Status to equal Shipped." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const listCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:elementCountAtLeast", status: "passed", detail: "role=listitem; min count=3" }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedListCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected element count to equal 3.",
                steps: [{ kind: "assertion", name: "assert:elementCountEquals", status: "failed", detail: "role=listitem; expected count=3", error: "Expected element count to equal 3." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const textOrderCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:textOrder", status: "passed", detail: "expected text count=3" }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedTextOrderCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected text order to match Alpha, Bravo, Charlie.",
                steps: [{ kind: "assertion", name: "assert:textOrder", status: "failed", detail: "expected text count=3", error: "Expected text order to match Alpha, Bravo, Charlie." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const { workOrder: pageStateWorkOrder } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `required-page-state-coverage-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: ["URL, title, navigation, attributes, network state, and presence evidence is tracked separately from generic browser evidence."],
        requiredChecks: ["browser_e2e", "browser_url", "browser_title", "browser_navigation", "browser_attribute", "browser_network_state", "browser_presence", "browser_visibility"],
        projects: [{ name: "required-page-state-coverage-self-test", workDir: dir }],
    });
    const genericPageStateCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "Home Ready" }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const urlTitleNavigationCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "action", name: "action:waitForUrl", status: "passed", detail: "/done" },
                    { kind: "assertion", name: "assert:urlIncludes", status: "passed", detail: "expected=/done" },
                    { kind: "assertion", name: "assert:titleEquals", status: "passed", detail: "expected=Done Title" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedUrlTitleNavigationCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected URL to include /done and title to equal Done Title.",
                steps: [
                    { kind: "assertion", name: "assert:urlIncludes", status: "failed", detail: "expected=/done", error: "Expected URL to include /done." },
                    { kind: "assertion", name: "assert:titleEquals", status: "failed", detail: "expected=Done Title", error: "Expected title to equal Done Title." },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const attributeCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "assertion", name: "assert:attributeEquals", status: "passed", detail: "attribute=aria-expanded; expected length=4" },
                    { kind: "assertion", name: "assert:attributeIncludes", status: "passed", detail: "attribute=data-state; expected substring length=6" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedAttributeCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected aria-expanded to equal true.",
                steps: [{ kind: "assertion", name: "assert:attributeEquals", status: "failed", detail: "attribute=aria-expanded; expected length=4", error: "Expected aria-expanded to equal true." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const networkStateCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "action", name: "action:setOffline", status: "passed", detail: "offline" },
                    { kind: "assertion", name: "assert:browserOffline", status: "passed", detail: "offline" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedNetworkStateCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected browser to be online.",
                steps: [{ kind: "assertion", name: "assert:browserOnline", status: "failed", detail: "online", error: "Expected browser to be online." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const presenceCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "assertion", name: "assert:visible", status: "passed", detail: "role=button; name=Save" },
                    { kind: "assertion", name: "assert:notPresent", status: "passed", detail: "selector=#deleted" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedPresenceCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected target to be hidden.",
                steps: [{ kind: "assertion", name: "assert:notVisible", status: "failed", detail: "text=Debug panel", error: "Expected target to be hidden." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const { workOrder: interactionActionWorkOrder } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `required-interaction-action-coverage-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: ["Hover, drag/drop, scroll, and history action evidence is tracked separately from generic browser evidence."],
        requiredChecks: ["browser_e2e", "browser_hover", "browser_drag", "browser_scroll", "browser_history", "browser_reload"],
        projects: [{ name: "required-interaction-action-coverage-self-test", workDir: dir }],
    });
    const genericInteractionActionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "App Ready" }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const hoverInteractionActionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "action", name: "action:hover", status: "passed", detail: "role=button; name=Tools" },
                    { kind: "assertion", name: "assert:visible", status: "passed", detail: "role=menuitem; name=Export" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedHoverInteractionActionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected hover target to be visible.",
                steps: [{ kind: "action", name: "action:hover", status: "failed", detail: "role=button; name=Missing", error: "Expected hover target to be visible." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const dragInteractionActionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "action", name: "action:dragTo", status: "passed", detail: "text=Task; destinationTestId=done-column" },
                    { kind: "assertion", name: "assert:elementTextIncludes", status: "passed", detail: "testId=done-list" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedDragInteractionActionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Drag destination missing.",
                steps: [{ kind: "action", name: "action:dragTo", status: "failed", detail: "destinationTestId=missing-column", error: "Drag destination missing." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const scrollInteractionActionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "action", name: "action:scroll", status: "passed", detail: "page; down 920px" },
                    { kind: "assertion", name: "assert:inViewport", status: "passed", detail: "testId=below-fold-cta" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedScrollInteractionActionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Scroll target missing.",
                steps: [{ kind: "action", name: "action:scroll", status: "failed", detail: "selector=#missing; down 400px", error: "Scroll target missing." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const historyInteractionActionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "action", name: "action:reload", status: "passed", detail: "domcontentloaded" },
                    { kind: "action", name: "action:goBack", status: "passed", detail: "domcontentloaded" },
                    { kind: "action", name: "action:goForward", status: "passed", detail: "domcontentloaded" },
                    { kind: "assertion", name: "assert:urlIncludes", status: "passed", detail: "/start" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedHistoryInteractionActionCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "History navigation failed.",
                steps: [{ kind: "action", name: "action:goBack", status: "failed", detail: "domcontentloaded", error: "History navigation failed." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const { workOrder: scriptWaitWorkOrder } = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)({
        id: `required-script-wait-coverage-self-test-${process.pid}-${Date.now()}`,
        acceptanceCriteria: ["Browser JavaScript/expression and conditional wait evidence is tracked separately from generic browser evidence."],
        requiredChecks: ["browser_e2e", "browser_js", "browser_script", "browser_wait"],
        projects: [{ name: "required-script-wait-coverage-self-test", workDir: dir }],
    });
    const genericScriptWaitCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [{ kind: "assertion", name: "assert:text", status: "passed", detail: "App Ready" }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const scriptCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "action", name: "action:evaluate", status: "passed", detail: "localStorage.setItem('profile.saved','yes')" },
                    { kind: "assertion", name: "assert:jsTruthy", status: "passed", detail: "Boolean(localStorage.getItem('profile.saved'))" },
                    { kind: "assertion", name: "assert:jsEquals", status: "passed", detail: "document.readyState; expected=complete" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedScriptCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Expected JavaScript expression to be truthy.",
                steps: [{ kind: "assertion", name: "assert:jsTruthy", status: "failed", detail: "window.__ready === true", error: "Expected JavaScript expression to be truthy." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const waitCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "passed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                steps: [
                    { kind: "action", name: "action:waitForText", status: "passed", detail: "Ready after async load" },
                    { kind: "action", name: "action:waitForSelector", status: "passed", detail: "selector=#ready" },
                    { kind: "action", name: "action:waitForUrl", status: "passed", detail: "/done" },
                ],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
    const failedWaitCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
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
                status: "failed",
                provider: "playwright",
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: 1,
                error: "Timed out waiting for async text.",
                steps: [{ kind: "action", name: "action:waitForText", status: "failed", detail: "Ready after async load", error: "Timed out waiting for async text." }],
                screenshots: [],
                consoleErrors: [],
                pageErrors: [],
                networkErrors: [],
            }],
    });
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
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
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
                verificationCommands: [`"${process.execPath}" -e "console.log('CLI can validate and execute a work order file')"`],
            }],
        options: {
            requireAdversarialProbe: false,
            adversarialProbeWaiver: "CLI self-test isolates work-order transport and command execution.",
        },
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
                verificationCommands: [`"${process.execPath}" -e "console.log('Handoff input becomes a runnable TestAgent work order\\nCompleted task is independently verified: CLI handoff conversion implemented\\nCompleted task is independently verified: Handoff command evidence produced')"`],
                completedTasks: ["Handoff command evidence produced"],
            }],
        options: {
            browserProvider: "none",
            requireAdversarialProbe: false,
            adversarialProbeWaiver: "CLI handoff self-test isolates handoff conversion and command execution.",
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
    const selfTestModulePath = path.join(dir, "fake-cli-self-test.js");
    const selfTestMatrixParsed = (0, cli_options_1.parseTestAgentCliArgs)([
        "--self-test-matrix",
        "--self-test",
        "runTestAgentFastSelfTest,runTestAgentSecondSelfTest",
        "--self-test-pattern",
        "Cli",
        "--self-test-timeout-ms",
        "1234",
        "--self-test-stop-on-failure",
        "--self-test-module",
        selfTestModulePath,
        "--summary",
    ]);
    const invalidSelfTestMatrixCombo = (0, cli_options_1.parseTestAgentCliArgs)([workOrderPath, "--self-test-matrix"]);
    const invalidSelfTestTimeout = (0, cli_options_1.parseTestAgentCliArgs)(["--self-test-matrix", "--self-test-timeout-ms", "0"]);
    const invalidSelfTestSelector = (0, cli_options_1.parseTestAgentCliArgs)(["--self-test", "runTestAgentFastSelfTest"]);
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
    const selfTestMatrixStdout = [];
    const selfTestMatrixStderr = [];
    const selfTestMatrixCalls = [];
    const selfTestMatrixResult = await (0, cli_1.runTestAgentCli)([
        "--self-test-matrix",
        "--self-test",
        "runTestAgentFastSelfTest",
        "--self-test",
        "runTestAgentSecondSelfTest",
        "--self-test-pattern",
        "Cli",
        "--self-test-timeout-ms",
        "1234",
        "--self-test-stop-on-failure",
        "--self-test-module",
        selfTestModulePath,
        "--summary",
    ], {
        stdout: { write: message => selfTestMatrixStdout.push(String(message)) },
        stderr: { write: message => selfTestMatrixStderr.push(String(message)) },
        runSelfTestMatrix: async (options) => {
            selfTestMatrixCalls.push(options);
            const names = options.names || [];
            return {
                pass: true,
                total: names.length,
                passed: names.length,
                failed: 0,
                durationMs: 12,
                modulePath: String(options.selfTestModulePath || ""),
                timeoutMs: Number(options.timeoutMs || 0),
                results: names.map(name => ({
                    name,
                    pass: true,
                    durationMs: 4,
                    exitCode: 0,
                    timedOut: false,
                    reason: null,
                    status: "passed",
                    stdoutTail: "",
                    stderrTail: "",
                })),
            };
        },
    });
    const failingSelfTestMatrixStdout = [];
    const failingSelfTestMatrixStderr = [];
    const failingSelfTestMatrixResult = await (0, cli_1.runTestAgentCli)([
        "--self-test-matrix",
        "--self-test",
        "runTestAgentFailSelfTest",
        "--json",
    ], {
        stdout: { write: message => failingSelfTestMatrixStdout.push(String(message)) },
        stderr: { write: message => failingSelfTestMatrixStderr.push(String(message)) },
        runSelfTestMatrix: async (options) => ({
            pass: false,
            total: 1,
            passed: 0,
            failed: 1,
            durationMs: 7,
            modulePath: String(options.selfTestModulePath || "self-test.js"),
            timeoutMs: Number(options.timeoutMs || 180000),
            results: [{
                    name: options.names?.[0] || "runTestAgentFailSelfTest",
                    pass: false,
                    durationMs: 7,
                    exitCode: 1,
                    timedOut: false,
                    reason: "intentional cli matrix failure",
                    status: "failed",
                    stdoutTail: "",
                    stderrTail: "",
                }],
        }),
    });
    let failingSelfTestMatrixJson = null;
    try {
        failingSelfTestMatrixJson = JSON.parse(failingSelfTestMatrixStdout.join(""));
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
        && selfTestMatrixParsed.errors.length === 0
        && selfTestMatrixParsed.options.selfTestMatrix === true
        && selfTestMatrixParsed.options.selfTestNames.join(",") === "runTestAgentFastSelfTest,runTestAgentSecondSelfTest"
        && selfTestMatrixParsed.options.selfTestPattern === "Cli"
        && selfTestMatrixParsed.options.selfTestTimeoutMs === 1234
        && selfTestMatrixParsed.options.selfTestStopOnFailure === true
        && selfTestMatrixParsed.options.selfTestModulePath === selfTestModulePath
        && selfTestMatrixParsed.options.summary === true
        && selfTestMatrixParsed.options.json === false
        && invalid.errors.some(error => error.includes("Unsupported browser provider"))
        && invalidHandoffCombo.errors.some(error => error.includes("--from-handoff cannot be combined"))
        && invalidSelfTestMatrixCombo.errors.some(error => error.includes("--self-test-matrix cannot be combined with a work order path"))
        && invalidSelfTestTimeout.errors.some(error => error.includes("--self-test-timeout-ms requires a positive integer"))
        && invalidSelfTestSelector.errors.some(error => error.includes("--self-test requires --self-test-matrix"))
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
        && runStdout.join("").includes("Required checks: verified:1, not_verified:0, unknown:0, total:1")
        && runStdout.join("").includes("Required check attention: none")
        && runStdout.join("").includes("Required check verified evidence:")
        && runStdout.join("").includes("Acceptance coverage: verified:1, not_verified:0, unknown:0, total:1")
        && runStdout.join("").includes("Acceptance attention: none")
        && runStderr.length === 0
        && report?.status === "passed"
        && reportSummary.includes("Artifacts:")
        && reportSummary.includes("Required checks: verified:1, not_verified:0, unknown:0, total:1")
        && reportSummary.includes("Acceptance coverage: verified:1, not_verified:0, unknown:0, total:1")
        && handoffValidateResult.exitCode === 0
        && handoffValidateStdout.join("").includes("TestAgent work order: valid")
        && handoffValidateStdout.join("").includes("Projects: cli-handoff-self-test")
        && handoffValidateStderr.length === 0
        && handoffRunResult.exitCode === 0
        && handoffRunStdout.join("").includes("TestAgent report: passed")
        && handoffRunStdout.join("").includes("Commands: passed:1")
        && handoffRunStdout.join("").includes("Required checks: verified:1, not_verified:0, unknown:0, total:1")
        && handoffRunStdout.join("").includes("Acceptance coverage: verified:3, not_verified:0, unknown:0, total:3")
        && handoffRunStdout.join("").includes("Acceptance attention: none")
        && handoffRunStderr.length === 0
        && handoffReport?.status === "passed"
        && handoffReport?.requiredChecks?.includes("commands")
        && handoffReport?.metadata?.handoffSource === "test-agent-handoff-builder"
        && handoffReport?.metadata?.completedByProjectAgents?.includes("handoff-builder-agent")
        && handoffReportSummary.includes("Artifacts:")
        && handoffReportSummary.includes("Required check attention: none")
        && handoffReportSummary.includes("Acceptance attention: none")
        && handoffReportSummary.includes("Handoff input becomes a runnable TestAgent work order")
        && invalidHandoffResult.exitCode === 2
        && invalidHandoffStdout.length === 0
        && invalidHandoffStderr.join("").includes("root value must be a JSON object")
        && warningHandoffResult.exitCode === 0
        && warningHandoffStderr.length === 0
        && warningHandoffValidation?.valid === true
        && warningHandoffValidation?.warnings?.some((item) => item.code === "handoff_builder_warning" && String(item.message || "").includes("missing workDir"))
        && warningHandoffValidation?.warnings?.some((item) => item.code === "handoff_builder_warning" && String(item.message || "").includes("No acceptance criteria"))
        && warningHandoffValidation?.normalized?.metadata?.handoffWarnings?.some((item) => item.includes("missing workDir"))
        && selfTestMatrixResult.exitCode === 0
        && selfTestMatrixStderr.length === 0
        && selfTestMatrixStdout.join("").includes("TestAgent self-test matrix: passed")
        && selfTestMatrixStdout.join("").includes("PASS runTestAgentFastSelfTest")
        && selfTestMatrixCalls.length === 1
        && selfTestMatrixCalls[0]?.names?.join(",") === "runTestAgentFastSelfTest,runTestAgentSecondSelfTest"
        && selfTestMatrixCalls[0]?.pattern === "Cli"
        && selfTestMatrixCalls[0]?.timeoutMs === 1234
        && selfTestMatrixCalls[0]?.stopOnFailure === true
        && selfTestMatrixCalls[0]?.selfTestModulePath === selfTestModulePath
        && failingSelfTestMatrixResult.exitCode === 1
        && failingSelfTestMatrixStderr.length === 0
        && failingSelfTestMatrixJson?.pass === false
        && failingSelfTestMatrixJson?.failed === 1
        && failingSelfTestMatrixJson?.results?.[0]?.reason === "intentional cli matrix failure";
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
        selfTestMatrixParsed,
        invalidSelfTestMatrixCombo,
        invalidSelfTestTimeout,
        invalidSelfTestSelector,
        validateResult,
        runResult,
        handoffValidateResult,
        handoffRunResult,
        invalidHandoffResult,
        warningHandoffResult,
        selfTestMatrixResult,
        failingSelfTestMatrixResult,
        validationSummary,
        reportSummary,
        handoffReportSummary,
        invalidHandoffError: invalidHandoffStderr.join(""),
        warningHandoffValidation,
        selfTestMatrixSummary: selfTestMatrixStdout.join(""),
        failingSelfTestMatrixJson,
    };
}
function runTestAgentContractSelfTest() {
    const workOrderValidation = (0, contract_1.validateTestAgentWorkOrderContract)(contract_1.TEST_AGENT_WEB_APP_WORK_ORDER_EXAMPLE);
    const stabilityWorkOrderValidation = (0, contract_1.validateTestAgentWorkOrderContract)({
        schema: "ccm-test-agent-work-order-v1",
        id: `contract-stability-self-test-${process.pid}-${Date.now()}`,
        projects: [{
                name: "contract-stability-self-test",
                workDir: process.cwd(),
                browserChecks: [{
                        name: "stability alias",
                        repeat_runs: 3,
                    }],
            }],
    });
    const invalidStabilityWorkOrderValidation = (0, contract_1.validateTestAgentWorkOrderContract)({
        schema: "ccm-test-agent-work-order-v1",
        id: `contract-invalid-stability-self-test-${process.pid}-${Date.now()}`,
        projects: [{
                name: "contract-invalid-stability-self-test",
                workDir: process.cwd(),
                browserChecks: [{
                        name: "invalid stability limit",
                        stabilityRuns: 11,
                    }],
            }],
    });
    const invalidWorkOrderValidation = (0, contract_1.validateTestAgentWorkOrderContract)({
        schema: "ccm-test-agent-work-order-v1",
        id: `contract-invalid-self-test-${process.pid}-${Date.now()}`,
    });
    const now = new Date().toISOString();
    const browserEvidenceTemporalIntegrity = {
        status: "complete",
        toleranceMs: 100,
        reportDurationMs: 0,
        browserResultCount: 0,
        browserToolCallCount: 0,
        invalidItemCount: 0,
        invalidTimestampCount: 0,
        durationMismatchCount: 0,
        outsideReportWindowCount: 0,
        outsideResultWindowCount: 0,
        planMismatchCount: 0,
        items: [{
                kind: "report",
                id: "report",
                startedAt: now,
                finishedAt: now,
                durationMs: 0,
                status: "complete",
                errors: [],
            }],
    };
    const browserResourceLifecycleSummary = {
        status: "complete",
        eventCount: 0,
        ownedResourceCount: 0,
        externalResourceCount: 0,
        releasedResourceCount: 0,
        retainedExternalResourceCount: 0,
        openResourceCount: 0,
        cleanupFailureCount: 0,
        planMismatchCount: 0,
        duplicateResourceCount: 0,
        invalidOwnershipCount: 0,
        invalidTimestampCount: 0,
        outsideReportWindowCount: 0,
        resourceTypeCounts: {
            browser: 0,
            browser_context: 0,
            external_browser_session: 0,
        },
        events: [],
    };
    const reportValidation = (0, contract_1.validateTestAgentReportContract)({
        schema: "ccm-test-agent-report-v1",
        agent: "test-agent",
        id: `contract-report-self-test-${process.pid}-${Date.now()}`,
        workOrderId: "contract-work-order",
        taskId: "contract-task",
        groupId: "contract-group",
        originalUserGoal: "Validate the TestAgent report contract fixture.",
        acceptanceCriteria: [],
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
        browserResourceLifecycleEvents: [],
        browserEvidenceTemporalIntegrity,
        browserResourceLifecycleSummary,
        adversarialEvidenceSummary: {
            required: false,
            waived: true,
            waiverReason: "Contract fixture validates schema shape only.",
            status: "waived",
            total: 0,
            passed: 0,
            failed: 0,
            blocked: 0,
            skipped: 0,
            http: 0,
            browser: 0,
            relevant: 0,
            unlinked: 0,
            passedRelevant: 0,
            goalLinked: 0,
            criteriaCovered: [],
            probeTypes: [],
            items: [],
        },
        browserProviderGaps: [],
        requiredCheckCoverage: [],
        acceptanceCoverage: [],
        acceptanceEvidenceGateSummary: {
            status: "not_applicable",
            canAccept: true,
            total: 0,
            verified: 0,
            notVerified: 0,
            unknown: 0,
            matchedEvidence: 0,
            fallbackEvidence: 0,
            missingEvidence: 0,
            direct: 0,
            token: 0,
            fallback: 0,
            none: 0,
            failedCriteria: [],
            incompleteCriteria: [],
            weakCriteria: [],
        },
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
        requiredCheckSummary: {
            total: 0,
            statusCounts: {
                verified: 0,
                not_verified: 0,
                unknown: 0,
            },
            verified: [],
            notVerified: [],
            unknown: [],
        },
        acceptanceSummary: {
            total: 0,
            statusCounts: {
                verified: 0,
                not_verified: 0,
                unknown: 0,
            },
            matchStrengthCounts: {
                direct: 0,
                token: 0,
                fallback: 0,
                none: 0,
            },
            evidenceSourceCounts: {
                matched_evidence: 0,
                single_criterion_report_status: 0,
                none: 0,
            },
            verified: [],
            notVerified: [],
            unknown: [],
        },
        blockedReasons: [],
        risks: [],
        nextActions: ["Accept the delivery if it matches the user-facing goal."],
        evidenceSummary: {
            commands: { passed: 1 },
            devServers: {},
            httpChecks: {},
            browserChecks: {},
            browserToolCalls: {},
            adversarialProbes: 0,
            adversarialPassed: 0,
            adversarialFailed: 0,
            adversarialBlocked: 0,
            adversarialRelevant: 0,
            adversarialUnlinked: 0,
            adversarialPassedRelevant: 0,
            acceptanceMatchedEvidence: 0,
            acceptanceFallbackEvidence: 0,
            acceptanceMissingEvidence: 0,
            browserProviderGaps: 0,
            artifacts: 4,
        },
        browserEvidenceTemporalIntegrity,
        browserResourceLifecycleSummary,
        adversarialEvidenceSummary: {
            required: false,
            waived: true,
            waiverReason: "Contract fixture validates schema shape only.",
            status: "waived",
            total: 0,
            passed: 0,
            failed: 0,
            blocked: 0,
            skipped: 0,
            http: 0,
            browser: 0,
            relevant: 0,
            unlinked: 0,
            passedRelevant: 0,
            goalLinked: 0,
            criteriaCovered: [],
            probeTypes: [],
            items: [],
        },
        acceptanceEvidenceGateSummary: {
            status: "not_applicable",
            canAccept: true,
            total: 0,
            verified: 0,
            notVerified: 0,
            unknown: 0,
            matchedEvidence: 0,
            fallbackEvidence: 0,
            missingEvidence: 0,
            direct: 0,
            token: 0,
            fallback: 0,
            none: 0,
            failedCriteria: [],
            incompleteCriteria: [],
            weakCriteria: [],
        },
        browserProviderGaps: [],
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
            && stabilityWorkOrderValidation.valid
            && stabilityWorkOrderValidation.normalized?.projects[0].browserChecks[0].stabilityRuns === 3
            && !invalidStabilityWorkOrderValidation.valid
            && invalidStabilityWorkOrderValidation.errors.some(issue => issue.path.includes("stabilityRuns"))
            && !invalidWorkOrderValidation.valid
            && invalidWorkOrderValidation.errors.some(issue => issue.path === "projects")
            && reportValidation.valid
            && verdictValidation.valid,
        workOrderValidation,
        stabilityWorkOrderValidation,
        invalidStabilityWorkOrderValidation,
        invalidWorkOrderValidation,
        reportValidation,
        verdictValidation,
    };
}
//# sourceMappingURL=self-test-playwright-cli.js.map
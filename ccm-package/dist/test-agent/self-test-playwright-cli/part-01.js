"use strict";
// Behavior-freeze extraction from self-test-playwright-cli.ts (part-01.ts).
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
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const self_test_policy_1 = require("../self-test-policy");
const artifact_verifier_1 = require("../artifact-verifier");
const playwright_provider_1 = require("../browser/playwright-provider");
const tool_executor_1 = require("../browser/tool-executor");
const cli_1 = require("../cli");
const contract_1 = require("../contract");
const verdict_1 = require("../verdict");
const self_test_1 = require("../self-test");
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
//# sourceMappingURL=part-01.js.map
"use strict";
// Behavior-freeze extraction from self-test-browser-assertions.ts (part-05.ts).
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
exports.runTestAgentBrowserAttributeAssertionSelfTest = runTestAgentBrowserAttributeAssertionSelfTest;
exports.runTestAgentBrowserComputedStyleAssertionSelfTest = runTestAgentBrowserComputedStyleAssertionSelfTest;
exports.runTestAgentBrowserCookieAssertionSelfTest = runTestAgentBrowserCookieAssertionSelfTest;
exports.runTestAgentPlaywrightDownloadArtifactSelfTest = runTestAgentPlaywrightDownloadArtifactSelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const self_test_policy_1 = require("../self-test-policy");
const playwright_provider_1 = require("../browser/playwright-provider");
const self_test_1 = require("../self-test");
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const port = await (0, self_test_1.getFreePort)();
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
    const passReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const failReport = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
    const port = await (0, self_test_1.getFreePort)();
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
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)({
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
//# sourceMappingURL=part-05.js.map
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
exports.runTestAgentBrowserAuthenticationContractSelfTest = runTestAgentBrowserAuthenticationContractSelfTest;
exports.runTestAgentPlaywrightAuthenticationSelfTest = runTestAgentPlaywrightAuthenticationSelfTest;
exports.runTestAgentPlaywrightMultiSessionAuthenticationSelfTest = runTestAgentPlaywrightMultiSessionAuthenticationSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const net = __importStar(require("net"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const self_test_policy_1 = require("../self-test-policy");
const artifact_verifier_1 = require("../artifact-verifier");
const execution_plan_1 = require("../execution-plan");
const required_checks_1 = require("../required-checks");
const verdict_1 = require("../verdict");
const contract_1 = require("../contract");
const playwright_provider_1 = require("./playwright-provider");
const tool_executor_1 = require("./tool-executor");
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
function sha256File(filePath) {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
function refreshManifestItemIntegrity(manifestPath, artifactType) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const item = (manifest.files || []).find((entry) => entry.type === artifactType);
    if (!item?.path)
        return;
    const targetPath = path.resolve(item.path);
    const stat = fs.statSync(targetPath);
    const integrity = {
        exists: true,
        sizeBytes: stat.size,
        sha256: sha256File(targetPath),
    };
    for (const entry of manifest.files || []) {
        if (entry.type === artifactType || (entry.path && path.resolve(entry.path) === targetPath)) {
            entry.integrity = integrity;
        }
    }
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}
function writeAuthenticationFixtureServer(dir) {
    fs.writeFileSync(path.join(dir, "server.js"), [
        "const http = require('http');",
        "const expectedEmail = String(process.env.SERVER_EMAIL || process.env.TEST_EMAIL || '');",
        "const expectedPassword = String(process.env.SERVER_PASSWORD || process.env.TEST_PASSWORD || '');",
        "const sessionUsers = new Map([",
        "  [expectedPassword, expectedEmail],",
        "  [String(process.env.SERVER_ALICE_SECRET || ''), 'alice'],",
        "  [String(process.env.SERVER_BOB_SECRET || ''), 'bob'],",
        "].filter(([secret]) => secret));",
        "function cookie(req, name) {",
        "  const raw = String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(name + '='));",
        "  return raw ? decodeURIComponent(raw.slice(name.length + 1)) : '';",
        "}",
        "function userFor(req) { return sessionUsers.get(cookie(req, 'session')) || ''; }",
        "const loginHtml = `<!doctype html>",
        "<html><head><title>Secure login fixture</title><link rel=\"icon\" href=\"data:,\"></head>",
        "<body><main>",
        "<h1>Sign in</h1>",
        "<form id=\"login-form\">",
        "<label for=\"email\">Email</label><input id=\"email\" name=\"email\" autocomplete=\"username\">",
        "<label for=\"password\">Password</label><input id=\"password\" name=\"password\" type=\"password\" autocomplete=\"current-password\">",
        "<button type=\"submit\">Sign in</button>",
        "</form>",
        "<p id=\"status\" role=\"status\">Waiting</p>",
        "<script>",
        "document.getElementById('login-form').addEventListener('submit', async event => {",
        "  event.preventDefault();",
        "  const email = event.currentTarget.elements.email.value;",
        "  const password = event.currentTarget.elements.password.value;",
        "  const response = await fetch('/api/login', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({email, password}) });",
        "  const payload = await response.json();",
        "  console.log('login echo ' + payload.email + ' ' + payload.password);",
        "  if (!response.ok) { document.getElementById('status').textContent = 'Denied'; return; }",
        "  location.href = '/dashboard';",
        "});",
        "</script>",
        "</main></body></html>`;",
        "function dashboardHtml(user) { return `<!doctype html>",
        "<html><head><title>Authenticated dashboard</title><link rel=\"icon\" href=\"data:,\"></head>",
        "<body><main><h1>Dashboard</h1><p id=\"identity\">Signed in ${user}</p><p id=\"ready\" role=\"status\">Loading session</p>",
        "<script>",
        "fetch('/api/whoami').then(response => response.json()).then(payload => {",
        "  console.log('session echo ' + payload.user + ' ' + payload.secret);",
        "  document.getElementById('ready').textContent = 'Session ready';",
        "});",
        "</script>",
        "</main></body></html>`; }",
        "http.createServer((req, res) => {",
        "  const parsed = new URL(req.url || '/', 'http://127.0.0.1');",
        "  if (req.method === 'GET' && parsed.pathname === '/health') {",
        "    res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ok:true})); return;",
        "  }",
        "  if (req.method === 'POST' && parsed.pathname === '/api/login') {",
        "    let body = '';",
        "    req.on('data', chunk => { body += chunk; });",
        "    req.on('end', () => {",
        "      const payload = JSON.parse(body || '{}');",
        "      const ok = payload.email === expectedEmail && payload.password === expectedPassword;",
        "      if (ok) res.setHeader('set-cookie', 'session=' + encodeURIComponent(payload.password) + '; Path=/; SameSite=Lax');",
        "      res.writeHead(ok ? 200 : 401, {'content-type':'application/json'});",
        "      res.end(JSON.stringify({ok, email: payload.email, password: payload.password}));",
        "    });",
        "    return;",
        "  }",
        "  if (req.method === 'GET' && parsed.pathname === '/api/whoami') {",
        "    const user = userFor(req);",
        "    const secret = cookie(req, 'session');",
        "    res.writeHead(user ? 200 : 401, {'content-type':'application/json'});",
        "    res.end(JSON.stringify({user, secret}));",
        "    return;",
        "  }",
        "  if (req.method === 'GET' && parsed.pathname === '/dashboard') {",
        "    const user = userFor(req);",
        "    res.writeHead(user ? 200 : 401, {'content-type':'text/html; charset=utf-8'});",
        "    res.end(user ? dashboardHtml(user) : '<!doctype html><title>Unauthorized</title><p>Unauthorized</p>');",
        "    return;",
        "  }",
        "  if (req.method === 'GET' && parsed.pathname === '/login') {",
        "    res.writeHead(200, {'content-type':'text/html; charset=utf-8'}); res.end(loginHtml); return;",
        "  }",
        "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});",
        "  res.end('<!doctype html><title>Auth fixture</title><main><h1>Auth fixture ready</h1></main>');",
        "}).listen(process.env.PORT);",
    ].join("\n"), "utf-8");
}
function reportTextEvidencePaths(report) {
    const files = report.metadata?.artifactFiles || {};
    const paths = new Set([
        files.reportJsonPath,
        files.reportMarkdownPath,
        ...report.browserResults.flatMap((result) => [
            result.consoleLogPath,
            result.dialogLogPath,
            result.popupLogPath,
            result.networkLogPath,
            ...(result.pageSnapshots || []),
            ...(result.browserArtifacts || [])
                .filter((artifact) => artifact.type === "accessibility_snapshot")
                .map((artifact) => artifact.path),
            ...(result.browserSessions || []).flatMap((session) => [
                session.consoleLogPath,
                session.networkLogPath,
                ...(session.pageSnapshots || []),
                ...(session.browserArtifacts || [])
                    .filter((artifact) => artifact.type === "accessibility_snapshot")
                    .map((artifact) => artifact.path),
            ]),
        ]),
    ].filter(Boolean).map(String));
    return Array.from(paths).filter(filePath => fs.existsSync(filePath));
}
function textEvidenceHasNone(report, secrets) {
    return reportTextEvidencePaths(report).every(filePath => {
        const text = fs.readFileSync(filePath, "utf-8");
        return secrets.every(secret => !text.includes(secret));
    });
}
function storageStateCookie(secret) {
    return {
        cookies: [{
                name: "session",
                value: secret,
                domain: "127.0.0.1",
                path: "/",
                expires: -1,
                httpOnly: false,
                secure: false,
                sameSite: "Lax",
            }],
        origins: [],
    };
}
async function runTestAgentBrowserAuthenticationContractSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-auth-contract-selftest-"));
    const input = {
        id: `browser-auth-contract-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Validate safe browser authentication work-order aliases.",
        acceptanceCriteria: ["Authenticated browser checks use environment bindings and file-backed storage state."],
        requiredChecks: ["browser_auth"],
        projects: [{
                name: "browser-auth-contract-self-test",
                workDir: dir,
                targetUrl: "http://127.0.0.1:4173",
                browserChecks: [{
                        name: "Environment aliases",
                        auth_state_path: ".test/check-auth.json",
                        actions: [
                            { type: "fill", label: "Email", value_env: "TEST_EMAIL" },
                            { type: "fill", label: "Password", textEnv: "TEST_PASSWORD" },
                            { type: "setLocalStorage", key: "token", content_env: "TEST_TOKEN" },
                        ],
                    }, {
                        name: "Session storage-state aliases",
                        sessions: [
                            { name: "alice", auth_state_path: ".test/alice.json" },
                            { name: "bob", storage_state_path: ".test/bob.json" },
                        ],
                        sessionSteps: [
                            { session: "alice", assertion: { type: "text", text: "Alice" } },
                            { session: "bob", assertion: { type: "text", text: "Bob" } },
                        ],
                    }],
            }],
        options: {
            artifactDir: path.join(dir, "artifacts"),
            browserProvider: "mcp",
            collectBrowserArtifacts: true,
            collectBrowserVideo: true,
        },
    };
    const validation = (0, contract_1.validateTestAgentWorkOrderContract)(input);
    const normalized = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)(input);
    const plan = (0, execution_plan_1.buildTestAgentExecutionPlan)(input, {}, validation);
    const checks = normalized.workOrder.projects[0]?.browserChecks || [];
    const invalidInput = {
        ...input,
        id: `${input.id}-invalid`,
        projects: [{
                ...input.projects[0],
                browserChecks: [{
                        name: "Invalid authentication inputs",
                        storageState: { cookies: [{ name: "session", value: "raw-secret" }] },
                        actions: [
                            { type: "fill", label: "Email", valueEnv: "BAD-NAME" },
                            { type: "fill", label: "Password", value: "literal", valueEnv: "TEST_PASSWORD" },
                            { type: "click", text: "Submit", valueEnv: "TEST_TOKEN" },
                        ],
                    }],
            }],
    };
    const invalidValidation = (0, contract_1.validateTestAgentWorkOrderContract)(invalidInput);
    const invalidNormalized = (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)(invalidInput);
    const pass = validation.valid
        && normalized.issues.every(issue => issue.severity !== "error")
        && checks[0]?.storageStatePath === ".test/check-auth.json"
        && checks[0]?.actions[0]?.valueEnv === "TEST_EMAIL"
        && checks[0]?.actions[1]?.valueEnv === "TEST_PASSWORD"
        && checks[0]?.actions[2]?.valueEnv === "TEST_TOKEN"
        && checks[1]?.sessions?.[0]?.storageStatePath === ".test/alice.json"
        && checks[1]?.sessions?.[1]?.storageStatePath === ".test/bob.json"
        && plan.valid
        && plan.summary.browserAuthenticationChecks === 2
        && plan.summary.browserCredentialEnvBindings === 3
        && plan.summary.browserStorageStateFiles === 3
        && plan.summary.browserSensitiveArtifactSuppressions === 2
        && !plan.summary.expectedArtifactTypes.includes("browser_trace")
        && !plan.summary.expectedArtifactTypes.includes("browser_har")
        && !plan.summary.expectedArtifactTypes.includes("browser_video")
        && plan.browserProviderWarnings.filter(item => item.item === "browserAuthentication").length === 2
        && !invalidValidation.valid
        && invalidValidation.errors.some(issue => issue.message.includes("Inline browser authentication state"))
        && invalidNormalized.issues.some(issue => issue.code === "invalid_browser_action_value_env")
        && invalidNormalized.issues.some(issue => issue.code === "browser_action_value_source_conflict")
        && invalidNormalized.issues.some(issue => issue.code === "unsupported_browser_action_value_env")
        && invalidNormalized.issues.some(issue => issue.code === "invalid_browser_storage_state");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return { pass, validation, normalized, plan, invalidValidation, invalidNormalized };
}
async function runTestAgentPlaywrightAuthenticationSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available)
        return { pass: false, availability, reason: availability.reason };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-playwright-auth-selftest-"));
    writeAuthenticationFixtureServer(dir);
    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const email = `auth-user-${process.pid}@example.test`;
    const password = `auth-password-${Date.now()}-${process.pid}`;
    const artifactDir = path.join(dir, "artifacts");
    const input = {
        id: `playwright-auth-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify a real login flow with credentials supplied by environment variable names.",
        acceptanceCriteria: ["A valid test user can sign in and reach the authenticated dashboard."],
        requiredChecks: ["browser_e2e", "browser_auth", "browser_network", "console_errors", "screenshots"],
        projects: [{
                name: "playwright-auth-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl: `${baseUrl}/login`,
                startupUrl: `${baseUrl}/health`,
                env: {
                    PORT: String(port),
                    SERVER_EMAIL: email,
                    SERVER_PASSWORD: password,
                    TEST_EMAIL: email,
                    TEST_PASSWORD: password,
                },
                browserChecks: [{
                        name: "Environment credential login",
                        actions: [
                            { type: "goto", url: `${baseUrl}/login` },
                            { type: "fill", label: "Email", valueEnv: "TEST_EMAIL" },
                            { type: "fill", label: "Password", value_env: "TEST_PASSWORD" },
                            { type: "click", role: "button", name: "Sign in", exact: true },
                            { type: "waitForUrl", url: "/dashboard" },
                            { type: "waitForText", text: "Session ready" },
                        ],
                        assertions: [
                            { type: "text", text: `Signed in ${email}` },
                            { type: "urlIncludes", text: "/dashboard" },
                            { type: "consoleNoErrors" },
                            { type: "networkNoErrors" },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir,
            browserProvider: "mcp",
            collectBrowserArtifacts: true,
            collectBrowserVideo: true,
        },
    };
    const validation = (0, contract_1.validateTestAgentWorkOrderContract)(input);
    const plan = (0, execution_plan_1.buildTestAgentExecutionPlan)(input, {}, validation);
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: ["mcp__playwright__browser_navigate"],
        onCall: () => ({ ok: true }),
    });
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)(input, {
        browserProvider: "mcp",
        browserToolExecutor: executor,
    });
    const browser = report.browserResults[0];
    const authCoverage = report.requiredCheckCoverage.find(item => item.check === "browser_auth");
    const reportValidation = (0, contract_1.validateTestAgentReportContract)(report);
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const artifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const textEvidenceSafe = textEvidenceHasNone(report, [email, password]);
    const allBrowserArtifacts = [
        ...(browser?.browserArtifacts || []),
        ...(browser?.browserSessions || []).flatMap(session => session.browserArtifacts || []),
    ];
    const missingPort = await getFreePort();
    const missingInput = {
        ...input,
        id: `${input.id}-missing-env`,
        requiredChecks: ["browser_auth"],
        projects: [{
                ...input.projects[0],
                targetUrl: `http://127.0.0.1:${missingPort}/login`,
                startupUrl: `http://127.0.0.1:${missingPort}/health`,
                env: {
                    PORT: String(missingPort),
                    SERVER_EMAIL: email,
                    SERVER_PASSWORD: password,
                },
                browserChecks: [{
                        name: "Missing environment credential",
                        actions: [
                            { type: "goto", url: `http://127.0.0.1:${missingPort}/login` },
                            { type: "fill", label: "Email", valueEnv: "MISSING_TEST_EMAIL" },
                        ],
                    }],
            }],
        options: {
            ...input.options,
            artifactDir: path.join(dir, "missing-artifacts"),
            browserProvider: "playwright",
            collectBrowserArtifacts: false,
            collectBrowserVideo: false,
        },
    };
    const missingReport = await (0, self_test_policy_1.runTestAgentForSelfTest)(missingInput, { browserProvider: "playwright" });
    const missingBrowser = missingReport.browserResults[0];
    const missingCoverage = missingReport.requiredCheckCoverage.find(item => item.check === "browser_auth");
    const reportJsonPath = String(report.metadata.artifactFiles?.reportJsonPath || "");
    const verdictJsonPath = String(report.metadata.artifactFiles?.verdictJsonPath || "");
    const tamperedReport = JSON.parse(fs.readFileSync(reportJsonPath, "utf-8"));
    tamperedReport.browserResults[0].authentication.password = password;
    const tamperedVerdict = (0, verdict_1.buildTestAgentVerdict)(tamperedReport);
    fs.writeFileSync(reportJsonPath, `${JSON.stringify(tamperedReport, null, 2)}\n`, "utf-8");
    fs.writeFileSync(verdictJsonPath, `${JSON.stringify(tamperedVerdict, null, 2)}\n`, "utf-8");
    refreshManifestItemIntegrity(manifestPath, "report_json");
    refreshManifestItemIntegrity(manifestPath, "verdict_json");
    const tamperedVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const tamperedContract = (0, contract_1.validateTestAgentReportContract)(tamperedReport);
    const pass = validation.valid
        && plan.valid
        && plan.summary.browserAuthenticationChecks === 1
        && plan.summary.browserCredentialEnvBindings === 2
        && plan.summary.browserStorageStateFiles === 0
        && plan.summary.browserSensitiveArtifactSuppressions === 1
        && !plan.summary.expectedArtifactTypes.includes("browser_trace")
        && !plan.summary.expectedArtifactTypes.includes("browser_har")
        && !plan.summary.expectedArtifactTypes.includes("browser_video")
        && plan.browserProviderWarnings.some(item => item.item === "browserAuthentication")
        && report.status === "passed"
        && browser?.provider === "playwright"
        && browser?.status === "passed"
        && browser.authentication?.credentialEnvNames.join(",") === "TEST_EMAIL,TEST_PASSWORD"
        && browser.authentication?.sensitiveArtifactsSuppressed === true
        && !browser.authentication?.storageState
        && browser.steps.some(step => step.name === "action:fill" && step.detail?.includes("env:TEST_EMAIL"))
        && browser.steps.some(step => step.name === "action:fill" && step.detail?.includes("env:TEST_PASSWORD"))
        && browser.pageTextPreview?.includes("[redacted:TEST_EMAIL]")
        && (browser.consoleMessages || []).some(line => line.includes("[redacted:TEST_PASSWORD]"))
        && (browser.networkRequests || []).some(line => line.includes("[redacted:TEST_EMAIL]"))
        && (browser.networkRequests || []).some(line => line.includes("[redacted:TEST_PASSWORD]"))
        && allBrowserArtifacts.every(artifact => artifact.type !== "trace" && artifact.type !== "har" && artifact.type !== "video")
        && authCoverage?.status === "verified"
        && report.browserProviderSummary?.selectedProvider === "playwright"
        && report.browserProviderSummary?.fallbackUsed === true
        && report.browserToolCalls.length === 0
        && report.metadata.browserAuthenticationSummary?.credentialEnvNames?.join(",") === "TEST_EMAIL,TEST_PASSWORD"
        && textEvidenceSafe
        && reportValidation.valid
        && artifactVerification.status === "passed"
        && artifactVerification.items.some(item => item.type === "browser_authentication_evidence" && item.status === "passed")
        && missingBrowser?.status === "blocked"
        && missingBrowser?.authentication?.credentialEnvNames?.includes("MISSING_TEST_EMAIL")
        && String(missingBrowser?.error || "").includes("MISSING_TEST_EMAIL")
        && missingCoverage?.status === "unknown"
        && !tamperedContract.valid
        && tamperedVerification.status === "failed"
        && tamperedVerification.items.some(item => item.type === "browser_authentication_evidence"
            && item.status === "failed"
            && String(item.error || "").includes("password"));
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        validation,
        plan,
        report,
        reportValidation,
        artifactVerification,
        missingReport,
        tamperedContract,
        tamperedVerification,
        textEvidenceSafe,
    };
}
async function runTestAgentPlaywrightMultiSessionAuthenticationSelfTest() {
    const availability = await (0, playwright_provider_1.checkPlaywrightAvailability)();
    if (!availability.available)
        return { pass: false, availability, reason: availability.reason };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-multi-session-auth-selftest-"));
    writeAuthenticationFixtureServer(dir);
    const port = await getFreePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const aliceSecret = `alice-storage-secret-${Date.now()}-${process.pid}`;
    const bobSecret = `bob-storage-secret-${Date.now()}-${process.pid}`;
    const aliceStatePath = path.join(dir, "alice-state.json");
    const bobStatePath = path.join(dir, "bob-state.json");
    fs.writeFileSync(aliceStatePath, `${JSON.stringify(storageStateCookie(aliceSecret), null, 2)}\n`, "utf-8");
    fs.writeFileSync(bobStatePath, `${JSON.stringify(storageStateCookie(bobSecret), null, 2)}\n`, "utf-8");
    const artifactDir = path.join(dir, "artifacts");
    const input = {
        id: `multi-session-auth-self-test-${process.pid}-${Date.now()}`,
        originalUserGoal: "Verify two authenticated users in isolated browser sessions.",
        acceptanceCriteria: ["Alice and Bob each open the dashboard with their own authenticated session."],
        requiredChecks: ["browser_e2e", "browser_authentication", "browser_multi_session", "browser_network", "console_errors"],
        projects: [{
                name: "multi-session-auth-self-test",
                workDir: dir,
                runCommand: `"${process.execPath}" server.js`,
                targetUrl: baseUrl,
                startupUrl: `${baseUrl}/health`,
                env: {
                    PORT: String(port),
                    SERVER_ALICE_SECRET: aliceSecret,
                    SERVER_BOB_SECRET: bobSecret,
                },
                browserChecks: [{
                        name: "Alice and Bob authenticated dashboards",
                        sessions: [
                            {
                                name: "alice",
                                url: "/dashboard",
                                storageStatePath: path.basename(aliceStatePath),
                                setupActions: [{ type: "waitForText", text: "Session ready" }],
                            },
                            {
                                name: "bob",
                                url: "/dashboard",
                                auth_state_path: path.basename(bobStatePath),
                                setupActions: [{ type: "waitForText", text: "Session ready" }],
                            },
                        ],
                        sessionSteps: [
                            { session: "alice", assertion: { type: "text", text: "Signed in alice" } },
                            { session: "bob", assertion: { type: "text", text: "Signed in bob" } },
                            { session: "alice", assertion: { type: "consoleNoErrors" } },
                            { session: "bob", assertion: { type: "consoleNoErrors" } },
                            { session: "alice", assertion: { type: "networkNoErrors" } },
                            { session: "bob", assertion: { type: "networkNoErrors" } },
                        ],
                        screenshot: true,
                    }],
            }],
        options: {
            artifactDir,
            browserProvider: "playwright",
            collectBrowserArtifacts: true,
            collectBrowserVideo: true,
        },
    };
    const validation = (0, contract_1.validateTestAgentWorkOrderContract)(input);
    const plan = (0, execution_plan_1.buildTestAgentExecutionPlan)(input, {}, validation);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)(input, { browserProvider: "playwright" });
    const browser = report.browserResults[0];
    const authCoverage = report.requiredCheckCoverage.find(item => item.check === "browser_authentication");
    const reportValidation = (0, contract_1.validateTestAgentReportContract)(report);
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const artifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const textEvidenceSafe = textEvidenceHasNone(report, [aliceSecret, bobSecret]);
    const sessionAuthentication = (browser?.browserSessions || []).map(session => session.authentication);
    const storageFileNames = new Set(sessionAuthentication.map(authentication => authentication?.storageState?.fileName));
    const browserArtifacts = [
        ...(browser?.browserArtifacts || []),
        ...(browser?.browserSessions || []).flatMap(session => session.browserArtifacts || []),
    ];
    const directCoverage = (0, required_checks_1.buildRequiredCheckCoverage)({
        workOrder: (0, self_test_policy_1.normalizeTestAgentWorkOrderForSelfTest)(input).workOrder,
        commandResults: [],
        devServerResults: report.devServerResults,
        httpResults: [],
        browserResults: report.browserResults,
        browserToolCalls: [],
    }).find(item => item.check === "browser_authentication");
    const pass = validation.valid
        && plan.valid
        && plan.summary.browserAuthenticationChecks === 1
        && plan.summary.browserCredentialEnvBindings === 0
        && plan.summary.browserStorageStateFiles === 2
        && plan.summary.browserSensitiveArtifactSuppressions === 1
        && !plan.summary.expectedArtifactTypes.includes("browser_trace")
        && !plan.summary.expectedArtifactTypes.includes("browser_har")
        && !plan.summary.expectedArtifactTypes.includes("browser_video")
        && report.status === "passed"
        && browser?.status === "passed"
        && browser?.browserSessions?.length === 2
        && !browser.authentication
        && sessionAuthentication.every(authentication => authentication?.credentialEnvNames.length === 0
            && authentication.storageState?.source === "file"
            && authentication.storageState?.cookieCount === 1
            && authentication.storageState?.originCount === 0
            && authentication.sensitiveArtifactsSuppressed === true)
        && storageFileNames.has("alice-state.json")
        && storageFileNames.has("bob-state.json")
        && (browser.consoleMessages || []).some(line => line.includes("[redacted:STORAGE_STATE_COOKIE_SESSION]"))
        && (browser.networkRequests || []).some(line => line.includes("[redacted:STORAGE_STATE_COOKIE_SESSION]"))
        && browserArtifacts.every(artifact => artifact.type !== "trace" && artifact.type !== "har" && artifact.type !== "video")
        && authCoverage?.status === "verified"
        && directCoverage?.status === "verified"
        && report.metadata.browserAuthenticationSummary?.storageStateCount === 2
        && report.metadata.browserAuthenticationSummary?.authenticatedSessions === 2
        && textEvidenceSafe
        && reportValidation.valid
        && artifactVerification.status === "passed"
        && artifactVerification.items.some(item => item.type === "browser_authentication_evidence" && item.status === "passed");
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        availability,
        validation,
        plan,
        report,
        reportValidation,
        artifactVerification,
        textEvidenceSafe,
    };
}
//# sourceMappingURL=authentication-self-test.js.map
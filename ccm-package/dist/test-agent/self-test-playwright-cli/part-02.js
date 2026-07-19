"use strict";
// Behavior-freeze extraction from self-test-playwright-cli.ts (part-02.ts).
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
exports.runTestAgentStandaloneHandoffRealWebSelfTest = runTestAgentStandaloneHandoffRealWebSelfTest;
exports.runTestAgentPlaywrightAvailabilitySelfTest = runTestAgentPlaywrightAvailabilitySelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const playwright_provider_1 = require("../browser/playwright-provider");
const self_test_1 = require("../self-test");
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
//# sourceMappingURL=part-02.js.map
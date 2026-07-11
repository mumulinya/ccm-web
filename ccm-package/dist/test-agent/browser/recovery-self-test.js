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
exports.runTestAgentClaudeChromeRecoverySelfTest = runTestAgentClaudeChromeRecoverySelfTest;
exports.runTestAgentUnsafeBrowserRecoverySelfTest = runTestAgentUnsafeBrowserRecoverySelfTest;
exports.runTestAgentFailedBrowserRecoverySelfTest = runTestAgentFailedBrowserRecoverySelfTest;
exports.runTestAgentChromeDevtoolsRecoverySelfTest = runTestAgentChromeDevtoolsRecoverySelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const self_test_policy_1 = require("../self-test-policy");
const artifact_verifier_1 = require("../artifact-verifier");
const cli_1 = require("../cli");
const contract_1 = require("../contract");
const execution_plan_1 = require("../execution-plan");
const verdict_1 = require("../verdict");
const tool_executor_1 = require("./tool-executor");
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
function recoveryWorkOrder(dir, options) {
    const targetUrl = "https://app.example.test/workspace";
    return {
        id: options.id,
        originalUserGoal: "Verify the authenticated workspace after safe browser session recovery.",
        acceptanceCriteria: ["The authenticated workspace is visible and ready."],
        requiredChecks: ["browser_e2e", "browser_auth"],
        projects: [{
                name: "browser-recovery-self-test",
                workDir: dir,
                targetUrl,
                browserChecks: [{
                        name: "Authenticated workspace recovery",
                        authentication: {
                            mode: "existing_session",
                            provider: options.provider || "claude-in-chrome",
                            evidencePolicy: "minimal",
                        },
                        actions: options.actions || [{ type: "goto", url: targetUrl }],
                        assertions: [{ type: "text", text: "Workspace ready" }],
                        screenshot: false,
                    }],
            }],
        options: {
            artifactDir: options.artifactDir || path.join(dir, "artifacts"),
            browserProvider: "mcp",
            collectBrowserArtifacts: false,
            collectBrowserVideo: false,
        },
    };
}
function claudeRecoveryTools(includeComputer = false) {
    return [
        "mcp__claude-in-chrome__tabs_context_mcp",
        "mcp__claude-in-chrome__tabs_create_mcp",
        "mcp__claude-in-chrome__navigate",
        "mcp__claude-in-chrome__get_page_text",
        ...(includeComputer ? ["mcp__claude-in-chrome__computer"] : []),
    ];
}
function callSuffixes(calls) {
    return calls.map(call => call.toolName.split("__").pop() || call.toolName);
}
async function runTestAgentClaudeChromeRecoverySelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-claude-recovery-"));
    const secret = `stale-tab-${process.pid}-${Date.now()}`;
    const calls = [];
    let navigateCalls = 0;
    const input = recoveryWorkOrder(dir, {
        id: `claude-recovery-${process.pid}-${Date.now()}`,
    });
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: claudeRecoveryTools(),
        onCall(toolName, toolInput) {
            calls.push({ toolName, input: toolInput });
            if (toolName.endsWith("__tabs_context_mcp")) {
                return { tabs: [{ id: `private-${secret}`, url: `https://private.example.test/${secret}` }] };
            }
            if (toolName.endsWith("__tabs_create_mcp")) {
                return { tabId: `verification-${secret}` };
            }
            if (toolName.endsWith("__navigate")) {
                navigateCalls += 1;
                if (navigateCalls === 1) {
                    throw new Error(`No such tab verification-${secret}; url=https://private.example.test/${secret}`);
                }
                return { ok: true };
            }
            if (toolName.endsWith("__get_page_text"))
                return `Workspace ready ${secret}`;
            return [];
        },
    });
    const plan = (0, execution_plan_1.buildTestAgentExecutionPlan)(input);
    const planText = (0, cli_1.formatTestAgentCliExecutionPlanSummary)(plan);
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)(input, {
        browserProvider: "mcp",
        browserToolExecutor: executor,
    });
    const browser = report.browserResults[0];
    const recovery = browser?.recovery;
    const event = recovery?.events[0];
    const transcriptPath = String(report.metadata.browserToolTranscriptPath || "");
    const transcriptText = fs.readFileSync(transcriptPath, "utf-8");
    const reportText = JSON.stringify(report);
    const contract = (0, contract_1.validateTestAgentReportContract)(report);
    const manifestPath = String(report.metadata.artifactFiles?.manifestPath || "");
    const artifactVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const expectedPrefix = [
        "tabs_context_mcp",
        "tabs_create_mcp",
        "navigate",
        "tabs_context_mcp",
        "tabs_create_mcp",
        "navigate",
    ];
    const reportJsonPath = String(report.metadata.artifactFiles?.reportJsonPath || "");
    const verdictJsonPath = String(report.metadata.artifactFiles?.verdictJsonPath || "");
    const tamperedReport = JSON.parse(fs.readFileSync(reportJsonPath, "utf-8"));
    tamperedReport.browserResults[0].recovery.events[0].operation = "action:click";
    tamperedReport.browserResults[0].recovery.events[0].retrySafe = true;
    tamperedReport.browserResults[0].recovery.events[0].tabId = `raw-${secret}`;
    const tamperedVerdict = (0, verdict_1.buildTestAgentVerdict)(tamperedReport);
    fs.writeFileSync(reportJsonPath, `${JSON.stringify(tamperedReport, null, 2)}\n`, "utf-8");
    fs.writeFileSync(verdictJsonPath, `${JSON.stringify(tamperedVerdict, null, 2)}\n`, "utf-8");
    refreshManifestItemIntegrity(manifestPath, "report_json");
    refreshManifestItemIntegrity(manifestPath, "verdict_json");
    const tamperedContract = (0, contract_1.validateTestAgentReportContract)(tamperedReport);
    const tamperedArtifacts = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(manifestPath);
    const pass = report.status === "passed"
        && browser?.status === "passed"
        && recovery?.maxAttempts === 1
        && recovery.attempted === 1
        && recovery.recovered === 1
        && recovery.failed === 0
        && recovery.notRetried === 0
        && event?.provider === "claude-in-chrome"
        && event.operation === "action:goto"
        && event.trigger === "stale_tab"
        && event.retrySafe === true
        && event.status === "recovered"
        && event.contextRefreshed === true
        && event.createdNewTab === true
        && event.attempt === 1
        && navigateCalls === 2
        && expectedPrefix.every((value, index) => callSuffixes(calls)[index] === value)
        && plan.summary.browserSessionRecoveryChecks === 1
        && plan.projects[0]?.browserChecks[0]?.sessionRecoveryEnabled === true
        && planText.includes("sessionRecovery:1")
        && !reportText.includes(secret)
        && !transcriptText.includes(secret)
        && contract.valid
        && artifactVerification.status === "passed"
        && artifactVerification.items.some(item => item.type === "browser_recovery_evidence" && item.status === "passed")
        && !tamperedContract.valid
        && tamperedArtifacts.status === "failed"
        && tamperedArtifacts.items.some(item => item.type === "browser_recovery_evidence"
            && item.status === "failed"
            && /forbidden|replay policy|does not match/i.test(String(item.error || "")));
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return {
        pass,
        report,
        contract,
        artifactVerification,
        tamperedContract,
        tamperedArtifacts,
        calls,
        plan,
    };
}
async function runTestAgentUnsafeBrowserRecoverySelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-unsafe-recovery-"));
    const calls = [];
    let computerCalls = 0;
    const input = recoveryWorkOrder(dir, {
        id: `unsafe-recovery-${process.pid}-${Date.now()}`,
        artifactDir: path.join(dir, "artifacts"),
        actions: [
            { type: "goto", url: "https://app.example.test/workspace" },
            { type: "click", text: "Submit" },
        ],
    });
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: claudeRecoveryTools(true),
        onCall(toolName, toolInput) {
            calls.push({ toolName, input: toolInput });
            if (toolName.endsWith("__tabs_context_mcp"))
                return { tabs: [] };
            if (toolName.endsWith("__tabs_create_mcp"))
                return { tabId: "verification-click" };
            if (toolName.endsWith("__navigate"))
                return { ok: true };
            if (toolName.endsWith("__computer")) {
                computerCalls += 1;
                throw new Error("Target closed while dispatching click to tab raw-click-id.");
            }
            if (toolName.endsWith("__get_page_text"))
                return "Workspace ready";
            return [];
        },
    });
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)(input, {
        browserProvider: "mcp",
        browserToolExecutor: executor,
    });
    const browser = report.browserResults[0];
    const recovery = browser?.recovery;
    const event = recovery?.events[0];
    const suffixes = callSuffixes(calls);
    const pass = report.status === "failed"
        && browser?.status === "failed"
        && recovery?.attempted === 1
        && recovery.recovered === 0
        && recovery.failed === 0
        && recovery.notRetried === 1
        && event?.operation === "action:click"
        && event.retrySafe === false
        && event.status === "not_retried"
        && event.contextRefreshed === false
        && event.createdNewTab === false
        && computerCalls === 1
        && suffixes.filter(value => value === "computer").length === 1
        && suffixes.filter(value => value === "tabs_context_mcp").length === 1
        && suffixes.filter(value => value === "tabs_create_mcp").length === 1
        && (0, contract_1.validateTestAgentReportContract)(report).valid;
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return { pass, report, calls };
}
async function runTestAgentFailedBrowserRecoverySelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-failed-recovery-"));
    const calls = [];
    let createCalls = 0;
    let navigateCalls = 0;
    const input = recoveryWorkOrder(dir, {
        id: `failed-recovery-${process.pid}-${Date.now()}`,
        artifactDir: path.join(dir, "artifacts"),
    });
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: claudeRecoveryTools(),
        onCall(toolName, toolInput) {
            calls.push({ toolName, input: toolInput });
            if (toolName.endsWith("__tabs_context_mcp"))
                return { tabs: [] };
            if (toolName.endsWith("__tabs_create_mcp")) {
                createCalls += 1;
                if (createCalls === 2)
                    throw new Error("Browser extension connection closed while creating recovery tab.");
                return { tabId: "verification-failed-recovery" };
            }
            if (toolName.endsWith("__navigate")) {
                navigateCalls += 1;
                throw new Error("Execution context destroyed because the frame navigated.");
            }
            return [];
        },
    });
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)(input, {
        browserProvider: "mcp",
        browserToolExecutor: executor,
    });
    const browser = report.browserResults[0];
    const recovery = browser?.recovery;
    const event = recovery?.events[0];
    const suffixes = callSuffixes(calls);
    const pass = report.status === "failed"
        && browser?.status === "failed"
        && recovery?.attempted === 1
        && recovery.recovered === 0
        && recovery.failed === 1
        && recovery.notRetried === 0
        && event?.operation === "action:goto"
        && event.trigger === "navigation_context_lost"
        && event.retrySafe === true
        && event.status === "failed"
        && event.contextRefreshed === true
        && event.createdNewTab === false
        && navigateCalls === 1
        && createCalls === 2
        && suffixes.filter(value => value === "tabs_context_mcp").length === 2
        && (0, contract_1.validateTestAgentReportContract)(report).valid;
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return { pass, report, calls };
}
async function runTestAgentChromeDevtoolsRecoverySelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-devtools-recovery-"));
    const secret = `devtools-stale-${process.pid}-${Date.now()}`;
    const calls = [];
    let snapshotCalls = 0;
    const input = recoveryWorkOrder(dir, {
        id: `devtools-recovery-${process.pid}-${Date.now()}`,
        provider: "chrome-devtools",
        artifactDir: path.join(dir, "artifacts"),
    });
    const executor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
        tools: [
            "mcp__chrome-devtools__list_pages",
            "mcp__chrome-devtools__new_page",
            "mcp__chrome-devtools__take_snapshot",
        ],
        onCall(toolName, toolInput) {
            calls.push({ toolName, input: toolInput });
            if (toolName.endsWith("__list_pages")) {
                return { pages: [{ id: `private-${secret}`, url: `https://private.example.test/${secret}` }] };
            }
            if (toolName.endsWith("__new_page"))
                return { id: `verification-${secret}` };
            if (toolName.endsWith("__take_snapshot")) {
                snapshotCalls += 1;
                if (snapshotCalls === 1)
                    throw new Error(`Page not found: page-${secret}`);
                return `Workspace ready ${secret}`;
            }
            return [];
        },
    });
    const report = await (0, self_test_policy_1.runTestAgentForSelfTest)(input, {
        browserProvider: "mcp",
        browserToolExecutor: executor,
    });
    const browser = report.browserResults[0];
    const recovery = browser?.recovery;
    const event = recovery?.events[0];
    const expectedSequence = [
        "list_pages",
        "new_page",
        "take_snapshot",
        "list_pages",
        "new_page",
        "take_snapshot",
    ];
    const suffixes = callSuffixes(calls);
    const pass = report.status === "passed"
        && browser?.status === "passed"
        && recovery?.attempted === 1
        && recovery.recovered === 1
        && event?.provider === "chrome-devtools"
        && event.operation === "observation:page_text"
        && event.trigger === "stale_tab"
        && event.status === "recovered"
        && event.contextRefreshed === true
        && event.createdNewTab === true
        && snapshotCalls === 2
        && expectedSequence.every((value, index) => suffixes[index] === value)
        && !JSON.stringify(report).includes(secret)
        && (0, contract_1.validateTestAgentReportContract)(report).valid;
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    return { pass, report, calls };
}
//# sourceMappingURL=recovery-self-test.js.map
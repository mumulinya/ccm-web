"use strict";
// Behavior-freeze extraction from self-test-playwright-cli.ts (part-04.ts).
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
exports.runTestAgentCliSelfTest = runTestAgentCliSelfTest;
exports.runTestAgentContractSelfTest = runTestAgentContractSelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const cli_1 = require("../cli");
const cli_options_1 = require("../cli-options");
const contract_1 = require("../contract");
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
//# sourceMappingURL=part-04.js.map
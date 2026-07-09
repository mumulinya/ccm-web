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
exports.formatTestAgentCliValidationSummary = formatTestAgentCliValidationSummary;
exports.formatTestAgentCliReportSummary = formatTestAgentCliReportSummary;
exports.formatTestAgentCliArtifactVerificationSummary = formatTestAgentCliArtifactVerificationSummary;
exports.formatTestAgentCliExecutionPlanSummary = formatTestAgentCliExecutionPlanSummary;
exports.runTestAgentCli = runTestAgentCli;
const fs = __importStar(require("fs"));
const agent_1 = require("./agent");
const artifact_verifier_1 = require("./artifact-verifier");
const cli_options_1 = require("./cli-options");
const contract_1 = require("./contract");
const execution_plan_1 = require("./execution-plan");
const provider_gaps_1 = require("./browser/provider-gaps");
const provider_summary_1 = require("./browser/provider-summary");
const acceptance_summary_1 = require("./acceptance-summary");
const required_check_summary_1 = require("./required-check-summary");
const self_test_matrix_1 = require("./self-test-matrix");
function exitCodeForReport(report) {
    if (report.status === "passed")
        return 0;
    if (report.status === "failed")
        return 1;
    return 2;
}
function statusCounts(items) {
    const counts = new Map();
    for (const item of items)
        counts.set(item.status, (counts.get(item.status) || 0) + 1);
    return Array.from(counts.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([status, count]) => `${status}:${count}`)
        .join(", ") || "none";
}
function formatIssues(label, issues, limit = 5) {
    if (!issues.length)
        return [`${label}: 0`];
    const lines = [`${label}: ${issues.length}`];
    for (const issue of issues.slice(0, limit)) {
        const location = issue.path || issue.project || "";
        lines.push(`- ${issue.code}${location ? ` (${location})` : ""}: ${issue.message}`);
    }
    if (issues.length > limit)
        lines.push(`- ... ${issues.length - limit} more`);
    return lines;
}
function formatTestAgentCliValidationSummary(validation) {
    const lines = [
        `TestAgent work order: ${validation.valid ? "valid" : "invalid"}`,
        ...formatIssues("Errors", validation.errors),
        ...formatIssues("Warnings", validation.warnings),
    ];
    if (validation.normalized) {
        lines.push(`Work order: ${validation.normalized.id}`);
        lines.push(`Projects: ${validation.normalized.projects.map(project => project.name).join(", ") || "none"}`);
        lines.push(`Browser provider: ${validation.normalized.options.browserProvider}`);
        lines.push(`Artifact dir: ${validation.normalized.options.artifactDir}`);
    }
    return `${lines.join("\n")}\n`;
}
function formatTestAgentCliReportSummary(report) {
    const requiredCheckSummary = (0, required_check_summary_1.buildRequiredCheckSummary)(report.requiredCheckCoverage, { evidenceLimit: 1, textLimit: 220 });
    const acceptanceSummary = (0, acceptance_summary_1.buildAcceptanceSummary)(report.acceptanceCoverage, { evidenceLimit: 1, textLimit: 220 });
    const networkErrors = (report.browserNetworkSummary || []).reduce((sum, item) => sum + Number(item.errorCount || 0), 0);
    const failedNetworkUrls = (report.browserNetworkSummary || []).flatMap(item => item.failedUrls || []).slice(0, 3);
    const browserProviderGaps = report.browserProviderGaps || [];
    const lines = [
        `TestAgent report: ${report.status} (${report.recommendation})`,
        `Summary: ${report.summary}`,
        `Work order: ${report.workOrderId}`,
        `Commands: ${statusCounts(report.commandResults)}`,
        `HTTP checks: ${statusCounts(report.httpResults)}`,
        `Browser checks: ${statusCounts(report.browserResults)}`,
        `Browser network: errors:${networkErrors}${failedNetworkUrls.length ? ` failed:${failedNetworkUrls.join(", ")}` : ""}`,
        `Browser providers: ${(0, provider_summary_1.formatBrowserProviderSummaryLine)(report.browserProviderSummary)}`,
        `Browser provider gaps: ${browserProviderGaps.length}`,
        ...browserProviderGaps.slice(0, 5).map(item => `- ${(0, provider_gaps_1.formatBrowserProviderGapLine)(item)}`),
        `Required checks: ${(0, required_check_summary_1.formatRequiredCheckStatusCounts)(requiredCheckSummary)}`,
        ...(0, required_check_summary_1.formatRequiredCheckAttentionLines)(requiredCheckSummary, 5),
        ...(0, required_check_summary_1.formatRequiredCheckVerifiedEvidenceLines)(requiredCheckSummary, 3),
        `Acceptance coverage: ${(0, acceptance_summary_1.formatAcceptanceStatusCounts)(acceptanceSummary)}`,
        `Acceptance match strength: ${(0, acceptance_summary_1.formatAcceptanceMatchStrengthCounts)(acceptanceSummary)}`,
        `Acceptance evidence source: ${(0, acceptance_summary_1.formatAcceptanceEvidenceSourceCounts)(acceptanceSummary)}`,
        ...(0, acceptance_summary_1.formatAcceptanceAttentionLines)(acceptanceSummary, 5),
        ...(0, acceptance_summary_1.formatAcceptanceVerifiedEvidenceLines)(acceptanceSummary, 3),
        `Artifacts: ${report.artifactDir}`,
    ];
    if (report.risks.length)
        lines.push(`Risks: ${report.risks.slice(0, 5).join("; ")}`);
    if (report.blockedReasons.length)
        lines.push(`Blocked: ${report.blockedReasons.slice(0, 5).join("; ")}`);
    if (report.issues.length)
        lines.push(...formatIssues("Issues", report.issues));
    return `${lines.join("\n")}\n`;
}
function formatTestAgentCliArtifactVerificationSummary(verification) {
    const lines = [
        `TestAgent artifact verification: ${verification.status}`,
        `Manifest: ${verification.manifestPath || "(inline)"}`,
        `Files: total=${verification.summary.total}, passed=${verification.summary.passed}, failed=${verification.summary.failed}, skipped=${verification.summary.skipped}`,
    ];
    for (const item of verification.items.filter(item => item.status === "failed").slice(0, 8)) {
        lines.push(`- ${item.type} ${item.path}: ${item.error || "failed"}`);
    }
    return `${lines.join("\n")}\n`;
}
function formatTestAgentCliExecutionPlanSummary(plan) {
    const lines = [
        `TestAgent execution plan: ${plan.valid ? "valid" : "invalid"}`,
        `Work order: ${plan.workOrderId}`,
        `Projects: ${plan.projects.map(project => project.name).join(", ") || "none"}`,
        `Commands: ${plan.summary.commands} (auto-discovered ${plan.summary.autoDiscoveredCommands})`,
        `Dev servers: ${plan.summary.devServers}`,
        `HTTP checks: ${plan.summary.httpChecks} (adversarial ${plan.summary.adversarialHttpChecks})`,
        `Browser checks: ${plan.summary.browserChecks} (auto ${plan.summary.autoBrowserChecks}, adversarial ${plan.summary.adversarialBrowserChecks})`,
        `Browser provider: ${plan.browserProvider}`,
        `Browser provider warnings: ${plan.browserProviderWarnings?.length || 0}`,
        ...(plan.browserProviderWarnings || []).slice(0, 5).map(item => `- ${(0, provider_gaps_1.formatBrowserProviderPlanWarningLine)(item)}`),
        `Expected artifacts: ${plan.summary.expectedArtifactTypes.join(", ") || "none"}`,
        `Artifact dir: ${plan.artifactDir}`,
        ...formatIssues("Issues", plan.issues),
    ];
    return `${lines.join("\n")}\n`;
}
function parseWorkOrderJson(file, readFile, label = "work order") {
    let text = "";
    try {
        text = readFile(file);
    }
    catch (error) {
        return {
            input: null,
            error: `Unable to read ${label} file "${file}": ${error?.message || String(error)}`,
            ok: false,
        };
    }
    try {
        return { input: JSON.parse(text), error: "", ok: true };
    }
    catch (error) {
        return {
            input: null,
            error: `Invalid JSON in ${label} file "${file}": ${error?.message || String(error)}`,
            ok: false,
        };
    }
}
function isJsonObject(input) {
    return !!input && typeof input === "object" && !Array.isArray(input);
}
function invalidJsonRootMessage(label, file) {
    return `Invalid ${label} file "${file}": root value must be a JSON object.`;
}
async function runTestAgentCli(args = process.argv.slice(2), io = {}) {
    const stdout = io.stdout || process.stdout;
    const stderr = io.stderr || process.stderr;
    const readFile = io.readFile || ((file) => fs.readFileSync(file, "utf-8"));
    const runAgent = io.runAgent || agent_1.runTestAgent;
    const runSelfTestMatrix = io.runSelfTestMatrix || self_test_matrix_1.runTestAgentSelfTestMatrix;
    const parsed = (0, cli_options_1.parseTestAgentCliArgs)(args);
    const { options, errors } = parsed;
    if (options.help) {
        stdout.write(`${(0, cli_options_1.testAgentCliUsage)()}\n`);
        return { exitCode: 0 };
    }
    if (errors.length) {
        stderr.write(`${(0, cli_options_1.testAgentCliUsage)()}\n\n${errors.map(error => `Error: ${error}`).join("\n")}\n`);
        return { exitCode: 2 };
    }
    if (options.selfTestMatrix) {
        const report = await runSelfTestMatrix({
            ...(options.selfTestModulePath ? { selfTestModulePath: options.selfTestModulePath } : {}),
            ...(options.selfTestNames.length ? { names: options.selfTestNames } : {}),
            ...(options.selfTestPattern ? { pattern: options.selfTestPattern } : {}),
            ...(options.selfTestTimeoutMs ? { timeoutMs: options.selfTestTimeoutMs } : {}),
            ...(options.selfTestStopOnFailure ? { stopOnFailure: true } : {}),
        });
        stdout.write(options.summary
            ? `${(0, self_test_matrix_1.formatTestAgentSelfTestMatrixSummary)(report)}\n`
            : `${JSON.stringify(report, null, 2)}\n`);
        return { exitCode: report.pass ? 0 : 1 };
    }
    if (options.verifyArtifactsPath) {
        const manifestJson = parseWorkOrderJson(options.verifyArtifactsPath, readFile, "artifact manifest");
        if (!manifestJson.ok) {
            stderr.write(`${manifestJson.error}\n`);
            return { exitCode: 2 };
        }
        if (!isJsonObject(manifestJson.input)) {
            stderr.write(`${invalidJsonRootMessage("artifact manifest", options.verifyArtifactsPath)}\n`);
            return { exitCode: 2 };
        }
        const manifest = manifestJson.input;
        if (manifest?.schema !== "ccm-test-agent-artifact-manifest-v1" || !Array.isArray(manifest.files)) {
            stderr.write(`Invalid TestAgent artifact manifest: ${options.verifyArtifactsPath}\n`);
            return { exitCode: 2 };
        }
        const verification = (0, artifact_verifier_1.verifyTestAgentArtifactManifest)(manifest, options.verifyArtifactsPath);
        stdout.write(options.summary
            ? formatTestAgentCliArtifactVerificationSummary(verification)
            : `${JSON.stringify(verification, null, 2)}\n`);
        return { exitCode: verification.status === "passed" ? 0 : 1 };
    }
    const workOrderJson = parseWorkOrderJson(options.handoffPath || options.workOrderPath, readFile, options.handoffPath ? "handoff" : "work order");
    if (!workOrderJson.ok) {
        stderr.write(`${workOrderJson.error}\n`);
        return { exitCode: 2 };
    }
    const inputLabel = options.handoffPath ? "handoff" : "work order";
    const inputPath = options.handoffPath || options.workOrderPath;
    if (!isJsonObject(workOrderJson.input)) {
        stderr.write(`${invalidJsonRootMessage(inputLabel, inputPath)}\n`);
        return { exitCode: 2 };
    }
    const overrides = (0, cli_options_1.cliOverrides)(options);
    let workOrderInput = null;
    let validation;
    if (options.handoffPath) {
        const handoffValidation = (0, contract_1.validateTestAgentHandoffContract)(workOrderJson.input, overrides);
        validation = handoffValidation;
        workOrderInput = handoffValidation.workOrder || null;
    }
    else {
        workOrderInput = workOrderJson.input;
        validation = (0, contract_1.validateTestAgentWorkOrderContract)(workOrderInput, overrides);
    }
    if (!validation.valid) {
        stdout.write(options.summary
            ? formatTestAgentCliValidationSummary(validation)
            : `${JSON.stringify(validation, null, 2)}\n`);
        return { exitCode: 2 };
    }
    if (options.validateOnly) {
        stdout.write(options.summary
            ? formatTestAgentCliValidationSummary(validation)
            : `${JSON.stringify(validation, null, 2)}\n`);
        return { exitCode: 0 };
    }
    if (!workOrderInput) {
        stderr.write("Unable to build TestAgent work order from input.\n");
        return { exitCode: 2 };
    }
    if (options.planOnly) {
        const plan = (0, execution_plan_1.buildTestAgentExecutionPlan)(workOrderInput, overrides, validation);
        stdout.write(options.summary
            ? formatTestAgentCliExecutionPlanSummary(plan)
            : `${JSON.stringify(plan, null, 2)}\n`);
        return { exitCode: plan.valid ? 0 : 2 };
    }
    const report = await runAgent(workOrderInput, overrides);
    stdout.write(options.summary
        ? formatTestAgentCliReportSummary(report)
        : `${JSON.stringify(report, null, 2)}\n`);
    return { exitCode: exitCodeForReport(report) };
}
async function main() {
    const result = await runTestAgentCli();
    process.exit(result.exitCode);
}
if (require.main === module) {
    main().catch(error => {
        console.error(error?.stack || error?.message || String(error));
        process.exit(2);
    });
}
//# sourceMappingURL=cli.js.map
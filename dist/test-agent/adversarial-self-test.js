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
exports.runTestAgentAdversarialEvidenceGateSelfTest = runTestAgentAdversarialEvidenceGateSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const agent_1 = require("./agent");
const artifact_verifier_1 = require("./artifact-verifier");
const artifacts_1 = require("./artifacts");
const cli_1 = require("./cli");
const contract_1 = require("./contract");
const tool_executor_1 = require("./browser/tool-executor");
const execution_plan_1 = require("./execution-plan");
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
async function listen(server) {
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string")
        throw new Error("Unable to allocate adversarial gate self-test port.");
    return `http://127.0.0.1:${address.port}`;
}
async function close(server) {
    await new Promise(resolve => server.close(() => resolve()));
}
function fixtureServer() {
    return http.createServer((request, response) => {
        if (request.url === "/invalid") {
            response.writeHead(400, { "content-type": "application/json" });
            response.end(JSON.stringify({ error: "invalid input handled" }));
            return;
        }
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: true }));
    });
}
function artifactPaths(report) {
    const files = (report.metadata?.artifactFiles || {});
    return {
        reportPath: String(files.reportJsonPath || ""),
        verdictPath: String(files.verdictJsonPath || ""),
        manifestPath: String(files.manifestPath || ""),
    };
}
async function runTestAgentAdversarialEvidenceGateSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-adversarial-gate-"));
    const server = fixtureServer();
    const baseUrl = await listen(server);
    const command = `"${process.execPath}" -e "console.log('happy path ok')"`;
    try {
        const missingReport = await (0, agent_1.runTestAgent)({
            id: `adversarial-missing-${process.pid}-${Date.now()}`,
            originalUserGoal: "A happy-path command alone must not authorize acceptance.",
            acceptanceCriteria: ["The happy path command runs."],
            requiredChecks: ["commands"],
            projects: [{
                    name: "missing-adversarial",
                    workDir: dir,
                    verificationCommands: [command],
                }],
            options: {
                artifactDir: path.join(dir, "missing-artifacts"),
                browserProvider: "none",
            },
        });
        const passedHttpReport = await (0, agent_1.runTestAgent)({
            id: `adversarial-http-pass-${process.pid}-${Date.now()}`,
            originalUserGoal: "Invalid input is rejected safely.",
            acceptanceCriteria: ["Invalid input returns a controlled 400 response."],
            projects: [{
                    name: "http-adversarial-pass",
                    workDir: dir,
                    adversarialHttpChecks: [{
                            name: "Reject invalid payload",
                            probeType: "invalid_input",
                            method: "POST",
                            url: `${baseUrl}/invalid`,
                            json: { value: "" },
                            assertions: [
                                { type: "status", status: 400 },
                                { type: "jsonPathEquals", path: "error", value: "invalid input handled" },
                            ],
                        }],
                }],
            options: {
                artifactDir: path.join(dir, "http-pass-artifacts"),
                browserProvider: "none",
            },
        });
        const unlinkedHttpReport = await (0, agent_1.runTestAgent)({
            id: `adversarial-http-unlinked-${process.pid}-${Date.now()}`,
            originalUserGoal: "Deleting a task removes it from the project board.",
            acceptanceCriteria: ["A deleted task no longer appears in the project task list."],
            projects: [{
                    name: "http-adversarial-unlinked",
                    workDir: dir,
                    adversarialHttpChecks: [{
                            name: "Observe unrelated transport boundary",
                            probeType: "transport_fault",
                            method: "GET",
                            url: `${baseUrl}/invalid`,
                            assertions: [{ type: "status", status: 400 }],
                        }],
                }],
            options: {
                artifactDir: path.join(dir, "http-unlinked-artifacts"),
                browserProvider: "none",
            },
        });
        const goalLinkedHttpReport = await (0, agent_1.runTestAgent)({
            id: `adversarial-http-goal-linked-${process.pid}-${Date.now()}`,
            originalUserGoal: "Invalid payload is rejected safely.",
            acceptanceCriteria: ["The profile page renders account settings."],
            projects: [{
                    name: "http-adversarial-goal-linked",
                    workDir: dir,
                    verificationCommands: [
                        `"${process.execPath}" -e "console.log('The profile page renders account settings.')"`
                    ],
                    adversarialHttpChecks: [{
                            name: "Reject invalid payload",
                            probeType: "invalid_input",
                            method: "POST",
                            url: `${baseUrl}/invalid`,
                            assertions: [{ type: "status", status: 400 }],
                        }],
                }],
            options: {
                artifactDir: path.join(dir, "http-goal-linked-artifacts"),
                browserProvider: "none",
            },
        });
        const unknownExplicitCriterionReport = await (0, agent_1.runTestAgent)({
            id: `adversarial-http-unknown-explicit-${process.pid}-${Date.now()}`,
            originalUserGoal: "Invalid payload is rejected safely.",
            acceptanceCriteria: ["Invalid payload returns a controlled 400 response."],
            projects: [{
                    name: "http-adversarial-unknown-explicit",
                    workDir: dir,
                    adversarialHttpChecks: [{
                            name: "Reject invalid payload",
                            probeType: "invalid_input",
                            method: "POST",
                            url: `${baseUrl}/invalid`,
                            coversAcceptanceCriteria: ["This criterion does not exist in the work order."],
                            assertions: [{ type: "status", status: 400 }],
                        }],
                }],
            options: {
                artifactDir: path.join(dir, "http-unknown-explicit-artifacts"),
                browserProvider: "none",
            },
        });
        const unlinkedPlan = (0, execution_plan_1.buildTestAgentExecutionPlan)({
            id: `adversarial-plan-unlinked-${process.pid}-${Date.now()}`,
            originalUserGoal: "Deleting a task removes it from the project board.",
            acceptanceCriteria: ["A deleted task no longer appears in the project task list."],
            requiredChecks: ["adversarial"],
            projects: [{
                    name: "adversarial-plan-unlinked",
                    workDir: dir,
                    adversarialHttpChecks: [{
                            name: "Observe unrelated transport boundary",
                            probeType: "transport_fault",
                            url: `${baseUrl}/invalid`,
                            assertions: [{ type: "status", status: 400 }],
                        }],
                }],
            options: {
                artifactDir: path.join(dir, "plan-unlinked-artifacts"),
                browserProvider: "none",
            },
        });
        const explicitPlanCriterion = "Invalid payload returns a controlled 400 response.";
        const explicitPlan = (0, execution_plan_1.buildTestAgentExecutionPlan)({
            id: `adversarial-plan-explicit-${process.pid}-${Date.now()}`,
            originalUserGoal: "Validate invalid payload handling.",
            acceptanceCriteria: [explicitPlanCriterion],
            requiredChecks: ["adversarial"],
            projects: [{
                    name: "adversarial-plan-explicit",
                    workDir: dir,
                    adversarialHttpChecks: [{
                            name: "Boundary request",
                            probeType: "boundary",
                            url: `${baseUrl}/invalid`,
                            covers_acceptance_criteria: [explicitPlanCriterion],
                            assertions: [{ type: "status", status: 400 }],
                        }],
                }],
            options: {
                artifactDir: path.join(dir, "plan-explicit-artifacts"),
                browserProvider: "none",
            },
        });
        const failedHttpReport = await (0, agent_1.runTestAgent)({
            id: `adversarial-http-fail-${process.pid}-${Date.now()}`,
            originalUserGoal: "A failed adversarial expectation routes the task to rework.",
            acceptanceCriteria: ["Invalid input is accepted with status 200."],
            projects: [{
                    name: "http-adversarial-fail",
                    workDir: dir,
                    adversarialHttpChecks: [{
                            name: "Incorrect invalid-input expectation",
                            probeType: "invalid_input",
                            method: "POST",
                            url: `${baseUrl}/invalid`,
                            assertions: [{ type: "status", status: 200 }],
                        }],
                }],
            options: {
                artifactDir: path.join(dir, "http-fail-artifacts"),
                browserProvider: "none",
            },
        });
        const blockedHttpReport = await (0, agent_1.runTestAgent)({
            id: `adversarial-http-blocked-${process.pid}-${Date.now()}`,
            originalUserGoal: "An unavailable probe target is an environment limitation.",
            acceptanceCriteria: ["The adversarial endpoint can be reached."],
            projects: [{
                    name: "http-adversarial-blocked",
                    workDir: dir,
                    adversarialHttpChecks: [{
                            name: "Unavailable adversarial endpoint",
                            probeType: "environment_block",
                            url: "http://127.0.0.1:1/unavailable",
                            timeoutMs: 1000,
                            assertions: [{ type: "status", status: 200 }],
                        }],
                }],
            options: {
                artifactDir: path.join(dir, "http-blocked-artifacts"),
                browserProvider: "none",
            },
        });
        const browserExecutor = (0, tool_executor_1.createStaticBrowserToolExecutor)({
            tools: [
                "mcp__playwright__browser_navigate",
                "mcp__playwright__browser_snapshot",
                "mcp__playwright__browser_take_screenshot",
                "mcp__playwright__browser_console_messages",
                "mcp__playwright__browser_network_requests",
            ],
            onCall: toolName => {
                if (toolName.endsWith("browser_snapshot"))
                    return "Invalid submission handled";
                if (toolName.endsWith("browser_console_messages"))
                    return [];
                if (toolName.endsWith("browser_network_requests"))
                    return [];
                if (toolName.endsWith("browser_take_screenshot"))
                    return { path: "adversarial-browser.png" };
                return { ok: true };
            },
        });
        const passedBrowserReport = await (0, agent_1.runTestAgent)({
            id: `adversarial-browser-pass-${process.pid}-${Date.now()}`,
            originalUserGoal: "Invalid browser submission remains controlled.",
            acceptanceCriteria: ["Invalid submission is handled in the browser."],
            projects: [{
                    name: "browser-adversarial-pass",
                    workDir: dir,
                    adversarialBrowserChecks: [{
                            name: "Invalid browser submission",
                            probeType: "invalid_form_input",
                            coversAcceptanceCriteria: ["Invalid submission is handled in the browser."],
                            url: "http://example.test/invalid",
                            actions: [{ type: "goto", url: "http://example.test/invalid" }],
                            assertions: [{ type: "text", text: "Invalid submission handled" }],
                            screenshot: true,
                        }],
                }],
            options: {
                artifactDir: path.join(dir, "browser-pass-artifacts"),
                browserProvider: "mcp",
            },
        }, {
            browserProvider: "mcp",
            browserToolExecutor: browserExecutor,
        });
        const waivedReport = await (0, agent_1.runTestAgent)({
            id: `adversarial-waiver-${process.pid}-${Date.now()}`,
            originalUserGoal: "A reasoned low-risk waiver remains auditable.",
            acceptanceCriteria: ["The command wiring works."],
            requiredChecks: ["commands"],
            projects: [{
                    name: "adversarial-waiver",
                    workDir: dir,
                    verificationCommands: [
                        `"${process.execPath}" -e "console.log('The command wiring works.')"`
                    ],
                }],
            options: {
                artifactDir: path.join(dir, "waiver-artifacts"),
                browserProvider: "none",
                requireAdversarialProbe: false,
                adversarialProbeWaiver: "Static command wiring has no meaningful hostile input surface in this fixture.",
            },
        });
        const invalidWaiverValidation = (0, contract_1.validateTestAgentWorkOrderContract)({
            id: "invalid-adversarial-waiver",
            originalUserGoal: "A silent waiver must be rejected.",
            acceptanceCriteria: ["Command runs."],
            projects: [{
                    name: "invalid-waiver",
                    workDir: dir,
                    verificationCommands: [command],
                }],
            options: {
                browserProvider: "none",
                requireAdversarialProbe: false,
            },
        });
        const snakeCaseWaiverValidation = (0, contract_1.validateTestAgentWorkOrderContract)({
            id: "snake-case-adversarial-waiver",
            originalUserGoal: "Snake-case adversarial policy aliases normalize.",
            acceptanceCriteria: ["Command runs."],
            projects: [{
                    name: "snake-case-waiver",
                    workDir: dir,
                    verificationCommands: [command],
                }],
            options: {
                browserProvider: "none",
                require_adversarial_probe: false,
                adversarial_probe_waiver: "Snake-case contract fixture has no hostile input surface.",
            },
        });
        const passedHttpVerdictPath = artifactPaths(passedHttpReport).verdictPath;
        const passedHttpVerdict = JSON.parse(fs.readFileSync(passedHttpVerdictPath, "utf-8"));
        const unlinkedHttpVerdictPath = artifactPaths(unlinkedHttpReport).verdictPath;
        const unlinkedHttpVerdict = JSON.parse(fs.readFileSync(unlinkedHttpVerdictPath, "utf-8"));
        const goalLinkedHttpVerdictPath = artifactPaths(goalLinkedHttpReport).verdictPath;
        const goalLinkedHttpVerdict = JSON.parse(fs.readFileSync(goalLinkedHttpVerdictPath, "utf-8"));
        const unknownExplicitCriterionVerdictPath = artifactPaths(unknownExplicitCriterionReport).verdictPath;
        const unknownExplicitCriterionVerdict = JSON.parse(fs.readFileSync(unknownExplicitCriterionVerdictPath, "utf-8"));
        const browserVerdictPath = artifactPaths(passedBrowserReport).verdictPath;
        const browserVerdict = JSON.parse(fs.readFileSync(browserVerdictPath, "utf-8"));
        const waiverVerdictPath = artifactPaths(waivedReport).verdictPath;
        const waiverVerdict = JSON.parse(fs.readFileSync(waiverVerdictPath, "utf-8"));
        const cliSummary = (0, cli_1.formatTestAgentCliReportSummary)(passedHttpReport);
        const markdown = (0, artifacts_1.buildTestAgentMarkdownReport)(passedHttpReport);
        const httpPaths = artifactPaths(passedHttpReport);
        const tamperedReport = JSON.parse(fs.readFileSync(httpPaths.reportPath, "utf-8"));
        tamperedReport.adversarialEvidenceSummary.passed += 1;
        fs.writeFileSync(httpPaths.reportPath, `${JSON.stringify(tamperedReport, null, 2)}\n`, "utf-8");
        refreshManifestItemIntegrity(httpPaths.manifestPath, "report_json");
        const summaryTamperedVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(httpPaths.manifestPath);
        const browserPaths = artifactPaths(passedBrowserReport);
        const tamperedRelevanceReport = JSON.parse(fs.readFileSync(browserPaths.reportPath, "utf-8"));
        tamperedRelevanceReport.adversarialEvidenceSummary.items[0].relevance = "none";
        tamperedRelevanceReport.adversarialEvidenceSummary.items[0].linkedCriteria = [];
        tamperedRelevanceReport.adversarialEvidenceSummary.items[0].matchScore = 0;
        fs.writeFileSync(browserPaths.reportPath, `${JSON.stringify(tamperedRelevanceReport, null, 2)}\n`, "utf-8");
        refreshManifestItemIntegrity(browserPaths.manifestPath, "report_json");
        const relevanceTamperedVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(browserPaths.manifestPath);
        const waiverPaths = artifactPaths(waivedReport);
        const tamperedWaiverReport = JSON.parse(fs.readFileSync(waiverPaths.reportPath, "utf-8"));
        tamperedWaiverReport.adversarialEvidenceSummary.waiverReason = "Tampered waiver reason";
        fs.writeFileSync(waiverPaths.reportPath, `${JSON.stringify(tamperedWaiverReport, null, 2)}\n`, "utf-8");
        refreshManifestItemIntegrity(waiverPaths.manifestPath, "report_json");
        const waiverTamperedVerification = (0, artifact_verifier_1.verifyTestAgentArtifactManifestFile)(waiverPaths.manifestPath);
        const pass = missingReport.status === "partial"
            && missingReport.recommendation === "need_human"
            && missingReport.adversarialEvidenceSummary.status === "missing"
            && missingReport.adversarialEvidenceSummary.required === true
            && missingReport.requiredChecks.includes("adversarial")
            && missingReport.requiredCheckCoverage.some(item => item.check === "adversarial" && item.status === "unknown")
            && passedHttpReport.status === "passed"
            && passedHttpReport.adversarialEvidenceSummary.status === "verified"
            && passedHttpReport.adversarialEvidenceSummary.http === 1
            && passedHttpReport.adversarialEvidenceSummary.browser === 0
            && passedHttpReport.adversarialEvidenceSummary.passedRelevant === 1
            && passedHttpReport.adversarialEvidenceSummary.items[0]?.relevance === "inferred"
            && passedHttpReport.adversarialEvidenceSummary.items[0]?.linkedCriteria[0] === "Invalid input returns a controlled 400 response."
            && passedHttpVerdict.canAccept === true
            && passedHttpVerdict.evidenceSummary.adversarialProbes === 1
            && passedHttpVerdict.evidenceSummary.adversarialPassed === 1
            && passedHttpVerdict.evidenceSummary.adversarialRelevant === 1
            && passedHttpVerdict.evidenceSummary.adversarialUnlinked === 0
            && passedHttpVerdict.evidenceSummary.adversarialPassedRelevant === 1
            && (0, contract_1.validateTestAgentReportContract)(passedHttpReport).valid
            && (0, contract_1.validateTestAgentVerdictContract)(passedHttpVerdict).valid
            && unlinkedHttpReport.status === "partial"
            && unlinkedHttpReport.recommendation === "need_human"
            && unlinkedHttpReport.adversarialEvidenceSummary.status === "unlinked"
            && unlinkedHttpReport.adversarialEvidenceSummary.relevant === 0
            && unlinkedHttpReport.adversarialEvidenceSummary.unlinked === 1
            && unlinkedHttpReport.adversarialEvidenceSummary.passedRelevant === 0
            && unlinkedHttpReport.requiredCheckCoverage.some(item => item.check === "adversarial"
                && item.status === "unknown"
                && String(item.missingReason || "").includes("none were linked"))
            && unlinkedHttpVerdict.canAccept === false
            && unlinkedHttpVerdict.nextActions.some((item) => item.includes("explicitly linked"))
            && (0, contract_1.validateTestAgentReportContract)(unlinkedHttpReport).valid
            && (0, contract_1.validateTestAgentVerdictContract)(unlinkedHttpVerdict).valid
            && goalLinkedHttpReport.status === "passed"
            && goalLinkedHttpReport.adversarialEvidenceSummary.status === "verified"
            && goalLinkedHttpReport.adversarialEvidenceSummary.goalLinked === 1
            && goalLinkedHttpReport.adversarialEvidenceSummary.criteriaCovered.length === 0
            && goalLinkedHttpReport.adversarialEvidenceSummary.items[0]?.relevance === "inferred"
            && goalLinkedHttpReport.adversarialEvidenceSummary.items[0]?.goalLinked === true
            && goalLinkedHttpVerdict.canAccept === true
            && (0, contract_1.validateTestAgentReportContract)(goalLinkedHttpReport).valid
            && (0, contract_1.validateTestAgentVerdictContract)(goalLinkedHttpVerdict).valid
            && unknownExplicitCriterionReport.status === "partial"
            && unknownExplicitCriterionReport.adversarialEvidenceSummary.status === "unlinked"
            && unknownExplicitCriterionReport.adversarialEvidenceSummary.items[0]?.relevance === "none"
            && unknownExplicitCriterionReport.adversarialEvidenceSummary.items[0]?.linkedCriteria.length === 0
            && unknownExplicitCriterionReport.adversarialEvidenceSummary.items[0]?.goalLinked === false
            && unknownExplicitCriterionVerdict.canAccept === false
            && (0, contract_1.validateTestAgentReportContract)(unknownExplicitCriterionReport).valid
            && (0, contract_1.validateTestAgentVerdictContract)(unknownExplicitCriterionVerdict).valid
            && unlinkedPlan.summary.adversarialProbeCount === 1
            && unlinkedPlan.summary.adversarialLinkedProbeCount === 0
            && unlinkedPlan.summary.adversarialUnlinkedProbeCount === 1
            && unlinkedPlan.issues.some(item => item.code === "unlinked_adversarial_probe_plan")
            && explicitPlan.summary.adversarialProbeCount === 1
            && explicitPlan.summary.adversarialLinkedProbeCount === 1
            && explicitPlan.summary.adversarialUnlinkedProbeCount === 0
            && explicitPlan.projects[0]?.httpChecks[0]?.adversarialRelevance === "explicit"
            && explicitPlan.projects[0]?.httpChecks[0]?.linkedAcceptanceCriteria[0] === explicitPlanCriterion
            && !explicitPlan.issues.some(item => item.code === "unlinked_adversarial_probe_plan")
            && passedBrowserReport.status === "passed"
            && passedBrowserReport.adversarialEvidenceSummary.status === "verified"
            && passedBrowserReport.adversarialEvidenceSummary.browser === 1
            && passedBrowserReport.adversarialEvidenceSummary.items[0]?.relevance === "explicit"
            && passedBrowserReport.adversarialEvidenceSummary.items[0]?.linkedCriteria[0] === "Invalid submission is handled in the browser."
            && browserVerdict.canAccept === true
            && (0, contract_1.validateTestAgentReportContract)(passedBrowserReport).valid
            && (0, contract_1.validateTestAgentVerdictContract)(browserVerdict).valid
            && failedHttpReport.status === "failed"
            && failedHttpReport.recommendation === "rework"
            && failedHttpReport.adversarialEvidenceSummary.status === "failed"
            && blockedHttpReport.status === "blocked"
            && blockedHttpReport.recommendation === "need_human"
            && blockedHttpReport.adversarialEvidenceSummary.status === "blocked"
            && !blockedHttpReport.requiredCheckCoverage.some(item => item.check === "adversarial" && item.status === "not_verified")
            && waivedReport.status === "passed"
            && waivedReport.adversarialEvidenceSummary.status === "waived"
            && waivedReport.adversarialEvidenceSummary.waived === true
            && waiverVerdict.canAccept === true
            && (0, contract_1.validateTestAgentReportContract)(waivedReport).valid
            && (0, contract_1.validateTestAgentVerdictContract)(waiverVerdict).valid
            && invalidWaiverValidation.valid === false
            && invalidWaiverValidation.errors.some(item => item.message.includes("adversarialProbeWaiver"))
            && snakeCaseWaiverValidation.valid === true
            && snakeCaseWaiverValidation.normalized?.options.requireAdversarialProbe === false
            && snakeCaseWaiverValidation.normalized?.options.adversarialProbeWaiver.includes("Snake-case")
            && cliSummary.includes("Adversarial evidence: status=verified")
            && markdown.includes("## Adversarial Evidence Summary")
            && summaryTamperedVerification.status === "failed"
            && summaryTamperedVerification.items.some(item => item.type === "adversarial_evidence" && item.status === "failed")
            && summaryTamperedVerification.items.some(item => item.type === "verdict_consistency" && item.status === "failed")
            && relevanceTamperedVerification.status === "failed"
            && relevanceTamperedVerification.items.some(item => item.type === "adversarial_evidence" && item.status === "failed")
            && relevanceTamperedVerification.items.some(item => item.type === "verdict_consistency" && item.status === "failed")
            && waiverTamperedVerification.status === "failed"
            && waiverTamperedVerification.items.some(item => item.type === "verdict_consistency" && item.status === "failed");
        return {
            pass,
            missingReport,
            passedHttpReport,
            unlinkedHttpReport,
            goalLinkedHttpReport,
            unknownExplicitCriterionReport,
            unlinkedPlan,
            explicitPlan,
            passedBrowserReport,
            failedHttpReport,
            blockedHttpReport,
            waivedReport,
            invalidWaiverValidation,
            snakeCaseWaiverValidation,
            summaryTamperedVerification,
            relevanceTamperedVerification,
            waiverTamperedVerification,
            cliSummary,
            markdown,
        };
    }
    finally {
        await close(server);
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
//# sourceMappingURL=adversarial-self-test.js.map
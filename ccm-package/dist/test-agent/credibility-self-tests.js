"use strict";
/**
 * Lightweight credibility self-tests (no browser launch).
 * Locks fail-closed URL waits, upload path escape, review decision alignment,
 * and provider-gap → Playwright recheck reroute.
 */
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
exports.runTestAgentMcpLiveUrlFailClosedSelfTest = runTestAgentMcpLiveUrlFailClosedSelfTest;
exports.runTestAgentUploadPathEscapeSelfTest = runTestAgentUploadPathEscapeSelfTest;
exports.runTestAgentIndependentReviewDecisionAlignmentSelfTest = runTestAgentIndependentReviewDecisionAlignmentSelfTest;
exports.runTestAgentProviderGapForcesPlaywrightRecheckSelfTest = runTestAgentProviderGapForcesPlaywrightRecheckSelfTest;
exports.runTestAgentFlakyHardBlocksAcceptSelfTest = runTestAgentFlakyHardBlocksAcceptSelfTest;
exports.runTestAgentEnvironmentPrepStructuredSelfTest = runTestAgentEnvironmentPrepStructuredSelfTest;
exports.runTestAgentPetActivityKeySelfTest = runTestAgentPetActivityKeySelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const mcp_adapters_part_01_1 = require("./browser/mcp-adapters-part-01");
const playwright_provider_part_02_1 = require("./browser/playwright-provider-part-02");
function asPass(pass, detail = {}) {
    return { pass, ...detail };
}
async function runTestAgentMcpLiveUrlFailClosedSelfTest() {
    const noReader = await (0, mcp_adapters_part_01_1.waitForMcpUrl)("mcp", "https://cached.example/ok", { type: "waitForUrl", url: "/dashboard" }, 400);
    const mismatch = await (0, mcp_adapters_part_01_1.waitForMcpUrl)("mcp", "https://cached.example/ok", { type: "waitForUrl", url: "/dashboard" }, 400, async () => "https://live.example/login");
    const pass = noReader.status === "failed"
        && !!noReader.error
        && mismatch.status === "failed"
        && !!mismatch.error;
    return asPass(pass, { noReader, mismatch });
}
function runTestAgentUploadPathEscapeSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ta-upload-escape-"));
    try {
        fs.writeFileSync(path.join(dir, "ok.txt"), "x", "utf8");
        let escapeRejected = false;
        let escapeMessage = "";
        try {
            (0, playwright_provider_part_02_1.uploadFilePayload)({ workDir: dir, targetUrl: "http://localhost" }, { type: "uploadFile", filePath: path.join(os.tmpdir(), `outside-escape-${Date.now()}.txt`) });
        }
        catch (error) {
            escapeMessage = String(error?.message || error || "");
            escapeRejected = /outside workDir/i.test(escapeMessage);
        }
        const inside = (0, playwright_provider_part_02_1.uploadFilePayload)({ workDir: dir, targetUrl: "http://localhost" }, { type: "uploadFile", filePath: "ok.txt" });
        const insideOk = typeof inside === "string" && path.basename(inside) === "ok.txt";
        return asPass(escapeRejected && insideOk, { escapeRejected, escapeMessage, insideOk, inside });
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runTestAgentIndependentReviewDecisionAlignmentSelfTest() {
    const { deriveIndependentReviewDecision, } = require("../modules/collaboration/test-agent-independent-review-decision");
    const { buildNativeTestAgentReviewSummary } = require("../modules/collaboration/collaboration-test-agent-runtime");
    const { getIndependentReviewGateState } = require("../agents/workchain-part-01-part-01");
    const report = {
        schema: "ccm-test-agent-report-v1",
        status: "passed",
        browserProviderGaps: [{
                step: "mcp:waitForUrl",
                reason: "no live url observation",
                recommendation: "use Playwright",
            }],
        verdict: {
            status: "passed",
            canAccept: true,
            recommendation: "accept",
        },
    };
    const verdict = report.verdict;
    const decision = deriveIndependentReviewDecision({ report, verdict });
    const native = buildNativeTestAgentReviewSummary("TestAgent", report, {
        status: "done",
        testAgentReport: { verdict },
    });
    const gate = getIndependentReviewGateState({
        summary: {
            independent_review_required: true,
            independent_review_gate_passed: true,
            test_agent_report: report,
        },
    });
    const pass = decision.status === "needs_recheck"
        && decision.needsRecheck === true
        && decision.reviewRoute === "test_agent_recheck"
        && native.status === "needs_recheck"
        && gate.needsRecheck === true
        && gate.passed === false
        && gate.testAgentBrowserProviderGaps?.hasGaps === true;
    return asPass(pass, {
        decisionStatus: decision.status,
        nativeStatus: native.status,
        gateNeedsRecheck: gate.needsRecheck,
        gatePassed: gate.passed,
        providerGapCount: decision.providerGapCount,
    });
}
function runTestAgentProviderGapForcesPlaywrightRecheckSelfTest() {
    const { applyTestAgentProviderGapPlaywrightReroute, } = require("../modules/collaboration/test-agent-independent-review-decision");
    const { buildTestAgentReviewRecheckFollowUp, } = require("../modules/collaboration/collaboration-runtime-daily-dev-part-02");
    const report = {
        schema: "ccm-test-agent-report-v1",
        browserProviderGaps: [{
                step: "computer-use:goto",
                reason: "cannot prove navigation",
                recommendation: "use Playwright",
            }],
    };
    const handoff = {
        schema: "ccm-test-agent-handoff-v1",
        id: "handoff-gap-recheck",
        options: { browserProvider: "auto", verificationOnly: true },
        metadata: { handoffSource: "self-test" },
    };
    const rerouted = applyTestAgentProviderGapPlaywrightReroute(handoff, { report });
    const followUp = buildTestAgentReviewRecheckFollowUp({
        subject: "demo-project",
        reason: "Provider缺口：computer-use:goto → use Playwright",
        handoff,
        report,
        source: "credibility-self-test",
    });
    const followHandoff = followUp?.testAgentHandoff || followUp?.test_agent_handoff;
    const pass = rerouted?.options?.browserProvider === "playwright"
        && rerouted?.metadata?.providerGapReroute === true
        && followHandoff?.options?.browserProvider === "playwright"
        && followHandoff?.metadata?.providerGapReroute === true;
    return asPass(pass, {
        reroutedProvider: rerouted?.options?.browserProvider,
        followProvider: followHandoff?.options?.browserProvider,
        providerGapReroute: followHandoff?.metadata?.providerGapReroute === true,
    });
}
function runTestAgentFlakyHardBlocksAcceptSelfTest() {
    const { deriveIndependentReviewDecision } = require("../modules/collaboration/test-agent-independent-review-decision");
    const report = {
        status: "passed",
        recommendation: "accept",
        browserStabilitySummary: {
            total: 1,
            statusCounts: { stable_pass: 0, stable_fail: 0, flaky: 2, blocked: 0 },
        },
    };
    const verdict = {
        status: "passed",
        recommendation: "accept",
        canAccept: true,
        needsRework: false,
        needsRecheck: false,
        needsHuman: false,
        evidenceSummary: { browserFlakyStabilityGroups: 2 },
        browserStabilitySummary: report.browserStabilitySummary,
    };
    const decision = deriveIndependentReviewDecision({ report, verdict });
    const flakyBlocksCanAccept = (report.browserStabilitySummary.statusCounts.flaky || 0) > 0;
    const pass = flakyBlocksCanAccept
        && decision.canAccept === false
        && decision.needsRecheck === true
        && decision.status === "needs_recheck"
        && decision.flakyStabilityGroups === 2;
    return asPass(pass, {
        decisionStatus: decision.status,
        flakyStabilityGroups: decision.flakyStabilityGroups,
        canAccept: decision.canAccept,
    });
}
function runTestAgentEnvironmentPrepStructuredSelfTest() {
    const { buildTestAgentEnvironmentPrepChecklist, applyTestAgentEnvironmentPrepToHandoff, collectTestAgentFailureScreenshotRefs, formatFailureScreenshotTechnicalRows, } = require("../modules/collaboration/test-agent-environment-prep");
    const { deriveIndependentReviewDecision } = require("../modules/collaboration/test-agent-independent-review-decision");
    const report = {
        browserResults: [{
                name: "登录恢复",
                status: "blocked",
                error: 'Browser action fill requires environment variable "TEST_LOGIN_EMAIL", but it is not defined.',
                authentication: { credentialEnvNames: ["TEST_LOGIN_EMAIL", "TEST_LOGIN_PASSWORD"] },
                steps: [{ name: "fill:email", status: "failed", error: "missing env" }],
                screenshots: ["/tmp/artifacts/screenshots/web-登录恢复-1-fill_email.failure.png"],
                screenshotRefs: [{
                        stepName: "fill:email",
                        path: "/tmp/artifacts/screenshots/web-登录恢复-1-fill_email.failure.png",
                        kind: "failure",
                    }],
            }],
    };
    const verdict = {
        needsEnvironment: true,
        reviewRoute: "environment",
        browserAuthenticationSummary: { blockedChecks: 1, pendingChecks: 0, configuredChecks: 1, passedChecks: 0, failedChecks: 0 },
    };
    const prep = buildTestAgentEnvironmentPrepChecklist(report, verdict);
    const decision = deriveIndependentReviewDecision({
        report,
        verdict,
        forceEnvironmentSignals: true,
    });
    const handoff = applyTestAgentEnvironmentPrepToHandoff({
        id: "handoff-env-prep",
        metadata: {},
    }, prep);
    const shots = collectTestAgentFailureScreenshotRefs(report);
    const shotRows = formatFailureScreenshotTechnicalRows(shots);
    const pass = !!prep
        && prep.missingEnvNames.includes("TEST_LOGIN_EMAIL")
        && prep.missingEnvNames.includes("TEST_LOGIN_PASSWORD")
        && /缺环境变量名|缺登录/.test(prep.userSummary)
        && decision.status === "needs_environment"
        && decision.needsEnvironment === true
        && !!handoff?.metadata?.environmentPrepChecklist
        && shots.length === 1
        && shots[0].stepName === "fill:email"
        && shotRows[0].includes("失败步骤 → 截图");
    return asPass(pass, {
        missingEnvNames: prep?.missingEnvNames || [],
        decisionStatus: decision.status,
        hasHandoffChecklist: !!handoff?.metadata?.environmentPrepChecklist,
        shotRows,
    });
}
function runTestAgentPetActivityKeySelfTest() {
    const fs = require("fs");
    const path = require("path");
    const compiled = path.join(__dirname, "../modules/collaboration/collaboration-cross-agents-part-02-part-02-native-test.js");
    const sourceTs = path.join(__dirname, "../../backend/modules/collaboration/collaboration-cross-agents-part-02-part-02-native-test.ts");
    const sourcePath = fs.existsSync(compiled) ? compiled : sourceTs;
    const source = fs.readFileSync(sourcePath, "utf8");
    const usesDedicatedKey = /testAgentActivityKey\s*=\s*["']TestAgent["']/.test(source)
        && /setAgentActivity\(\s*testAgentActivityKey/.test(source)
        && !/setAgentActivity\(\s*targetName\s*,/.test(source);
    return asPass(usesDedicatedKey, { usesDedicatedKey, sourcePath });
}
//# sourceMappingURL=credibility-self-tests.js.map
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
exports.buildTestAgentArtifactManifest = buildTestAgentArtifactManifest;
exports.buildTestAgentMarkdownReport = buildTestAgentMarkdownReport;
exports.writeTestAgentArtifacts = writeTestAgentArtifacts;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const acceptance_summary_1 = require("./acceptance-summary");
const required_check_summary_1 = require("./required-check-summary");
const provider_gaps_1 = require("./browser/provider-gaps");
const provider_summary_1 = require("./browser/provider-summary");
const utils_1 = require("./utils");
const verdict_1 = require("./verdict");
function fileIntegrity(filePath, options = {}) {
    try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile())
            return { exists: false, error: "Path exists but is not a file." };
        if (options.omitHash) {
            return {
                exists: true,
                sizeBytes: stat.size,
                error: "sha256 omitted for self-referential artifact.",
            };
        }
        const hash = crypto.createHash("sha256");
        hash.update(fs.readFileSync(filePath));
        return {
            exists: true,
            sizeBytes: stat.size,
            sha256: hash.digest("hex"),
        };
    }
    catch (error) {
        return {
            exists: false,
            error: error.message || String(error),
        };
    }
}
function withArtifactIntegrity(files, manifestPath) {
    return files.map(item => ({
        ...item,
        integrity: fileIntegrity(item.path, { omitHash: path.resolve(item.path) === path.resolve(manifestPath) }),
    }));
}
function statusLine(label, status, detail = "") {
    return `- ${label}: ${status}${detail ? ` - ${detail}` : ""}`;
}
function commandLine(result) {
    const detail = result.error || `exit=${result.exitCode}; duration=${result.durationMs}ms`;
    return statusLine(`${result.project} command \`${result.command}\``, result.status, detail);
}
function httpLine(result) {
    const detail = result.error || `status=${result.statusCode}; resources=${result.resourceChecks.length}${result.probeType ? `; probe=${result.probeType}` : ""}`;
    return statusLine(`${result.project} ${result.adversarial ? "adversarial " : ""}HTTP ${result.name || result.url}`, result.status, detail);
}
function browserLine(result) {
    const finalUrl = result.finalUrl && result.finalUrl !== result.url ? `; final=${result.finalUrl}` : "";
    const viewport = result.viewport ? `; viewport=${result.viewport.width}x${result.viewport.height}${result.viewport.isMobile ? "; mobile" : ""}` : "";
    const browserContext = result.contextOptions ? `; context=${browserContextOptionsSummary(result.contextOptions)}` : "";
    const source = browserSourceSummary(result.context);
    const artifacts = (result.browserArtifacts || []).length;
    const detail = result.error || `${result.url}${finalUrl}${viewport}${browserContext}${source ? `; source=${source}` : ""}; steps=${result.steps.length}; screenshots=${result.screenshots.length}; artifacts=${artifacts}${result.probeType ? `; probe=${result.probeType}` : ""}`;
    return statusLine(`${result.project} ${result.adversarial ? "adversarial " : ""}browser ${result.name}`, result.status, detail);
}
function browserSourceSummary(context) {
    if (!context)
        return "";
    const generatedBy = String(context.generatedBy || context.source || "").trim();
    const criteria = Array.isArray(context.acceptanceCriteria) ? context.acceptanceCriteria.length : 0;
    return [generatedBy, criteria ? `criteria=${criteria}` : ""].filter(Boolean).join("; ");
}
function browserContextOptionsSummary(contextOptions) {
    const parts = [
        contextOptions.locale ? `locale=${contextOptions.locale}` : "",
        contextOptions.timezoneId ? `timezone=${contextOptions.timezoneId}` : "",
        contextOptions.colorScheme ? `color=${contextOptions.colorScheme}` : "",
        contextOptions.reducedMotion ? `motion=${contextOptions.reducedMotion}` : "",
        contextOptions.permissions?.length ? `permissions=${contextOptions.permissions.join(",")}` : "",
        contextOptions.geolocation ? `geo=${contextOptions.geolocation.latitude},${contextOptions.geolocation.longitude}` : "",
    ].filter(Boolean);
    return parts.join("; ") || "default";
}
function browserNetworkSummaryLine(item) {
    const failedUrls = item.failedUrls.length ? `; failed=${item.failedUrls.slice(0, 3).join(", ")}` : "";
    const detail = `requests=${item.requestCount}; responses=${item.responseCount}; errors=${item.errorCount}; failedResponses=${item.failedResponseCount}${failedUrls}${item.networkLogPath ? `; log=${item.networkLogPath}` : ""}`;
    return statusLine(`${item.project} browser network ${item.name}`, item.status, detail);
}
function typedCounts(counts) {
    const entries = Object.entries(counts || {});
    return entries.length ? entries.map(([key, value]) => `${key}:${value}`).join(", ") : "none";
}
function browserInteractionSummaryLine(item) {
    const failed = item.failedSteps.length ? `; failed=${item.failedSteps.slice(0, 3).map(step => `${step.name}${step.error ? `(${step.error})` : ""}`).join(", ")}` : "";
    const detail = `actions=${item.actionCount} passed=${item.passedActions} failed=${item.failedActions}; assertions=${item.assertionCount} passed=${item.passedAssertions} failed=${item.failedAssertions}; actionTypes=${typedCounts(item.actionTypes)}; assertionTypes=${typedCounts(item.assertionTypes)}${failed}`;
    return statusLine(`${item.project} browser interactions ${item.name}`, item.status, detail);
}
function browserProviderGapLine(item) {
    return statusLine(`${item.provider} ${item.category}`, "gap", (0, provider_gaps_1.formatBrowserProviderGapLine)(item));
}
function browserProviderSummaryLines(report) {
    const summary = report.browserProviderSummary;
    if (!summary)
        return ["- none"];
    const lines = [`- ${(0, provider_summary_1.formatBrowserProviderSummaryLine)(summary)}`];
    for (const item of summary.items || []) {
        const detail = [
            `preferred=${item.preferred ? "yes" : "no"}`,
            `available=${item.available ? "yes" : "no"}`,
            `selected=${item.selected ? "yes" : "no"}`,
            `attempted=${item.attempted ? "yes" : "no"}`,
            `results=${item.resultCount}`,
            `passed=${item.passed}`,
            `failed=${item.failed}`,
            `blocked=${item.blocked}`,
            `skipped=${item.skipped}`,
            item.reason ? `reason=${item.reason}` : "",
            item.tools?.length ? `tools=${item.tools.length}` : "",
        ].filter(Boolean).join("; ");
        lines.push(statusLine(`${item.label || item.provider}`, item.provider, detail));
    }
    return lines;
}
function evidenceLine(item) {
    const target = item.path || item.detail || "";
    return statusLine(item.title, item.status, target);
}
function requiredCheckLine(item) {
    const detail = item.evidence.length ? item.evidence.join("; ") : item.missingReason || "";
    return statusLine(item.check, item.status, detail);
}
function failureSummaryLine(item) {
    const evidence = item.evidence?.length ? `; evidence=${item.evidence.join("; ")}` : "";
    const diagnostics = item.diagnostics?.length ? `; diagnostics=${item.diagnostics.join(" | ")}` : "";
    const next = item.nextAction ? `; next=${item.nextAction}` : "";
    return statusLine(`${item.type}${item.project ? ` ${item.project}` : ""} ${item.title}`, item.status, `${item.reason}${evidence}${diagnostics}${next}`);
}
function fence(value, max = 4000) {
    const text = (0, utils_1.compactText)(value ?? "", max).replace(/```/g, "`` `").trim();
    return text ? ["```text", text, "```"] : ["```text", "(empty)", "```"];
}
function section(title, lines) {
    return ["", `## ${title}`, "", ...lines];
}
function detailTitle(index, title) {
    return `### ${index + 1}. ${title}`;
}
function commandDetail(result, index) {
    return [
        detailTitle(index, `${result.project}: ${result.command}`),
        "",
        `- Status: ${result.status}`,
        `- CWD: ${result.cwd}`,
        `- Exit code: ${result.exitCode === null ? "(none)" : result.exitCode}`,
        `- Duration: ${result.durationMs}ms`,
        ...(result.error ? [`- Error: ${result.error}`] : []),
        "",
        "**Command run:**",
        ...fence(result.command, 1000),
        "",
        "**Output observed:**",
        ...fence(result.output || [result.stdout, result.stderr].filter(Boolean).join("\n"), 6000),
    ];
}
function devServerDetail(result, index) {
    return [
        detailTitle(index, `${result.project}: ${result.command || "dev server readiness"}`),
        "",
        `- Status: ${result.status}`,
        `- CWD: ${result.cwd}`,
        `- URL: ${result.url || "(none)"}`,
        `- Started: ${result.startedAt}`,
        ...(result.readyAt ? [`- Ready: ${result.readyAt}`] : []),
        ...(result.error ? [`- Error: ${result.error}`] : []),
        "",
        "**Server output:**",
        ...fence(result.output || "", 3000),
    ];
}
function httpDetail(result, index) {
    const resources = result.resourceChecks.length
        ? result.resourceChecks.map(item => `- ${item.status}: ${item.statusCode ?? "(none)"} ${item.url}${item.contentType ? ` (${item.contentType})` : ""}${item.error ? ` - ${item.error}` : ""}`)
        : ["- none"];
    const assertions = (result.assertions || []).length
        ? (result.assertions || []).map(item => `- ${item.status}: ${item.name}${item.detail ? ` - ${item.detail}` : ""}${item.error ? ` - ${item.error}` : ""}`)
        : ["- none"];
    return [
        detailTitle(index, `${result.project}: ${result.name || result.url}`),
        "",
        `- Status: ${result.status}`,
        `- Adversarial: ${result.adversarial ? "yes" : "no"}`,
        ...(result.probeType ? [`- Probe type: ${result.probeType}`] : []),
        `- Method: ${result.method || "GET"}`,
        `- URL: ${result.url}`,
        `- HTTP status: ${result.statusCode === null ? "(none)" : result.statusCode}`,
        `- Content-Type: ${result.contentType || "(none)"}`,
        `- Duration: ${result.durationMs}ms`,
        ...(result.error ? [`- Error: ${result.error}`] : []),
        "",
        "**Assertions:**",
        ...assertions,
        "",
        "**Resource sample:**",
        ...resources,
        "",
        "**Response preview:**",
        ...fence(result.responsePreview || "", 3000),
    ];
}
function browserDetail(result, index) {
    const steps = result.steps.length
        ? result.steps.map((step, stepIndex) => `- ${stepIndex + 1}. ${step.kind} ${step.name}: ${step.status}${step.detail ? ` - ${step.detail}` : ""}${step.error ? ` - ${step.error}` : ""}`)
        : ["- none"];
    const browserArtifacts = result.browserArtifacts || [];
    return [
        detailTitle(index, `${result.project}: ${result.name}`),
        "",
        `- Status: ${result.status}`,
        `- Adversarial: ${result.adversarial ? "yes" : "no"}`,
        ...(result.probeType ? [`- Probe type: ${result.probeType}`] : []),
        ...(browserSourceSummary(result.context) ? [`- Source: ${browserSourceSummary(result.context)}`] : []),
        `- Provider: ${result.provider || "(unknown)"}`,
        `- URL: ${result.url}`,
        ...(result.finalUrl ? [`- Final URL: ${result.finalUrl}`] : []),
        ...(result.viewport ? [`- Viewport: ${result.viewport.width}x${result.viewport.height}${result.viewport.isMobile ? " mobile" : ""}${result.viewport.deviceScaleFactor ? ` @${result.viewport.deviceScaleFactor}x` : ""}`] : []),
        ...(result.contextOptions ? [`- Context: ${browserContextOptionsSummary(result.contextOptions)}`] : []),
        ...(result.title ? [`- Title: ${result.title}`] : []),
        `- Duration: ${result.durationMs}ms`,
        ...(result.error ? [`- Error: ${result.error}`] : []),
        ...(result.context?.acceptanceCriteria ? [
            "",
            "**Acceptance source:**",
            ...(Array.isArray(result.context.acceptanceCriteria) && result.context.acceptanceCriteria.length
                ? result.context.acceptanceCriteria.map((criterion) => `- ${criterion}`)
                : ["- none"]),
        ] : []),
        "",
        "**Steps:**",
        ...steps,
        "",
        "**Console errors:**",
        ...(result.consoleErrors.length ? result.consoleErrors.map(item => `- ${item}`) : ["- none"]),
        "",
        "**Console messages:**",
        ...((result.consoleMessages || []).length ? (result.consoleMessages || []).slice(0, 20).map(item => `- ${item}`) : ["- none"]),
        ...(result.consoleLogPath ? [`- Full log: ${result.consoleLogPath}`] : []),
        "",
        "**Browser dialogs:**",
        ...((result.dialogMessages || []).length ? (result.dialogMessages || []).slice(0, 20).map(item => `- ${item}`) : ["- none"]),
        ...(result.dialogLogPath ? [`- Full log: ${result.dialogLogPath}`] : []),
        "",
        "**Browser popups:**",
        ...((result.popupMessages || []).length ? (result.popupMessages || []).slice(0, 20).map(item => `- ${item}`) : ["- none"]),
        ...(result.popupLogPath ? [`- Full log: ${result.popupLogPath}`] : []),
        "",
        "**Page errors:**",
        ...(result.pageErrors.length ? result.pageErrors.map(item => `- ${item}`) : ["- none"]),
        "",
        "**Network errors:**",
        ...((result.networkErrors || []).length ? (result.networkErrors || []).map(item => `- ${item}`) : ["- none"]),
        "",
        "**Network requests:**",
        ...((result.networkRequests || []).length ? (result.networkRequests || []).slice(0, 30).map(item => `- ${item}`) : ["- none"]),
        ...(result.networkLogPath ? [`- Full log: ${result.networkLogPath}`] : []),
        "",
        "**Screenshots:**",
        ...(result.screenshots.length ? result.screenshots.map(item => `- ${item}`) : ["- none"]),
        "",
        "**Page snapshots:**",
        ...((result.pageSnapshots || []).length ? (result.pageSnapshots || []).map(item => `- ${item}`) : ["- none"]),
        "",
        "**Browser artifacts:**",
        ...(browserArtifacts.length ? browserArtifacts.map(item => `- ${item.type}: ${item.path}${item.mediaType ? ` (${item.mediaType})` : ""}${item.source ? ` - ${item.source}` : ""}`) : ["- none"]),
        "",
        "**Page text preview:**",
        ...fence(result.pageTextPreview || "", 2000),
    ];
}
function browserToolCallDetail(result, index) {
    return [
        detailTitle(index, result.toolName),
        "",
        `- Status: ${result.status}`,
        `- Duration: ${result.durationMs}ms`,
        `- Started: ${result.startedAt}`,
        `- Finished: ${result.finishedAt}`,
        ...(result.error ? [`- Error: ${result.error}`] : []),
        "",
        "**Input:**",
        ...fence(JSON.stringify(result.input, null, 2), 3000),
        "",
        "**Output preview:**",
        ...fence(result.outputPreview || "", 3000),
    ];
}
function browserProviderPreflightLines(report) {
    const preflight = Array.isArray(report.metadata?.browserProviderPreflight)
        ? report.metadata.browserProviderPreflight
        : [];
    if (!preflight.length)
        return ["- none"];
    return preflight.flatMap((item, index) => [
        detailTitle(index, `${item.label || item.provider}`),
        "",
        `- Provider: ${item.provider || "(unknown)"}`,
        `- Preferred: ${item.preferred ? "yes" : "no"}`,
        `- Available: ${item.available ? "yes" : "no"}`,
        ...(item.reason ? [`- Reason: ${item.reason}`] : []),
        ...(item.diagnostics ? [
            "- Diagnostics:",
            ...Object.entries(item.diagnostics).map(([key, value]) => `  - ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`),
        ] : []),
        "- Tools:",
        ...(Array.isArray(item.tools) && item.tools.length ? item.tools.map((tool) => `  - ${tool}`) : ["  - none"]),
        "",
    ]);
}
function uniqueManifestItems(items) {
    const seen = new Set();
    return items.filter(item => {
        const key = `${item.type}:${path.resolve(item.path)}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function browserArtifactManifestType(artifact) {
    if (artifact.type === "trace")
        return "browser_trace";
    if (artifact.type === "har")
        return "browser_har";
    if (artifact.type === "video")
        return "browser_video";
    if (artifact.type === "accessibility_snapshot")
        return "browser_accessibility_snapshot";
    return "browser_artifact";
}
function buildTestAgentArtifactManifest(report, manifestPath) {
    const files = withArtifactIntegrity(uniqueManifestItems([
        {
            type: "report_json",
            title: "TestAgent JSON report",
            path: String(report.metadata.artifactFiles?.reportJsonPath || path.join(report.artifactDir, "report.json")),
            status: report.status,
            source: "writeTestAgentArtifacts",
        },
        {
            type: "report_markdown",
            title: "TestAgent Markdown report",
            path: String(report.metadata.artifactFiles?.reportMarkdownPath || path.join(report.artifactDir, "report.md")),
            status: report.status,
            source: "writeTestAgentArtifacts",
        },
        {
            type: "verdict_json",
            title: "TestAgent verdict JSON",
            path: String(report.metadata.artifactFiles?.verdictJsonPath || path.join(report.artifactDir, "verdict.json")),
            status: report.status,
            source: "writeTestAgentArtifacts",
        },
        {
            type: "artifact_manifest",
            title: "TestAgent artifact manifest",
            path: manifestPath,
            status: report.status,
            source: "writeTestAgentArtifacts",
        },
        ...report.browserResults.flatMap(result => result.screenshots.map(screenshot => ({
            type: "screenshot",
            title: `Screenshot: ${result.name}`,
            path: screenshot,
            project: result.project,
            status: result.status,
            source: "browserResults",
        }))),
        ...report.browserResults.flatMap(result => (result.pageSnapshots || []).map(snapshot => ({
            type: "browser_snapshot",
            title: `Page snapshot: ${result.name}`,
            path: snapshot,
            project: result.project,
            status: result.status,
            source: "browserResults",
        }))),
        ...report.browserResults.flatMap(result => result.consoleLogPath ? [{
                type: "browser_console_log",
                title: `Console log: ${result.name}`,
                path: result.consoleLogPath,
                project: result.project,
                status: result.status,
                source: "browserResults",
            }] : []),
        ...report.browserResults.flatMap(result => result.dialogLogPath ? [{
                type: "browser_dialog_log",
                title: `Dialog log: ${result.name}`,
                path: result.dialogLogPath,
                project: result.project,
                status: result.status,
                source: "browserResults",
            }] : []),
        ...report.browserResults.flatMap(result => result.popupLogPath ? [{
                type: "browser_popup_log",
                title: `Popup log: ${result.name}`,
                path: result.popupLogPath,
                project: result.project,
                status: result.status,
                source: "browserResults",
            }] : []),
        ...report.browserResults.flatMap(result => result.networkLogPath ? [{
                type: "browser_network_log",
                title: `Network log: ${result.name}`,
                path: result.networkLogPath,
                project: result.project,
                status: result.status,
                source: "browserResults",
            }] : []),
        ...report.browserResults.flatMap(result => (result.browserArtifacts || []).map(artifact => ({
            type: browserArtifactManifestType(artifact),
            title: `Browser ${artifact.type}: ${result.name}`,
            path: artifact.path,
            project: result.project,
            status: result.status,
            source: artifact.source || "browserResults",
        }))),
        ...(typeof report.metadata.browserToolTranscriptPath === "string" && report.metadata.browserToolTranscriptPath
            ? [{
                    type: "browser_tool_transcript",
                    title: "Browser MCP tool call transcript",
                    path: report.metadata.browserToolTranscriptPath,
                    status: report.browserToolCalls.some(item => item.status === "failed") ? "failed" : "passed",
                    source: "browserToolCalls",
                }]
            : []),
        ...report.evidence
            .filter(item => item.type === "artifact" && item.path)
            .map(item => ({
            type: "evidence_artifact",
            title: item.title,
            path: item.path,
            project: item.project,
            status: item.status,
            source: "evidence",
        })),
    ]), manifestPath);
    return {
        schema: "ccm-test-agent-artifact-manifest-v1",
        reportId: report.id,
        workOrderId: report.workOrderId,
        taskId: report.taskId,
        groupId: report.groupId,
        status: report.status,
        artifactDir: report.artifactDir,
        generatedAt: (0, utils_1.nowIso)(),
        summary: {
            reports: files.filter(item => item.type === "report_json" || item.type === "report_markdown").length,
            screenshots: files.filter(item => item.type === "screenshot").length,
            browserSnapshots: files.filter(item => item.type === "browser_snapshot").length,
            browserAccessibilitySnapshots: files.filter(item => item.type === "browser_accessibility_snapshot").length,
            browserConsoleLogs: files.filter(item => item.type === "browser_console_log").length,
            browserPopupLogs: files.filter(item => item.type === "browser_popup_log").length,
            browserNetworkLogs: files.filter(item => item.type === "browser_network_log").length,
            browserToolTranscripts: files.filter(item => item.type === "browser_tool_transcript").length,
            browserTraces: files.filter(item => item.type === "browser_trace").length,
            browserHars: files.filter(item => item.type === "browser_har").length,
            browserVideos: files.filter(item => item.type === "browser_video").length,
            browserArtifacts: files.filter(item => item.type === "browser_artifact").length,
            evidenceArtifacts: files.filter(item => item.type === "evidence_artifact").length,
            integrityVerified: files.filter(item => item.integrity?.exists).length,
            integrityMissing: files.filter(item => !item.integrity?.exists).length,
        },
        files,
    };
}
function buildTestAgentMarkdownReport(report) {
    const requiredCheckSummary = (0, required_check_summary_1.buildRequiredCheckSummary)(report.requiredCheckCoverage, { evidenceLimit: 1, textLimit: 260 });
    const acceptanceSummary = (0, acceptance_summary_1.buildAcceptanceSummary)(report.acceptanceCoverage, { evidenceLimit: 1, textLimit: 260 });
    const lines = [
        `# TestAgent Report`,
        "",
        `- Status: ${report.status}`,
        `- Recommendation: ${report.recommendation}`,
        `- Work order: ${report.workOrderId}`,
        `- Task: ${report.taskId || "(none)"}`,
        `- Group: ${report.groupId || "(none)"}`,
        `- Started: ${report.startedAt}`,
        `- Finished: ${report.finishedAt}`,
        `- Duration: ${report.durationMs}ms`,
        "",
        "## Summary",
        "",
        report.summary,
        "",
        "## Commands",
        "",
        ...(report.commandResults.length ? report.commandResults.map(commandLine) : ["- none"]),
        "",
        "## HTTP",
        "",
        ...(report.httpResults.length ? report.httpResults.map(httpLine) : ["- none"]),
        "",
        "## Browser",
        "",
        ...(report.browserResults.length ? report.browserResults.map(browserLine) : ["- none"]),
        "",
        "## Browser Network Summary",
        "",
        ...((report.browserNetworkSummary || []).length ? (report.browserNetworkSummary || []).map(browserNetworkSummaryLine) : ["- none"]),
        "",
        "## Browser Interaction Summary",
        "",
        ...((report.browserInteractionSummary || []).length ? (report.browserInteractionSummary || []).map(browserInteractionSummaryLine) : ["- none"]),
        "",
        "## Browser Provider Summary",
        "",
        ...browserProviderSummaryLines(report),
        "",
        "## Browser Provider Gaps",
        "",
        ...((report.browserProviderGaps || []).length ? (report.browserProviderGaps || []).map(browserProviderGapLine) : ["- none"]),
        "",
        "## Failure Summary",
        "",
        ...((report.failureSummary || []).length ? (report.failureSummary || []).map(failureSummaryLine) : ["- none"]),
        "",
        "## Required Check Summary",
        "",
        ...(0, required_check_summary_1.formatRequiredCheckMarkdownSummaryLines)(requiredCheckSummary),
        "",
        "## Required Check Coverage",
        "",
        ...(report.requiredCheckCoverage.length ? report.requiredCheckCoverage.map(requiredCheckLine) : ["- none"]),
        "",
        "## Acceptance Summary",
        "",
        ...(0, acceptance_summary_1.formatAcceptanceMarkdownSummaryLines)(acceptanceSummary),
        "",
        "## Acceptance Coverage",
        "",
        ...(report.acceptanceCoverage.length
            ? report.acceptanceCoverage.map(item => statusLine(item.criterion, item.status, item.evidence.join("; ")))
            : ["- none"]),
        "",
        "## Risks",
        "",
        ...(report.risks.length ? report.risks.map(risk => `- ${risk}`) : ["- none"]),
        "",
        "## Blocked Reasons",
        "",
        ...(report.blockedReasons.length ? report.blockedReasons.map(reason => `- ${reason}`) : ["- none"]),
        "",
        "## Evidence",
        "",
        ...(report.evidence.length ? report.evidence.map(evidenceLine) : ["- none"]),
        ...section("Dev Server Details", report.devServerResults.length ? report.devServerResults.flatMap(devServerDetail) : ["- none"]),
        ...section("Command Details", report.commandResults.length ? report.commandResults.flatMap(commandDetail) : ["- none"]),
        ...section("HTTP Details", report.httpResults.length ? report.httpResults.flatMap(httpDetail) : ["- none"]),
        ...section("Browser Details", report.browserResults.length ? report.browserResults.flatMap(browserDetail) : ["- none"]),
        ...section("Browser Provider Preflight", browserProviderPreflightLines(report)),
        ...section("Browser Tool Calls", report.browserToolCalls.length ? report.browserToolCalls.flatMap(browserToolCallDetail) : ["- none"]),
        "",
    ];
    return `${lines.join("\n")}\n`;
}
function writeTestAgentArtifacts(report) {
    const artifactDir = (0, utils_1.ensureDir)(report.artifactDir);
    const reportJsonPath = path.join(artifactDir, "report.json");
    const reportMarkdownPath = path.join(artifactDir, "report.md");
    const verdictJsonPath = path.join(artifactDir, "verdict.json");
    const manifestPath = path.join(artifactDir, "artifact-manifest.json");
    const artifactEvidence = [
        {
            type: "artifact",
            title: "TestAgent JSON report",
            status: report.status,
            path: reportJsonPath,
        },
        {
            type: "artifact",
            title: "TestAgent Markdown report",
            status: report.status,
            path: reportMarkdownPath,
        },
        {
            type: "artifact",
            title: "TestAgent verdict JSON",
            status: report.status,
            path: verdictJsonPath,
        },
        {
            type: "artifact",
            title: "TestAgent artifact manifest",
            status: report.status,
            path: manifestPath,
        },
    ];
    const augmented = {
        ...report,
        evidence: [...report.evidence, ...artifactEvidence],
        metadata: {
            ...report.metadata,
            artifactFiles: {
                reportJsonPath,
                reportMarkdownPath,
                verdictJsonPath,
                manifestPath,
            },
        },
    };
    const verdict = (0, verdict_1.buildTestAgentVerdict)(augmented);
    fs.writeFileSync(reportJsonPath, `${JSON.stringify(augmented, null, 2)}\n`, "utf-8");
    fs.writeFileSync(reportMarkdownPath, buildTestAgentMarkdownReport(augmented), "utf-8");
    fs.writeFileSync(verdictJsonPath, `${JSON.stringify(verdict, null, 2)}\n`, "utf-8");
    let manifest = buildTestAgentArtifactManifest(augmented, manifestPath);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
    manifest = buildTestAgentArtifactManifest(augmented, manifestPath);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
    return augmented;
}
//# sourceMappingURL=artifacts.js.map
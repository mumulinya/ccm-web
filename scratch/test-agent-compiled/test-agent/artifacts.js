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
const utils_1 = require("./utils");
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
    const artifacts = (result.browserArtifacts || []).length;
    const detail = result.error || `${result.url}${finalUrl}; steps=${result.steps.length}; screenshots=${result.screenshots.length}; artifacts=${artifacts}${result.probeType ? `; probe=${result.probeType}` : ""}`;
    return statusLine(`${result.project} ${result.adversarial ? "adversarial " : ""}browser ${result.name}`, result.status, detail);
}
function evidenceLine(item) {
    const target = item.path || item.detail || "";
    return statusLine(item.title, item.status, target);
}
function requiredCheckLine(item) {
    const detail = item.evidence.length ? item.evidence.join("; ") : item.missingReason || "";
    return statusLine(item.check, item.status, detail);
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
        `- Provider: ${result.provider || "(unknown)"}`,
        `- URL: ${result.url}`,
        ...(result.finalUrl ? [`- Final URL: ${result.finalUrl}`] : []),
        ...(result.title ? [`- Title: ${result.title}`] : []),
        `- Duration: ${result.durationMs}ms`,
        ...(result.error ? [`- Error: ${result.error}`] : []),
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
            browserConsoleLogs: files.filter(item => item.type === "browser_console_log").length,
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
        "## Required Check Coverage",
        "",
        ...(report.requiredCheckCoverage.length ? report.requiredCheckCoverage.map(requiredCheckLine) : ["- none"]),
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
                manifestPath,
            },
        },
    };
    fs.writeFileSync(reportJsonPath, `${JSON.stringify(augmented, null, 2)}\n`, "utf-8");
    fs.writeFileSync(reportMarkdownPath, buildTestAgentMarkdownReport(augmented), "utf-8");
    let manifest = buildTestAgentArtifactManifest(augmented, manifestPath);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
    manifest = buildTestAgentArtifactManifest(augmented, manifestPath);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
    return augmented;
}

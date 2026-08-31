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
exports.testAgentVisibleProgressContext = testAgentVisibleProgressContext;
exports.testAgentProgressRuntimeOptionsFromEnv = testAgentProgressRuntimeOptionsFromEnv;
exports.beginTestAgentVisibleTool = beginTestAgentVisibleTool;
exports.publishTestAgentVisibleModelRetry = publishTestAgentVisibleModelRetry;
exports.readTestAgentVisibleProgress = readTestAgentVisibleProgress;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const tool_display_projection_1 = require("../system/tool-display-projection");
const user_visible_agent_events_1 = require("../system/user-visible-agent-events");
const PROGRESS_SCHEMA = "ccm-test-agent-tool-progress-v1";
const SECRET = /((?:api[_-]?key|access[_-]?token|token|authorization|cookie|password|secret|credential)\s*[:=]\s*["']?)[^\s,"'}]{4,}/gi;
const ABSOLUTE_PATH = /(?:[A-Za-z]:\\[^\s"']+|\/(?:Users|home|root|var|private|opt|srv)\/[^\s"']+)/g;
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function clean(value, max = 500) {
    return String(value ?? "")
        .replace(/(^|\s)([A-Z_][A-Z0-9_]*(?:=|:))[^\s]+/g, "$1$2[redacted]")
        .replace(SECRET, "$1[redacted]")
        .replace(ABSOLUTE_PATH, match => `[path]/${path.basename(match)}`)
        .replace(/[\0\r\n\t]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, max);
}
function progressPath() {
    const candidate = String(process.env.CCM_TEST_AGENT_PROGRESS_PATH || "").trim();
    if (!candidate)
        return "";
    const root = path.resolve(utils_1.CCM_DIR, "test-agent-runs");
    const resolved = path.resolve(candidate);
    const relative = path.relative(root, resolved);
    return relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? resolved : "";
}
function persistProgress(row) {
    const file = progressPath();
    if (!file)
        return;
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.appendFileSync(file, `${JSON.stringify(row)}\n`, "utf-8");
    }
    catch { }
}
function toolName(kind) {
    if (kind === "command" || kind === "dev_server")
        return "run_command";
    if (kind === "http")
        return "test_agent_http_check";
    if (kind === "browser_tool")
        return "test_agent_browser_tool";
    return "test_agent_browser_check";
}
function title(kind, label) {
    if (kind === "command")
        return `验证命令 · ${label}`;
    if (kind === "dev_server")
        return `测试服务 · ${label}`;
    if (kind === "http")
        return `HTTP 检查 · ${label}`;
    if (kind === "browser_tool")
        return `浏览器工具 · ${label}`;
    return `浏览器检查 · ${label}`;
}
function testAgentVisibleProgressContext(value) {
    const source = value?.metadata?.userVisibleProgressContext || value?.userVisibleProgressContext || value;
    const scope = String(source?.scope || "");
    const scopeId = clean(source?.scopeId || source?.scope_id, 240);
    const exactSessionId = clean(source?.exactSessionId || source?.exact_session_id, 240);
    const taskId = clean(source?.taskId || source?.task_id, 240);
    const agentRunId = clean(source?.agentRunId || source?.agent_run_id, 240);
    if (!["project", "group"].includes(scope) || !scopeId || !exactSessionId || !taskId || !agentRunId)
        return null;
    return {
        scope,
        scopeId,
        exactSessionId,
        taskId,
        generation: Math.max(0, Number(source?.generation || 0)),
        attempt: Math.max(1, Number(source?.attempt || 1)),
        anchorMessageId: clean(source?.anchorMessageId || source?.anchor_message_id, 240) || undefined,
        originMessageId: clean(source?.originMessageId || source?.origin_message_id, 240) || undefined,
        projectId: clean(source?.projectId || source?.project_id, 240) || undefined,
        agentRunId,
    };
}
function testAgentProgressRuntimeOptionsFromEnv() {
    try {
        const value = JSON.parse(String(process.env.CCM_TEST_AGENT_PROGRESS_CONTEXT || "null"));
        const context = testAgentVisibleProgressContext(value);
        return context ? { userVisibleProgressContext: context } : {};
    }
    catch {
        return {};
    }
}
function beginTestAgentVisibleTool(contextValue, input) {
    const context = testAgentVisibleProgressContext(contextValue);
    if (!context)
        return { toolCallId: "", finish: (_result) => undefined };
    const normalized = {
        kind: input.kind,
        key: clean(input.key, 300),
        project: clean(input.project || context.projectId || context.scopeId, 240),
        label: clean(input.label, 240) || "检查",
        command: clean(input.command, 600),
    };
    const toolCallId = `test-agent-tool:${checksum({ context, normalized }).slice(0, 28)}`;
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    const canonicalTool = toolName(normalized.kind);
    const displayTitle = title(normalized.kind, normalized.label);
    const safeArguments = {
        project_id: normalized.project,
        check: normalized.label,
        ...(normalized.command ? { command: normalized.command } : {}),
    };
    const toolDisplay = (0, tool_display_projection_1.buildToolDisplayDetail)({ toolName: canonicalTool, arguments: safeArguments, result: { status: "running" }, includeTechnicalCommand: true });
    (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
        eventId: `${toolCallId}:started`,
        ...context,
        turnId: context.anchorMessageId || `task:${context.taskId}`,
        parentEventId: context.agentRunId,
        toolCallId,
        toolName: canonicalTool,
        eventType: "tool_started",
        createdAt: startedAt,
        display: { title: displayTitle, target: normalized.project, summary: "正在执行", status: "running" },
        detail: { safeArguments, toolDisplay, testAgentToolTrace: { schema: PROGRESS_SCHEMA, kind: normalized.kind, checksum: checksum(normalized), contentStored: false } },
        visibility: "transcript",
        contentStored: false,
    });
    persistProgress({ schema: PROGRESS_SCHEMA, phase: "started", at: startedAt, context, toolCallId, toolName: canonicalTool, title: displayTitle, ...normalized, checksum: checksum({ context, normalized, phase: "started" }), contentStored: false });
    let finished = false;
    return {
        toolCallId,
        finish(result = {}) {
            if (finished)
                return;
            finished = true;
            const statusText = clean(result?.status, 40).toLowerCase();
            const failed = ["failed", "blocked", "timed_out", "error", "partial", "unavailable"].includes(statusText);
            const durationMs = Math.max(0, Number(result?.durationMs || result?.duration_ms || Date.now() - startedMs));
            const exitCode = Number.isFinite(Number(result?.exitCode ?? result?.exit_code)) ? Number(result?.exitCode ?? result?.exit_code) : null;
            const summary = failed
                ? `${normalized.label}${statusText === "blocked" ? "已阻止" : statusText === "timed_out" ? "已超时" : "未通过"}`
                : `${normalized.label}已完成`;
            const safeResult = { status: failed ? statusText || "failed" : "passed", exitCode, durationMs, contentStored: false };
            const completedDisplay = (0, tool_display_projection_1.buildToolDisplayDetail)({ toolName: canonicalTool, arguments: safeArguments, result: safeResult, error: failed ? clean(result?.error, 500) || summary : undefined, includeTechnicalCommand: true });
            const at = new Date().toISOString();
            (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
                eventId: `${toolCallId}:${failed ? "failed" : "completed"}`,
                ...context,
                turnId: context.anchorMessageId || `task:${context.taskId}`,
                parentEventId: context.agentRunId,
                toolCallId,
                toolName: canonicalTool,
                eventType: failed ? "tool_failed" : "tool_completed",
                createdAt: at,
                display: { title: displayTitle, target: normalized.project, summary, status: failed ? "failed" : "success", durationMs },
                detail: { safeArguments, safeResult, toolDisplay: completedDisplay, testAgentToolTrace: { schema: PROGRESS_SCHEMA, kind: normalized.kind, checksum: checksum({ normalized, safeResult }), contentStored: false } },
                visibility: "transcript",
                contentStored: false,
            });
            persistProgress({ schema: PROGRESS_SCHEMA, phase: failed ? "failed" : "completed", at, context, toolCallId, toolName: canonicalTool, title: displayTitle, ...normalized, status: safeResult.status, exitCode, durationMs, checksum: checksum({ context, normalized, safeResult }), contentStored: false });
        },
    };
}
/**
 * TestAgent can run in a detached CLI process, so a real Provider retry must
 * be written to the same recoverable progress channel as its verification
 * tools. Normal planning remains covered by the enclosing TestAgent activity;
 * this emits only a retry that will actually be followed by another request.
 */
function publishTestAgentVisibleModelRetry(contextValue, stage, notice) {
    const context = testAgentVisibleProgressContext(contextValue);
    if (!context)
        return null;
    const retryAttempt = Math.max(1, Number(notice?.attempt || 1));
    const maxRetries = Math.max(retryAttempt, Math.max(1, Number(notice?.maxAttempts || 1) - 1));
    const retryDelayMs = Math.max(0, Number(notice?.delayMs || 0));
    const error = notice?.error && typeof notice.error === "object" ? notice.error : {};
    const evidence = error?.providerRequestEvidence && typeof error.providerRequestEvidence === "object"
        ? error.providerRequestEvidence
        : error;
    const requestDispatchCount = Math.max(0, Number(evidence?.requestDispatchCount || 0));
    const responseStartedCount = Math.max(0, Number(evidence?.responseStartedCount || 0));
    const providerRequestIdPresent = evidence?.providerRequestIdPresent === true;
    const label = `模型请求失败，正在重试（${retryAttempt}/${maxRetries}）`;
    const at = new Date().toISOString();
    const stageIndex = stage === "test_plan" ? 1 : stage === "test_plan_repair" ? 2 : 3;
    const eventId = `test-agent-model-retry:${checksum({ context, stage, retryAttempt }).slice(0, 28)}`;
    const activity = {
        state: "retrying",
        phase: stage === "test_followup" ? "verification" : "understanding",
        modelCallIndex: stageIndex,
        revision: retryAttempt,
        retryAttempt,
        maxRetries,
        retryDelayMs,
        startedAt: at,
        requestDispatched: requestDispatchCount > 0,
        responseStarted: responseStartedCount > 0,
        providerRequestIdPresent,
        requestDispatchCount,
        responseStartedCount,
        safeLabel: label,
        contentStored: false,
    };
    const event = (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
        eventId,
        ...context,
        turnId: context.anchorMessageId || `task:${context.taskId}`,
        parentEventId: context.agentRunId,
        eventType: "model_activity",
        createdAt: at,
        display: { title: "TestAgent", target: context.projectId || context.scopeId, summary: label, status: "running" },
        detail: { modelActivity: activity },
        visibility: "transcript",
        contentStored: false,
    });
    persistProgress({
        schema: PROGRESS_SCHEMA,
        phase: "model_retry",
        at,
        context,
        stage,
        retryAttempt,
        maxRetries,
        retryDelayMs,
        requestDispatchCount,
        responseStartedCount,
        providerRequestIdPresent,
        eventId,
        checksum: checksum({ context, stage, retryAttempt, maxRetries, requestDispatchCount, responseStartedCount, providerRequestIdPresent }),
        contentStored: false,
    });
    return event;
}
function readTestAgentVisibleProgress(file) {
    const resolved = path.resolve(String(file || ""));
    const root = path.resolve(utils_1.CCM_DIR, "test-agent-runs");
    const relative = path.relative(root, resolved);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || !fs.existsSync(resolved))
        return [];
    return fs.readFileSync(resolved, "utf-8")
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(-4_000)
        .flatMap(line => {
        try {
            const value = JSON.parse(line);
            return value?.schema === PROGRESS_SCHEMA && value?.contentStored === false ? [value] : [];
        }
        catch {
            return [];
        }
    });
}
//# sourceMappingURL=user-visible-progress.js.map
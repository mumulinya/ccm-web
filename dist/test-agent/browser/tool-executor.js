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
exports.createRecordingBrowserToolExecutor = createRecordingBrowserToolExecutor;
exports.createStaticBrowserToolExecutor = createStaticBrowserToolExecutor;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const async_hooks_1 = require("async_hooks");
const utils_1 = require("../utils");
const user_visible_progress_1 = require("../user-visible-progress");
const MIN_BROWSER_TOOL_CALL_TIMEOUT_MS = 1_000;
function browserToolCallTimeoutMs(value) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? Math.max(MIN_BROWSER_TOOL_CALL_TIMEOUT_MS, Math.floor(parsed)) : 60_000;
}
function timeoutError(timeoutMs, suppressDetails) {
    return suppressDetails
        ? "Browser tool call failed; raw provider error suppressed."
        : `Browser tool call timed out after ${timeoutMs}ms.`;
}
function previewOutput(output) {
    if (output === undefined)
        return "";
    if (typeof output === "string")
        return (0, utils_1.compactText)(output, 2000);
    try {
        return (0, utils_1.compactText)(JSON.stringify(output), 2000);
    }
    catch {
        return (0, utils_1.compactText)(String(output), 2000);
    }
}
function suppressedInputMetadata(input) {
    const action = String(input?.action || input?.type || "").trim();
    return {
        inputKeys: Object.keys(input || {}).sort(),
        ...(action && /^[A-Za-z0-9_.:-]{1,80}$/.test(action) ? { action } : {}),
    };
}
function createRecordingBrowserToolExecutor(input, artifactDir, options = {}) {
    const records = [];
    const executionScope = new async_hooks_1.AsyncLocalStorage();
    const toolCallTimeoutMs = browserToolCallTimeoutMs(options.toolCallTimeoutMs);
    const transcriptDir = (0, utils_1.ensureDir)(path.join(artifactDir, "browser-tools"));
    const transcriptPath = path.join(transcriptDir, "tool-calls.jsonl");
    const appendRecord = (record) => {
        records.push(record);
        fs.appendFileSync(transcriptPath, `${JSON.stringify(record)}\n`, "utf-8");
    };
    return {
        transcriptPath,
        getRecords: () => records.slice(),
        runWithExecutionScope: (execution, task) => executionScope.run({ ...execution }, task),
        getRecordIdsForExecution: execution => records
            .filter(record => record.browserExecution?.checkId === execution.checkId
            && record.browserExecution?.run === execution.run
            && record.browserExecution?.projectIndex === execution.projectIndex
            && record.browserExecution?.checkIndex === execution.checkIndex)
            .map(record => record.id),
        executor: {
            listTools: input.listTools ? options => input.listTools(options) : undefined,
            callTool: async (toolName, toolInput) => {
                const startedAt = (0, utils_1.nowIso)();
                const started = Date.now();
                const id = (0, utils_1.makeRunId)("browser-tool-call");
                const browserExecution = executionScope.getStore();
                const visibleTrace = (0, user_visible_progress_1.beginTestAgentVisibleTool)(options.userVisibleProgressContext, {
                    kind: "browser_tool",
                    key: `${browserExecution?.checkId || "browser"}:${browserExecution?.run || 1}:${id}`,
                    project: options.userVisibleProgressContext?.projectId || "browser",
                    label: String(toolName || "浏览器工具").slice(0, 160),
                });
                const controller = new AbortController();
                let deadlineExceeded = false;
                let timer;
                const providerCall = Promise.resolve()
                    .then(() => input.callTool(toolName, toolInput, { signal: controller.signal, timeoutMs: toolCallTimeoutMs }))
                    .then(output => ({ kind: "passed", output }), error => deadlineExceeded
                    ? ({ kind: "timed_out" })
                    : ({ kind: "failed", error }));
                const deadline = new Promise(resolve => {
                    timer = setTimeout(() => {
                        deadlineExceeded = true;
                        controller.abort(new Error(`Browser tool call timed out after ${toolCallTimeoutMs}ms.`));
                        resolve({ kind: "timed_out" });
                    }, toolCallTimeoutMs);
                });
                const outcome = await Promise.race([providerCall, deadline]);
                if (timer)
                    clearTimeout(timer);
                if (outcome.kind === "passed") {
                    visibleTrace.finish({ status: "passed", durationMs: Date.now() - started });
                    appendRecord({
                        id,
                        toolName,
                        input: options.suppressDetails ? suppressedInputMetadata(toolInput) : toolInput,
                        status: "passed",
                        startedAt,
                        finishedAt: (0, utils_1.nowIso)(),
                        durationMs: Date.now() - started,
                        ...(browserExecution ? { browserExecution: { ...browserExecution } } : {}),
                        timeoutMs: toolCallTimeoutMs,
                        outputPreview: options.suppressDetails
                            ? "[suppressed for existing authenticated browser session]"
                            : previewOutput(outcome.output),
                    });
                    return outcome.output;
                }
                if (outcome.kind === "timed_out") {
                    const error = timeoutError(toolCallTimeoutMs, options.suppressDetails === true);
                    visibleTrace.finish({ status: "timed_out", durationMs: Date.now() - started, error });
                    appendRecord({
                        id,
                        toolName,
                        input: options.suppressDetails ? suppressedInputMetadata(toolInput) : toolInput,
                        status: "failed",
                        startedAt,
                        finishedAt: (0, utils_1.nowIso)(),
                        durationMs: Date.now() - started,
                        ...(browserExecution ? { browserExecution: { ...browserExecution } } : {}),
                        timeoutMs: toolCallTimeoutMs,
                        timedOut: true,
                        abortRequested: true,
                        error,
                    });
                    const thrown = new Error(error);
                    thrown.code = "BROWSER_TOOL_CALL_TIMEOUT";
                    throw thrown;
                }
                const error = outcome.error;
                visibleTrace.finish({ status: "failed", durationMs: Date.now() - started, error: error?.message || String(error) });
                appendRecord({
                    id,
                    toolName,
                    input: options.suppressDetails ? suppressedInputMetadata(toolInput) : toolInput,
                    status: "failed",
                    startedAt,
                    finishedAt: (0, utils_1.nowIso)(),
                    durationMs: Date.now() - started,
                    ...(browserExecution ? { browserExecution: { ...browserExecution } } : {}),
                    timeoutMs: toolCallTimeoutMs,
                    error: options.suppressDetails
                        ? "Browser tool call failed; raw provider error suppressed."
                        : error?.message || String(error),
                });
                throw error;
            },
        },
    };
}
function createStaticBrowserToolExecutor(input) {
    return {
        listTools: options => input.onListTools ? input.onListTools(options) : input.tools,
        callTool: async (toolName, toolInput, options) => {
            if (input.onCall)
                return input.onCall(toolName, toolInput, options);
            if (Object.prototype.hasOwnProperty.call(input.responses || {}, toolName))
                return input.responses[toolName];
            return { ok: true, toolName, input: toolInput };
        },
    };
}
//# sourceMappingURL=tool-executor.js.map
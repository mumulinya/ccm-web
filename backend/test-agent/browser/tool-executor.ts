import * as fs from "fs";
import * as path from "path";
import { AsyncLocalStorage } from "async_hooks";
import {
  BrowserCheckExecutionIdentity,
  BrowserToolCallRecord,
  TestAgentBrowserToolExecutor,
} from "../types";
import { compactText, ensureDir, makeRunId, nowIso } from "../utils";

export interface RecordingBrowserToolExecutor {
  executor: TestAgentBrowserToolExecutor;
  getRecords: () => BrowserToolCallRecord[];
  runWithExecutionScope: <T>(execution: BrowserCheckExecutionIdentity, task: () => Promise<T>) => Promise<T>;
  getRecordIdsForExecution: (execution: BrowserCheckExecutionIdentity) => string[];
  transcriptPath: string;
}

export interface RecordingBrowserToolExecutorOptions {
  suppressDetails?: boolean;
  toolCallTimeoutMs?: number;
}

const MIN_BROWSER_TOOL_CALL_TIMEOUT_MS = 1_000;

function browserToolCallTimeoutMs(value: number | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(MIN_BROWSER_TOOL_CALL_TIMEOUT_MS, Math.floor(parsed)) : 60_000;
}

function timeoutError(timeoutMs: number, suppressDetails: boolean) {
  return suppressDetails
    ? "Browser tool call failed; raw provider error suppressed."
    : `Browser tool call timed out after ${timeoutMs}ms.`;
}

function previewOutput(output: any) {
  if (output === undefined) return "";
  if (typeof output === "string") return compactText(output, 2000);
  try {
    return compactText(JSON.stringify(output), 2000);
  } catch {
    return compactText(String(output), 2000);
  }
}

function suppressedInputMetadata(input: Record<string, any>) {
  const action = String(input?.action || input?.type || "").trim();
  return {
    inputKeys: Object.keys(input || {}).sort(),
    ...(action && /^[A-Za-z0-9_.:-]{1,80}$/.test(action) ? { action } : {}),
  };
}

export function createRecordingBrowserToolExecutor(
  input: TestAgentBrowserToolExecutor,
  artifactDir: string,
  options: RecordingBrowserToolExecutorOptions = {},
): RecordingBrowserToolExecutor {
  const records: BrowserToolCallRecord[] = [];
  const executionScope = new AsyncLocalStorage<BrowserCheckExecutionIdentity>();
  const toolCallTimeoutMs = browserToolCallTimeoutMs(options.toolCallTimeoutMs);
  const transcriptDir = ensureDir(path.join(artifactDir, "browser-tools"));
  const transcriptPath = path.join(transcriptDir, "tool-calls.jsonl");
  const appendRecord = (record: BrowserToolCallRecord) => {
    records.push(record);
    fs.appendFileSync(transcriptPath, `${JSON.stringify(record)}\n`, "utf-8");
  };
  return {
    transcriptPath,
    getRecords: () => records.slice(),
    runWithExecutionScope: (execution, task) => executionScope.run({ ...execution }, task),
    getRecordIdsForExecution: execution => records
      .filter(record =>
        record.browserExecution?.checkId === execution.checkId
        && record.browserExecution?.run === execution.run
        && record.browserExecution?.projectIndex === execution.projectIndex
        && record.browserExecution?.checkIndex === execution.checkIndex
      )
      .map(record => record.id),
    executor: {
      listTools: input.listTools ? options => input.listTools!(options) : undefined,
      callTool: async (toolName: string, toolInput: Record<string, any>) => {
        const startedAt = nowIso();
        const started = Date.now();
        const id = makeRunId("browser-tool-call");
        const browserExecution = executionScope.getStore();
        const controller = new AbortController();
        let deadlineExceeded = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const providerCall = Promise.resolve()
          .then(() => input.callTool(toolName, toolInput, { signal: controller.signal, timeoutMs: toolCallTimeoutMs }))
          .then(
            output => ({ kind: "passed" as const, output }),
            error => deadlineExceeded
              ? ({ kind: "timed_out" as const })
              : ({ kind: "failed" as const, error }),
          );
        const deadline = new Promise<{ kind: "timed_out" }>(resolve => {
          timer = setTimeout(() => {
            deadlineExceeded = true;
            controller.abort(new Error(`Browser tool call timed out after ${toolCallTimeoutMs}ms.`));
            resolve({ kind: "timed_out" });
          }, toolCallTimeoutMs);
        });
        const outcome = await Promise.race([providerCall, deadline]);
        if (timer) clearTimeout(timer);
        if (outcome.kind === "passed") {
          appendRecord({
            id,
            toolName,
            input: options.suppressDetails ? suppressedInputMetadata(toolInput) : toolInput,
            status: "passed",
            startedAt,
            finishedAt: nowIso(),
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
          appendRecord({
            id,
            toolName,
            input: options.suppressDetails ? suppressedInputMetadata(toolInput) : toolInput,
            status: "failed",
            startedAt,
            finishedAt: nowIso(),
            durationMs: Date.now() - started,
            ...(browserExecution ? { browserExecution: { ...browserExecution } } : {}),
            timeoutMs: toolCallTimeoutMs,
            timedOut: true,
            abortRequested: true,
            error,
          });
          const thrown = new Error(error);
          (thrown as any).code = "BROWSER_TOOL_CALL_TIMEOUT";
          throw thrown;
        }
        const error = outcome.error;
        appendRecord({
          id,
          toolName,
          input: options.suppressDetails ? suppressedInputMetadata(toolInput) : toolInput,
          status: "failed",
          startedAt,
          finishedAt: nowIso(),
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

export function createStaticBrowserToolExecutor(input: {
  tools: string[];
  onListTools?: (options?: { signal?: AbortSignal; timeoutMs?: number }) => string[] | Promise<string[]>;
  responses?: Record<string, any>;
  onCall?: (
    toolName: string,
    toolInput: Record<string, any>,
    options?: { signal?: AbortSignal; timeoutMs?: number },
  ) => any | Promise<any>;
}): TestAgentBrowserToolExecutor {
  return {
    listTools: options => input.onListTools ? input.onListTools(options) : input.tools,
    callTool: async (toolName, toolInput, options) => {
      if (input.onCall) return input.onCall(toolName, toolInput, options);
      if (Object.prototype.hasOwnProperty.call(input.responses || {}, toolName)) return input.responses![toolName];
      return { ok: true, toolName, input: toolInput };
    },
  };
}

import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { ToolScope } from "./tool-manager";

const TOOL_LOOP_AUDIT_FILE = path.join(os.homedir(), ".cc-connect", "agent-runner", "tool-call-loop.jsonl");

export interface ParsedToolCall {
  name: string;
  arguments: any;
}

export interface ToolLoopContinuation {
  output: string;
  nativeSessionId?: string;
}

export interface ToolLoopEvent {
  type: "round_started" | "tool_result" | "continuation_started" | "loop_finished";
  round: number;
  tool?: string;
  ok?: boolean;
  text: string;
}

export interface ToolLoopOptions {
  initialOutput: string;
  initialSessionId?: string;
  scope?: ToolScope;
  runtime?: string;
  project?: string;
  groupId?: string;
  taskId?: string;
  executionId?: string;
  source?: string;
  maxRounds?: number;
  maxCallsPerRound?: number;
  parseToolCalls: (text: string) => ParsedToolCall[];
  executeToolCall: (name: string, args: any, scope?: ToolScope) => Promise<string>;
  continueAgent: (prompt: string, state: {
    round: number;
    nativeSessionId: string;
    transcript: string;
    toolResults: string;
  }) => Promise<ToolLoopContinuation>;
  onEvent?: (event: ToolLoopEvent) => void;
}

export interface ToolLoopResult {
  output: string;
  finalOutput: string;
  nativeSessionId: string;
  rounds: number;
  toolCalls: number;
  termination: "no_tool_call" | "completed" | "max_rounds" | "duplicate_call" | "continuation_failed";
  auditFile: string;
}

function stableValue(value: any): any {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
  }
  return value;
}

function callFingerprint(call: ParsedToolCall) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ name: call.name, arguments: stableValue(call.arguments || {}) }))
    .digest("hex")
    .slice(0, 24);
}

function appendAudit(entry: any) {
  try {
    fs.mkdirSync(path.dirname(TOOL_LOOP_AUDIT_FILE), { recursive: true });
    if (fs.existsSync(TOOL_LOOP_AUDIT_FILE) && fs.statSync(TOOL_LOOP_AUDIT_FILE).size > 2 * 1024 * 1024) {
      const content = fs.readFileSync(TOOL_LOOP_AUDIT_FILE, "utf-8");
      const tail = content.slice(-1024 * 1024);
      fs.writeFileSync(TOOL_LOOP_AUDIT_FILE, tail.slice(Math.max(0, tail.indexOf("\n") + 1)), "utf-8");
    }
    fs.appendFileSync(TOOL_LOOP_AUDIT_FILE, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, "utf-8");
  } catch {}
}

function emit(options: ToolLoopOptions, event: ToolLoopEvent) {
  try { options.onEvent?.(event); } catch {}
}

function toolLoopAuditContext(options: ToolLoopOptions) {
  return {
    runtime: options.runtime || "",
    project: options.project || "",
    groupId: options.groupId || "",
    taskId: options.taskId || "",
    executionId: options.executionId || "",
    source: options.source || "tool-call-loop",
  };
}

function scopeWithAuditContext(scope: ToolScope | undefined, options: ToolLoopOptions): ToolScope | undefined {
  const context = toolLoopAuditContext(options);
  return scope ? { ...scope, auditContext: context } : undefined;
}

function formatToolResults(round: number, rows: Array<{ name: string; ok: boolean; result: string }>) {
  const body = rows.map(row => {
    const label = row.ok ? "工具结果" : "工具错误";
    return `[${label}: ${row.name}]\n${row.result}`;
  }).join("\n\n");
  return `<ccm_tool_results round="${round}">\n${body}\n</ccm_tool_results>`;
}

export function buildToolContinuationPrompt(input: {
  round: number;
  transcript: string;
  toolResults: string;
  hasNativeSession: boolean;
}) {
  const context = input.hasNativeSession
    ? ""
    : `\n\n由于当前运行时没有可恢复的原生会话，下面附上本轮此前的完整转录：\n<ccm_previous_transcript>\n${input.transcript}\n</ccm_previous_transcript>`;
  return `CCM 已执行你上一条回复中的工具调用。请读取工具结果并继续完成原始任务。

要求：
- 不要重复已经成功执行的相同工具调用。
- 如需其它工具，仍只输出一个 <tool_call> 块并等待结果。
- 工具信息足够时，直接给出最终答复，不要只复述工具结果。
- 不要声称执行了未出现在结果中的操作。

${input.toolResults}${context}

这是工具循环第 ${input.round} 轮，请继续。`;
}

export async function runToolCallLoop(options: ToolLoopOptions): Promise<ToolLoopResult> {
  const maxRounds = Math.max(1, Math.min(8, Number(options.maxRounds || 4)));
  const maxCallsPerRound = Math.max(1, Math.min(16, Number(options.maxCallsPerRound || 4)));
  const startedAt = Date.now();
  const seenCalls = new Set<string>();
  const duplicateWarnings = new Set<string>();
  let transcript = String(options.initialOutput || "").trim();
  let currentOutput = transcript;
  let nativeSessionId = String(options.initialSessionId || "");
  let toolCalls = 0;
  let rounds = 0;
  let termination: ToolLoopResult["termination"] = "no_tool_call";
  const executionScope = scopeWithAuditContext(options.scope, options);

  for (let round = 1; round <= maxRounds; round += 1) {
    const parsed = options.parseToolCalls(currentOutput).slice(0, maxCallsPerRound);
    if (parsed.length === 0) {
      termination = round === 1 ? "no_tool_call" : "completed";
      break;
    }

    rounds = round;
    emit(options, { type: "round_started", round, text: `检测到 ${parsed.length} 个工具调用` });
    const resultRows: Array<{ name: string; ok: boolean; result: string }> = [];
    let repeatedTwice = false;

    for (const call of parsed) {
      const name = String(call.name || "").trim();
      if (!name) continue;
      const fingerprint = callFingerprint(call);
      if (seenCalls.has(fingerprint)) {
        const repeatedAgain = duplicateWarnings.has(fingerprint);
        duplicateWarnings.add(fingerprint);
        repeatedTwice = repeatedTwice || repeatedAgain;
        const result = repeatedAgain
          ? "CCM 已再次阻止完全相同的重复工具调用，工具循环将停止。"
          : "CCM 已阻止完全相同的重复工具调用。请直接使用上一轮结果，或调整参数后再调用。";
        resultRows.push({ name, ok: false, result });
        emit(options, { type: "tool_result", round, tool: name, ok: false, text: result });
        continue;
      }

      seenCalls.add(fingerprint);
      toolCalls += 1;
      try {
        const result = await options.executeToolCall(name, call.arguments || {}, executionScope);
        const ok = !/^\[(错误|工具错误)\]/.test(String(result || "").trim());
        resultRows.push({ name, ok, result: String(result || "") });
        emit(options, { type: "tool_result", round, tool: name, ok, text: String(result || "").slice(0, 1200) });
        appendAudit({
          type: "tool_call",
          runtime: options.runtime || "",
          project: options.project || "",
          groupId: options.groupId || "",
          taskId: options.taskId || "",
          executionId: options.executionId || "",
          source: options.source || "tool-call-loop",
          round,
          tool: name,
          argumentsHash: fingerprint,
          ok,
        });
      } catch (error: any) {
        const result = error?.message || String(error);
        resultRows.push({ name, ok: false, result });
        emit(options, { type: "tool_result", round, tool: name, ok: false, text: result });
        appendAudit({
          type: "tool_call",
          runtime: options.runtime || "",
          project: options.project || "",
          groupId: options.groupId || "",
          taskId: options.taskId || "",
          executionId: options.executionId || "",
          source: options.source || "tool-call-loop",
          round,
          tool: name,
          argumentsHash: fingerprint,
          ok: false,
          error: result.slice(0, 1000),
        });
      }
    }

    const toolResults = formatToolResults(round, resultRows);
    transcript = [transcript, toolResults].filter(Boolean).join("\n\n");
    if (repeatedTwice) {
      termination = "duplicate_call";
      break;
    }
    if (round >= maxRounds) {
      termination = "max_rounds";
      transcript += `\n\n[CCM 工具循环已达到 ${maxRounds} 轮上限，已停止自动续跑。]`;
      break;
    }

    const continuationPrompt = buildToolContinuationPrompt({
      round,
      transcript,
      toolResults,
      hasNativeSession: !!nativeSessionId,
    });
    emit(options, { type: "continuation_started", round, text: "工具结果已返回 Agent，继续执行原始任务" });
    try {
      const continuation = await options.continueAgent(continuationPrompt, {
        round,
        nativeSessionId,
        transcript,
        toolResults,
      });
      currentOutput = String(continuation.output || "").trim();
      nativeSessionId = String(continuation.nativeSessionId || nativeSessionId || "");
      transcript = [transcript, currentOutput ? `[Agent 继续执行]\n${currentOutput}` : ""].filter(Boolean).join("\n\n");
    } catch (error: any) {
      const message = error?.message || String(error);
      transcript += `\n\n[CCM 无法让 Agent 在工具结果后继续执行: ${message}]`;
      termination = "continuation_failed";
      appendAudit({
        type: "continuation_failed",
        runtime: options.runtime || "",
        project: options.project || "",
        groupId: options.groupId || "",
        taskId: options.taskId || "",
        executionId: options.executionId || "",
        source: options.source || "tool-call-loop",
        round,
        error: message.slice(0, 1000),
      });
      break;
    }
  }

  emit(options, { type: "loop_finished", round: rounds, text: termination });
  appendAudit({
    type: "tool_loop_finished",
    runtime: options.runtime || "",
    project: options.project || "",
    groupId: options.groupId || "",
    taskId: options.taskId || "",
    executionId: options.executionId || "",
    source: options.source || "tool-call-loop",
    rounds,
    toolCalls,
    termination,
    durationMs: Date.now() - startedAt,
    nativeSession: !!nativeSessionId,
  });
  return {
    output: transcript,
    finalOutput: currentOutput,
    nativeSessionId,
    rounds,
    toolCalls,
    termination,
    auditFile: TOOL_LOOP_AUDIT_FILE,
  };
}

export async function runToolCallLoopSelfTest() {
  const executed: string[] = [];
  const continuations: string[] = [];
  const result = await runToolCallLoop({
    initialOutput: '<tool_call>{"name":"lookup","arguments":{"id":7}}</tool_call>',
    initialSessionId: "session-1",
    scope: { mcp: ["demo/lookup"] },
    runtime: "self-test",
    project: "tool-loop",
    groupId: "tool-loop-group",
    taskId: `self-test-${Date.now()}`,
    executionId: "tool-loop-exec",
    parseToolCalls: text => {
      const match = text.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/);
      if (!match) return [];
      const parsed = JSON.parse(match[1]);
      return [{ name: parsed.name, arguments: parsed.arguments || {} }];
    },
    executeToolCall: async (name, args) => {
      executed.push(`${name}:${args.id}`);
      return JSON.stringify({ id: args.id, value: "done" });
    },
    continueAgent: async (prompt, state) => {
      continuations.push(prompt);
      return { output: `已根据第 ${state.round} 轮工具结果完成任务。`, nativeSessionId: state.nativeSessionId };
    },
  });
  const checks = {
    executesTool: executed[0] === "lookup:7",
    continuesSameSession: result.nativeSessionId === "session-1",
    feedsResultBack: continuations.length === 1 && continuations[0].includes('"value":"done"'),
    finishesAfterContinuation: result.termination === "completed" && result.rounds === 1,
    keepsTranscript: result.output.includes("[Agent 继续执行]") && result.output.includes("已根据第 1 轮工具结果完成任务"),
  };
  return { pass: Object.values(checks).every(Boolean), checks, result };
}

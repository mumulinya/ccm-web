import * as crypto from "crypto";
import { publishEphemeralUserVisibleAgentEvent } from "./user-visible-agent-events";

export type ModelActivityPhase = "understanding" | "tool_decision" | "tool_result_review" | "verification" | "final_synthesis";
export type ModelActivityState = "started" | "waiting" | "retrying" | "streaming" | "completed" | "failed";

const WAITING_THRESHOLD_MS = 10_000;

function safeLabel(value: any, fallback: string) {
  const text = String(value || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!text || /```|<script|\b(prompt|system message|reasoning|thinking)\b/i.test(text)) return fallback;
  return Array.from(text).slice(0, 120).join("");
}

export function modelActivityDefaultLabel(phase: ModelActivityPhase) {
  if (phase === "tool_result_review") return "已取得检查结果，正在归纳关键结论";
  if (phase === "verification") return "验证结果已返回，正在核对交付条件";
  if (phase === "final_synthesis") return "执行结果已收口，正在整理最终结论";
  if (phase === "tool_decision") return "正在确定下一步需要核对的项目信息";
  return "正在理解当前需求并核对必要上下文";
}

export function createModelActivityController(input: {
  scope: "global" | "project" | "group";
  scopeId: string;
  exactSessionId: string;
  turnId: string;
  modelCallIndex: number;
  phase: ModelActivityPhase;
  label?: string;
  generation?: number;
  taskId?: string;
  anchorMessageId?: string;
  waitingThresholdMs?: number;
  onActivity?: (activity: any) => void;
}) {
  const startedAt = new Date().toISOString();
  const eventId = `model-activity:${input.scope}:${input.scopeId}:${input.exactSessionId}:${input.turnId}:${input.modelCallIndex}`;
  const fallbackLabel = modelActivityDefaultLabel(input.phase);
  let state: ModelActivityState = "started";
  let firstDeltaAt = "";
  let retryAttempt = 0;
  let stopped = false;
  let lastLabel = safeLabel(input.label, fallbackLabel);

  const publish = (nextState: ModelActivityState, extra: any = {}) => {
    state = nextState;
    if (extra.label) lastLabel = safeLabel(extra.label, fallbackLabel);
    if (Number(extra.retryAttempt) > 0) retryAttempt = Number(extra.retryAttempt);
    const activity = {
      state,
      phase: input.phase,
      modelCallIndex: Math.max(1, Number(input.modelCallIndex || 1)),
      ...(retryAttempt ? { retryAttempt } : {}),
      startedAt,
      ...(firstDeltaAt ? { firstDeltaAt } : {}),
      safeLabel: lastLabel,
      contentStored: false,
    };
    publishEphemeralUserVisibleAgentEvent({
      eventId,
      scope: input.scope,
      scopeId: input.scopeId,
      exactSessionId: input.exactSessionId,
      turnId: input.turnId,
      generation: Math.max(0, Number(input.generation || 0)),
      ...(input.taskId ? { taskId: input.taskId } : {}),
      ...(input.anchorMessageId ? { anchorMessageId: input.anchorMessageId } : {}),
      createdAt: startedAt,
      eventType: "model_activity",
      display: {
        title: "处理进度",
        summary: lastLabel,
        status: ["failed"].includes(state) ? "failed" : ["completed"].includes(state) ? "success" : "running",
      },
      detail: { modelActivity: activity },
    });
    try { input.onActivity?.(activity); } catch {}
    return activity;
  };

  publish("started");
  const timer = setTimeout(() => {
    if (!stopped && !firstDeltaAt) publish("waiting");
  }, Math.max(0, Number(input.waitingThresholdMs ?? WAITING_THRESHOLD_MS)));
  (timer as any).unref?.();

  const finish = (nextState: "completed" | "failed") => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    publish(nextState);
  };

  return {
    eventId,
    onDelta(delta: string) {
      if (stopped || !String(delta || "")) return;
      if (!firstDeltaAt) firstDeltaAt = new Date().toISOString();
      clearTimeout(timer);
      publish("streaming");
    },
    onRetry(attempt: number) {
      if (stopped) return;
      clearTimeout(timer);
      publish("retrying", {
        retryAttempt: Math.max(1, Number(attempt || 1)),
        label: `模型响应较慢，正在进行第 ${Math.max(1, Number(attempt || 1))} 次重试`,
      });
    },
    updateLabel(label: string) {
      if (!stopped && ["waiting", "retrying"].includes(state)) publish(state, { label });
    },
    complete() { finish("completed"); },
    fail() { finish("failed"); },
  };
}

/** Extracts only a JSON string field after an allowed response type is known. */
export function createSafeJsonReplyDeltaExtractor(onDelta?: (delta: string) => void) {
  let source = "";
  let scanIndex = 0;
  let valueStarted = false;
  let valueEnded = false;
  let escaped = false;
  let unicode = "";
  let emitted = false;

  const responseAllowed = () => /["']response(?:Type|_type)["']\s*:\s*["'](?:reply|clarify)["']/i.test(source)
    || /["']state["']\s*:\s*["'](?:answer|clarify|needs_clarification)["']/i.test(source);
  const locateValue = () => {
    if (valueStarted || !responseAllowed()) return;
    const match = /["'](?:reply|content|message)["']\s*:\s*"/ig;
    let candidate: RegExpExecArray | null = null;
    while ((candidate = match.exec(source))) {
      valueStarted = true;
      scanIndex = candidate.index + candidate[0].length;
      break;
    }
  };
  const emit = (value: string) => {
    if (!value || !onDelta) return;
    emitted = true;
    onDelta(value);
  };
  return {
    push(chunk: string) {
      if (valueEnded || !chunk) return;
      source += chunk;
      locateValue();
      if (!valueStarted) return;
      let plain = "";
      for (; scanIndex < source.length; scanIndex += 1) {
        const char = source[scanIndex];
        if (unicode) {
          if (/^[0-9a-f]$/i.test(char)) unicode += char;
          else { unicode = ""; escaped = false; }
          if (unicode.length === 5) {
            plain += String.fromCharCode(parseInt(unicode.slice(1), 16));
            unicode = "";
            escaped = false;
          }
          continue;
        }
        if (escaped) {
          if (char === "u") { unicode = "u"; continue; }
          plain += ({ "n": "\n", "r": "\r", "t": "\t", "b": "\b", "f": "\f", "\"": "\"", "\\": "\\", "/": "/" } as any)[char] ?? char;
          escaped = false;
          continue;
        }
        if (char === "\\") { escaped = true; continue; }
        if (char === "\"") { valueEnded = true; break; }
        plain += char;
      }
      emit(plain);
    },
    get emitted() { return emitted; },
  };
}

export function streamDeltaChecksum(input: { runId: string; modelCallIndex: number; sequence: number; delta: string }) {
  return crypto.createHash("sha256").update(`${input.runId}\0${input.modelCallIndex}\0${input.sequence}\0${input.delta}`).digest("hex");
}

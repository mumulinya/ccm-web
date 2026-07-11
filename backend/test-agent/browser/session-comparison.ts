import { createHash } from "crypto";
import {
  BrowserSessionComparisonOperator,
  BrowserSessionComparisonResult,
  BrowserSessionComparisonSpec,
  BrowserSessionComparisonValueSummary,
  BrowserStepResult,
} from "../types";

export interface BrowserSessionComparisonRuntime {
  name: string;
  page: {
    evaluate(expression: string): Promise<any>;
  };
}

function stableSerialize(value: any, seen = new WeakSet<object>()): string {
  if (value === null) return "null";
  if (value === undefined) return "{\"$undefined\":true}";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "{\"$number\":\"NaN\"}";
    if (value === Infinity) return "{\"$number\":\"Infinity\"}";
    if (value === -Infinity) return "{\"$number\":\"-Infinity\"}";
    if (Object.is(value, -0)) return "{\"$number\":\"-0\"}";
    return String(value);
  }
  if (typeof value === "bigint") return `{"$bigint":${JSON.stringify(value.toString())}}`;
  if (typeof value === "symbol") return `{"$symbol":${JSON.stringify(String(value.description || ""))}}`;
  if (typeof value === "function") return `{"$function":${JSON.stringify(value.name || "anonymous")}}`;
  if (typeof value !== "object") return JSON.stringify(String(value));
  if (seen.has(value)) return "{\"$circular\":true}";
  seen.add(value);
  if (Array.isArray(value)) {
    const serialized = `[${value.map(item => stableSerialize(item, seen)).join(",")}]`;
    seen.delete(value);
    return serialized;
  }
  const serialized = `{${Object.keys(value)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableSerialize(value[key], seen)}`)
    .join(",")}}`;
  seen.delete(value);
  return serialized;
}

function valueType(value: any) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function summarizeBrowserSessionComparisonValue(value: any): BrowserSessionComparisonValueSummary {
  const serialized = stableSerialize(value);
  const type = valueType(value);
  const length = typeof value === "string" || Array.isArray(value)
    ? value.length
    : value && typeof value === "object"
      ? Object.keys(value).length
      : undefined;
  return {
    type,
    ...(length === undefined ? {} : { length }),
    serializedBytes: Buffer.byteLength(serialized, "utf8"),
    sha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

function comparisonPassed(operator: BrowserSessionComparisonOperator, left: any, right: any) {
  const leftSerialized = stableSerialize(left);
  const rightSerialized = stableSerialize(right);
  if (operator === "equals") return leftSerialized === rightSerialized;
  if (operator === "notEquals") return leftSerialized !== rightSerialized;
  if (typeof left === "string") return left.includes(String(right ?? ""));
  if (Array.isArray(left)) return left.some(item => stableSerialize(item) === rightSerialized);
  return leftSerialized.includes(rightSerialized);
}

function valueSummaryDetail(label: string, summary?: BrowserSessionComparisonValueSummary) {
  if (!summary) return `${label}=unavailable`;
  const length = summary.length === undefined ? "" : `,length=${summary.length}`;
  return `${label}=${summary.type}(bytes=${summary.serializedBytes}${length},sha256=${summary.sha256})`;
}

function wait(delayMs: number) {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

function positiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function summarizeEvaluationError(reason: any) {
  const name = String(reason?.name || reason?.constructor?.name || "Error").trim() || "Error";
  const message = String(reason?.message || reason || "");
  const serializedBytes = Buffer.byteLength(message, "utf8");
  const sha256 = createHash("sha256").update(message).digest("hex");
  return `${name}(messageBytes=${serializedBytes},messageSha256=${sha256})`;
}

function evaluateBeforeDeadline(runtime: BrowserSessionComparisonRuntime, expression: string, timeoutMs: number) {
  return new Promise<any>((resolve, reject) => {
    let settled = false;
    const finish = (callback: (value: any) => void, value: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    const timer = setTimeout(
      () => finish(reject, new Error("Browser session comparison evaluation timed out.")),
      Math.max(1, timeoutMs),
    );
    Promise.resolve().then(() => runtime.page.evaluate(expression)).then(
      value => finish(resolve, value),
      error => finish(reject, error),
    );
  });
}

export async function runBrowserSessionComparison(input: {
  spec: BrowserSessionComparisonSpec;
  left: BrowserSessionComparisonRuntime;
  right: BrowserSessionComparisonRuntime;
  defaultTimeoutMs: number;
}): Promise<{ step: BrowserStepResult; result: BrowserSessionComparisonResult }> {
  const started = Date.now();
  const timeoutMs = positiveNumber(input.spec.timeoutMs, positiveNumber(input.defaultTimeoutMs, 30_000));
  const pollMs = Math.max(10, Math.min(timeoutMs, positiveNumber(input.spec.pollMs, 100)));
  const deadline = started + timeoutMs;
  let attempts = 0;
  let leftSummary: BrowserSessionComparisonValueSummary | undefined;
  let rightSummary: BrowserSessionComparisonValueSummary | undefined;
  let evaluationErrors: BrowserSessionComparisonResult["evaluationErrors"];

  while (true) {
    attempts += 1;
    const evaluationTimeoutMs = Math.max(1, deadline - Date.now());
    const evaluated = await Promise.allSettled([
      evaluateBeforeDeadline(input.left, input.spec.leftExpression, evaluationTimeoutMs),
      evaluateBeforeDeadline(input.right, input.spec.rightExpression, evaluationTimeoutMs),
    ]);
    const leftValue = evaluated[0].status === "fulfilled" ? evaluated[0].value : undefined;
    const rightValue = evaluated[1].status === "fulfilled" ? evaluated[1].value : undefined;
    leftSummary = evaluated[0].status === "fulfilled" ? summarizeBrowserSessionComparisonValue(leftValue) : undefined;
    rightSummary = evaluated[1].status === "fulfilled" ? summarizeBrowserSessionComparisonValue(rightValue) : undefined;
    evaluationErrors = {
      ...(evaluated[0].status === "rejected" ? { left: summarizeEvaluationError(evaluated[0].reason) } : {}),
      ...(evaluated[1].status === "rejected" ? { right: summarizeEvaluationError(evaluated[1].reason) } : {}),
    };
    if (!Object.keys(evaluationErrors).length) evaluationErrors = undefined;

    if (!evaluationErrors && comparisonPassed(input.spec.operator, leftValue, rightValue)) {
      const durationMs = Date.now() - started;
      const detail = [
        `compareSessions=${input.spec.leftSession},${input.spec.rightSession}`,
        `operator=${input.spec.operator}`,
        `attempts=${attempts}`,
        `durationMs=${durationMs}`,
        valueSummaryDetail("left", leftSummary),
        valueSummaryDetail("right", rightSummary),
      ].join("; ");
      return {
        step: { kind: "assertion", name: "assert:sessionCompare", status: "passed", detail },
        result: {
          leftSession: input.spec.leftSession,
          rightSession: input.spec.rightSession,
          operator: input.spec.operator,
          status: "passed",
          attempts,
          durationMs,
          timeoutMs,
          pollMs,
          left: leftSummary,
          right: rightSummary,
        },
      };
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await wait(Math.min(pollMs, remaining));
  }

  const durationMs = Date.now() - started;
  const detail = [
    `compareSessions=${input.spec.leftSession},${input.spec.rightSession}`,
    `operator=${input.spec.operator}`,
    `attempts=${attempts}`,
    `durationMs=${durationMs}`,
    valueSummaryDetail("left", leftSummary),
    valueSummaryDetail("right", rightSummary),
  ].join("; ");
  const evaluationDetail = evaluationErrors
    ? ` Last evaluation errors: ${[
      evaluationErrors.left ? `left=${evaluationErrors.left}` : "",
      evaluationErrors.right ? `right=${evaluationErrors.right}` : "",
    ].filter(Boolean).join("; ")}.`
    : "";
  const error = `Timed out after ${timeoutMs}ms waiting for ${input.spec.leftSession} ${input.spec.operator} ${input.spec.rightSession}.${evaluationDetail}`;
  return {
    step: { kind: "assertion", name: "assert:sessionCompare", status: "failed", detail, error },
    result: {
      leftSession: input.spec.leftSession,
      rightSession: input.spec.rightSession,
      operator: input.spec.operator,
      status: "failed",
      attempts,
      durationMs,
      timeoutMs,
      pollMs,
      ...(leftSummary ? { left: leftSummary } : {}),
      ...(rightSummary ? { right: rightSummary } : {}),
      ...(evaluationErrors ? { evaluationErrors } : {}),
      error,
    },
  };
}

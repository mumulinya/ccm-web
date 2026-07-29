// 任务回放共享底座：脱敏、时间与状态归一化。
// task-replay.ts 与 task-replay-plan.ts 共同引用；本模块不得 import 其他 collaboration 模块。
import * as crypto from "crypto";
import * as path from "path";

export type TaskReplayStatus = "info" | "running" | "passed" | "warning" | "failed" | "blocked" | "cancelled";

export function stableId(prefix: string, value: any) {
  return `${prefix}_${crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex").slice(0, 22)}`;
}

export function iso(value: any, fallback = "") {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

export function safeText(value: any, max = 1200) {
  let text = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  text = text
    .replace(/CCM_AGENT_RECEIPT[\s\S]*?(?=\n\S|$)/gi, "[内部回执已收起]")
    .replace(/(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret)\s*[=:]\s*[^\s,;]+/gi, "$1=[已隐藏]")
    .replace(/\b(?:sk|xox[baprs]|gh[pousr])[-_][A-Za-z0-9_-]{12,}\b/g, "[密钥已隐藏]")
    .replace(/[A-Za-z]:\\Users\\[^\s"']+/gi, "[本机路径]")
    .replace(/\/(?:home|Users)\/[^\s"']+/g, "[本机路径]")
    .replace(/\r\n/g, "\n")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function publicFile(value: any) {
  const raw = String(value?.path || value?.file || value || "").trim();
  if (!raw) return "";
  return path.isAbsolute(raw) ? path.basename(raw) : raw.replace(/\\/g, "/").replace(/^\.\//, "").slice(0, 260);
}

export function stringList(values: any, max = 100) {
  return [...new Set((Array.isArray(values) ? values : values ? [values] : []).map(publicFile).filter(Boolean))].slice(0, max);
}

export function safeTextList(values: any, max = 20, itemMax = 240) {
  return (Array.isArray(values) ? values : values ? [values] : [])
    .map(item => safeText(item, itemMax))
    .filter(Boolean)
    .slice(0, max);
}

export function normalizeStatus(value: any): TaskReplayStatus {
  const text = String(value || "").toLowerCase();
  if (/cancel|revert/.test(text)) return "cancelled";
  if (/fail|error|reject|invalid/.test(text)) return "failed";
  if (/block|waiting_user|needs_user/.test(text)) return "blocked";
  if (/warn|partial|attention|needs_review/.test(text)) return "warning";
  if (/running|progress|reviewing|executing|queued|monitoring|supervising/.test(text)) return "running";
  if (/pass|success|succeed|complete|done|ok|accept/.test(text)) return "passed";
  return "info";
}

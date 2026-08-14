import * as path from "path";
import { publishEphemeralUserVisibleAgentEvent } from "./user-visible-agent-events";

type LiveCommandIdentity = {
  commandRunId: string;
  taskId: string;
  scope: "global" | "project" | "group";
  scopeId: string;
  exactSessionId: string;
  generation: number;
  attempt: number;
  anchorMessageId?: string;
  description: string;
};

type LiveCommandEntry = {
  identity: LiveCommandIdentity;
  lines: string[];
  lastSummary: string;
  lastPublishedAt: number;
  startedAt: number;
  finished: boolean;
  feishuTimer?: NodeJS.Timeout;
};

const entries = new Map<string, LiveCommandEntry>();
const ANSI = /\x1B(?:[@-_][0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g;
const SECRET = /((?:api[_-]?key|token|secret|password|authorization|cookie|credential)\s*[:=]\s*)([^\s,;]+)/ig;
const ABSOLUTE_PATH = /(?:[A-Za-z]:\\[^\s"']+|\/(?:Users|home|root|var|private|opt|srv)\/[^\s"']+)/g;
const SOURCE_LIKE = /^\s*(?:import\s|export\s|function\s|class\s|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|<\/?[A-Za-z][^>]*>|[{}]{1,2}\s*$|[>$#]\s|PS\s|(?:npm|pnpm|yarn|mvn|gradle|dotnet|cargo|go)\s+(?:run|test|build|install)\b)/i;

function cleanLine(value: string) {
  const line = String(value || "").replace(ANSI, "").replace(SECRET, "$1[已脱敏]").replace(ABSOLUTE_PATH, match => `[路径]/${path.basename(match)}`).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (!line || SOURCE_LIKE.test(line) || /-----BEGIN|bearer\s+[A-Za-z0-9._-]+/i.test(line)) return "";
  return line.slice(0, 320);
}

function progressFrom(lines: string[], description: string) {
  const text = lines.slice(-30).join("\n");
  const test = [...text.matchAll(/(?:tests?|测试|用例)[^\d]{0,12}(\d+)|(?:executed|passed|通过|完成)\s*(\d+)\s*(?:tests?|测试|用例)/ig)].at(-1);
  const module = [...text.matchAll(/(?:compiled|built|编译|构建)[^\d]{0,12}(\d+)\s*(?:modules?|模块|files?|文件)/ig)].at(-1);
  const percent = [...text.matchAll(/(?:^|\s)(\d{1,3})%/g)].at(-1);
  const failed = /(?:failed|failure|error|未通过|失败)\b/i.test(text);
  if (test) {
    const count = Number(test[1] || test[2] || 0);
    return { phase: "testing" as const, safeSummary: `已执行 ${count} 项测试${failed ? "，当前存在未通过项" : "，正在继续验证"}`, completed: count };
  }
  if (module) {
    const count = Number(module[1] || 0);
    return { phase: "building" as const, safeSummary: `已编译 ${count} 个模块，正在生成构建结果`, completed: count };
  }
  if (percent) {
    const completed = Math.min(100, Number(percent[1] || 0));
    return { phase: /test|测试/i.test(description) ? "testing" as const : "building" as const, safeSummary: `${description}正在进行 · ${completed}%`, completed, total: 100 };
  }
  return { phase: /test|测试|验收/i.test(description) ? "testing" as const : /build|compile|构建|编译/i.test(description) ? "building" as const : "running" as const, safeSummary: `${description}仍在运行` };
}

export function sanitizeCommandLiveOutputForSelfTest(input: string, description = "运行项目构建") {
  const lines = String(input || "").split(/\r?\n/).map(cleanLine).filter(Boolean).slice(-20);
  return { lines, progress: progressFrom(lines, description), contentStored: false };
}

export function createCommandLiveProgress(identity: LiveCommandIdentity) {
  const entry: LiveCommandEntry = { identity, lines: [], lastSummary: "", lastPublishedAt: 0, startedAt: Date.now(), finished: false };
  entries.set(identity.commandRunId, entry);
  entry.feishuTimer = setTimeout(() => {
    if (entry.finished) return;
    const summary = entry.lastSummary || `${identity.description}仍在运行`;
    void import("../modules/collaboration/feishu-channel").then(({ notifyFeishuTaskStage }) => notifyFeishuTaskStage({
      stage: "long_running",
      title: "任务仍在执行",
      markdown: summary,
      taskId: identity.taskId,
      sessionId: identity.exactSessionId,
      dedupeKey: `long-command:${identity.taskId}:${identity.commandRunId}`,
    })).catch(() => undefined);
  }, 30_000);
  entry.feishuTimer.unref?.();
  const observe = (chunk: Buffer | string) => {
    if (entry.finished) return;
    for (const raw of String(chunk || "").split(/\r?\n/)) {
      const line = cleanLine(raw);
      if (line) entry.lines.push(line);
    }
    entry.lines = entry.lines.slice(-20);
    const progress = progressFrom(entry.lines, identity.description);
    const now = Date.now();
    if (progress.safeSummary === entry.lastSummary || now - entry.lastPublishedAt < 1000) return;
    entry.lastSummary = progress.safeSummary;
    entry.lastPublishedAt = now;
    publishEphemeralUserVisibleAgentEvent({
      eventId: `live-command-${identity.commandRunId}`,
      eventType: "tool_progress",
      scope: identity.scope,
      scopeId: identity.scopeId,
      exactSessionId: identity.exactSessionId,
      taskId: identity.taskId,
      generation: identity.generation,
      attempt: identity.attempt,
      anchorMessageId: identity.anchorMessageId,
      toolCallId: identity.commandRunId,
      toolName: "run_command",
      display: { title: identity.description, summary: progress.safeSummary, status: "running", durationMs: now - entry.startedAt },
      detail: { liveProgress: { ...progress, updatedAt: new Date(now).toISOString(), contentStored: false } },
    });
  };
  const finish = (status: string) => {
    entry.finished = true;
    if (entry.feishuTimer) clearTimeout(entry.feishuTimer);
    const phase = status === "completed" ? "finishing" : status === "failed" ? "finishing" : "running";
    const safeSummary = status === "completed" ? `${identity.description}已完成` : status === "cancelled" ? `${identity.description}已取消` : status === "timed_out" ? `${identity.description}已超时` : `${identity.description}未通过`;
    publishEphemeralUserVisibleAgentEvent({
      eventId: `live-command-${identity.commandRunId}`,
      eventType: "tool_progress", scope: identity.scope, scopeId: identity.scopeId, exactSessionId: identity.exactSessionId,
      taskId: identity.taskId, generation: identity.generation, attempt: identity.attempt, anchorMessageId: identity.anchorMessageId,
      toolCallId: identity.commandRunId, toolName: "run_command",
      display: { title: identity.description, summary: safeSummary, status: status === "completed" ? "success" : status === "cancelled" ? "waiting" : "failed", durationMs: Date.now() - entry.startedAt },
      detail: { liveProgress: { phase, safeSummary, updatedAt: new Date().toISOString(), contentStored: false } },
    });
    entries.delete(identity.commandRunId);
  };
  return { observe, finish };
}

export function getCommandLiveTail(commandRunId: string) {
  const entry = entries.get(String(commandRunId || ""));
  if (!entry) return null;
  const text = entry.lines.slice(-20).join("\n");
  return { lines: entry.lines.slice(-20), text: text.length > 4096 ? text.slice(-4096) : text, updatedAt: new Date(entry.lastPublishedAt || entry.startedAt).toISOString(), contentStored: false };
}

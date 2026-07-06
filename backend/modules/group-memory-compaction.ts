import * as crypto from "crypto";
import { buildContextBudget, estimateTextTokens, getAutoCompactThreshold, microCompactText } from "../context-budget";

export const GROUP_MEMORY_COMPACTION_VERSION = 3;
export const GROUP_COMPACT_TRIGGER_TOKENS = 137_000;
export const GROUP_COMPACT_MIN_KEEP_MESSAGES = 5;
export const GROUP_COMPACT_MIN_KEEP_TOKENS = 10_000;
export const GROUP_COMPACT_MAX_KEEP_TOKENS = 40_000;
export const GROUP_COMPACT_MAX_FAILURES = 3;
export const GROUP_COMPACT_MODEL_RETRY_MS = 15 * 60 * 1000;
export const GROUP_FACT_ANCHOR_LIMIT = 500;
export const GROUP_CONTEXT_WINDOW_DEFAULT = 200_000;
export const GROUP_CONTEXT_RESERVED_TOKENS = 50_000;
export const GROUP_AUTOCOMPACT_BUFFER_TOKENS = 13_000;
export const GROUP_COMPACT_MAX_ACTIVE_MESSAGES = 120;

type ConversationSummary = {
  primaryRequest: string;
  userMessages: string[];
  keyConcepts: string[];
  filesAndCode: string[];
  errorsAndFixes: string[];
  decisions: string[];
  completedWork: string[];
  pendingTasks: string[];
  currentWork: string;
  nextStep: string;
  participantState: string[];
  taskStates: string[];
};

type FactAnchor = {
  id: string;
  type: "user_requirement" | "dispatch_decision";
  messageId: string;
  text: string;
  timestamp: string;
  checksum: string;
};

function compactText(value: any, max = 800) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const head = Math.max(1, Math.floor(max * 0.68));
  const tail = Math.max(1, max - head - 20);
  return `${text.slice(0, head)} …[已压缩]… ${text.slice(-tail)}`;
}

function messageContent(message: any) {
  return String(message?.content || message?.delivery_summary?.headline || message?.result || "").trim();
}

function messageIdentity(message: any, index = 0) {
  return String(message?.id || message?.uuid || `${message?.timestamp || "unknown"}-${index}`);
}

function mergeUnique(existing: any[] = [], incoming: any[] = [], limit = 24, max = 700) {
  const result = new Map<string, string>();
  for (const raw of [...existing, ...incoming]) {
    const value = compactText(raw, max);
    const key = value.toLowerCase();
    if (!value) continue;
    if (result.has(key)) result.delete(key);
    result.set(key, value);
  }
  return [...result.values()].slice(-limit);
}

function mergeTaskStates(existing: any[] = [], incoming: any[] = [], limit = 30) {
  const keyed = new Map<string, string>();
  const unkeyed: string[] = [];
  for (const raw of [...existing, ...incoming]) {
    const value = compactText(raw, 700);
    if (!value) continue;
    const match = value.match(/^\[([^\]]+)\]/);
    if (match) keyed.set(match[1], value);
    else unkeyed.push(value);
  }
  return [...unkeyed, ...keyed.values()].slice(-limit);
}

function normalizedSearchTokens(value: any) {
  const text = String(value || "").toLowerCase();
  const tokens = new Set<string>();
  for (const match of text.matchAll(/[a-z0-9_./\\:-]{3,}/g)) tokens.add(match[0]);
  const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
  for (let index = 0; index < chinese.length - 1; index += 1) tokens.add(chinese.slice(index, index + 2));
  return tokens;
}

function isGroundedInSource(value: any, source: string) {
  const item = compactText(value, 1200).toLowerCase();
  const corpus = String(source || "").toLowerCase();
  if (!item) return false;
  if (corpus.includes(item)) return true;
  const tokens = [...normalizedSearchTokens(item)];
  if (!tokens.length) return false;
  let matches = 0;
  for (const token of tokens) if (corpus.includes(token) && ++matches >= Math.min(3, Math.max(1, Math.ceil(tokens.length * 0.25)))) return true;
  return false;
}

function mergeSafeConversationSummary(previous: ConversationSummary, fallback: ConversationSummary, model: ConversationSummary | null, messages: any[]) {
  const source = messages.map(message => [messageContent(message), JSON.stringify(message?.assignments || []), JSON.stringify(message?.delivery_summary || {})].join("\n")).join("\n");
  const grounded = (items: any[] = []) => items.filter(item => isGroundedInSource(item, source));
  const safeModel = model || createEmptyConversationSummary();
  return {
    primaryRequest: fallback.primaryRequest || safeModel.primaryRequest || previous.primaryRequest,
    userMessages: mergeUnique(previous.userMessages, fallback.userMessages, 40, 900),
    keyConcepts: mergeUnique(previous.keyConcepts, [...grounded(safeModel.keyConcepts), ...fallback.keyConcepts], 24, 400),
    filesAndCode: mergeUnique(previous.filesAndCode, [...grounded(safeModel.filesAndCode), ...fallback.filesAndCode], 40, 500),
    errorsAndFixes: mergeUnique(previous.errorsAndFixes, [...grounded(safeModel.errorsAndFixes), ...fallback.errorsAndFixes], 30, 700),
    decisions: mergeUnique(previous.decisions, [...grounded(safeModel.decisions), ...fallback.decisions], 30, 700),
    completedWork: mergeUnique(previous.completedWork, [...grounded(safeModel.completedWork), ...fallback.completedWork], 30, 700),
    pendingTasks: mergeUnique(previous.pendingTasks, [...grounded(safeModel.pendingTasks), ...fallback.pendingTasks], 30, 700),
    currentWork: fallback.currentWork || safeModel.currentWork || previous.currentWork,
    nextStep: fallback.nextStep || safeModel.nextStep || previous.nextStep,
    participantState: mergeUnique(previous.participantState, [...grounded(safeModel.participantState), ...fallback.participantState], 20, 400),
    taskStates: mergeTaskStates(previous.taskStates, fallback.taskStates, 30),
  } as ConversationSummary;
}

function validateSummaryPreservesFallback(summary: ConversationSummary, fallback: ConversationSummary) {
  const missing: string[] = [];
  const arrayKeys: Array<keyof ConversationSummary> = [
    "userMessages", "filesAndCode", "errorsAndFixes", "decisions", "completedWork", "pendingTasks", "taskStates",
  ];
  for (const key of arrayKeys) {
    const actual = new Set((summary[key] as string[] || []).map(item => String(item)));
    for (const item of (fallback[key] as string[] || [])) if (!actual.has(String(item))) missing.push(`${String(key)}:${compactText(item, 120)}`);
  }
  if (fallback.primaryRequest && summary.primaryRequest !== fallback.primaryRequest) missing.push("primaryRequest");
  if (fallback.currentWork && summary.currentWork !== fallback.currentWork) missing.push("currentWork");
  if (fallback.nextStep && summary.nextStep !== fallback.nextStep) missing.push("nextStep");
  return { pass: missing.length === 0, missing: missing.slice(0, 30) };
}

function extractFactAnchors(messages: any[]) {
  const anchors: FactAnchor[] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const messageId = messageIdentity(message, index);
    const timestamp = String(message?.timestamp || message?.time || "");
    const add = (type: FactAnchor["type"], text: string) => {
      const bounded = compactText(text, 2000);
      if (!bounded) return;
      const checksum = crypto.createHash("sha256").update(`${type}\n${bounded}`).digest("hex").slice(0, 16);
      anchors.push({ id: `${messageId}:${type}`, type, messageId, text: bounded, timestamp, checksum });
    };
    if (message?.role === "user") add("user_requirement", messageContent(message));
    if (message?.dispatchPolicy?.action || message?.dispatchPolicy?.reason) {
      add("dispatch_decision", `${message?.dispatchPolicy?.action || "delegate"}：${message?.dispatchPolicy?.reason || messageContent(message)}`);
    }
  }
  return anchors;
}

function mergeFactAnchors(existing: any[] = [], incoming: FactAnchor[] = []) {
  const result = new Map<string, FactAnchor>();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...incoming]) {
    if (!item?.id || !item?.text) continue;
    result.set(String(item.id), item as FactAnchor);
  }
  return [...result.values()].slice(-GROUP_FACT_ANCHOR_LIMIT);
}

function extractPersistentRequirements(messages: any[]) {
  return extractFactAnchors(messages).filter(item =>
    item.type === "user_requirement"
    && /(必须|不要|不得|禁止|始终|只能|不能|务必|验收|约束|must\b|never\b|always\b|do not\b|required?\b)/i.test(item.text)
  );
}

function mergePersistentRequirements(existing: any[] = [], incoming: FactAnchor[] = []) {
  const result = new Map<string, FactAnchor>();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...incoming]) {
    if (!item?.id || !item?.text) continue;
    result.set(String(item.id), item as FactAnchor);
  }
  return [...result.values()].slice(-200);
}

export function estimateGroupTextTokens(value: any) {
  return estimateTextTokens(value);
}

export function estimateGroupMessageTokens(message: any) {
  return estimateGroupTextTokens([
    message?.role || "",
    message?.agent || message?.target || "",
    messageContent(message),
    message?.assignments ? JSON.stringify(message.assignments) : "",
    message?.delivery_summary ? JSON.stringify(message.delivery_summary) : "",
  ].filter(Boolean).join("\n"));
}

function messageHasText(message: any) {
  return !!messageContent(message);
}

/** Claude Code session-memory style retained window adapted to group messages:
 * keep 10K/5 text messages, cap near 40K, and preserve task transactions. */
export function calculateGroupMessagesToKeepIndex(messages: any[], options: any = {}) {
  if (!messages.length) return 0;
  const floorIndex = Math.max(0, Math.min(messages.length, Number(options.floorIndex || 0)));
  const minMessages = Math.max(4, Number(options.minMessages || GROUP_COMPACT_MIN_KEEP_MESSAGES));
  const minTokens = Math.max(500, Number(options.minTokens || GROUP_COMPACT_MIN_KEEP_TOKENS));
  const maxTokens = Math.max(minTokens, Number(options.maxTokens || GROUP_COMPACT_MAX_KEEP_TOKENS));
  let startIndex = messages.length;
  let totalTokens = 0;
  let textMessages = 0;

  for (let i = messages.length - 1; i >= floorIndex; i--) {
    const nextTokens = estimateGroupMessageTokens(messages[i]);
    if (textMessages >= minMessages && totalTokens >= minTokens && totalTokens + nextTokens > maxTokens) break;
    startIndex = i;
    totalTokens += nextTokens;
    if (messageHasText(messages[i])) textMessages++;
    if (textMessages >= minMessages && totalTokens >= minTokens) break;
  }

  const firstTaskId = String(messages[startIndex]?.task_id || "");
  while (firstTaskId && startIndex > floorIndex && String(messages[startIndex - 1]?.task_id || "") === firstTaskId) {
    startIndex--;
  }
  if (startIndex > floorIndex && messages[startIndex]?.role !== "user" && messages[startIndex - 1]?.role === "user") startIndex--;
  return startIndex;
}

export function getGroupAutoCompactThreshold(config: any = {}) {
  const configuredWindow = Number(
    config?.memoryContextWindowTokens
      || config?.contextWindowTokens
      || process.env.CCM_GROUP_CONTEXT_WINDOW_TOKENS
      || GROUP_CONTEXT_WINDOW_DEFAULT
  );
  const contextWindow = Number.isFinite(configuredWindow) && configuredWindow > 32_000
    ? configuredWindow
    : GROUP_CONTEXT_WINDOW_DEFAULT;
  const reserved = Math.min(contextWindow - 16_000, Math.max(20_000, Number(config?.memoryReservedTokens || GROUP_CONTEXT_RESERVED_TOKENS)));
  return getAutoCompactThreshold({ maxTokens: contextWindow, reservedOutputTokens: reserved, autoCompactBufferTokens: GROUP_AUTOCOMPACT_BUFFER_TOKENS });
}

function createEmptyConversationSummary(): ConversationSummary {
  return {
    primaryRequest: "",
    userMessages: [],
    keyConcepts: [],
    filesAndCode: [],
    errorsAndFixes: [],
    decisions: [],
    completedWork: [],
    pendingTasks: [],
    currentWork: "",
    nextStep: "",
    participantState: [],
    taskStates: [],
  };
}

function extractFiles(message: any) {
  const content = messageContent(message);
  const explicit = [
    ...(Array.isArray(message?.filesChanged) ? message.filesChanged : []),
    ...(Array.isArray(message?.fileChanges?.files) ? message.fileChanges.files : []),
    ...(Array.isArray(message?.delivery_summary?.actual_file_changes)
      ? message.delivery_summary.actual_file_changes.map((item: any) => item?.path || item?.file || item)
      : []),
  ];
  const matched = content.match(/(?:[A-Za-z]:\\[^\s，。；]+|(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+|[\w.-]+\.(?:ts|tsx|js|jsx|vue|java|py|go|rs|md|json|toml|yaml|yml|xml|sql))/g) || [];
  return [...explicit, ...matched].map(item => typeof item === "string" ? item : JSON.stringify(item)).filter(Boolean);
}

function extractRuntimeSkillFacts(message: any) {
  const facts: string[] = [];
  const actor = message?.agent || message?.role || "Agent";
  const add = (item: any) => {
    const name = typeof item === "string" ? item.replace(/^Skill\s*[:：]\s*/i, "") : item?.name;
    const hash = typeof item === "object" && item?.contentHash ? `#${item.contentHash}` : "";
    if (name) facts.push(`${actor} 使用 Skill:${name}${hash}`);
  };
  for (const item of Array.isArray(message?.invokedSkills) ? message.invokedSkills : []) add(item);
  for (const item of Array.isArray(message?.receipt?.invokedSkills) ? message.receipt.invokedSkills : []) add(item);
  for (const item of Array.isArray(message?.delivery_summary?.runtime_tooling?.invoked_skills) ? message.delivery_summary.runtime_tooling.invoked_skills : []) add(item);
  for (const item of Array.isArray(message?.receipt?.memoryUsed) ? message.receipt.memoryUsed : []) if (/Skill\s*[:：]/i.test(String(item || ""))) add(item);
  return Array.from(new Set(facts)).slice(0, 12);
}

function memorySeed(memory: any) {
  const completed = (memory?.completed || []).slice(-12).map((item: any) => `${item.project || "unknown"}: ${item.summary || ""}`);
  const blocked = (memory?.blocked || []).slice(-10).map((item: any) => `${item.project || "unknown"}: ${item.reason || item.summary || ""}`);
  const decisions = (memory?.decisions || []).slice(-12).map((item: any) => `${item.decision || ""}${item.reason ? `（${item.reason}）` : ""}`);
  return { completed, blocked, decisions };
}

export function buildDeterministicConversationSummary(messages: any[], memory: any, previous: any = {}): ConversationSummary {
  const base = { ...createEmptyConversationSummary(), ...(previous || {}) } as ConversationSummary;
  const users: string[] = [];
  const files: string[] = [];
  const errors: string[] = [];
  const decisions: string[] = [];
  const completed: string[] = [];
  const pending: string[] = [];
  const participantState: string[] = [];
  const taskStates: string[] = [];
  const runtimeFacts: string[] = [];

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    const content = messageContent(message);
    if (!content) continue;
    const id = messageIdentity(message, index);
    const actor = message?.role === "user" ? `用户 -> ${message?.target || "all"}` : message?.agent || message?.role || "Agent";
    if (message?.role === "user") users.push(`#${id} ${compactText(content, 900)}`);
    files.push(...extractFiles(message));
    runtimeFacts.push(...extractRuntimeSkillFacts(message));
    if (/(错误|失败|异常|阻塞|超时|拒绝|error|failed|timeout|blocked)/i.test(content)) errors.push(`${actor}: ${compactText(content, 600)}`);
    if (message?.dispatchPolicy?.action || Array.isArray(message?.assignments) && message.assignments.length) {
      decisions.push(`${actor}: ${message?.dispatchPolicy?.action || "delegate"}；${compactText(message?.dispatchPolicy?.reason || content, 500)}`);
      for (const assignment of message.assignments || []) {
        if (!["done", "complete", "completed", "success"].includes(String(assignment?.status || "").toLowerCase())) {
          pending.push(`${assignment?.project || assignment?.target || "unknown"}: ${compactText(assignment?.task || assignment?.reason || "待执行", 500)}`);
        }
      }
    }
    const receiptStatus = String(message?.receipt?.status || message?.delivery_summary?.status || "").toLowerCase();
    const taskId = String(message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "").trim();
    if (taskId && receiptStatus) taskStates.push(`[${taskId}] ${receiptStatus}；${actor}：${compactText(message?.receipt?.summary || message?.delivery_summary?.headline || content, 500)}`);
    if (["done", "complete", "completed", "success"].includes(receiptStatus) || message?.delivery_summary?.has_final_review) {
      completed.push(`${actor}: ${compactText(message?.delivery_summary?.headline || message?.receipt?.summary || content, 600)}`);
    }
    if (message?.agent) participantState.push(`${message.agent}: ${receiptStatus || message?.workflow?.phase || "最近有发言"}`);
  }

  const seed = memorySeed(memory);
  const latestUser = [...messages].reverse().find((item: any) => item?.role === "user" && messageContent(item));
  const latestMessage = [...messages].reverse().find((item: any) => messageContent(item));
  const nextAction = (memory?.nextActions || []).slice(-1)[0];
  return {
    primaryRequest: compactText(messageContent(latestUser) || base.primaryRequest || memory?.goal, 1200),
    userMessages: mergeUnique(base.userMessages, users, 40, 900),
    keyConcepts: mergeUnique(base.keyConcepts, runtimeFacts, 24, 400),
    filesAndCode: mergeUnique(base.filesAndCode, files, 40, 500),
    errorsAndFixes: mergeUnique(base.errorsAndFixes, errors, 30, 700),
    decisions: mergeUnique(base.decisions, [...seed.decisions, ...decisions], 30, 700),
    completedWork: mergeUnique(base.completedWork, [...seed.completed, ...completed], 30, 700),
    pendingTasks: mergeUnique(base.pendingTasks, [...seed.blocked, ...pending], 30, 700),
    currentWork: compactText(messageContent(latestMessage) || base.currentWork, 1200),
    nextStep: compactText(nextAction?.action || nextAction || base.nextStep, 900),
    participantState: mergeUnique(base.participantState, participantState, 20, 400),
    taskStates: mergeTaskStates(base.taskStates, taskStates, 30),
  };
}

function normalizeSummary(value: any, fallback: ConversationSummary): ConversationSummary {
  const raw = value?.conversationSummary || value?.summary || value || {};
  return {
    primaryRequest: compactText(raw.primaryRequest || raw.primary_request || fallback.primaryRequest, 1200),
    userMessages: mergeUnique([], raw.userMessages || raw.user_messages || fallback.userMessages, 40, 900),
    keyConcepts: mergeUnique([], raw.keyConcepts || raw.key_concepts || fallback.keyConcepts, 24, 400),
    filesAndCode: mergeUnique([], raw.filesAndCode || raw.files_and_code || fallback.filesAndCode, 40, 500),
    errorsAndFixes: mergeUnique([], raw.errorsAndFixes || raw.errors_and_fixes || fallback.errorsAndFixes, 30, 700),
    decisions: mergeUnique([], raw.decisions || fallback.decisions, 30, 700),
    completedWork: mergeUnique([], raw.completedWork || raw.completed_work || fallback.completedWork, 30, 700),
    pendingTasks: mergeUnique([], raw.pendingTasks || raw.pending_tasks || fallback.pendingTasks, 30, 700),
    currentWork: compactText(raw.currentWork || raw.current_work || fallback.currentWork, 1200),
    nextStep: compactText(raw.nextStep || raw.next_step || fallback.nextStep, 900),
    participantState: mergeUnique([], raw.participantState || raw.participant_state || fallback.participantState, 20, 400),
    taskStates: mergeTaskStates([], raw.taskStates || raw.task_states || fallback.taskStates, 30),
  };
}

export function renderConversationSummary(summary: any, maxChars = 14_000) {
  if (!summary) return "";
  const normalized = normalizeSummary(summary, createEmptyConversationSummary());
  const lines = [
    "群聊会话压缩摘要（压缩边界前的历史）：",
    `- 用户当前/最近主目标：${normalized.primaryRequest || "未明确"}`,
  ];
  const add = (title: string, items: string[], limit = 10) => {
    if (!items?.length) return;
    lines.push(`- ${title}：`);
    for (const item of items.slice(-limit)) lines.push(`  - ${item}`);
  };
  add("用户历史要求", normalized.userMessages, 14);
  add("关键概念/约束", normalized.keyConcepts, 10);
  add("文件与代码", normalized.filesAndCode, 12);
  add("错误与修复", normalized.errorsAndFixes, 10);
  add("关键决策", normalized.decisions, 10);
  add("已完成工作", normalized.completedWork, 10);
  add("待办/阻塞", normalized.pendingTasks, 10);
  add("成员状态", normalized.participantState, 8);
  add("最新任务状态（同一任务以最后一条为准）", normalized.taskStates, 12);
  if (normalized.currentWork) lines.push(`- 压缩前正在进行：${normalized.currentWork}`);
  if (normalized.nextStep) lines.push(`- 下一步：${normalized.nextStep}`);
  const text = lines.join("\n");
  if (text.length <= maxChars) return text;
  const head = Math.max(1, Math.floor(maxChars * 0.62));
  const tail = Math.max(1, maxChars - head - 36);
  return `${text.slice(0, head)}\n…[中间摘要已折叠，可回溯原始记录]…\n${text.slice(-tail)}`;
}

function buildCompactionTimeline(messages: any[]) {
  const userMessages = messages
    .filter((item: any) => item?.role === "user" && messageContent(item))
    .slice(-40)
    .map((item: any, index: number) => `${messageIdentity(item, index)} [用户 -> ${item?.target || "all"}] ${compactText(messageContent(item), 1000)}`);
  const timeline = messages.slice(-80).map((item: any, index: number) => {
    const actor = item?.role === "user" ? `用户 -> ${item?.target || "all"}` : item?.agent || item?.role || "Agent";
    return `${messageIdentity(item, index)} [${actor}] ${compactText(messageContent(item), 900)}`;
  });
  return { userMessages, timeline };
}

function extractJsonObject(text: string) {
  const raw = String(text || "").trim();
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) try { return JSON.parse(fenced[1].trim()); } catch {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  return null;
}

function normalizeOpenAiUrl(value: string) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/chat/completions`;
  return /\/v1\//i.test(base) ? base : `${base}/v1/chat/completions`;
}

function normalizeAnthropicUrl(value: string) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  if (/\/v1\/messages$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/messages`;
  return /\/v1\//i.test(base) ? base : `${base}/v1/messages`;
}

async function callCompactionModel(config: any, system: string, user: string) {
  if (!config?.enabled || !config?.apiUrl || !config?.apiKey || !config?.model) return null;
  const anthropic = config.format === "anthropic-compatible"
    || config.format === "auto" && String(config.apiUrl).toLowerCase().includes("anthropic")
    || /\/anthropic(?:\/|$)/i.test(String(config.apiUrl));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(10_000, Math.min(Number(config.timeoutMs) || 90_000, 120_000)));
  try {
    const response = await fetch(anthropic ? normalizeAnthropicUrl(config.apiUrl) : normalizeOpenAiUrl(config.apiUrl), {
      method: "POST",
      headers: anthropic
        ? { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" }
        : { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
      body: JSON.stringify(anthropic ? {
        model: config.model,
        max_tokens: 5000,
        temperature: 0.1,
        system,
        messages: [{ role: "user", content: user }],
      } : {
        model: config.model,
        temperature: 0.1,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`memory compact HTTP ${response.status}: ${body.slice(0, 180)}`);
    const data = JSON.parse(body);
    const content = anthropic
      ? (data?.content || []).map((part: any) => part?.type === "text" ? part.text : "").join("")
      : data?.choices?.[0]?.message?.content || "";
    return extractJsonObject(content);
  } finally {
    clearTimeout(timeout);
  }
}

async function summarizeWithModel(messages: any[], memory: any, fallback: ConversationSummary, config: any) {
  const previous = memory?.conversationSummary || createEmptyConversationSummary();
  const timeline = buildCompactionTimeline(messages);
  const system = `你是群聊 Agent 会话压缩器。只生成 JSON，不调用工具，不创建任务，不向任何 Agent 派发。
你的摘要会替代压缩边界之前的原始消息，因此必须保真并支持主 Agent 无缝续跑。
参考 Claude Code compaction：保留用户明确要求、意图变化、技术决策、文件/代码、错误与修复、已完成、未完成、当前工作和下一步。
必须合并旧摘要，不能因为新消息覆盖仍有效的旧约束；已完成与待办冲突时，以时间较新的证据为准。
不要编造文件变更、测试或完成状态。`;
  const user = `旧结构化摘要：
${JSON.stringify(previous)}

平台结构化保底摘要：
${JSON.stringify(fallback)}

本次被压缩区间内的全部用户消息（已做长度保护）：
${timeline.userMessages.join("\n") || "无"}

本次被压缩区间的近期时间线：
${timeline.timeline.join("\n") || "无"}

返回以下 JSON，不要 Markdown：
{"primaryRequest":"","userMessages":[],"keyConcepts":[],"filesAndCode":[],"errorsAndFixes":[],"decisions":[],"completedWork":[],"pendingTasks":[],"currentWork":"","nextStep":"","participantState":[],"taskStates":[]}`;
  const result = await callCompactionModel(config, system, user);
  return result ? normalizeSummary(result, createEmptyConversationSummary()) : null;
}

export function buildBoundedRecentGroupContext(messages: any[], fullCount = 5) {
  const rows = (messages || []).map((message: any, index: number) => {
    const who = message?.role === "user" ? `[用户 -> ${message?.target || "all"}]` : `[${message?.agent || message?.role || "Agent"}]`;
    const isFull = index >= messages.length - fullCount;
    const max = message?.role === "user" ? (isFull ? 5000 : 1200) : (isFull ? 6000 : 900);
    const compacted = microCompactText(messageContent(message), max);
    const content = compacted.text;
    const originalLength = messageContent(message).length;
    const suffix = compacted.compacted ? `\n[该消息原文 ${originalLength} 字符，已做 micro-compact；可按 #${messageIdentity(message, index)} 回溯]` : "";
    return `${who} ${content}${suffix}`;
  });
  return rows.join("\n");
}

export function buildRelevantHistoricalGroupContext(messages: any[], boundaryIndex: number, query: string, options: any = {}) {
  if (boundaryIndex < 0 || !messages?.length) return "";
  const queryTokens = [...normalizedSearchTokens(query)].slice(0, 120);
  if (!queryTokens.length) return "";
  const maxMessages = Math.max(1, Math.min(10, Number(options.maxMessages || 6)));
  const maxChars = Math.max(1000, Math.min(12_000, Number(options.maxChars || 6000)));
  const ranked: Array<{ index: number; score: number; message: any }> = [];
  for (let index = 0; index <= boundaryIndex; index += 1) {
    const message = messages[index];
    const content = messageContent(message);
    if (!content) continue;
    const corpus = content.toLowerCase();
    let score = 0;
    for (const token of queryTokens) if (corpus.includes(token)) score += token.length >= 4 ? 3 : 1;
    if (!score) continue;
    if (message?.role === "user") score += 4;
    if (message?.dispatchPolicy || message?.delivery_summary || message?.receipt) score += 2;
    if (/(错误|失败|阻塞|error|failed|blocked|\.(?:ts|js|vue|java|py|go|rs)\b)/i.test(content)) score += 1;
    ranked.push({ index, score, message });
  }
  const selected = ranked.sort((a, b) => b.score - a.score || b.index - a.index).slice(0, maxMessages).sort((a, b) => a.index - b.index);
  if (!selected.length) return "";
  const lines = ["按当前任务自动回溯到的压缩前原文证据（原文优先于摘要）："];
  let used = lines[0].length;
  for (const item of selected) {
    const actor = item.message?.role === "user" ? `用户 -> ${item.message?.target || "all"}` : item.message?.agent || item.message?.role || "Agent";
    const row = `- #${messageIdentity(item.message, item.index)} [${actor}] ${compactText(messageContent(item.message), 1400)}`;
    if (used + row.length > maxChars) break;
    lines.push(row);
    used += row.length;
  }
  return lines.length > 1 ? lines.join("\n") : "";
}

export async function compactGroupConversationMemory(input: {
  groupId: string;
  messages: any[];
  memory: any;
  config?: any;
  transcriptPath: string;
  force?: boolean;
  rebuild?: boolean;
}) {
  const messages = input.messages || [];
  const memory = input.memory || {};
  const previousState = memory.compaction || {};
  const previousVersion = Number(previousState.version || 0);
  const requiresVersionMigration = previousVersion > 0 && previousVersion < GROUP_MEMORY_COMPACTION_VERSION;
  const requiresValidationRepair = !!input.force && String(previousState.summarySource || "") === "structured-validation-fallback";
  const requiresMetadataRepair = !!input.force && !previousState.modelMode;
  const requiresExplicitRebuild = !!input.rebuild;
  const lastBoundaryId = requiresVersionMigration || requiresValidationRepair || requiresMetadataRepair || requiresExplicitRebuild ? "" : String(previousState.lastCompactedMessageId || "");
  let summarizedThroughIndex = lastBoundaryId ? messages.findIndex((message: any, index: number) => messageIdentity(message, index) === lastBoundaryId) : -1;
  if (lastBoundaryId && summarizedThroughIndex < 0) summarizedThroughIndex = -1;

  const keepIndex = calculateGroupMessagesToKeepIndex(messages, { floorIndex: summarizedThroughIndex + 1 });
  if (keepIndex <= summarizedThroughIndex + 1) return { compacted: false, memory, keepIndex };
  const messagesToCompact = messages.slice(summarizedThroughIndex + 1, keepIndex);
  const sourceTokens = messagesToCompact.reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
  const keptActiveTokens = messages.slice(keepIndex).reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
  const previousSummaryTokens = estimateGroupTextTokens(JSON.stringify(memory.conversationSummary || {}));
  const activeTokens = sourceTokens + keptActiveTokens + previousSummaryTokens;
  const triggerTokens = getGroupAutoCompactThreshold(input.config);
  const activeMessageCount = messages.length - summarizedThroughIndex - 1;
  const shouldCompact = !!input.force || activeTokens >= triggerTokens || activeMessageCount >= GROUP_COMPACT_MAX_ACTIVE_MESSAGES;
  if (!shouldCompact || !messagesToCompact.length) return { compacted: false, memory, keepIndex };

  const previousSummary = normalizeSummary(memory.conversationSummary || {}, createEmptyConversationSummary());
  const fallback = buildDeterministicConversationSummary(messagesToCompact, memory, previousSummary);
  let conversationSummary = fallback;
  let summarySource = "structured";
  let failure = "";
  let validation = validateSummaryPreservesFallback(conversationSummary, fallback);
  let rejectedModelValidation: any = null;
  const failures = Number(previousState.consecutiveFailures || 0);
  const nowMs = Date.now();
  const lastFailureAtMs = Date.parse(String(previousState.lastFailureAt || "")) || 0;
  const retryWindowExpired = lastFailureAtMs > 0 && nowMs - lastFailureAtMs >= GROUP_COMPACT_MODEL_RETRY_MS;
  const modelCompactionEnabled = input.config?.memoryCompactionUseModel === true
    || String(input.config?.memoryCompactionMode || "").toLowerCase() === "hybrid";
  const shouldAttemptModel = modelCompactionEnabled && (failures < GROUP_COMPACT_MAX_FAILURES || retryWindowExpired);
  if (shouldAttemptModel) {
    try {
      const modelSummary = await summarizeWithModel(messagesToCompact, memory, fallback, input.config);
      if (modelSummary) {
        conversationSummary = mergeSafeConversationSummary(previousSummary, fallback, modelSummary, messagesToCompact);
        summarySource = "hybrid";
        validation = validateSummaryPreservesFallback(conversationSummary, fallback);
        if (!validation.pass) {
          rejectedModelValidation = validation;
          conversationSummary = fallback;
          summarySource = "structured-validation-fallback";
          validation = validateSummaryPreservesFallback(conversationSummary, fallback);
        }
      }
    } catch (error: any) {
      failure = compactText(error?.message || error, 400);
    }
  }

  const boundaryMessage = messages[keepIndex - 1];
  const keptMessages = messages.slice(keepIndex);
  const preCompactTokenCount = messages.reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
  const postCompactTokenCount = estimateGroupTextTokens(JSON.stringify(conversationSummary))
    + keptMessages.reduce((sum, message) => sum + Math.min(estimateGroupMessageTokens(message), 2500), 0);
  const now = new Date(nowMs).toISOString();
  const summaryChecksum = crypto.createHash("sha256").update(JSON.stringify(conversationSummary)).digest("hex").slice(0, 24);
  const reductionRatio = preCompactTokenCount > 0 ? Math.max(0, 1 - postCompactTokenCount / preCompactTokenCount) : 0;
  const pressurePercent = triggerTokens > 0 ? Math.round((activeTokens / triggerTokens) * 1000) / 10 : 0;
  const contextBudget = buildContextBudget({
    context: {
      conversationSummary,
      keptRecent: keptMessages.map((message, index) => ({
        id: messageIdentity(message, keepIndex + index),
        role: message?.role,
        agent: message?.agent,
        content: microCompactText(messageContent(message), 1800).text,
      })),
    },
    maxChars: 48_000,
    maxTokens: triggerTokens,
  });
  const previousThrashCount = Number(previousState.thrashCount || 0);
  const thrashCount = reductionRatio < 0.2 ? previousThrashCount + 1 : 0;
  const health = !validation.pass ? "degraded" : thrashCount >= 3 ? "thrashing" : "healthy";
  const boundary = {
    id: `compact-${Date.now().toString(36)}`,
    type: input.force ? "manual" : "auto",
    summarizedFromMessageId: messageIdentity(messages[summarizedThroughIndex + 1], summarizedThroughIndex + 1),
    summarizedThroughMessageId: messageIdentity(boundaryMessage, keepIndex - 1),
    summarizedMessageCount: messagesToCompact.length,
    preservedMessageIds: keptMessages.slice(-40).map((message, index) => messageIdentity(message, keepIndex + index)),
    preCompactTokenCount,
    postCompactTokenCount,
    post_compact_restore: {
      strategy: "conversation_summary_recent_reinject",
      preservedMessageIds: keptMessages.slice(-20).map((message, index) => messageIdentity(message, keepIndex + index)),
      summaryChecksum,
      transcriptPath: input.transcriptPath,
    },
    context_budget: contextBudget,
    summarySource,
    createdAt: now,
  };
  const totalCompacted = requiresExplicitRebuild
    ? keepIndex
    : Math.max(Number(previousState.compactedMessageCount || 0) + messagesToCompact.length, keepIndex);
  const nextMemory = {
    ...memory,
    conversationSummary,
    factAnchors: mergeFactAnchors(memory.factAnchors, extractFactAnchors(messagesToCompact)),
    persistentRequirements: mergePersistentRequirements(memory.persistentRequirements, extractPersistentRequirements(messagesToCompact)),
    messageDigest: renderConversationSummary(conversationSummary),
    compactBoundary: boundary,
    compaction: {
      version: GROUP_MEMORY_COMPACTION_VERSION,
      rebuiltAt: requiresExplicitRebuild ? now : String(previousState.rebuiltAt || ""),
      migratedFromVersion: requiresVersionMigration ? previousVersion : Number(previousState.migratedFromVersion || 0),
      enabled: true,
      lastCompactedMessageId: boundary.summarizedThroughMessageId,
      lastCompactedAt: now,
      compactedMessageCount: totalCompacted,
      totalMessagesSeen: messages.length,
      preservedRecentMessages: keptMessages.length,
      preCompactTokenCount,
      postCompactTokenCount,
      context_budget: contextBudget,
      activeTokensBeforeCompact: activeTokens,
      triggerTokens,
      pressurePercent,
      summarySource,
      modelMode: modelCompactionEnabled ? "hybrid-opt-in" : "session-memory-first",
      modelAttempted: shouldAttemptModel,
      summaryChecksum,
      deterministicFactsPreserved: true,
      validation,
      rejectedModelValidation,
      reductionRatio,
      thrashCount,
      health,
      consecutiveFailures: !modelCompactionEnabled || summarySource === "hybrid" ? 0 : Math.min(GROUP_COMPACT_MAX_FAILURES, failures + (failure ? 1 : 0)),
      lastFailure: modelCompactionEnabled ? failure : "",
      lastFailureAt: modelCompactionEnabled ? (failure ? now : String(previousState.lastFailureAt || "")) : "",
      nextModelRetryAt: modelCompactionEnabled && failure && failures + 1 >= GROUP_COMPACT_MAX_FAILURES
        ? new Date(nowMs + GROUP_COMPACT_MODEL_RETRY_MS).toISOString()
        : "",
      transcriptPath: input.transcriptPath,
      boundaries: [...(Array.isArray(previousState.boundaries) ? previousState.boundaries : []), boundary].slice(-8),
    },
    messageCompression: {
      enabled: true,
      strategy: "cc-session-memory-v3",
      totalMessages: messages.length,
      compressedMessages: totalCompacted,
      recentMessages: keptMessages.length,
      recentLimit: keptMessages.length,
      olderLimit: totalCompacted,
      preCompactTokenCount,
      postCompactTokenCount,
      lastCompressedAt: now,
    },
  };
  return { compacted: true, memory: nextMemory, boundary, keepIndex };
}

export function runGroupMemoryCompactionSelfTest() {
  const messages: any[] = [];
  for (let i = 0; i < 36; i++) {
    messages.push({ id: `u${i}`, role: "user", target: "coordinator", content: i === 0 ? "实现订单审核并保留权限校验" : `用户补充要求 ${i}` });
    messages.push({ id: `a${i}`, role: "assistant", agent: "backend", content: i === 10 ? "执行失败：mvn test 超时，需要修复" : `处理进度 ${i}，文件 src/order-${i}.ts`, receipt: i < 30 ? { status: "done", summary: `完成 ${i}` } : undefined });
  }
  const keepIndex = calculateGroupMessagesToKeepIndex(messages, { minMessages: 8, minTokens: 500, maxTokens: 1800 });
  const boundaryKeepIndex = calculateGroupMessagesToKeepIndex(messages, { floorIndex: 60, minMessages: 8, minTokens: 500, maxTokens: 1800 });
  const compacted = messages.slice(0, keepIndex);
  const kept = messages.slice(keepIndex);
  const summary = buildDeterministicConversationSummary(compacted, { goal: "实现订单审核", decisions: [], completed: [], blocked: [], nextActions: [{ action: "继续测试" }] });
  const bounded = buildBoundedRecentGroupContext([{ id: "large", role: "assistant", agent: "worker", content: "x".repeat(20_000) }], 1);
  const retrieval = buildRelevantHistoricalGroupContext(messages, Math.max(0, keepIndex - 1), "订单审核 权限校验");
  const unsafeModel = { ...createEmptyConversationSummary(), filesAndCode: ["src/fake-hallucination.ts"], completedWork: ["已经上线生产"] };
  const safeMerged = mergeSafeConversationSummary(createEmptyConversationSummary(), summary, unsafeModel, compacted);
  const anchors = extractFactAnchors(compacted);
  const checks = {
    keepsRecentMessages: kept.length >= 8,
    compactsOlderMessages: compacted.length > 0,
    preservesUserIntent: summary.userMessages.some(item => item.includes("实现订单审核")),
    preservesErrors: summary.errorsAndFixes.some(item => item.includes("mvn test")),
    preservesFiles: summary.filesAndCode.some(item => item.includes("src/order-")),
    preservesNextStep: summary.nextStep.includes("继续测试"),
    microCompactsLargeOutput: bounded.length < 8_000 && bounded.includes("micro-compact"),
    rawTranscriptUntouched: messages[0].content === "实现订单审核并保留权限校验" && messages.length === 72,
    neverCrossesPreviousBoundary: boundaryKeepIndex >= 60,
    retrievesCompressedOriginalEvidence: retrieval.includes("#u0") && retrieval.includes("权限校验"),
    rejectsUngroundedModelClaims: !safeMerged.filesAndCode.includes("src/fake-hallucination.ts") && !safeMerged.completedWork.includes("已经上线生产"),
    preservesDeterministicFacts: safeMerged.filesAndCode.some(item => item.includes("src/order-")) && safeMerged.userMessages.some(item => item.includes("权限校验")),
    storesChecksummedUserAnchors: anchors.some(item => item.messageId === "u0" && item.type === "user_requirement" && item.checksum.length === 16),
    adaptiveThresholdMatchesDefaultBudget: getGroupAutoCompactThreshold({}) === GROUP_COMPACT_TRIGGER_TOKENS,
  };
  return { pass: Object.values(checks).every(Boolean), checks, keepIndex, keptMessages: kept.length, compactedMessages: compacted.length };
}

export async function runGroupMemoryCompactionIntegrationSelfTest() {
  const messages = Array.from({ length: 70 }, (_, index) => ({
    id: `m${index}`,
    role: index % 2 ? "assistant" : "user",
    agent: index % 2 ? "worker" : undefined,
    content: index === 0
      ? "实现支付回调，必须保留幂等校验"
      : index === 20
        ? "Error: signature mismatch in src/pay.ts"
        : `阶段 ${index} ${"内容".repeat(250)}`,
  }));
  const originalMessages = JSON.stringify(messages);
  const first: any = await compactGroupConversationMemory({
    groupId: "compaction-self-test",
    messages,
    memory: { goal: "支付回调", nextActions: [{ action: "继续验签测试" }] },
    config: {},
    transcriptPath: "raw.json",
    force: true,
  });
  const appended = messages.concat(Array.from({ length: 30 }, (_, index) => ({
    id: `n${index}`,
    role: index % 2 ? "assistant" : "user",
    agent: index % 2 ? "worker" : undefined,
    content: `新增阶段 ${index} ${"x".repeat(1000)}`,
  })));
  const second: any = first.compacted
    ? await compactGroupConversationMemory({
      groupId: "compaction-self-test",
      messages: appended,
      memory: first.memory,
      config: {},
      transcriptPath: "raw.json",
      force: true,
    })
    : { compacted: false };
  const migrated: any = await compactGroupConversationMemory({
    groupId: "compaction-migration-self-test",
    messages,
    memory: { compaction: { version: 2, lastCompactedMessageId: "m60" } },
    config: {},
    transcriptPath: "raw.json",
    force: true,
  });
  const expectedSecondStart = first.compacted ? messages[first.keepIndex]?.id : "";
  const checks = {
    actualAsyncCompaction: !!first.compacted,
    structuredFallbackWithoutModel: first.memory?.compaction?.summarySource === "structured",
    fallbackPreservesUserIntent: !!first.memory?.conversationSummary?.userMessages?.length,
    rawMessagesRemainImmutable: JSON.stringify(messages) === originalMessages,
    incrementalSecondCompaction: !!second.compacted,
    nextBoundaryStartsAfterPrevious: second.boundary?.summarizedFromMessageId === expectedSecondStart,
    postCompactRestoreAnchorsRecorded: Array.isArray(first.boundary?.post_compact_restore?.preservedMessageIds) && first.boundary.post_compact_restore.preservedMessageIds.length > 0,
    legacyVersionRebuildsFromRawTranscript: migrated.memory?.compaction?.version === GROUP_MEMORY_COMPACTION_VERSION
      && migrated.memory?.compaction?.migratedFromVersion === 2
      && migrated.boundary?.summarizedFromMessageId === "m0",
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

export async function runGroupMemoryCompactionStressSelfTest() {
  const messages: any[] = [];
  let memory: any = { goal: "长期维护支付审计链路", nextActions: [{ action: "继续完成当前任务" }] };
  let lastBoundaryIndex = -1;
  let boundariesAdvance = true;
  let validationsPass = true;
  let checksumsPresent = true;
  let reductionsHealthy = true;
  for (let round = 0; round < 12; round += 1) {
    for (let offset = 0; offset < 100; offset += 1) {
      const index = round * 100 + offset;
      const role = index % 2 === 0 ? "user" : "assistant";
      const taskId = `stress-task-${Math.floor(index / 40)}`;
      const content = index === 0
        ? "必须保留审计日志，任何压缩都不得删除 AUDIT_SENTINEL_73921"
        : index === 640
          ? "新的约束：支付回调必须使用幂等键 IDEMPOTENCY_V2"
          : `${role === "user" ? "用户要求" : "Agent进度"} ${index}，处理 src/payment/module-${index}.ts，${"上下文".repeat(180)}`;
      messages.push({
        id: `stress-${index}`,
        role,
        agent: role === "assistant" ? "payment-agent" : undefined,
        target: role === "user" ? "coordinator" : undefined,
        task_id: taskId,
        content,
        receipt: role === "assistant" ? { status: index % 40 === 39 ? "done" : "partial", summary: `任务阶段 ${index}` } : undefined,
      });
    }
    const result: any = await compactGroupConversationMemory({
      groupId: "compaction-stress-test",
      messages,
      memory,
      config: {},
      transcriptPath: "stress-raw.json",
      force: true,
    });
    if (!result.compacted) {
      boundariesAdvance = false;
      break;
    }
    const boundaryIndex = messages.findIndex(item => item.id === result.boundary?.summarizedThroughMessageId);
    boundariesAdvance = boundariesAdvance && boundaryIndex > lastBoundaryIndex;
    lastBoundaryIndex = boundaryIndex;
    validationsPass = validationsPass && result.memory?.compaction?.validation?.pass === true;
    checksumsPresent = checksumsPresent && String(result.memory?.compaction?.summaryChecksum || "").length === 24;
    reductionsHealthy = reductionsHealthy && Number(result.memory?.compaction?.reductionRatio || 0) > 0.2;
    memory = result.memory;
  }
  const retrieval = buildRelevantHistoricalGroupContext(messages, lastBoundaryIndex, "审计日志 AUDIT_SENTINEL_73921");
  const persistent = Array.isArray(memory.persistentRequirements) ? memory.persistentRequirements : [];
  const checks = {
    handlesTwelveIncrementalCompactions: boundariesAdvance && Number(memory?.compaction?.compactedMessageCount || 0) > 1000,
    summaryValidationNeverDrifts: validationsPass,
    everySummaryHasIntegrityChecksum: checksumsPresent,
    compactionActuallyReleasesContext: reductionsHealthy,
    persistentRequirementSurvives: persistent.some((item: any) => String(item.text || "").includes("AUDIT_SENTINEL_73921"))
      && persistent.some((item: any) => String(item.text || "").includes("IDEMPOTENCY_V2")),
    oldRawEvidenceIsAutomaticallyRetrievable: retrieval.includes("#stress-0") && retrieval.includes("AUDIT_SENTINEL_73921"),
    rawTranscriptRemainsUntouched: messages[0]?.content.includes("AUDIT_SENTINEL_73921") && messages.length === 1200,
    boundaryHistoryIsBounded: Array.isArray(memory?.compaction?.boundaries) && memory.compaction.boundaries.length <= 8,
  };
  return { pass: Object.values(checks).every(Boolean), checks, finalBoundaryIndex: lastBoundaryIndex };
}

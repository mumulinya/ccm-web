import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { buildBoundedRecentGroupContext } from "./group-memory-compaction";
import { getGroupMessages } from "./storage";

const GROUP_MEMORY_DIR = path.join(CCM_DIR, "group-memory");
export function getGroupMemoryFile(groupId: string) {
  return path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
}

function getGroupMemoryBackupFile(groupId: string) {
  return `${getGroupMemoryFile(groupId)}.bak`;
}

export function createEmptyGroupMemory(groupId: string) {
  return {
    groupId,
    goal: "",
    summary: "",
    currentPhase: "idle",
    decisions: [],
    completed: [],
    blocked: [],
    workerLedger: [],
    agentMemories: {},
    messageDigest: "",
    messageCompression: { enabled: true, recentLimit: 12, olderLimit: 30, totalMessages: 0, compressedMessages: 0, lastCompressedAt: "" },
    openQuestions: [],
    nextActions: [],
    updated_at: new Date().toISOString(),
  };
}

export function loadGroupMemory(groupId: string) {
  const file = getGroupMemoryFile(groupId);
  if (!fs.existsSync(file)) return createEmptyGroupMemory(groupId);
  try {
    return { ...createEmptyGroupMemory(groupId), ...JSON.parse(fs.readFileSync(file, "utf-8")) };
  } catch {
    const backup = getGroupMemoryBackupFile(groupId);
    try {
      const recovered = { ...createEmptyGroupMemory(groupId), ...JSON.parse(fs.readFileSync(backup, "utf-8")) };
      const temp = `${file}.${process.pid}.recover.tmp`;
      fs.writeFileSync(temp, JSON.stringify(recovered, null, 2), "utf-8");
      fs.renameSync(temp, file);
      return recovered;
    } catch {}
    return createEmptyGroupMemory(groupId);
  }
}

export function saveGroupMemory(groupId: string, memory: any) {
  if (!fs.existsSync(GROUP_MEMORY_DIR)) fs.mkdirSync(GROUP_MEMORY_DIR, { recursive: true });
  const next = compressGroupMemory({
    ...createEmptyGroupMemory(groupId),
    ...(memory || {}),
    groupId,
    updated_at: new Date().toISOString(),
  });
  const file = getGroupMemoryFile(groupId);
  const backup = getGroupMemoryBackupFile(groupId);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  if (fs.existsSync(file)) {
    try {
      JSON.parse(fs.readFileSync(file, "utf-8"));
      fs.copyFileSync(file, backup);
    } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(next, null, 2), "utf-8");
  fs.renameSync(temp, file);
  return next;
}

export function runGroupMemoryStorageRecoverySelfTest() {
  const groupId = `memory-storage-self-test-${process.pid}-${Date.now()}`;
  const file = getGroupMemoryFile(groupId);
  const backup = getGroupMemoryBackupFile(groupId);
  try {
    const first = saveGroupMemory(groupId, { goal: "first-valid-state", decisions: [{ decision: "keep" }] });
    saveGroupMemory(groupId, { goal: "second-valid-state" });
    fs.writeFileSync(file, "{broken-json", "utf-8");
    const recovered = loadGroupMemory(groupId);
    const checks = {
      atomicFileIsValidJson: (() => { try { JSON.parse(fs.readFileSync(file, "utf-8")); return true; } catch { return false; } })(),
      backupRecoveryWorks: recovered.goal === first.goal && recovered.decisions?.[0]?.decision === "keep",
      backupExists: fs.existsSync(backup),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
  } finally {
    for (const target of [file, backup]) try { fs.unlinkSync(target); } catch {}
  }
}

export function uniqueByKey(items: any[], keyFn: (item: any) => string, limit = 20) {
  const seen = new Set<string>();
  const result: any[] = [];
  for (const item of [...(items || [])].reverse()) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.unshift(item);
  }
  return result.slice(-limit);
}

export function compactMemoryText(value: any, max = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function compactPreserveLines(value: any, max = 2200) {
  const text = String(value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  return text.length > max ? `${text.slice(0, max)}\n…（已截断）` : text;
}

function summarizeMemoryItems(title: string, items: any[], mapper: (item: any) => string) {
  const values = (items || []).map(mapper).filter(Boolean);
  if (!values.length) return "";
  return `${title}: ${values.join("；")}`;
}

function compressGroupMemory(memory: any) {
  const next = { ...(memory || {}) };
  const summaryParts: string[] = [];
  const compressList = (key: string, keep = 8, title = key, mapper = (item: any) => JSON.stringify(item)) => {
    const items = Array.isArray(next[key]) ? next[key] : [];
    if (items.length <= keep) return;
    const oldItems = items.slice(0, Math.max(0, items.length - keep));
    next[key] = items.slice(-keep);
    const summary = summarizeMemoryItems(title, oldItems, mapper);
    if (summary) summaryParts.push(summary);
  };

  compressList("decisions", 8, "历史决策", (item: any) => `${item.decision}${item.reason ? `(${item.reason})` : ""}`);
  compressList("completed", 10, "历史完成", (item: any) => `${item.project || "unknown"}:${item.summary || ""}`);
  compressList("blocked", 8, "历史阻塞", (item: any) => `${item.project || "unknown"}:${item.reason || ""}`);
  compressList("workerLedger", 18, "历史 Worker 通知", (item: any) => `${item.project || "unknown"}:${item.status || ""}:${item.summary || ""}`);
  if (!next.agentMemories || !Object.keys(next.agentMemories || {}).length) {
    next.agentMemories = normalizeAgentMemories({}, next.workerLedger || []);
  }
  compressList("openQuestions", 6, "历史问题", (item: any) => String(item.question || item));
  compressList("nextActions", 6, "历史下一步", (item: any) => String(item.action || item));

  const mergedSummary = [next.summary || "", ...summaryParts].filter(Boolean).join(" | ");
  next.summary = compactMemoryText(mergedSummary, 1800);
  return next;
}

export function buildGroupMemoryContext(memory: any) {
  if (!memory || (!memory.goal && !memory.decisions?.length && !memory.completed?.length && !memory.blocked?.length && !memory.workerLedger?.length && !Object.keys(memory.agentMemories || {}).length && !memory.openQuestions?.length && !memory.nextActions?.length)) {
    return "";
  }
  const lines = [
    "群聊协作记忆（主 Agent 必须参考，避免重复派发和遗忘上下文）：",
    `- 原始/当前目标：${memory.goal || "未记录"}`,
    `- 当前阶段：${memory.currentPhase || "idle"}`,
  ];
  if (memory.summary) lines.push(`- 压缩摘要：${compactMemoryText(memory.summary, 900)}`);
  if (memory.messageDigest) lines.push(`- 群聊旧消息压缩：${compactMemoryText(memory.messageDigest, 900)}`);
  if (memory.compactBoundary) {
    const boundary = memory.compactBoundary;
    const budget = boundary.context_budget || {};
    lines.push(`- 群聊压缩边界：${boundary.summarizedFromMessageId || ""} -> ${boundary.summarizedThroughMessageId || ""}；保留 ${boundary.preservedMessageIds?.length || 0} 条锚点；压缩前 ${boundary.preCompactTokenCount || 0} tokens，压缩后 ${boundary.postCompactTokenCount || 0} tokens，压力 ${budget.pressure ?? 0}%。`);
  }
  if (memory.messageCompression?.compressedMessages) lines.push(`- 压缩状态：共 ${memory.messageCompression.totalMessages || 0} 条消息，旧消息压缩 ${memory.messageCompression.compressedMessages || 0} 条，近期原文 ${memory.messageCompression.recentLimit || 0} 条。`);
  const addList = (title: string, items: any[], mapper: (item: any) => string) => {
    if (!items?.length) return;
    lines.push(`- ${title}：`);
    for (const item of items.slice(-6)) lines.push(`  - ${mapper(item)}`);
  };
  addList("关键决策", memory.decisions || [], (item: any) => `${item.decision}${item.reason ? `（${item.reason}）` : ""}`);
  addList("已完成", memory.completed || [], (item: any) => `${item.project || "unknown"}：${item.summary || ""}`);
  addList("阻塞/未完成", memory.blocked || [], (item: any) => `${item.project || "unknown"}：${item.reason || ""}`);
  addList("Worker scratchpad", memory.workerLedger || [], (item: any) => `${item.project || "unknown"} [${item.status || "unknown"}]：${item.summary || ""}${item.verification?.length ? `；验证：${item.verification.join("、")}` : ""}`);
  addList("开放问题", memory.openQuestions || [], (item: any) => String(item.question || item));
  addList("下一步", memory.nextActions || [], (item: any) => String(item.action || item));
  return lines.join("\n");
}

function normalizeAgentMemoryProject(project: string) {
  return String(project || "").trim() || "unknown";
}

function formatAgentMemoryReceipt(item: any) {
  return [
    `[${item.status || item.receiptStatus || "unknown"}]`,
    item.summary || "无摘要",
    item.filesChanged?.length ? `文件：${item.filesChanged.slice(0, 6).join("、")}` : "",
    item.verification?.length ? `验证：${item.verification.slice(0, 4).join("、")}` : "",
    item.blockers?.length ? `阻塞：${item.blockers.slice(0, 3).join("、")}` : "",
    item.needs?.length ? `需要：${item.needs.slice(0, 3).join("、")}` : "",
  ].filter(Boolean).join("；");
}

function createEmptyAgentMemory(project: string) {
  return {
    project: normalizeAgentMemoryProject(project),
    summary: "",
    recentReceipts: [],
    frequentFiles: [],
    verificationHints: [],
    blockers: [],
    needs: [],
    stats: { totalReceipts: 0, compressedReceipts: 0, recentReceipts: 0, lastUpdatedAt: "" },
  };
}

function upsertAgentMemory(agentMemories: any = {}, item: any = {}) {
  const normalized = normalizeWorkerLedgerItem(item);
  const project = normalizeAgentMemoryProject(normalized.project);
  if (!project || project === "unknown") return agentMemories || {};
  const current = { ...createEmptyAgentMemory(project), ...((agentMemories || {})[project] || {}) };
  const entry = {
    time: normalized.time,
    taskId: normalized.taskId,
    status: normalized.status,
    receiptStatus: normalized.receiptStatus,
    summary: compactMemoryText(normalized.summary, 420),
    filesChanged: normalized.filesChanged || [],
    verification: normalized.verification || [],
    blockers: normalized.blockers || [],
    needs: normalized.needs || [],
  };
  const allReceipts = uniqueByKey([...(current.recentReceipts || []), entry], (x: any) => [x.taskId || "", x.status || "", x.receiptStatus || "", x.summary || ""].join("|"), 20);
  const older = allReceipts.slice(0, Math.max(0, allReceipts.length - 8));
  const recentReceipts = allReceipts.slice(-8);
  const summaryParts = [current.summary || "", ...older.map((x: any) => formatAgentMemoryReceipt(x))].filter(Boolean);
  const files = Array.from(new Set([...(current.frequentFiles || []), ...(entry.filesChanged || [])].filter(Boolean))).slice(-20);
  const verification = Array.from(new Set([...(current.verificationHints || []), ...(entry.verification || [])].filter(Boolean))).slice(-20);
  const blockers = Array.from(new Set([...(current.blockers || []), ...(entry.blockers || [])].filter(Boolean))).slice(-20);
  const needs = Array.from(new Set([...(current.needs || []), ...(entry.needs || [])].filter(Boolean))).slice(-20);
  const totalReceipts = Math.max(Number(current.stats?.totalReceipts || 0) + 1, recentReceipts.length + Number(current.stats?.compressedReceipts || 0));
  return {
    ...(agentMemories || {}),
    [project]: {
      project,
      summary: compactMemoryText(summaryParts.join(" | "), 1800),
      recentReceipts,
      frequentFiles: files,
      verificationHints: verification,
      blockers,
      needs,
      stats: {
        totalReceipts,
        compressedReceipts: Math.max(0, totalReceipts - recentReceipts.length),
        recentReceipts: recentReceipts.length,
        lastUpdatedAt: new Date().toISOString(),
      },
    },
  };
}

function normalizeAgentMemories(agentMemories: any = {}, workerLedger: any[] = []) {
  let next = { ...(agentMemories || {}) };
  for (const item of workerLedger || []) next = upsertAgentMemory(next, item);
  return next;
}

export function buildAgentMemoryPacket(groupId: string, targetProject: string, task = "") {
  const memory = loadGroupMemory(groupId);
  const project = normalizeAgentMemoryProject(targetProject);
  const agentMemory = { ...createEmptyAgentMemory(project), ...((memory.agentMemories || {})[project] || {}) };
  const ownCompleted = (memory.completed || []).filter((item: any) => item.project === project).slice(-4);
  const otherCompleted = (memory.completed || []).filter((item: any) => item.project !== project).slice(-4);
  const ownBlocked = (memory.blocked || []).filter((item: any) => item.project === project).slice(-4);
  const globalBlocked = (memory.blocked || []).filter((item: any) => item.project !== project).slice(-3);
  const relatedLedger = (memory.workerLedger || []).filter((item: any) => item.project !== project).slice(-5);
  const lines = [
    "子 Agent 受控记忆包（平台生成，优先级高于第三方 CLI 自带历史）：",
    `- 目标子 Agent：${project}`,
    `- 群聊目标：${memory.goal || "未记录"}`,
    `- 当前阶段：${memory.currentPhase || "idle"}`,
    "- 记忆边界：只以本包、本轮任务、近期原文窗口和明确前置输出为准；不要假定 Claude Code/Cursor/Codex 等第三方 Agent 内部 session 记得旧上下文。",
    "- 上下文策略：旧消息已由 CCM 平台压缩；如果需要原文，应在回执 needs 中按 message id 请求用户或主 Agent 补充。",
  ];
  if (agentMemory.stats?.totalReceipts) {
    lines.push(`- 子 Agent 记忆统计：总回执 ${agentMemory.stats.totalReceipts}，压缩 ${agentMemory.stats.compressedReceipts || 0}，近期保留 ${agentMemory.stats.recentReceipts || 0}。`);
  }
  if (agentMemory.summary) lines.push(`- 你的长期压缩摘要：${compactMemoryText(agentMemory.summary, 900)}`);
  if (memory.summary) lines.push(`- 群聊全局压缩摘要：${compactMemoryText(memory.summary, 500)}`);
  if (memory.messageDigest) lines.push(`- 群聊旧消息压缩：${compactMemoryText(memory.messageDigest, 500)}`);
  if (task) lines.push(`- 你本次任务：${compactMemoryText(task, 900)}`);
  const addList = (title: string, items: any[], mapper: (item: any) => string, limit = 6) => {
    const list = (items || []).filter(Boolean).slice(-limit);
    if (!list.length) return;
    lines.push(`- ${title}：`);
    for (const item of list) lines.push(`  - ${mapper(item)}`);
  };
  addList("你的近期结构化回执", agentMemory.recentReceipts || [], (item: any) => formatAgentMemoryReceipt(item), 8);
  addList("你常涉及的文件", agentMemory.frequentFiles || [], (item: any) => String(item), 10);
  addList("你已有验证线索", agentMemory.verificationHints || [], (item: any) => String(item), 8);
  addList("你仍需处理的阻塞", [...(agentMemory.blockers || []), ...(agentMemory.needs || [])], (item: any) => String(item), 8);
  addList("你之前的完成记录", ownCompleted, (item: any) => `${item.summary || ""}${item.verification?.length ? `；验证：${item.verification.join("、")}` : ""}`, 4);
  addList("其他 Agent 已完成", otherCompleted, (item: any) => `${item.project || "unknown"}：${item.summary || ""}`, 4);
  addList("其他 Agent 近期回执", relatedLedger, (item: any) => `${item.project || "unknown"} [${item.status || "unknown"}]：${item.summary || ""}${item.blockers?.length ? `；阻塞：${item.blockers.join("、")}` : ""}`, 5);
  addList("与你相关的阻塞", ownBlocked, (item: any) => `${item.reason || ""}${item.needs?.length ? `；需要：${item.needs.join("、")}` : ""}`, 4);
  addList("全局阻塞", globalBlocked, (item: any) => `${item.project || "unknown"}：${item.reason || ""}`, 3);
  addList("开放问题", memory.openQuestions || [], (item: any) => String(item.question || item), 4);
  addList("下一步", memory.nextActions || [], (item: any) => String(item.action || item), 4);
  lines.push("- 回执要求：回复末尾必须包含 CCM_AGENT_RECEIPT；不能编造未执行的验证或文件修改；必须用 memoryUsed / memoryIgnored 声明本轮是否使用了本记忆包、项目记忆、历史结论、共享文档或知识库。");
  return lines.join("\n");
}

function getGroupMessageMemoryWho(message: any) {
  if (message?.role === "user") return `[用户 -> ${message.target || "all"}]`;
  if (message?.role === "thinking") return "[系统思考]";
  return `[${message?.agent || "Agent"}]`;
}

function buildGroupMessageMemoryLine(message: any, max = 260) {
  const time = message?.timestamp ? String(message.timestamp).slice(0, 19).replace("T", " ") : "unknown-time";
  const id = message?.id ? `#${message.id}` : "#local";
  const who = getGroupMessageMemoryWho(message);
  const content = compactMemoryText(message?.content || message?.delivery_summary?.headline || "", max);
  const extras: string[] = [];
  if (Array.isArray(message?.assignments) && message.assignments.length) {
    extras.push(`派发:${message.assignments.slice(0, 4).map((item: any) => `${item.project || item.target || "unknown"}:${item.status || "pending"}`).join(",")}`);
  }
  if (message?.fileChanges?.count) extras.push(`文件变更:${message.fileChanges.count}`);
  if (message?.delivery_summary?.headline) extras.push(`交付:${compactMemoryText(message.delivery_summary.headline, 120)}`);
  return `- ${time} ${id} ${who} ${content}${extras.length ? `（${extras.join("；")}）` : ""}`;
}

function buildCompressedGroupMessageDigest(messages: any[], limit = 30) {
  const source = (messages || []).filter((message: any) => !String(message?.content || "").startsWith("📤"));
  if (!source.length) return "";
  const omitted = Math.max(0, source.length - limit);
  const lines = source.slice(-limit).map((message: any) => buildGroupMessageMemoryLine(message, 220));
  if (omitted > 0) lines.unshift(`- 更早 ${omitted} 条旧消息已进一步折叠，仅保留在原始群聊记录中，可按 message id 回溯。`);
  return lines.join("\n");
}

export function buildGroupContextPacket(groupId: string, options: any = {}) {
  const recentLimit = Math.max(4, Number(options.recentLimit || options.recent_limit || 12));
  const olderLimit = Math.max(6, Number(options.olderLimit || options.older_limit || 30));
  const fullCount = Math.max(3, Number(options.fullCount || options.full_count || 5));
  const allMessages = getGroupMessages(groupId).filter((message: any) => !String(message?.content || "").startsWith("📤"));
  const recentMessages = allMessages.slice(-recentLimit);
  const olderMessages = allMessages.slice(0, Math.max(0, allMessages.length - recentLimit));
  const digest = buildCompressedGroupMessageDigest(olderMessages, olderLimit);
  const compression = {
    enabled: true,
    recentLimit,
    olderLimit,
    totalMessages: allMessages.length,
    compressedMessages: olderMessages.length,
    recentMessages: recentMessages.length,
    lastCompressedAt: new Date().toISOString(),
  };
  const memory = saveGroupMemory(groupId, {
    ...loadGroupMemory(groupId),
    messageDigest: digest,
    messageCompression: compression,
  });
  const sections = [buildGroupMemoryContext(memory)];
  if (digest) {
    sections.push([
      "群聊旧消息压缩摘要（旧消息不直接塞满上下文；需要回溯时按 message id 查原始记录）：",
      digest,
    ].join("\n"));
  }
  if (recentMessages.length) {
    sections.push([
      `群聊近期原文窗口（最近 ${recentMessages.length}/${allMessages.length} 条，最后 ${Math.min(fullCount, recentMessages.length)} 条保留全文）：`,
      buildBoundedRecentGroupContext(recentMessages, fullCount),
    ].join("\n"));
  }
  return sections.filter(Boolean).join("\n\n");
}

function normalizeMemoryStringArray(value: any) {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => String(item || "").trim()).filter(Boolean);
}
function normalizeWorkerLedgerItem(item: any = {}) {
  return {
    time: item.time || new Date().toISOString(),
    taskId: String(item.taskId || item.task_id || "").trim(),
    project: String(item.project || item.agent || "").trim(),
    status: String(item.status || "").trim(),
    receiptStatus: String(item.receiptStatus || item.receipt_status || "").trim(),
    summary: compactMemoryText(item.summary || "", 320),
    filesChanged: Array.isArray(item.filesChanged || item.files_changed) ? (item.filesChanged || item.files_changed).slice(0, 12) : [],
    verification: Array.isArray(item.verification) ? item.verification.slice(0, 12) : [],
    blockers: Array.isArray(item.blockers) ? item.blockers.slice(0, 12) : [],
    needs: Array.isArray(item.needs) ? item.needs.slice(0, 12) : [],
    memoryUsed: normalizeMemoryStringArray(item.memoryUsed || item.memory_used).slice(0, 12),
    memoryIgnored: normalizeMemoryStringArray(item.memoryIgnored || item.memory_ignored).slice(0, 12),
  };
}

export function findLatestWorkerLedger(memory: any, project: string) {
  const target = String(project || "").trim();
  if (!target) return null;
  return [...(memory?.workerLedger || [])].reverse().find((item: any) => item.project === target) || null;
}

export function appendWorkerLedger(memory: any, item: any) {
  const normalized = normalizeWorkerLedgerItem(item);
  if (!normalized.project && !normalized.summary) return memory;
  return {
    ...(memory || {}),
    workerLedger: uniqueByKey([...(memory?.workerLedger || []), normalized], (x: any) => [
      x.taskId || "",
      x.project || "",
      x.status || "",
      x.summary || "",
    ].join("|"), 40),
  };
}

export function updateGroupMemory(groupId: string, patch: any = {}) {
  const memory = loadGroupMemory(groupId);
  const next = { ...memory };
  if (patch.goal && !next.goal) next.goal = compactMemoryText(patch.goal, 500);
  if (patch.currentPhase) next.currentPhase = patch.currentPhase;
  if (patch.decision) {
    next.decisions = uniqueByKey([...(next.decisions || []), {
      time: new Date().toISOString(),
      decision: compactMemoryText(patch.decision, 260),
      reason: compactMemoryText(patch.reason || "", 220),
    }], (item: any) => `${item.decision}|${item.reason}`, 20);
  }
  if (patch.completed) {
    const item = patch.completed;
    next.completed = uniqueByKey([...(next.completed || []), {
      time: new Date().toISOString(),
      project: item.project || "",
      summary: compactMemoryText(item.summary || "", 260),
      filesChanged: item.filesChanged || [],
      verification: item.verification || [],
    }], (x: any) => `${x.project}|${x.summary}`, 30);
    next.blocked = (next.blocked || []).filter((x: any) => x.project !== item.project);
  }
  if (patch.blocked) {
    const item = patch.blocked;
    next.blocked = uniqueByKey([...(next.blocked || []), {
      time: new Date().toISOString(),
      project: item.project || "",
      reason: compactMemoryText(item.reason || "", 260),
      needs: item.needs || [],
    }], (x: any) => `${x.project}|${x.reason}`, 30);
  }
  if (patch.messageDigest) {
    next.messageDigest = compactMemoryText([next.messageDigest || "", patch.messageDigest].filter(Boolean).join(" | "), 2400);
  }
  if (patch.messageCompression) {
    next.messageCompression = { ...(next.messageCompression || {}), ...(patch.messageCompression || {}) };
  }
  if (patch.workerLedger || patch.workerNotification) {
    const item = patch.workerLedger || patch.workerNotification;
    const merged = appendWorkerLedger(next, item);
    next.workerLedger = merged.workerLedger || [];
    next.agentMemories = upsertAgentMemory(next.agentMemories || {}, item);
  }
  if (patch.openQuestion) {
    next.openQuestions = uniqueByKey([...(next.openQuestions || []), {
      time: new Date().toISOString(),
      question: compactMemoryText(patch.openQuestion, 260),
    }], (x: any) => x.question, 20);
  }
  if (patch.nextAction) {
    next.nextActions = uniqueByKey([...(next.nextActions || []), {
      time: new Date().toISOString(),
      action: compactMemoryText(patch.nextAction, 260),
    }], (x: any) => x.action, 20);
  }
  return saveGroupMemory(groupId, next);
}


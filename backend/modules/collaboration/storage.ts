import * as fs from "fs";
import * as path from "path";
import {
  GROUP_MESSAGES_DIR,
  GROUPS_FILE,
} from "../../core/utils";
import { loadTasks } from "../../core/db";
import { appendTraceEvent, ensureTraceId } from "../../system/reliability-ledger";
import { normalizeGroupOrchestrator } from "./group-orchestrator";

// === 群聊管理 ===
export function loadGroups() {
  if (!fs.existsSync(GROUPS_FILE)) return [];
  try {
    const groups = JSON.parse(fs.readFileSync(GROUPS_FILE, "utf-8"));
    if (!Array.isArray(groups)) return [];
    const before = JSON.stringify(groups);
    const normalized = groups.map(normalizeGroupOrchestrator);
    if (JSON.stringify(normalized) !== before) {
      saveGroups(normalized);
    }
    return normalized;
  } catch {
    try {
      const recovered = JSON.parse(fs.readFileSync(`${GROUPS_FILE}.bak`, "utf-8"));
      if (Array.isArray(recovered)) return recovered.map(normalizeGroupOrchestrator);
    } catch {}
    return [];
  }
}

export function saveGroups(groups: any[]) {
  const content = JSON.stringify(groups, null, 2);
  if (fs.existsSync(GROUPS_FILE)) {
    try { if (fs.readFileSync(GROUPS_FILE, "utf-8") === content) return; } catch {}
  }
  const temp = `${GROUPS_FILE}.${process.pid}.${Date.now()}.tmp`;
  if (fs.existsSync(GROUPS_FILE)) {
    try { fs.copyFileSync(GROUPS_FILE, `${GROUPS_FILE}.bak`); } catch {}
  }
  fs.writeFileSync(temp, content, "utf-8");
  fs.renameSync(temp, GROUPS_FILE);
}

const groupMessagesCache = new Map<string, { mtimeMs: number; size: number; messages: any[] }>();

export function getGroupMessages(groupId: string) {
  const file = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  if (!fs.existsSync(file)) {
    groupMessagesCache.delete(groupId);
    return [];
  }
  try {
    const stat = fs.statSync(file);
    const cached = groupMessagesCache.get(groupId);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.messages;
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    const messages = Array.isArray(parsed) ? parsed : [];
    groupMessagesCache.set(groupId, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
    return messages;
  } catch {
    try {
      const backup = `${file}.bak`;
      const parsed = JSON.parse(fs.readFileSync(backup, "utf-8"));
      const messages = Array.isArray(parsed) ? parsed : [];
      const stat = fs.statSync(file);
      groupMessagesCache.set(groupId, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
      return messages;
    } catch {
      groupMessagesCache.delete(groupId);
      return [];
    }
  }
}

export function appendGroupMessage(groupId: string, msg: any) {
  const messages = getGroupMessages(groupId);
  const messageId = String(msg?.id || "").trim();
  const existing = messageId ? messages.find((item: any) => String(item?.id || "") === messageId) : null;
  if (existing) return existing;
  const taskTraceId = msg?.task_id ? loadTasks().find((task: any) => task.id === msg.task_id)?.trace_id : "";
  const traceId = ensureTraceId(msg?.trace_id || msg?.traceId || taskTraceId, "message");
  const next = { ...msg, trace_id: traceId };
  messages.push(next);
  saveGroupMessages(groupId, messages);
  appendTraceEvent(traceId, { id: `group-message:${groupId}:${messageId || messages.length}`, type: "group.message_persisted", status: "ok", group_id: groupId, task_id: msg?.task_id || "", agent: msg?.agent || msg?.role || "", message: String(msg?.content || "").slice(0, 500), data: { message_id: messageId } });
  return next;
}

export function saveGroupMessages(groupId: string, messages: any[]) {
  if (!fs.existsSync(GROUP_MESSAGES_DIR)) {
    fs.mkdirSync(GROUP_MESSAGES_DIR, { recursive: true });
  }
  const file = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, `${file}.bak`); } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(messages, null, 2), "utf-8");
  fs.renameSync(temp, file);
  const stat = fs.statSync(file);
  groupMessagesCache.set(groupId, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
}

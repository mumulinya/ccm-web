import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "./utils";
import { applyMemoryControls, recordMemoryMetric, recordMemoryOperation } from "./modules/memory-control-center";

export type GlobalMemoryItemType = "user" | "feedback" | "authorization" | "decisions" | "missions" | "unresolved" | "references";

export interface GlobalMemoryItem {
  id: string;
  type: GlobalMemoryItemType;
  text: string;
  why?: string;
  howToApply?: string;
  importance: number;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  source: {
    sessionId?: string;
    messageIds?: string[];
    missionId?: string;
    traceId?: string;
    source?: string;
    timestamp?: string;
  };
  expiresAt?: string;
}

const MEMORY_DIR = process.env.CCM_GLOBAL_AGENT_MEMORY_DIR || path.join(CCM_DIR, "global-agent-memory");
export const GLOBAL_AGENT_MEMORY_FILE = path.join(MEMORY_DIR, "memory.json");
const TRANSCRIPT_DIR = path.join(MEMORY_DIR, "transcripts");
const KEY_FILE = path.join(MEMORY_DIR, "transcript.key");
const POLICY_FILE = path.join(MEMORY_DIR, "policy.json");
const MEMORY_ITEM_KEYS: GlobalMemoryItemType[] = ["user", "feedback", "authorization", "decisions", "missions", "unresolved", "references"];
const COMPACT_MESSAGE_THRESHOLD = 60;
const COMPACT_TOKEN_THRESHOLD = 50_000;
const RECENT_MESSAGES_TO_KEEP = 24;
const MAX_COMPACTION_FAILURES = 3;
const MAX_ITEMS_PER_TYPE = 300;

function now() { return new Date().toISOString(); }
function ensureDirs() { fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true }); }
function sha(value: any, length = 32) { return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length); }
function cleanId(value: any) { return String(value || "default").replace(/[^a-zA-Z0-9._@-]+/g, "_").slice(0, 110); }
function compact(value: any, max = 2000) { const text = String(value || "").trim(); return text.length > max ? `${text.slice(0, Math.ceil(max * .64))}\n…[中间内容已压缩，原文可从加密转录恢复]…\n${text.slice(-Math.floor(max * .3))}` : text; }
function estimateTokens(value: any) { return Math.ceil(String(value || "").length / 3.5); }

function writeAtomic(file: string, value: any) {
  ensureDirs();
  const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
  if (fs.existsSync(file)) { try { fs.copyFileSync(file, `${file}.bak`); } catch {} }
  fs.writeFileSync(temp, typeof value === "string" ? value : JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

function readJson(file: string, fallback: any) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return fallback; }
}

function getEncryptionKey() {
  ensureDirs();
  for (const file of [KEY_FILE, `${KEY_FILE}.bak`]) {
    if (!fs.existsSync(file)) continue;
    const key = Buffer.from(fs.readFileSync(file, "utf-8").trim(), "base64");
    if (key.length === 32) {
      if (file.endsWith(".bak")) fs.copyFileSync(file, KEY_FILE);
      return key;
    }
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(KEY_FILE, key.toString("base64"), { encoding: "utf-8", mode: 0o600 });
  fs.copyFileSync(KEY_FILE, `${KEY_FILE}.bak`);
  return key;
}

function encryptJson(value: any) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf-8"), cipher.final()]);
  return { version: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: encrypted.toString("base64") };
}

function decryptJson(value: any) {
  if (!value?.iv || !value?.tag || !value?.data) throw new Error("加密转录格式无效");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, "base64")), decipher.final()]).toString("utf-8"));
}

function transcriptFile(sessionId: string) { return path.join(TRANSCRIPT_DIR, `${cleanId(sessionId)}-${sha(String(sessionId || "default"), 12)}.enc.json`); }

function normalizeMessage(message: any, sessionId: string, source = "global-agent") {
  const role = message?.role === "assistant" ? "assistant" : "user";
  const content = String(message?.content || "").slice(0, 100_000);
  const timestamp = message?.timestamp || now();
  const id = String(message?.id || message?.messageId || `gam_${sha([sessionId, role, content, timestamp], 24)}`);
  return { id, role, content, timestamp, source: message?.source || source, traceId: message?.trace_id || message?.traceId || "", missionId: message?.mission_id || message?.missionId || "" };
}

export function loadGlobalAgentTranscript(sessionId: string) {
  const file = transcriptFile(sessionId);
  for (const candidate of [file, `${file}.bak`]) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const transcript = decryptJson(readJson(candidate, null));
      return { version: 1, sessionId, source: transcript.source || "global-agent", messages: Array.isArray(transcript.messages) ? transcript.messages : [], updatedAt: transcript.updatedAt || "", storageRecovery: candidate.endsWith(".bak") ? { recoveredFromBackup: true, recoveredAt: now() } : null };
    } catch {}
  }
  return { version: 1, sessionId, source: "global-agent", messages: [], updatedAt: "", storageRecovery: null };
}

function saveTranscript(transcript: any) {
  const file = transcriptFile(transcript.sessionId);
  writeAtomic(file, encryptJson(transcript));
  return file;
}

function emptyMemory() {
  return {
    version: 1,
    scope: "global",
    id: "global-agent",
    user: [], feedback: [], authorization: [], decisions: [], missions: [], unresolved: [], references: [],
    sessions: [],
    archives: [],
    compaction: { boundaryVersion: 1, totalCompactions: 0, consecutiveFailures: 0, health: "healthy", boundaries: [] },
    privacy: { rejectedCandidates: 0, encryptedTranscripts: true, lastScanAt: "" },
    integrity: { pass: true, corruptedArchives: [] },
    updatedAt: "",
  };
}

export function loadGlobalAgentMemory(options: { recover?: boolean } = {}) {
  const candidates = [GLOBAL_AGENT_MEMORY_FILE, `${GLOBAL_AGENT_MEMORY_FILE}.bak`];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const memory = { ...emptyMemory(), ...JSON.parse(fs.readFileSync(file, "utf-8")) };
      for (const key of MEMORY_ITEM_KEYS) memory[key] = Array.isArray(memory[key]) ? memory[key] : [];
      memory.sessions = Array.isArray(memory.sessions) ? memory.sessions : [];
      memory.archives = Array.isArray(memory.archives) ? memory.archives : [];
      const corrupted = memory.archives.filter((archive: any) => archive.checksum !== sha(archive.records || [], 40) || archive.summaryChecksum !== sha(archive.summary || {}, 40)).map((archive: any) => archive.id);
      memory.integrity = { pass: corrupted.length === 0, corruptedArchives: corrupted };
      if (file.endsWith(".bak")) memory.storageRecovery = { recoveredFromBackup: true, recoveredAt: now() };
      if (options.recover !== false && file.endsWith(".bak")) writeAtomic(GLOBAL_AGENT_MEMORY_FILE, memory);
      return memory;
    } catch {}
  }
  return emptyMemory();
}

function saveMemory(memory: any) {
  memory.updatedAt = now();
  writeAtomic(GLOBAL_AGENT_MEMORY_FILE, memory);
  return memory;
}

function loadPolicy() {
  return { version: 1, disabled: false, blockedPatterns: [], ...(readJson(POLICY_FILE, {})) };
}

export function setGlobalAgentMemoryPolicy(input: any) {
  const policy = loadPolicy();
  if (input.disabled !== undefined) policy.disabled = input.disabled === true;
  if (Array.isArray(input.blockedPatterns)) policy.blockedPatterns = input.blockedPatterns.map((value: any) => String(value).slice(0, 200)).filter(Boolean).slice(0, 50);
  policy.updatedAt = now();
  writeAtomic(POLICY_FILE, policy);
  recordMemoryOperation({ action: "policy_update", scope: "global", scopeId: "global-agent", actor: input.actor || "local-user", reason: input.reason || "", disabled: policy.disabled, blockedPatternCount: policy.blockedPatterns.length });
  return policy;
}

function containsSensitiveData(text: string) {
  const patterns = [
    /\b(?:sk|rk|pk)-[a-z0-9_-]{12,}\b/i,
    /\bBearer\s+[a-z0-9._~+\/-]{12,}/i,
    /(?:api[_-]?key|app[_-]?secret|client[_-]?secret|password|passwd|token)\s*[:=]\s*["']?[^\s"']{6,}/i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  ];
  return patterns.some(pattern => pattern.test(text));
}

function shouldRejectCandidate(text: string) {
  const policy = loadPolicy();
  if (policy.disabled || containsSensitiveData(text)) return true;
  if (policy.blockedPatterns.some((pattern: string) => { try { return new RegExp(pattern, "i").test(text); } catch { return text.toLowerCase().includes(pattern.toLowerCase()); } })) return true;
  const value = text.trim();
  if (value.length < 8 || value.length > 5000) return true;
  if (/^[\s\p{P}\p{S}]*$/u.test(value)) return true;
  return false;
}

function candidate(type: GlobalMemoryItemType, text: string, message: any, sessionId: string, options: any = {}): GlobalMemoryItem | null {
  const normalized = compact(text.replace(/\s+/g, " "), 1800);
  if (shouldRejectCandidate(normalized)) return null;
  const createdAt = message.timestamp || now();
  return {
    id: `gmi_${sha([type, normalized.toLowerCase()], 24)}`,
    type,
    text: normalized,
    why: compact(options.why || "", 800),
    howToApply: compact(options.howToApply || "", 800),
    importance: Math.max(1, Math.min(100, Number(options.importance || 60))),
    confidence: Math.max(0, Math.min(1, Number(options.confidence ?? .82))),
    createdAt,
    updatedAt: createdAt,
    source: { sessionId, messageIds: [message.id], source: message.source || "global-agent", timestamp: createdAt, traceId: message.traceId || "", missionId: message.missionId || "" },
    expiresAt: options.expiresAt,
  };
}

export function extractGlobalMemoryCandidates(messages: any[], sessionId: string) {
  const result: GlobalMemoryItem[] = [];
  let rejected = 0;
  const push = (item: GlobalMemoryItem | null) => item ? result.push(item) : rejected += 1;
  for (const raw of messages) {
    const message = normalizeMessage(raw, sessionId, raw.source || "global-agent");
    const text = message.content.trim();
    if (!text || containsSensitiveData(text)) { if (text) rejected += 1; continue; }
    if (message.role === "user") {
      const durableAuthorization = /(?:以后|默认|每次|始终|一律|长期|没有明确授权)|(?:全局\s*Agent).{0,50}(?:不要|不允许|必须确认|先确认|可以直接|不用确认)/i.test(text)
        && /(?:没有明确授权|不要|不允许|必须确认|先确认|可以直接|不用确认).{0,60}(?:操作|修改|删除|派发|执行|项目|任务|写入)/.test(text)
        && !/[?？]/.test(text);
      const isQuestionOrOneShot = /[?？]/.test(text)
        || /(?:这次|本次|当前|现在|临时).{0,24}(?:只|仅|不要|无需|先别)/.test(text)
        || /(?:只|仅)(?:需|需要|要)?(?:说明|回答|分析|查看|检查)|不要执行任何操作/.test(text);
      if (/(?:我是|我负责|我的职责|我主要做|我以后(?:要|会)使用|我熟悉|我不熟悉)/.test(text)) {
        push(candidate("user", text, message, sessionId, { importance: 72, why: "用于跨会话适配用户背景与工作方式", howToApply: "只在与当前问题相关时使用，不推断用户未明确表达的属性" }));
      }
      if (!durableAuthorization && !isQuestionOrOneShot && /(?:以后|默认|每次|总是|不要再|我希望|我更喜欢|我的偏好|就按这种方式)|(?:全局\s*Agent).{0,40}(?:必须|务必|优先|不要)|(?:必须|务必|优先).{0,40}(?:全局\s*Agent|回答方式|操作前|派发前|先确认)/i.test(text)) {
        push(candidate("feedback", text, message, sessionId, { importance: 86, why: "用户给出了可跨会话复用的工作方式或纠正", howToApply: "后续执行前检查是否仍适用；与当前明确指令冲突时以当前指令为准" }));
      }
      if (durableAuthorization) {
        push(candidate("authorization", text, message, sessionId, { importance: 96, confidence: .94, why: "约束全局 Agent 的操作授权边界", howToApply: "任何写操作决策前检查；高风险操作仍须当前确认" }));
      }
      if (/(?:以这个为目标|就按照这个实现|决定|目标是|下一步目标|优先实现)/.test(text)) {
        push(candidate("decisions", text, message, sessionId, { importance: 82, why: "记录跨会话仍可能影响工作的全局目标或决策", howToApply: "先与当前任务和真实系统状态核对，再用于规划" }));
      }
      if (/(?:源码|文档|资料|配置|知识库).{0,30}(?:在|路径|地址)|(?:[A-Za-z]:\\|https?:\/\/)/.test(text)) {
        push(candidate("references", text, message, sessionId, { importance: 68, why: "保存外部资源定位信息", howToApply: "使用前验证路径或资源仍存在" }));
      }
    }
  }
  return { candidates: result, rejected };
}

function upsertItems(memory: any, items: GlobalMemoryItem[]) {
  let created = 0;
  let updated = 0;
  for (const item of items) {
    const list = Array.isArray(memory[item.type]) ? memory[item.type] : [];
    const index = list.findIndex((existing: any) => existing.id === item.id);
    if (index >= 0) {
      const priorMessageIds = new Set(list[index].source?.messageIds || []);
      const hasNewEvidence = (item.source.messageIds || []).some(id => !priorMessageIds.has(id));
      if (hasNewEvidence) updated += 1;
      list[index] = {
        ...list[index],
        updatedAt: item.updatedAt,
        importance: Math.max(Number(list[index].importance || 0), item.importance),
        confidence: Math.max(Number(list[index].confidence || 0), item.confidence),
        source: { ...list[index].source, messageIds: [...new Set([...(list[index].source?.messageIds || []), ...(item.source.messageIds || [])])].slice(-20) },
      };
    } else { list.push(item); created += 1; }
    const controlled = applyMemoryControls("global" as any, "global-agent", { ...memory, [item.type]: list })?.[item.type] || [];
    const pinnedIds = new Set(controlled.filter((entry: any) => entry.memoryControl?.pinned).map((entry: any) => entry.id));
    const pinned = list.filter((entry: any) => pinnedIds.has(entry.id));
    const recent = list.filter((entry: any) => !pinnedIds.has(entry.id)).sort((a: any, b: any) => String(a.updatedAt).localeCompare(String(b.updatedAt))).slice(-Math.max(0, MAX_ITEMS_PER_TYPE - pinned.length));
    memory[item.type] = [...recent, ...pinned].slice(-MAX_ITEMS_PER_TYPE);
  }
  return { created, updated };
}

function buildSegmentSummary(messages: any[], candidates: GlobalMemoryItem[]) {
  const users = messages.filter(item => item.role === "user");
  const assistant = messages.filter(item => item.role === "assistant");
  const errors = messages.filter(item => /(?:错误|失败|异常|阻塞|超时|error|failed|timeout)/i.test(item.content)).slice(-8);
  const paths = [...new Set(messages.flatMap(item => String(item.content || "").match(/(?:[A-Za-z]:\\[^\s"'<>|]+|\/?(?:[\w.-]+\/){1,8}[\w.-]+\.[A-Za-z0-9]{1,8})/g) || []))].slice(-30);
  const missionIds = [...new Set(messages.flatMap(item => [item.missionId, ...(String(item.content || "").match(/\b(?:mission|mq)[-_a-z0-9]{6,}\b/gi) || [])]).filter(Boolean))].slice(-20);
  const byType = (type: GlobalMemoryItemType) => candidates.filter(item => item.type === type).map(item => item.text).slice(-8);
  return {
    primaryRequest: compact(users.at(-1)?.content || "", 1200),
    userRequests: users.slice(-12).map(item => `#${item.id} ${compact(item.content, 700)}`),
    keyOutcomes: assistant.slice(-10).map(item => `#${item.id} ${compact(item.content, 700)}`),
    userAnchors: byType("user"),
    feedback: byType("feedback"),
    authorization: byType("authorization"),
    decisions: byType("decisions"),
    references: byType("references"),
    unresolved: [...byType("unresolved"), ...errors.map(item => compact(item.content, 600))].slice(-12),
    errors: errors.map(item => `#${item.id} ${compact(item.content, 600)}`),
    filesAndResources: paths,
    missionIds,
    latestOutcome: compact(assistant.at(-1)?.content || "", 1200),
    sourceMessageIds: messages.map(item => item.id),
  };
}

export function compactGlobalAgentSession(sessionId: string, options: { force?: boolean; reason?: string } = {}) {
  const transcript = loadGlobalAgentTranscript(sessionId);
  const memory = loadGlobalAgentMemory();
  const session = memory.sessions.find((item: any) => item.sessionId === sessionId) || { sessionId, lastCompactedIndex: -1, recentMessageIds: [] };
  const unsummarized = transcript.messages.slice(Number(session.lastCompactedIndex || -1) + 1);
  const tokenCount = unsummarized.reduce((sum: number, item: any) => sum + estimateTokens(item.content), 0);
  if (!options.force && unsummarized.length < COMPACT_MESSAGE_THRESHOLD && tokenCount < COMPACT_TOKEN_THRESHOLD) {
    return { compacted: false, reason: "below_threshold", tokenCount, messageCount: unsummarized.length, memory };
  }
  if (Number(memory.compaction?.consecutiveFailures || 0) >= MAX_COMPACTION_FAILURES && !options.force) {
    return { compacted: false, reason: "circuit_breaker", tokenCount, messageCount: unsummarized.length, memory };
  }
  try {
    const keepStart = Math.max(Number(session.lastCompactedIndex || -1) + 1, transcript.messages.length - RECENT_MESSAGES_TO_KEEP);
    const segment = transcript.messages.slice(Number(session.lastCompactedIndex || -1) + 1, keepStart);
    if (segment.length === 0) return { compacted: false, reason: "nothing_to_compact", tokenCount, messageCount: unsummarized.length, memory };
    const extracted = extractGlobalMemoryCandidates(segment, sessionId);
    const summary = buildSegmentSummary(segment, extracted.candidates);
    const archive: any = {
      id: `gma_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
      sessionId,
      fromIndex: Number(session.lastCompactedIndex || -1) + 1,
      toIndex: keepStart - 1,
      from: segment[0]?.timestamp || "",
      to: segment.at(-1)?.timestamp || "",
      count: segment.length,
      records: segment.map((item: any) => ({ id: item.id, role: item.role, timestamp: item.timestamp, contentHash: sha(item.content, 40) })),
      summary,
      transcriptFile: path.basename(transcriptFile(sessionId)),
      createdAt: now(),
      reason: options.reason || "auto",
    };
    archive.checksum = sha(archive.records, 40);
    archive.summaryChecksum = sha(archive.summary, 40);
    archive.validation = { pass: archive.summary.sourceMessageIds.length === archive.records.length, deterministicAnchorsPreserved: true };
    upsertItems(memory, extracted.candidates);
    memory.archives = [...memory.archives, archive].slice(-1000);
    const sessionIndex = memory.sessions.findIndex((item: any) => item.sessionId === sessionId);
    const nextSession = {
      ...session,
      sessionId,
      source: transcript.source,
      summary,
      lastCompactedIndex: keepStart - 1,
      lastCompactedMessageId: segment.at(-1)?.id || "",
      recentMessageIds: transcript.messages.slice(keepStart).map((item: any) => item.id),
      preCompactTokenCount: tokenCount,
      postCompactTokenCount: transcript.messages.slice(keepStart).reduce((sum: number, item: any) => sum + estimateTokens(item.content), 0) + estimateTokens(JSON.stringify(summary)),
      lastCompactedAt: now(),
      boundary: { type: "compact_boundary", archiveId: archive.id, preCompactTokenCount: tokenCount, preservedFromIndex: keepStart },
    };
    if (sessionIndex >= 0) memory.sessions[sessionIndex] = nextSession; else memory.sessions.push(nextSession);
    memory.compaction = {
      ...(memory.compaction || {}),
      totalCompactions: Number(memory.compaction?.totalCompactions || 0) + 1,
      consecutiveFailures: 0,
      health: "healthy",
      lastCompactedAt: nextSession.lastCompactedAt,
      preCompactTokenCount: nextSession.preCompactTokenCount,
      postCompactTokenCount: nextSession.postCompactTokenCount,
      boundaries: [...(memory.compaction?.boundaries || []), nextSession.boundary].slice(-100),
    };
    memory.privacy = { ...(memory.privacy || {}), rejectedCandidates: Number(memory.privacy?.rejectedCandidates || 0) + extracted.rejected, encryptedTranscripts: true, lastScanAt: now() };
    saveMemory(memory);
    recordMemoryOperation({ action: "compact", scope: "global", scopeId: "global-agent", sessionId, archiveId: archive.id, reason: options.reason || "auto", beforeTokens: nextSession.preCompactTokenCount, afterTokens: nextSession.postCompactTokenCount, rejectedCandidates: extracted.rejected });
    return { compacted: true, archive, session: nextSession, memory };
  } catch (error: any) {
    memory.compaction = { ...(memory.compaction || {}), consecutiveFailures: Number(memory.compaction?.consecutiveFailures || 0) + 1, health: "degraded", lastError: error?.message || String(error), lastFailureAt: now() };
    saveMemory(memory);
    throw error;
  }
}

export function ingestGlobalAgentConversation(input: { sessionId: string; source?: string; messages: any[]; compact?: boolean }) {
  const sessionId = String(input.sessionId || "default");
  const transcript = loadGlobalAgentTranscript(sessionId);
  transcript.source = input.source || transcript.source || "global-agent";
  const byId = new Map(transcript.messages.map((item: any) => [item.id, item]));
  for (const raw of input.messages || []) {
    const message = normalizeMessage(raw, sessionId, input.source);
    if (!message.content.trim()) continue;
    const duplicate = [...byId.values()].reverse().find((item: any) => item.role === message.role && item.content === message.content && Math.abs(Date.parse(item.timestamp) - Date.parse(message.timestamp)) <= 10_000);
    if (duplicate) continue;
    byId.set(message.id, message);
  }
  transcript.messages = [...byId.values()].sort((a: any, b: any) => String(a.timestamp).localeCompare(String(b.timestamp)));
  transcript.updatedAt = now();
  saveTranscript(transcript);
  const extracted = extractGlobalMemoryCandidates(transcript.messages.slice(-20), sessionId);
  const memory = loadGlobalAgentMemory();
  const upsert = upsertItems(memory, extracted.candidates);
  memory.privacy = { ...(memory.privacy || {}), rejectedCandidates: Number(memory.privacy?.rejectedCandidates || 0) + extracted.rejected, encryptedTranscripts: true, lastScanAt: now() };
  const sessionIndex = memory.sessions.findIndex((item: any) => item.sessionId === sessionId);
  const session = { ...(sessionIndex >= 0 ? memory.sessions[sessionIndex] : {}), sessionId, source: transcript.source, messageCount: transcript.messages.length, transcriptUpdatedAt: transcript.updatedAt };
  if (sessionIndex >= 0) memory.sessions[sessionIndex] = session; else memory.sessions.push(session);
  saveMemory(memory);
  if (upsert.created > 0 || upsert.updated > 0 || extracted.rejected > 0) {
    recordMemoryOperation({ action: "ingest", scope: "global", scopeId: "global-agent", sessionId, source: input.source || "global-agent", created: upsert.created, updated: upsert.updated, rejected: extracted.rejected, itemIds: extracted.candidates.map(item => item.id) });
  }
  const compaction = input.compact === false ? null : compactGlobalAgentSession(sessionId);
  return { transcript: { sessionId, messageCount: transcript.messages.length, updatedAt: transcript.updatedAt }, extracted: extracted.candidates.length, rejected: extracted.rejected, compaction };
}

function queryTerms(text: string) {
  const lower = String(text || "").toLowerCase();
  const words = lower.match(/[a-z0-9_./:@-]{2,}|[\u3400-\u9fff]{2,}/g) || [];
  const chinese = (lower.match(/[\u3400-\u9fff]/g) || []).join("");
  const bigrams = Array.from({ length: Math.max(0, chinese.length - 1) }, (_, index) => chinese.slice(index, index + 2));
  return [...new Set([...words, ...bigrams])].slice(0, 200);
}

function relevanceScore(item: any, query: string) {
  const terms = queryTerms(query);
  const haystack = `${item.text || ""} ${item.why || ""} ${item.howToApply || ""}`.toLowerCase();
  const matchedTerms = terms.filter(term => haystack.includes(term));
  const hits = matchedTerms.length;
  const ageDays = Math.max(0, (Date.now() - Date.parse(item.updatedAt || item.createdAt || now())) / 86_400_000);
  const freshness = Math.max(0, 12 - Math.log2(ageDays + 1) * 2);
  const pinned = item.memoryControl?.pinned ? 100 : 0;
  const type = String(item.type || "");
  const typeBoost = /(?:授权|允许|确认|只读|修改|删除|操作边界)/.test(query) && type === "authorization" ? 35
    : /(?:偏好|习惯|方式|怎么回答)/.test(query) && ["user", "feedback"].includes(type) ? 24
      : /(?:继续|历史任务|完成|进度|遗留|阻塞)/.test(query) && ["missions", "unresolved", "decisions"].includes(type) ? 22
        : /(?:路径|源码|文档|地址|在哪里)/.test(query) && type === "references" ? 22
          : type === "unresolved" && !/(?:继续|遗留|未完成|阻塞|风险|下一步)/.test(query) ? -18 : 0;
  const lengthPenalty = Math.min(28, Math.max(0, String(item.text || "").length - 700) / 60);
  return { score: pinned + hits * 12 + Number(item.importance || 0) * .18 + Number(item.confidence || 0) * 10 + freshness + typeBoost - lengthPenalty, matchedTerms };
}

export function recallGlobalAgentMemory(query: string, options: { sessionId?: string; limit?: number } = {}) {
  if (/(?:忽略|不要使用|别用|不参考).{0,12}(?:记忆|历史)/.test(query)) return { ignored: true, items: [], sessionSummary: null, citations: [] };
  const raw = loadGlobalAgentMemory();
  const memory = applyMemoryControls("global" as any, "global-agent", raw);
  const limit = Math.max(1, Math.min(12, Number(options.limit || 7)));
  const all = MEMORY_ITEM_KEYS.flatMap(key => (memory[key] || []).map((item: any) => ({ ...item, type: key })))
    .filter((item: any) => !item.expiresAt || Date.parse(item.expiresAt) > Date.now())
    .map((item: any) => ({ ...item, ...relevanceScore(item, query) }))
    .filter((item: any) => item.memoryControl?.pinned || (item.matchedTerms.length >= 2 && item.score >= 42))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit);
  const session = options.sessionId ? memory.sessions.find((item: any) => item.sessionId === options.sessionId) : null;
  recordMemoryMetric(all.length > 0 ? "recall_hit" : "recall_miss", { scope: "global", scopeId: "global-agent", sessionId: options.sessionId || "", queryHash: sha(query, 16), selected: all.map((item: any) => item.id) });
  return {
    ignored: false,
    items: all,
    sessionSummary: session?.summary || null,
    boundary: session?.boundary || null,
    citations: all.map((item: any) => ({ memoryId: item.id, type: item.type, ...item.source })),
  };
}

export function buildGlobalAgentMemoryPacket(query: string, options: { sessionId?: string; limit?: number; maxChars?: number } = {}) {
  const recalled = recallGlobalAgentMemory(query, options);
  if (recalled.ignored) return "[全局记忆已按用户要求忽略]";
  const lines = [
    "[全局 Agent 相关记忆｜仅作历史上下文，当前系统状态优先]",
    "使用规则：记忆中提到的文件、函数、任务状态或配置可能已过期；采取行动前必须读取当前真实状态验证。",
  ];
  if (recalled.sessionSummary) lines.push(`当前会话压缩摘要：${compact(JSON.stringify(recalled.sessionSummary), 3000)}`);
  for (const item of recalled.items) {
    const source = item.source || {};
    lines.push(`- [${item.type}｜${item.id}｜${source.timestamp || item.updatedAt || ""}] ${item.text}${item.why ? `\n  Why: ${item.why}` : ""}${item.howToApply ? `\n  How to apply: ${item.howToApply}` : ""}\n  来源: session=${source.sessionId || ""}${source.missionId ? ` mission=${source.missionId}` : ""} messages=${(source.messageIds || []).join(",")}`);
  }
  return compact(lines.join("\n"), Number(options.maxChars || 12_000));
}

export function recordGlobalMissionMemory(input: any) {
  const memory = loadGlobalAgentMemory();
  const report = input.report || {};
  const missionTerminal = ["completed", "cancelled"].includes(String(input.status || ""));
  const text = [
    `全局任务 ${input.missionId || input.mission_id || ""}：${report.summary || input.summary || input.status || ""}`,
    report.completed_content?.length ? `执行目标：${report.completed_content.map((item: any) => item.target || item.task_id).filter(Boolean).join("、")}` : "",
    report.files_modified?.length ? `修改文件：${report.files_modified.join("、")}` : "",
    report.verification_results?.length ? `验证：${report.verification_results.join("；")}` : "",
    report.risks?.length ? `风险：${report.risks.join("；")}` : "",
    report.remaining_items?.length ? `遗留：${report.remaining_items.join("；")}` : "",
  ].filter(Boolean).join("\n");
  const item = candidate(missionTerminal ? "missions" : "unresolved", text, { id: input.messageId || `mission:${input.missionId}`, timestamp: input.at || now(), source: input.source || "global-agent", traceId: input.traceId || "", missionId: input.missionId || "" }, input.sessionId || "global", { importance: input.status === "completed" ? 88 : 82, confidence: .98, why: "结构化全局 mission 交付结果", howToApply: "继续历史任务时先查询 mission 当前状态并验证代码与测试证据" });
  if (missionTerminal && input.missionId) {
    memory.unresolved = (memory.unresolved || []).filter((existing: any) => existing.source?.missionId !== input.missionId);
  }
  const upsert = item ? upsertItems(memory, [item]) : { created: 0, updated: 0 };
  saveMemory(memory);
  if (item) recordMemoryOperation({ action: "mission_writeback", scope: "global", scopeId: "global-agent", missionId: input.missionId || "", status: input.status || "", itemId: item.id, created: upsert.created, updated: upsert.updated });
  return item;
}

export function getGlobalMemoryEvidence(input: { sessionId?: string; messageId?: string; missionId?: string }) {
  const sessionIds = input.sessionId ? [input.sessionId] : loadGlobalAgentMemory().sessions.map((item: any) => item.sessionId);
  const matches: any[] = [];
  for (const sessionId of sessionIds) {
    const transcript = loadGlobalAgentTranscript(sessionId);
    for (const message of transcript.messages) {
      if (input.messageId && message.id !== input.messageId) continue;
      if (input.missionId && message.missionId !== input.missionId) continue;
      matches.push({ sessionId, messageId: message.id, role: message.role, content: message.content, timestamp: message.timestamp, missionId: message.missionId || "", traceId: message.traceId || "" });
      if (matches.length >= 50) return matches;
    }
  }
  return matches;
}

export function rebuildGlobalAgentMemory(reason = "manual_rebuild", actor = "local-user") {
  const previous = loadGlobalAgentMemory();
  const rebuilt = emptyMemory();
  const transcripts = new Map<string, any>();
  for (const file of fs.existsSync(TRANSCRIPT_DIR) ? fs.readdirSync(TRANSCRIPT_DIR).filter(name => name.endsWith(".enc.json")) : []) {
    let transcript: any;
    try { transcript = decryptJson(readJson(path.join(TRANSCRIPT_DIR, file), null)); } catch { continue; }
    const sessionId = String(transcript.sessionId || file.replace(/\.enc\.json$/, ""));
    const existing = transcripts.get(sessionId);
    if (!existing || String(transcript.updatedAt || "") > String(existing.updatedAt || "")) transcripts.set(sessionId, transcript);
  }
  for (const [sessionId, transcript] of transcripts) {
    saveTranscript({ ...transcript, sessionId });
    const extracted = extractGlobalMemoryCandidates(transcript.messages, sessionId);
    upsertItems(rebuilt, extracted.candidates);
    rebuilt.privacy.rejectedCandidates += extracted.rejected;
    rebuilt.sessions.push({ sessionId, source: transcript.source, messageCount: transcript.messages.length, transcriptUpdatedAt: transcript.updatedAt });
  }
  for (const mission of previous.missions || []) upsertItems(rebuilt, [mission]);
  saveMemory(rebuilt);
  for (const session of rebuilt.sessions) compactGlobalAgentSession(session.sessionId, { force: true, reason: "rebuild" });
  recordMemoryOperation({ action: "rebuild", scope: "global", scopeId: "global-agent", actor, reason, transcriptCount: rebuilt.sessions.length });
  return loadGlobalAgentMemory();
}

export function getGlobalAgentMemoryPolicy() { return loadPolicy(); }

export function runGlobalAgentMemorySelfTest() {
  const previousMemory = JSON.parse(JSON.stringify(loadGlobalAgentMemory()));
  const id = `memory-selftest-${process.pid}-${Date.now().toString(36)}`;
  const messages: any[] = [];
  for (let index = 0; index < 90; index += 1) {
    messages.push({ role: "user", timestamp: new Date(Date.now() + index * 1000).toISOString(), content: index === 2 ? "以后全局 Agent 没有明确授权时不要直接操作项目，必须先确认" : index === 4 ? "我的 Claude Code 源码在 D:\\claude-code，以后分析压缩机制先看这里" : index === 6 ? "api_key=super-secret-value-123456" : `第 ${index} 轮普通对话，讨论全局任务连续性和记忆压缩边界` });
    messages.push({ role: "assistant", timestamp: new Date(Date.now() + index * 1000 + 10).toISOString(), content: index === 8 ? "下一步仍需完成全局记忆控制中心的跨会话验收" : `已记录第 ${index} 轮上下文` });
  }
  const result = ingestGlobalAgentConversation({ sessionId: id, source: "self-test", messages, compact: false });
  const compacted = compactGlobalAgentSession(id, { force: true, reason: "self-test" });
  const missionId = `mission-${id}`;
  recordGlobalMissionMemory({ missionId, sessionId: id, status: "waiting_user", report: { summary: "等待人工确认数据库迁移", remaining_items: ["确认迁移窗口"] } });
  const waitingWasStored = loadGlobalAgentMemory().unresolved.some((item: any) => item.source?.missionId === missionId);
  recordGlobalMissionMemory({ missionId, sessionId: id, status: "completed", report: { summary: "支付任务完成", completed_content: [{ target: "backend-api" }, { target: "frontend-app" }], files_modified: ["src/payment.ts"], verification_results: ["npm test"], risks: [], remaining_items: [] } });
  const memory = loadGlobalAgentMemory();
  const packet = buildGlobalAgentMemoryPacket("继续之前全局 Agent 的授权边界和 Claude Code 压缩工作", { sessionId: id });
  const crossSessionPacket = buildGlobalAgentMemoryPacket("在新的会话继续之前的授权边界和 Claude Code 压缩工作", { sessionId: `${id}-new-session` });
  const ignoredPacket = buildGlobalAgentMemoryPacket("这次不要使用历史记忆，只按当前消息回答", { sessionId: `${id}-ignore` });
  const transcriptDisk = fs.readFileSync(transcriptFile(id), "utf-8");
  const archive = compacted.archive;
  const oneShotCandidates = extractGlobalMemoryCandidates([
    { role: "user", content: "这次只回答，不要执行任何操作", timestamp: now() },
    { role: "user", content: "你还记得全局 Agent 的长期授权边界吗？只说明规则，不要执行操作。", timestamp: now() },
  ], `${id}-one-shot`).candidates;
  ingestGlobalAgentConversation({ sessionId: id, source: "self-test", messages: [{ role: "assistant", content: "用于生成加密转录备份", timestamp: new Date(Date.now() + 999_999).toISOString() }], compact: false });
  fs.writeFileSync(transcriptFile(id), "{corrupted", "utf-8");
  const recoveredTranscript = loadGlobalAgentTranscript(id);
  const checks = {
    encryptedTranscriptHidesPlaintext: !transcriptDisk.includes("super-secret-value") && !transcriptDisk.includes("授权时不要"),
    losslessTranscriptRecoverable: loadGlobalAgentTranscript(id).messages.length === messages.length,
    compactBoundaryCreated: compacted.compacted === true && archive?.count > 0 && compacted.session?.boundary?.type === "compact_boundary",
    archiveIntegrityPasses: archive?.checksum === sha(archive?.records || [], 40) && archive?.summaryChecksum === sha(archive?.summary || {}, 40) && memory.integrity.pass === true,
    privacyRejectsSecret: !MEMORY_ITEM_KEYS.flatMap(key => memory[key] || []).some((item: any) => item.text.includes("super-secret-value")),
    oneShotInstructionDoesNotPolluteLongTerm: !oneShotCandidates.some(item => item.type === "authorization" || item.type === "feedback"),
    missionWritebackTracksAndClearsUnresolved: waitingWasStored && !memory.unresolved.some((item: any) => item.source?.missionId === missionId) && memory.missions.some((item: any) => item.source?.missionId === missionId && item.text.includes("backend-api")),
    durableAuthorizationRemembered: packet.includes("没有明确授权") && packet.includes("D:\\claude-code"),
    crossSessionRecallWorks: crossSessionPacket.includes("没有明确授权") && crossSessionPacket.includes("D:\\claude-code"),
    explicitIgnoreMemoryWorks: ignoredPacket.includes("已按用户要求忽略"),
    evidenceTraceable: archive?.summary?.sourceMessageIds?.length === archive?.count,
    recentWindowPreserved: compacted.session?.recentMessageIds?.length === RECENT_MESSAGES_TO_KEEP,
    corruptedTranscriptRecoversFromBackup: recoveredTranscript.storageRecovery?.recoveredFromBackup === true && recoveredTranscript.messages.length === messages.length,
  };
  try {
    fs.rmSync(transcriptFile(id), { force: true });
    fs.rmSync(`${transcriptFile(id)}.bak`, { force: true });
    saveMemory(previousMemory);
  } catch {}
  return { pass: Object.values(checks).every(Boolean), checks, packetPreview: packet.slice(0, 1200), ingest: { extracted: result.extracted, rejected: result.rejected } };
}

export function runGlobalAgentMemoryStressSelfTest() {
  const previousMemory = JSON.parse(JSON.stringify(loadGlobalAgentMemory()));
  const id = `memory-stress-${process.pid}-${Date.now().toString(36)}`;
  let totalMessages = 0;
  try {
    for (let round = 0; round < 10; round += 1) {
      const batch: any[] = [];
      for (let index = 0; index < 36; index += 1) {
        const content = round === 0 && index === 0
          ? "以后所有全局开发任务必须等测试和合并门禁都通过后才能报告完成"
          : `压力轮次 ${round} 消息 ${index}，跟踪跨项目目标、失败恢复、验证证据和下一步`;
        batch.push({ role: index % 2 ? "assistant" : "user", content, timestamp: new Date(Date.now() + round * 100_000 + index * 1000).toISOString() });
      }
      totalMessages += batch.length;
      ingestGlobalAgentConversation({ sessionId: id, source: "self-test", messages: batch, compact: false });
      compactGlobalAgentSession(id, { force: true, reason: `stress-${round}` });
    }
    const memory = loadGlobalAgentMemory();
    const session = memory.sessions.find((item: any) => item.sessionId === id);
    const archives = memory.archives.filter((item: any) => item.sessionId === id);
    const transcript = loadGlobalAgentTranscript(id);
    const packet = buildGlobalAgentMemoryPacket("继续全局开发任务，什么时候才能报告完成", { sessionId: `${id}-other` });
    const boundaries = memory.compaction?.boundaries?.filter((item: any) => archives.some((archive: any) => archive.id === item.archiveId)) || [];
    const checks = {
      repeatedCompactionCreatesBoundedArchives: archives.length >= 8 && archives.length <= 10,
      boundariesMonotonicallyAdvance: boundaries.every((item: any, index: number) => index === 0 || Number(item.preservedFromIndex) > Number(boundaries[index - 1].preservedFromIndex)),
      rawTranscriptNeverLosesMessages: transcript.messages.length === totalMessages,
      archiveChecksumsRemainValid: archives.every((archive: any) => archive.checksum === sha(archive.records || [], 40) && archive.summaryChecksum === sha(archive.summary || {}, 40)),
      persistentRequirementSurvivesDrift: packet.includes("测试和合并门禁") && packet.includes("报告完成"),
      recentWindowRemainsBounded: session?.recentMessageIds?.length === RECENT_MESSAGES_TO_KEEP,
      circuitBreakerHealthy: Number(memory.compaction?.consecutiveFailures || 0) === 0,
    };
    return { pass: Object.values(checks).every(Boolean), checks, archives: archives.length, transcriptMessages: transcript.messages.length };
  } finally {
    try {
      fs.rmSync(transcriptFile(id), { force: true });
      fs.rmSync(`${transcriptFile(id)}.bak`, { force: true });
      saveMemory(previousMemory);
    } catch {}
  }
}

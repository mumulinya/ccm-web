// 记忆准入与召回重排的模型判定通道。
//
// 记忆系统的语义内核原本全是中英文正则：判断「是否持久」「是否非显然」
// 「是否复发失败」靠关键词表，召回打分靠同义词替换 + TF-IDF。换个说法或换个
// 语种就漏，而且规则只能越堆越多。
//
// 按项目约定（健康路径用模型决策与工具，本地规则限于写授权/幂等/schema 校验
// 等），这里把判定交给模型，本地只保留：schema 校验、幂等缓存、失败降级。
// 模型不可用时回退到原有启发式，并在结果里显式标注走的是降级路径——
// 降级必须可见，不能静默。

import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";

export const MEMORY_MODEL_JUDGMENT_VERSION = 1;

export const MEMORY_MODEL_JUDGMENT_CACHE_DIR = path.join(CCM_DIR, "typed-memory-model-judgments");

export const MEMORY_MODEL_JUDGMENT_MAX_OUTPUT_TOKENS = 4_000;

/** 每次最多送几条给模型判定，控制 token 成本。 */
export const MEMORY_MODEL_JUDGMENT_MAX_ITEMS = Math.max(
  1,
  Number(process.env.CCM_MEMORY_MODEL_JUDGMENT_MAX_ITEMS || 12)
);

export const MEMORY_MODEL_JUDGMENT_CACHE_MAX_ENTRIES = 500;

function now() { return new Date().toISOString(); }

function checksum(value: any, length = 24) {
  return require("crypto").createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex").slice(0, length);
}

function safeSegment(value: any, fallback = "default") {
  const text = String(value || "").trim().replace(/[^a-zA-Z0-9._@-]+/g, "-").slice(0, 160);
  return text || fallback;
}

function compactText(value: any, max = 700) {
  const text = String(value || "").replace(/\r/g, "").replace(/\s+\n/g, "\n").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function clamp(value: any, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** 模型判定是否启用：显式开关优先，否则跟随压缩模型是否配置齐全。 */
export function isMemoryModelJudgmentEnabled(config: any = {}) {
  const explicit = config?.memoryModelJudgmentEnabled ?? config?.memory_model_judgment_enabled;
  if (explicit === true) return true;
  if (explicit === false) return false;
  if (typeof (config?.modelCall || config?.compactionModelCall) === "function") return true;
  return !!(config?.enabled && config?.apiUrl && config?.apiKey && config?.model);
}

// ---------------------------------------------------------------- 幂等缓存

function cacheFile(kind: string, scopeId: string) {
  return path.join(MEMORY_MODEL_JUDGMENT_CACHE_DIR, safeSegment(scopeId), `${safeSegment(kind)}.json`);
}

export function readJudgmentCache(kind: string, scopeId: string) {
  const file = cacheFile(kind, scopeId);
  const state = readJsonWithBackup<any>(file, null);
  const entries = state && typeof state.entries === "object" && state.entries ? state.entries : {};
  return { entries, file };
}

function writeJudgmentCache(kind: string, scopeId: string, entries: Record<string, any>) {
  const file = cacheFile(kind, scopeId);
  const keys = Object.keys(entries);
  // 超量时丢最旧的，缓存只是省钱，不是事实源。
  const bounded = keys.length <= MEMORY_MODEL_JUDGMENT_CACHE_MAX_ENTRIES
    ? entries
    : Object.fromEntries(keys
      .map(key => [key, entries[key]] as [string, any])
      .sort((left, right) => String(right[1]?.at || "").localeCompare(String(left[1]?.at || "")))
      .slice(0, MEMORY_MODEL_JUDGMENT_CACHE_MAX_ENTRIES));
  withFileLock(file, () => writeJsonAtomic(file, {
    schema: "ccm-typed-memory-model-judgment-cache-v1",
    version: MEMORY_MODEL_JUDGMENT_VERSION,
    entries: bounded,
    updatedAt: now(),
  }));
}

// ------------------------------------------------------------ schema 校验

/** 准入判定的本地 schema 校验。模型输出不可信，形状不对就当没判。 */
export function validateAdmissionJudgment(value: any) {
  const issues: string[] = [];
  if (!value || typeof value !== "object") return { valid: false, issues: ["not_an_object"], value: null };
  if (typeof value.id !== "string" || !value.id.trim()) issues.push("missing_id");
  if (typeof value.admit !== "boolean") issues.push("admit_not_boolean");
  const confidence = Number(value.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) issues.push("confidence_out_of_range");
  if (value.admit === true && !String(value.why || "").trim()) issues.push("admitted_without_why");
  if (value.admit === true && !String(value.howToApply || value.how_to_apply || "").trim()) issues.push("admitted_without_how_to_apply");
  if (issues.length) return { valid: false, issues, value: null };
  return {
    valid: true,
    issues: [],
    value: {
      id: String(value.id).trim(),
      admit: value.admit === true,
      confidence: clamp(confidence, 0, 1, 0),
      why: compactText(value.why, 400),
      howToApply: compactText(value.howToApply || value.how_to_apply, 400),
      reason: compactText(value.reason, 160) || (value.admit ? "model_admitted" : "model_rejected"),
      durable: value.durable === true,
      nonObvious: value.nonObvious === true || value.non_obvious === true,
    },
  };
}

/** 召回重排判定的本地 schema 校验。 */
export function validateRerankJudgment(value: any) {
  const issues: string[] = [];
  if (!value || typeof value !== "object") return { valid: false, issues: ["not_an_object"], value: null };
  if (typeof value.id !== "string" || !value.id.trim()) issues.push("missing_id");
  const relevance = Number(value.relevance);
  if (!Number.isFinite(relevance) || relevance < 0 || relevance > 1) issues.push("relevance_out_of_range");
  if (issues.length) return { valid: false, issues, value: null };
  return {
    valid: true,
    issues: [],
    value: {
      id: String(value.id).trim(),
      relevance: clamp(relevance, 0, 1, 0),
      applicable: value.applicable !== false,
      reason: compactText(value.reason, 200),
    },
  };
}

// ------------------------------------------------------------------ 提示词

const ADMISSION_SYSTEM = [
  "You decide whether a candidate fact extracted from a multi-agent coding conversation deserves to become long-term memory.",
  "",
  "Admit ONLY facts that will still matter in a future, different task:",
  "- durable user rules and constraints (\"always/never do X\")",
  "- non-obvious corrections where the naive approach was wrong, together with the reason",
  "- non-obvious project motivations that change how future scope is judged",
  "- recurring (not one-off) failure modes worth preventing",
  "",
  "Reject: task progress, status updates, completed-work notices, assignments, anything derivable by",
  "reading the current repository, and one-off incidents.",
  "",
  "Judge meaning, not keywords. The conversation may be Chinese, English or mixed.",
  "Respond with JSON only: {\"judgments\":[{\"id\":string,\"admit\":boolean,\"confidence\":0..1,",
  "\"durable\":boolean,\"nonObvious\":boolean,\"why\":string,\"howToApply\":string,\"reason\":string}]}",
  "For rejected items why/howToApply may be empty. Include every input id exactly once.",
].join("\n");

const RERANK_SYSTEM = [
  "You re-rank candidate long-term memories for a coding task.",
  "",
  "Score how much each memory would change what the agent does on THIS task:",
  "- 1.0 = directly governs the task (a constraint or correction that applies right now)",
  "- 0.5 = related background worth knowing",
  "- 0.0 = unrelated, or already obvious from the task description",
  "",
  "Set applicable=false when the memory is about a different component, a superseded decision,",
  "or would mislead if applied here. Judge meaning, not shared keywords.",
  "Respond with JSON only: {\"judgments\":[{\"id\":string,\"relevance\":0..1,\"applicable\":boolean,\"reason\":string}]}",
  "Include every input id exactly once.",
].join("\n");

async function callJudgmentModel(config: any, system: string, user: string) {
  const engine = require("./group-compaction-engine");
  const text = await engine.callCompactionModel(config, system, user, MEMORY_MODEL_JUDGMENT_MAX_OUTPUT_TOKENS);
  if (!text) return null;
  const parsed = engine.extractJsonObject(typeof text === "string" ? text : JSON.stringify(text));
  if (!parsed || !Array.isArray(parsed.judgments)) return null;
  return parsed.judgments;
}

// ------------------------------------------------------------------ 准入

/**
 * 模型准入判定。返回 byId 映射；模型不可用/输出不合法时返回 degraded=true，
 * 调用方据此回退到本地启发式。
 */
export async function judgeMemoryAdmissionWithModel(scopeId: string, candidates: any[] = [], config: any = {}) {
  const scope = String(scopeId || "").trim() || "global";
  const items = (Array.isArray(candidates) ? candidates : []).slice(0, MEMORY_MODEL_JUDGMENT_MAX_ITEMS);
  const base = {
    schema: "ccm-typed-memory-model-admission-v1",
    scopeId: scope,
    requested: items.length,
    byId: new Map<string, any>(),
    cacheHits: 0,
    modelCalls: 0,
    degraded: false,
    degradedReason: "",
    invalidJudgments: [] as any[],
  };
  if (!items.length) return base;
  if (!isMemoryModelJudgmentEnabled(config)) {
    return { ...base, degraded: true, degradedReason: "model_judgment_disabled" };
  }

  const cache = readJudgmentCache("admission", scope);
  const entries = { ...cache.entries };
  const pending: any[] = [];
  for (const candidate of items) {
    const key = checksum([String(candidate?.category || ""), String(candidate?.type || ""), compactText(candidate?.text, 900)]);
    const cached = entries[key];
    if (cached?.judgment) {
      base.byId.set(String(candidate.id || candidate.checksum || key), { ...cached.judgment, cached: true });
      base.cacheHits += 1;
      continue;
    }
    pending.push({ candidate, key, id: String(candidate.id || candidate.checksum || key) });
  }
  if (!pending.length) return base;

  const user = [
    "Candidates:",
    ...pending.map(row => [
      `- id: ${row.id}`,
      `  category: ${row.candidate?.category || ""}`,
      `  kind: ${row.candidate?.type || ""}`,
      `  speaker_role: ${row.candidate?.sourceRole || ""}`,
      `  text: ${compactText(row.candidate?.text, 700)}`,
    ].join("\n")),
  ].join("\n");

  let judgments: any[] | null = null;
  try {
    base.modelCalls = 1;
    judgments = await callJudgmentModel(config, ADMISSION_SYSTEM, user);
  } catch (error: any) {
    return { ...base, degraded: true, degradedReason: `model_call_failed:${String(error?.message || error).slice(0, 160)}` };
  }
  if (!judgments) return { ...base, degraded: true, degradedReason: "model_returned_no_parsable_judgments" };

  const at = now();
  const byInputId = new Map(pending.map(row => [row.id, row]));
  let accepted = 0;
  for (const raw of judgments) {
    const validation = validateAdmissionJudgment(raw);
    if (!validation.valid) {
      base.invalidJudgments.push({ id: String(raw?.id || ""), issues: validation.issues });
      continue;
    }
    const row = byInputId.get(validation.value.id);
    if (!row) {
      base.invalidJudgments.push({ id: validation.value.id, issues: ["unknown_id"] });
      continue;
    }
    base.byId.set(row.id, validation.value);
    entries[row.key] = { judgment: validation.value, at };
    accepted += 1;
  }
  // 模型一条都没判对，等同于不可用。
  if (!accepted) return { ...base, degraded: true, degradedReason: "no_valid_judgment_in_model_output" };
  try { writeJudgmentCache("admission", scope, entries); } catch {}
  return base;
}

// -------------------------------------------------------------- 召回重排

/**
 * 模型召回重排。只对本地初筛出的 top-K 做重排，模型看到的条目很少。
 * 返回每个 relPath 的相关度与是否适用；调用方把它折算成分数调整。
 */
export async function rerankMemoryRecallWithModel(scopeId: string, query: string, docs: any[] = [], config: any = {}) {
  const scope = String(scopeId || "").trim() || "global";
  const items = (Array.isArray(docs) ? docs : []).slice(0, MEMORY_MODEL_JUDGMENT_MAX_ITEMS);
  const base = {
    schema: "ccm-typed-memory-model-rerank-v1",
    scopeId: scope,
    requested: items.length,
    byRelPath: new Map<string, any>(),
    cacheHits: 0,
    modelCalls: 0,
    degraded: false,
    degradedReason: "",
    invalidJudgments: [] as any[],
  };
  if (!items.length) return base;
  if (!isMemoryModelJudgmentEnabled(config)) {
    return { ...base, degraded: true, degradedReason: "model_judgment_disabled" };
  }
  const queryText = compactText(query, 900);
  if (!queryText) return { ...base, degraded: true, degradedReason: "empty_query" };

  const queryKey = checksum(queryText, 16);
  const cache = readJudgmentCache("rerank", scope);
  const entries = { ...cache.entries };
  const pending: any[] = [];
  for (const doc of items) {
    const relPath = String(doc?.relPath || doc?.file || "");
    if (!relPath) continue;
    const key = checksum([queryKey, relPath.toLowerCase(), String(doc?.checksum || "")]);
    const cached = entries[key];
    if (cached?.judgment) {
      base.byRelPath.set(relPath.toLowerCase(), { ...cached.judgment, cached: true });
      base.cacheHits += 1;
      continue;
    }
    pending.push({ doc, key, relPath, id: `d${checksum(relPath.toLowerCase(), 10)}` });
  }
  if (!pending.length) return base;

  const user = [
    `Task / query:\n${queryText}`,
    "",
    "Candidate memories:",
    ...pending.map(row => [
      `- id: ${row.id}`,
      `  type: ${row.doc?.type || ""}`,
      `  title: ${compactText(row.doc?.name, 160)}`,
      `  summary: ${compactText(row.doc?.description, 240)}`,
      `  excerpt: ${compactText(row.doc?.body, 600)}`,
    ].join("\n")),
  ].join("\n");

  let judgments: any[] | null = null;
  try {
    base.modelCalls = 1;
    judgments = await callJudgmentModel(config, RERANK_SYSTEM, user);
  } catch (error: any) {
    return { ...base, degraded: true, degradedReason: `model_call_failed:${String(error?.message || error).slice(0, 160)}` };
  }
  if (!judgments) return { ...base, degraded: true, degradedReason: "model_returned_no_parsable_judgments" };

  const at = now();
  const byInputId = new Map(pending.map(row => [row.id, row]));
  let accepted = 0;
  for (const raw of judgments) {
    const validation = validateRerankJudgment(raw);
    if (!validation.valid) {
      base.invalidJudgments.push({ id: String(raw?.id || ""), issues: validation.issues });
      continue;
    }
    const row = byInputId.get(validation.value.id);
    if (!row) {
      base.invalidJudgments.push({ id: validation.value.id, issues: ["unknown_id"] });
      continue;
    }
    const judgment = { ...validation.value, relPath: row.relPath };
    base.byRelPath.set(row.relPath.toLowerCase(), judgment);
    entries[row.key] = { judgment, at };
    accepted += 1;
  }
  if (!accepted) return { ...base, degraded: true, degradedReason: "no_valid_judgment_in_model_output" };
  try { writeJudgmentCache("rerank", scope, entries); } catch {}
  return base;
}

/**
 * 对已构建好的上下文包做模型重排：只重排本地已初筛出的召回结果，
 * 模型判为不适用的下沉，判为高相关的上浮。任何失败都只是保持本地顺序。
 */
export async function applyModelRecallRerankToBundle(scopeId: string, query: string, bundle: any, config: any = {}) {
  const recall = bundle?.typedMemoryRecall
    || bundle?.typed_memory_recall
    || bundle?.group_state?.typedMemory?.recall
    || null;
  const rows = Array.isArray(recall?.recalled) ? recall.recalled : [];
  if (!rows.length) {
    return { applied: false, reason: "no_recalled_memory", degraded: false, rerankedCount: 0 };
  }
  const judged = await rerankMemoryRecallWithModel(scopeId, query, rows, config);
  if (judged.degraded) {
    // 降级必须可见：本地启发式顺序原样保留，同时把原因带回上下文包。
    const degradedState = {
      schema: "ccm-typed-memory-model-rerank-state-v1",
      applied: false,
      degraded: true,
      degradedReason: judged.degradedReason,
      rerankedCount: 0,
    };
    recall.modelRerank = degradedState;
    return degradedState;
  }
  let rerankedCount = 0;
  for (const row of rows) {
    const judgment = judged.byRelPath.get(String(row?.relPath || "").toLowerCase());
    if (!judgment) continue;
    const adjustment = modelRerankScoreAdjustment(judgment, { weight: config.memoryModelRerankWeight || config.memory_model_rerank_weight });
    row.modelRerank = { ...judgment, ...adjustment };
    if (adjustment.applied) {
      row.localScore = Number(row.score || 0);
      row.score = Number(row.score || 0) + adjustment.adjustment;
      rerankedCount += 1;
    }
  }
  rows.sort((left: any, right: any) => Number(right.score || 0) - Number(left.score || 0));
  const state = {
    schema: "ccm-typed-memory-model-rerank-state-v1",
    applied: rerankedCount > 0,
    degraded: false,
    degradedReason: "",
    rerankedCount,
    cacheHits: judged.cacheHits,
    modelCalls: judged.modelCalls,
    notApplicableCount: rows.filter((row: any) => row.modelRerank?.applicable === false).length,
    invalidJudgments: judged.invalidJudgments,
  };
  recall.modelRerank = state;
  return state;
}

/**
 * 把模型相关度折算成召回分数调整。
 * 判为不适用的直接给强负分（但不硬删，保留可解释性）。
 */
export function modelRerankScoreAdjustment(judgment: any, options: any = {}) {
  if (!judgment) return { adjustment: 0, applied: false, reason: "no_model_judgment" };
  const weight = Number(options.weight || 14);
  if (judgment.applicable === false) {
    return { adjustment: -Math.round(weight), applied: true, reason: judgment.reason || "model_marked_not_applicable" };
  }
  const relevance = clamp(judgment.relevance, 0, 1, 0);
  // 以 0.5 为中位：高于中位加分，低于中位减分。
  const adjustment = Math.round((relevance - 0.5) * 2 * weight);
  return { adjustment, applied: adjustment !== 0, reason: judgment.reason || "model_relevance", relevance };
}

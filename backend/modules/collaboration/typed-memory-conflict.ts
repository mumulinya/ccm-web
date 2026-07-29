// 记忆冲突检测（doc 对 doc）。
//
// 既有的 polarity_conflict 惩罚比较的是「查询 vs 文档」，回答不了
// 「库里两条记忆本身互相矛盾」这个问题——比如一条说「失败后可以直接重试」，
// 另一条说「重试前必须人工确认」。两条同时被召回时，子 Agent 只能瞎猜。
//
// 这里按语义特征做成对检测：概念重叠 + 极性/关系相反 → 判定冲突，写入待裁决
// 台账；未裁决的冲突在召回时降权并标注，裁决后按用户选择保留一方。

import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";

// 惰性取用语义特征提取：group-memory-loading 会在顶层 import 本模块，
// 而 typed-memory-recall 与 typed-memory-* 之间已有既存环，走 require 规避初始化顺序问题。
function semanticRecallFeatures(value: any) {
  return require("./typed-memory-recall").semanticRecallFeatures(value);
}

export const TYPED_MEMORY_CONFLICT_VERSION = 1;

export const TYPED_MEMORY_CONFLICT_SCHEMA = "ccm-typed-memory-conflict-ledger-v1";

export const TYPED_MEMORY_CONFLICT_DIR = path.join(CCM_DIR, "typed-memory-conflicts");

/** 未裁决冲突的召回惩罚。不直接过滤，避免「两条都消失」比矛盾更糟。 */
export const TYPED_MEMORY_CONFLICT_PENALTY = Number(process.env.CCM_TYPED_MEMORY_CONFLICT_PENALTY || -8);

export const TYPED_MEMORY_CONFLICT_MAX_PAIRS = 200;

// 概念重叠必须落在这些「可执行」概念上才算真冲突，
// 否则两条都提到「文件」这种泛概念也会被误判。
const ACTIONABLE_CONCEPTS = new Set(["retry", "code_change", "verify", "deploy", "security", "persistence", "routing", "approval"]);

// 互斥的关系对：语义上直接打架。
const OPPOSED_RELATIONS: Array<[string, string]> = [
  ["approval_before_retry", "retry_allowed"],
];

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

function compactText(value: any, max = 300) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function getTypedMemoryConflictLedgerFile(scopeId: string) {
  return path.join(TYPED_MEMORY_CONFLICT_DIR, `${safeSegment(scopeId)}.json`);
}

function emptyLedger(scopeId: string, file: string) {
  return {
    schema: TYPED_MEMORY_CONFLICT_SCHEMA,
    version: TYPED_MEMORY_CONFLICT_VERSION,
    scopeId: String(scopeId || ""),
    pairs: [] as any[],
    updatedAt: "",
    file,
  };
}

export function readTypedMemoryConflictLedger(scopeId: string) {
  const file = getTypedMemoryConflictLedgerFile(scopeId);
  const state = readJsonWithBackup<any>(file, null);
  if (!state || state.schema !== TYPED_MEMORY_CONFLICT_SCHEMA) return emptyLedger(scopeId, file);
  return { ...emptyLedger(scopeId, file), ...state, pairs: Array.isArray(state.pairs) ? state.pairs : [], file };
}

/** 冲突对的稳定 id：与两个文档的顺序无关。 */
export function conflictPairId(scopeId: string, relPathA: string, relPathB: string) {
  const [left, right] = [String(relPathA || "").toLowerCase(), String(relPathB || "").toLowerCase()].sort();
  return `tmc_${checksum([safeSegment(scopeId), left, right], 20)}`;
}

/** 判断两个文档的语义特征是否构成冲突。纯函数，便于自测。 */
export function detectSemanticConflict(featuresA: any, featuresB: any) {
  const conceptsA = new Set<string>(featuresA?.concepts || []);
  const conceptsB = new Set<string>(featuresB?.concepts || []);
  const shared = [...conceptsA].filter(concept => conceptsB.has(concept));
  const sharedActionable = shared.filter(concept => ACTIONABLE_CONCEPTS.has(concept));
  const polaritiesA = new Set<string>(featuresA?.polarities || []);
  const polaritiesB = new Set<string>(featuresB?.polarities || []);
  const relationsA = new Set<string>(featuresA?.relations || []);
  const relationsB = new Set<string>(featuresB?.relations || []);

  const relationConflicts = OPPOSED_RELATIONS.filter(([left, right]) =>
    (relationsA.has(left) && relationsB.has(right)) || (relationsA.has(right) && relationsB.has(left)));
  if (relationConflicts.length) {
    return {
      conflict: true,
      kind: "opposed_relation",
      severity: "high",
      sharedConcepts: shared,
      detail: relationConflicts.map(pair => pair.join(" vs ")),
    };
  }

  // 极性相反必须叠加「可执行概念重叠」才算数，否则泛泛的禁止/允许不构成冲突。
  const polarityOpposed = (polaritiesA.has("prohibit") && polaritiesB.has("allow"))
    || (polaritiesA.has("allow") && polaritiesB.has("prohibit"));
  if (polarityOpposed && sharedActionable.length > 0) {
    return {
      conflict: true,
      kind: "opposed_polarity",
      severity: sharedActionable.length >= 2 ? "high" : "medium",
      sharedConcepts: sharedActionable,
      detail: ["prohibit vs allow"],
    };
  }

  return { conflict: false, kind: "", severity: "", sharedConcepts: shared, detail: [] };
}

/** 对一批 typed memory 文档做两两冲突扫描。 */
export function scanTypedMemoryConflicts(scopeId: string, docs: any[] = [], options: any = {}) {
  const maxDocs = Math.max(2, Math.min(120, Number(options.maxDocs || 80)));
  const bounded = docs.slice(0, maxDocs);
  const features = bounded.map(doc => ({
    doc,
    relPath: String(doc.relPath || doc.file || ""),
    features: semanticRecallFeatures(`${doc.name || ""}\n${doc.description || ""}\n${doc.body || ""}`),
  })).filter(row => row.relPath && row.features.constraintLike);
  const pairs: any[] = [];
  for (let left = 0; left < features.length; left += 1) {
    for (let right = left + 1; right < features.length; right += 1) {
      const verdict = detectSemanticConflict(features[left].features, features[right].features);
      if (!verdict.conflict) continue;
      pairs.push({
        pairId: conflictPairId(scopeId, features[left].relPath, features[right].relPath),
        kind: verdict.kind,
        severity: verdict.severity,
        sharedConcepts: verdict.sharedConcepts,
        detail: verdict.detail,
        left: {
          relPath: features[left].relPath,
          name: compactText(features[left].doc.name, 160),
          excerpt: compactText(features[left].doc.body || features[left].doc.description, 300),
          checksum: String(features[left].doc.checksum || ""),
        },
        right: {
          relPath: features[right].relPath,
          name: compactText(features[right].doc.name, 160),
          excerpt: compactText(features[right].doc.body || features[right].doc.description, 300),
          checksum: String(features[right].doc.checksum || ""),
        },
      });
      if (pairs.length >= TYPED_MEMORY_CONFLICT_MAX_PAIRS) break;
    }
    if (pairs.length >= TYPED_MEMORY_CONFLICT_MAX_PAIRS) break;
  }
  return {
    schema: "ccm-typed-memory-conflict-scan-v1",
    scopeId: String(scopeId || ""),
    scannedDocCount: features.length,
    pairCount: pairs.length,
    pairs,
    generatedAt: now(),
  };
}

/**
 * 落盘冲突台账。已裁决的冲突对保持裁决结果；
 * 只要任一侧文档内容变了（checksum 变化），裁决作废重新待裁。
 */
export function recordTypedMemoryConflicts(scopeId: string, docs: any[] = [], options: any = {}) {
  const scan = scanTypedMemoryConflicts(scopeId, docs, options);
  const file = getTypedMemoryConflictLedgerFile(scopeId);
  return withFileLock(file, () => {
    const ledger = readTypedMemoryConflictLedger(scopeId);
    const previous = new Map(ledger.pairs.map((pair: any) => [String(pair.pairId || ""), pair]));
    const at = now();
    const pairs = scan.pairs.map((pair: any) => {
      const existing: any = previous.get(pair.pairId);
      const contentChanged = !!existing
        && (String(existing.left?.checksum || "") !== pair.left.checksum
          || String(existing.right?.checksum || "") !== pair.right.checksum);
      if (existing && !contentChanged) {
        return { ...existing, ...pair, status: existing.status || "pending", resolution: existing.resolution || "", updatedAt: existing.updatedAt || at };
      }
      return {
        ...pair,
        status: "pending",
        resolution: "",
        resolvedBy: "",
        resolvedAt: "",
        supersededResolution: contentChanged ? String(existing?.resolution || "") : "",
        createdAt: existing?.createdAt || at,
        updatedAt: at,
      };
    });
    const changed = pairs.length !== ledger.pairs.length
      || pairs.some((pair: any, index: number) => JSON.stringify(pair) !== JSON.stringify(ledger.pairs[index]));
    if (!changed) return { ...scan, persisted: false, pairs: ledger.pairs, file };
    writeJsonAtomic(file, {
      schema: TYPED_MEMORY_CONFLICT_SCHEMA,
      version: TYPED_MEMORY_CONFLICT_VERSION,
      scopeId: String(scopeId || ""),
      pairs,
      updatedAt: at,
    });
    return { ...scan, persisted: true, pairs, file };
  });
}

/** 用户裁决：保留左侧 / 保留右侧 / 两者共存（说明适用条件不同）。 */
export function resolveTypedMemoryConflict(scopeId: string, pairId: string, options: any = {}) {
  const resolution = String(options.resolution || "").trim();
  if (!["keep_left", "keep_right", "keep_both"].includes(resolution)) {
    throw new Error("冲突裁决必须是 keep_left / keep_right / keep_both 之一");
  }
  const reason = String(options.reason || "").trim();
  if (!reason) throw new Error("裁决记忆冲突必须填写原因");
  const file = getTypedMemoryConflictLedgerFile(scopeId);
  return withFileLock(file, () => {
    const ledger = readTypedMemoryConflictLedger(scopeId);
    const index = ledger.pairs.findIndex((pair: any) => String(pair.pairId || "") === String(pairId || ""));
    if (index < 0) throw new Error("冲突记录不存在");
    const at = now();
    const pairs = [...ledger.pairs];
    pairs[index] = {
      ...pairs[index],
      status: "resolved",
      resolution,
      reason,
      resolvedBy: String(options.actor || "local-user"),
      resolvedAt: at,
      updatedAt: at,
    };
    writeJsonAtomic(file, {
      schema: TYPED_MEMORY_CONFLICT_SCHEMA,
      version: TYPED_MEMORY_CONFLICT_VERSION,
      scopeId: String(scopeId || ""),
      pairs,
      updatedAt: at,
    });
    return { scopeId: String(scopeId || ""), pair: pairs[index], file };
  });
}

/**
 * 召回侧索引：relPath → 本文档参与的未裁决冲突 + 是否已被裁决淘汰。
 * 供打分环节做降权与标注。
 */
export function buildTypedMemoryConflictRecallIndex(scopeId: string) {
  const ledger = readTypedMemoryConflictLedger(scopeId);
  const pendingByRelPath = new Map<string, any[]>();
  const losers = new Set<string>();
  for (const pair of ledger.pairs) {
    const left = String(pair.left?.relPath || "").toLowerCase();
    const right = String(pair.right?.relPath || "").toLowerCase();
    if (String(pair.status || "pending") === "resolved") {
      if (pair.resolution === "keep_left") losers.add(right);
      if (pair.resolution === "keep_right") losers.add(left);
      continue;
    }
    for (const key of [left, right]) {
      if (!key) continue;
      pendingByRelPath.set(key, [...(pendingByRelPath.get(key) || []), pair]);
    }
  }
  return { pendingByRelPath, losers, pairCount: ledger.pairs.length, file: ledger.file };
}

/**
 * 召回打分惩罚。未裁决冲突降权但保留（两条都消失比矛盾更糟）；
 * 已被裁决淘汰的一方直接判定为不应召回。
 */
export function evaluateTypedMemoryConflictPenalty(relPath: string, conflictIndex: any) {
  const key = String(relPath || "").toLowerCase();
  if (!key || !conflictIndex) return { adjustment: 0, suppressed: false, pendingConflicts: [] };
  if (conflictIndex.losers?.has(key)) {
    return { adjustment: 0, suppressed: true, reason: "conflict_resolved_against_this_memory", pendingConflicts: [] };
  }
  const pending = conflictIndex.pendingByRelPath?.get(key) || [];
  if (!pending.length) return { adjustment: 0, suppressed: false, pendingConflicts: [] };
  const highSeverity = pending.some((pair: any) => String(pair.severity || "") === "high");
  return {
    adjustment: highSeverity ? TYPED_MEMORY_CONFLICT_PENALTY : Math.round(TYPED_MEMORY_CONFLICT_PENALTY / 2),
    suppressed: false,
    reason: "unresolved_semantic_conflict",
    pendingConflicts: pending.map((pair: any) => ({
      pairId: pair.pairId,
      kind: pair.kind,
      severity: pair.severity,
      counterpart: String(pair.left?.relPath || "").toLowerCase() === key ? pair.right?.relPath : pair.left?.relPath,
    })).slice(0, 4),
  };
}

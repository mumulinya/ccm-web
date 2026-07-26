// typed-memory-recall.ts — merged from 3 part files (behavior-freeze merge).

import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  CCM_DIR,
} from "../../core/utils";
import {
  readJsonWithBackup,
  withFileLock,
  writeJsonAtomic as writeJsonAtomicWithBackup,
} from "../../core/atomic-json-file";
import {
  buildCrossGroupProviderDispatchReliabilitySignal,
  getGroupTypedMemoryDistillationLedgerFile,
  pressureProvenanceProviderDispatchOverrideFollowupArchive,
  pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive,
  providerDispatchReliabilityRound,
  providerSwitchExecutionArchive,
  readGroupTypedMemoryDistillationLedger,
  scoreProviderDispatchReliabilityRows,
  scoreProviderSwitchExecutionRows,
  summarizeProviderDispatchOverrideFollowupPolicyAttributions,
  summarizeProviderDispatchOverrideFollowupReceiptValidationPolicyAttributions,
  summarizeProviderSwitchExecutionPolicyAttributions,
} from "./typed-memory-distillation-receipts";
import {
  buildGroupTypedMemoryIndex,
  scanGroupTypedMemoryDocuments,
  scanGroupTypedMemoryDocumentsRaw,
  upsertGroupTypedMemoryDocument,
} from "./typed-memory-index-build";
import {
  readGroupTypedMemoryRecallLedger,
  readGroupTypedMemoryStaleCandidateLedger,
  writeGroupTypedMemoryStaleCandidateLedger,
} from "./typed-memory-ledgers";
import {
  GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
  GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_HALF_LIFE_DAYS,
  GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS,
  GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_DELIVERY_LEASES_PER_SCOPE,
  GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_SCOPES,
  SEMANTIC_RECALL_CONCEPTS,
  checksum,
  compactText,
  firstFiniteNumber,
  isExactGroupTypedMemorySessionScope,
  normalizeMemoryType,
  now,
  safeSegment,
  tokens,
  typedMemoryDeliveryLeaseChecksum,
  typedMemoryStaleRejectionChecksum,
  typedMemoryStaleResolutionChecksum,
  uniqueStrings,
  writeJsonAtomic,
} from "./typed-memory-shared";

// ===== merged from typed-memory-recall-part-01.ts =====

// Behavior-freeze module extracted mechanically from the former facade.


export function canonicalSemanticRecallText(value: any) {
  return String(value || "").toLowerCase()
    .replace(/验证|核验|校验|检查|确认|复核|审查|test|verify|validate|check|review/g, " verify ")
    .replace(/修改|改动|编辑|变更|实现|patch|edit|modify|change|implementation/g, " modify ")
    .replace(/重试|再次尝试|重新尝试|再试|retry|reattempt|try again/g, " retry ")
    .replace(/失败|报错|错误|异常|故障|超时|fail|error|exception|fault|timeout/g, " failure ")
    .replace(/禁止|不得|不要|不能|不允许|严禁|避免|切勿|do not|don't|never|must not|forbid/g, " prohibit ")
    .replace(/必须|务必|需要|应当|要求|must|required|should|need to/g, " require ")
    .replace(/人工|人为确认|让人确认|人来确认|用户确认|等待确认|审批|批准|human|user confirmation|approval/g, " approval ")
    .replace(/接口|端点|api|endpoint/g, " interface ")
    .replace(/先\s*([^，。；;\n]{0,24})\s*(?:再|然后|之后)/g, " sequence $1 ")
    .replace(/\bbefore\b|\bfirst\b[^.\n]{0,40}\bthen\b/g, " sequence ")
    .replace(/[^a-z0-9_\u3400-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function semanticRecallFeatures(value: any) {
  const raw = String(value || "");
  const lower = raw.toLowerCase();
  const canonical = canonicalSemanticRecallText(raw);
  const concepts = SEMANTIC_RECALL_CONCEPTS.filter(([, pattern]) => pattern.test(lower)).map(([id]) => id);
  const allowText = lower.replace(/禁止|不得|不要|不能|不允许|严禁|避免|切勿|do not|don't|never|must not|forbid/g, " ");
  const polarities = [
    ["prohibit", /禁止|不得|不要|不能|不允许|严禁|避免|切勿|do not|don't|never|must not|forbid/, lower],
    ["require", /必须|务必|需要|应当|要求|都要|must|required|should|need to/, lower],
    ["allow", /可以|允许|可直接|直接进行|allowed|permitted|\b(?:can|may)\s+(?:retry|reattempt|modify|change|deploy|delete|write|skip)\b/, allowText],
    ["sequence", /先[^。；;\n]{0,28}(?:，|,)?\s*(?:再|然后|之后)|before|first[^.\n]{0,50}then/, lower],
    ["conditional", /如果|若|当[^，。；;\n]{0,24}时|出现[^，。；;\n]{0,24}时|失败后|出错后|报错后|发生[^，。；;\n]{0,24}后|if|when|on failure|after[^.\n]{0,30}fail/, lower],
  ].filter(([, pattern, target]: any) => pattern.test(target)).map(([id]) => String(id));
  const relations = uniqueStrings([
    /(?:修改|改动|编辑|变更|代码)[^。；;\n]{0,18}(?:前|之前)[^。；;\n]{0,24}(?:验证|核验|校验|检查|确认|复核|test|verify|validate|check)/.test(lower)
      || /先[^。；;\n]{0,24}(?:验证|核验|校验|检查|确认|复核|test|verify|validate|check)[^。；;\n]{0,24}(?:再|然后|之后)[^。；;\n]{0,24}(?:修改|改动|编辑|变更|实现|代码|patch|edit|modify|change)/.test(lower)
      ? "verify_before_code_change" : "",
    /(?:禁止|不得|不要|不能|不允许|严禁|避免|切勿|do not|don't|never|must not|forbid)[^。；;\n]{0,28}(?:重试|再次尝试|重新尝试|再试|retry|reattempt|try again)[^。；;\n]{0,48}(?:人工|用户确认|等待确认|审批|批准|授权|human|user confirmation|approval|authorize)/.test(lower)
      ? "approval_before_retry" : "",
    /(?:可以|允许|可直接|直接进行|allowed|permitted|\b(?:can|may)\s+)[^。；;\n]{0,24}(?:重试|再次尝试|重新尝试|再试|retry|reattempt|try again)/.test(allowText)
      ? "retry_allowed" : "",
  ].filter(Boolean), 12);
  const semanticTokens = uniqueStrings([...tokens(raw), ...tokens(canonical)], 260);
  const sentences = raw.split(/[。！？!?；;\n]+/).map(item => item.trim()).filter(Boolean).slice(0, 120);
  const constraintLike = polarities.some(item => ["prohibit", "require", "sequence", "conditional"].includes(item))
    || /约束|规则|注意|必须|禁止|不得|要求|constraint|rule|policy|requirement/.test(lower);
  const directivePolarities = polarities.filter(item => ["prohibit", "allow"].includes(item));
  const signature = concepts.length >= 2 && constraintLike && (directivePolarities.length > 0 || relations.length > 0)
    ? checksum([concepts.slice().sort(), directivePolarities.slice().sort(), relations.slice().sort(), constraintLike], 24)
    : "";
  return {
    raw,
    canonical,
    concepts,
    polarities,
    relations,
    semanticTokens,
    sentences,
    constraintLike,
    signature,
  };
}

export function semanticRecallCorpusStats(docs: any[] = [], query = "") {
  const queryFeatures = semanticRecallFeatures(query);
  const docFeatures = new Map<string, any>();
  const documentFrequency = new Map<string, number>();
  for (const doc of docs) {
    const key = String(doc.relPath || doc.file || doc.name || "");
    const features = semanticRecallFeatures(`${doc.name || ""}\n${doc.description || ""}\n${doc.body || ""}`);
    docFeatures.set(key, features);
    for (const token of new Set(features.semanticTokens)) {
      documentFrequency.set(token, Number(documentFrequency.get(token) || 0) + 1);
    }
  }
  return { queryFeatures, docFeatures, documentFrequency, documentCount: Math.max(1, docs.length) };
}

export function roundSemanticRecallScore(value: any, precision = 3) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  const factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

export function scoreSemanticNaturalLanguageRecall(doc: any, stats: any) {
  const query = stats.queryFeatures || semanticRecallFeatures("");
  const key = String(doc.relPath || doc.file || doc.name || "");
  const features = stats.docFeatures.get(key) || semanticRecallFeatures(`${doc.name || ""}\n${doc.description || ""}\n${doc.body || ""}`);
  const docTokenSet = new Set<string>(features.semanticTokens || []);
  const matchedTokens = (query.semanticTokens || []).filter((token: string) => docTokenSet.has(token));
  const idfRows = matchedTokens.map((token: string) => {
    const df = Math.max(1, Number(stats.documentFrequency.get(token) || 1));
    const idf = Math.log(1 + (Math.max(1, stats.documentCount) - df + 0.5) / (df + 0.5));
    return { token, df, idf: roundSemanticRecallScore(idf, 4) };
  });
  const idfTotal = idfRows.reduce((sum: number, row: any) => sum + Number(row.idf || 0), 0);
  const lexicalCoverage = matchedTokens.length / Math.max(1, (query.semanticTokens || []).length);
  let adjustment = Math.min(20, idfTotal * 1.8) + (lexicalCoverage >= 0.6 ? 4 : lexicalCoverage >= 0.35 ? 2 : 0);
  const queryConceptSet = new Set<string>(query.concepts || []);
  const matchedConcepts = (features.concepts || []).filter((concept: string) => queryConceptSet.has(concept));
  adjustment += Math.min(18, matchedConcepts.length * 3);
  const reasons: any[] = [];
  if (idfTotal > 0) reasons.push({ kind: "idf_overlap", delta: roundSemanticRecallScore(Math.min(24, idfTotal * 1.8 + (lexicalCoverage >= 0.6 ? 4 : lexicalCoverage >= 0.35 ? 2 : 0))), matchedTokens: idfRows.slice(0, 16), coverage: roundSemanticRecallScore(lexicalCoverage, 4) });
  if (matchedConcepts.length) reasons.push({ kind: "concept_overlap", delta: Math.min(18, matchedConcepts.length * 3), concepts: matchedConcepts });
  const sentenceMatches = (features.sentences || []).map((sentence: string) => {
    const sentenceFeatures = semanticRecallFeatures(sentence);
    const concepts = sentenceFeatures.concepts.filter((concept: string) => queryConceptSet.has(concept));
    return { sentence: compactText(sentence, 180), concepts, count: concepts.length };
  }).sort((a: any, b: any) => b.count - a.count);
  const strongestSentence = sentenceMatches[0] || { count: 0, concepts: [], sentence: "" };
  const requiredSentenceConcepts = Math.min(3, Math.max(2, queryConceptSet.size));
  if (strongestSentence.count >= requiredSentenceConcepts) {
    const delta = strongestSentence.count >= queryConceptSet.size && queryConceptSet.size > 1 ? 7 : 4;
    adjustment += delta;
    reasons.push({ kind: "sentence_concept_cooccurrence", delta, concepts: strongestSentence.concepts, sentence: strongestSentence.sentence });
  }
  const queryPolarity = new Set<string>(query.polarities || []);
  const docPolarity = new Set<string>(features.polarities || []);
  for (const polarity of ["prohibit", "require", "sequence", "conditional"]) {
    if (queryPolarity.has(polarity) && docPolarity.has(polarity)) {
      const delta = polarity === "prohibit" ? 5 : polarity === "sequence" ? 4 : 2;
      adjustment += delta;
      reasons.push({ kind: `polarity_${polarity}_match`, delta });
    }
  }
  const actionableConceptOverlap = matchedConcepts.some((concept: string) => ["retry", "code_change", "verify", "deploy", "security", "persistence", "routing"].includes(concept));
  if (actionableConceptOverlap && queryPolarity.has("prohibit") && docPolarity.has("allow")) {
    adjustment -= 16;
    reasons.push({ kind: "polarity_conflict_prohibit_vs_allow", delta: -16 });
  }
  if (actionableConceptOverlap && queryPolarity.has("allow") && docPolarity.has("prohibit")) {
    adjustment -= 12;
    reasons.push({ kind: "polarity_conflict_allow_vs_prohibit", delta: -12 });
  }
  if (query.constraintLike && features.constraintLike) {
    adjustment += 3;
    reasons.push({ kind: "constraint_shape_match", delta: 3 });
  }
  const canonicalQuery = String(query.canonical || "");
  if (canonicalQuery.length >= 12 && String(features.canonical || "").includes(canonicalQuery)) {
    adjustment += 7;
    reasons.push({ kind: "canonical_phrase_match", delta: 7 });
  }
  adjustment = Math.max(-20, Math.min(18, roundSemanticRecallScore(adjustment, 3)));
  return {
    schema: "ccm-group-typed-memory-semantic-reference-score-v1",
    adjustment,
    matchedTokens: idfRows.slice(0, 24),
    matchedConcepts,
    lexicalCoverage: roundSemanticRecallScore(lexicalCoverage, 4),
    queryConcepts: query.concepts || [],
    documentConcepts: features.concepts || [],
    queryPolarities: query.polarities || [],
    documentPolarities: features.polarities || [],
    queryRelations: query.relations || [],
    documentRelations: features.relations || [],
    strongestSentence,
    constraintShapeMatched: query.constraintLike && features.constraintLike,
    signature: features.signature || "",
    reasons,
  };
}

export function semanticRecallDuplicateOf(candidate: any, accepted: any[] = []) {
  const candidateSemantic = candidate.semanticReference || {};
  const candidateConcepts = new Set<string>(candidateSemantic.documentConcepts || []);
  const candidatePolarities = new Set<string>(candidateSemantic.documentPolarities || []);
  for (const existing of accepted) {
    const existingSemantic = existing.semanticReference || {};
    const existingConcepts = new Set<string>(existingSemantic.documentConcepts || []);
    const existingPolarities = new Set<string>(existingSemantic.documentPolarities || []);
    const sameType = String(candidate.type || "") === String(existing.type || "");
    if (candidate.file && existing.file && String(candidate.file).toLowerCase() === String(existing.file).toLowerCase()) return existing;
    if (sameType && candidateSemantic.signature && candidateSemantic.signature === existingSemantic.signature && candidateConcepts.size >= 2) return existing;
    const sharedConcepts = [...candidateConcepts].filter(concept => existingConcepts.has(concept));
    const conceptCoverage = sharedConcepts.length / Math.max(1, Math.min(candidateConcepts.size, existingConcepts.size));
    const directiveCompatible = candidatePolarities.has("prohibit") === existingPolarities.has("prohibit")
      && candidatePolarities.has("allow") === existingPolarities.has("allow");
    const directivePresent = candidatePolarities.has("prohibit") || candidatePolarities.has("allow")
      || existingPolarities.has("prohibit") || existingPolarities.has("allow");
    if (sameType && directivePresent && directiveCompatible && sharedConcepts.length >= 4 && conceptCoverage >= 0.8) return existing;
    const existingTokens = new Set<string>(tokens(`${existing.name || ""}\n${existing.description || ""}\n${existing.body || ""}`));
    const candidateTokens = new Set<string>(tokens(`${candidate.name || ""}\n${candidate.description || ""}\n${candidate.body || ""}`));
    const union = new Set<string>([...existingTokens, ...candidateTokens]);
    const overlap = [...candidateTokens].filter(token => existingTokens.has(token)).length;
    const jaccard = overlap / Math.max(1, union.size);
    if (sameType && jaccard >= 0.82) return existing;
  }
  return null;
}

export function extractSemanticRecallSnippet(body: string, queryFeatures: any, max = 700) {
  const queryConcepts = new Set<string>(queryFeatures?.concepts || []);
  const queryTokens = new Set<string>(queryFeatures?.semanticTokens || []);
  const lines = String(body || "").split(/\n+/).filter(Boolean);
  const scored = lines.map((line, index) => {
    const features = semanticRecallFeatures(line);
    const conceptMatches = features.concepts.filter((concept: string) => queryConcepts.has(concept)).length;
    const tokenMatches = features.semanticTokens.filter((token: string) => queryTokens.has(token)).length;
    const polarityMatch = features.polarities.some((polarity: string) => (queryFeatures?.polarities || []).includes(polarity));
    return { line, index, score: conceptMatches * 4 + tokenMatches + (polarityMatch ? 3 : 0) };
  }).sort((a, b) => b.score - a.score || a.index - b.index);
  const picked = scored[0]?.score
    ? scored.slice(0, 4).sort((a, b) => a.index - b.index).map(item => item.line).join("\n")
    : lines.slice(0, 4).join("\n");
  return compactText(picked, max);
}

export function scorePostCompactCandidateUsageHint(corpus: string, hints: any[] = []) {
  const matched: any[] = [];
  let adjustment = 0;
  for (const hint of hints) {
    const candidateId = String(hint.candidate_id || "").toLowerCase();
    const value = String(hint.value || "").toLowerCase();
    const matches = (!!candidateId && corpus.includes(candidateId)) || (!!value && corpus.includes(value));
    if (!matches) continue;
    let delta = 0;
    if (hint.recommendation === "promote_recall") delta = 8 + Math.min(6, hint.used_count + hint.verified_count);
    else if (hint.recommendation === "deprioritize_or_distill") delta = -8 - Math.min(6, hint.ignored_count);
    else if (hint.recommendation === "require_usage_receipt") delta = 2;
    else delta = 3;
    adjustment += delta;
    matched.push({
      candidate_id: hint.candidate_id,
      value: hint.value,
      recommendation: hint.recommendation,
      delta,
    });
  }
  return { adjustment, matched };
}

export function normalizeWorkerContextPressureStatus(rawStatus: any, pressure = 0, freeTokens = 0, compactRecommended = false) {
  const status = String(rawStatus || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["over_budget", "critical", "compact_recommended"].includes(status)) return status;
  if (/over.*budget|budget.*exhaust|negative_free|blocked_by_budget/.test(status)) return "over_budget";
  if (/critical|emergency/.test(status)) return "critical";
  if (/compact|compress|crop|trim|pressure|warning/.test(status) && !/ok|pass|recovered|continue/.test(status)) return "compact_recommended";
  if (freeTokens < 0 || pressure >= 100) return "over_budget";
  if (pressure >= 90) return "critical";
  if (compactRecommended || pressure >= 82) return "compact_recommended";
  return "";
}

export function normalizeWorkerContextPressureRecallSignals(options: any = {}) {
  const sources: any[] = [];
  const memory = options.groupMemory || options.group_memory || options.memory || options.workerMemory || options.worker_memory || null;
  const addSource = (source: string, raw: any) => {
    if (raw === undefined || raw === null || raw === "") return;
    if (Array.isArray(raw)) {
      raw.forEach((item, index) => addSource(`${source}[${index}]`, item));
      return;
    }
    const value = typeof raw === "object" ? raw : { status: raw };
    sources.push({ source, raw: value });
  };
  addSource("worker_context_packet_context_usage", options.workerContextPacketContextUsage || options.worker_context_packet_context_usage);
  addSource("worker_context_usage", options.workerContextUsage || options.worker_context_usage || options.contextUsage || options.context_usage);
  addSource("worker_context_pressure", options.workerContextPressure || options.worker_context_pressure || options.contextPressure || options.context_pressure);
  addSource("pre_dispatch_gate", options.preDispatchGate || options.pre_dispatch_gate || options.workerContextPreDispatchGate || options.worker_context_pre_dispatch_gate);
  addSource("context_compaction_retry", options.contextCompactionRetry || options.context_compaction_retry || options.workerContextCompactionRetry || options.worker_context_compaction_retry);
  addSource("compact_strategy_pressure", options.compactStrategyPressure || options.compact_strategy_pressure || options.compactStrategyDecision || options.compact_strategy_decision);
  addSource("ptl_emergency", options.ptlEmergency || options.ptl_emergency || options.ptlEmergencyHint || options.ptl_emergency_hint);
  if (options.forceWorkerContextPressureRecall === true || options.force_worker_context_pressure_recall === true) {
    addSource("forced", { status: "compact_recommended", reason: "force_worker_context_pressure_recall" });
  }
  if (memory && typeof memory === "object") {
    const compaction = memory.compaction || {};
    const boundary = memory.compactBoundary || memory.compact_boundary || {};
    const postRestore = boundary.post_compact_restore || boundary.postCompactRestore || {};
    const messageCompression = memory.messageCompression || memory.message_compression || {};
    addSource("group_memory_context_pressure_warning", compaction.contextPressureWarning || compaction.context_pressure_warning || compaction.compactWarning || compaction.compact_warning || messageCompression.contextPressureWarning || messageCompression.context_pressure_warning);
    addSource("group_memory_pre_compact_warning", compaction.preCompactWarning || compaction.pre_compact_warning);
    addSource("group_memory_ptl_emergency", compaction.ptlEmergency || compaction.ptl_emergency || boundary.ptlEmergency || boundary.ptl_emergency || postRestore.ptlEmergency || postRestore.ptl_emergency);
    addSource("group_memory_compact_strategy_decision", compaction.compactStrategyDecision || compaction.compact_strategy_decision || boundary.compactStrategyDecision || boundary.compact_strategy_decision || postRestore.strategyDecision || postRestore.strategy_decision || messageCompression.compactStrategyDecision || messageCompression.compact_strategy_decision);
    addSource("group_memory_partial_compact", compaction.partialCompact || compaction.partial_compact || boundary.partialCompact || boundary.partial_compact);
  }

  const signals = sources.map(({ source, raw }) => {
    const compactRecommended = raw.compact_recommended === true
      || raw.compactRecommended === true
      || raw.must_repair_before_dispatch === true
      || raw.mustRepairBeforeDispatch === true
      || raw.blocked === true
      || raw.dispatch_ready === false
      || raw.dispatchReady === false
      || /compact|compress|crop|trim|budget|pressure/i.test(`${raw.recommendation || ""}\n${raw.next_step || raw.nextStep || ""}\n${raw.reason || ""}`);
    const pressure = firstFiniteNumber(raw.pressure, raw.worker_context_packet_pressure, raw.context_pressure, raw.contextPressure);
    const totalTokens = firstFiniteNumber(raw.total_tokens, raw.totalTokens, raw.worker_context_packet_total_tokens);
    const maxTokens = firstFiniteNumber(raw.max_tokens, raw.maxTokens, raw.worker_context_packet_max_tokens);
    const autocompactBufferTokens = firstFiniteNumber(raw.autocompact_buffer_tokens, raw.autocompactBufferTokens, raw.worker_context_packet_autocompact_buffer_tokens);
    const computedFreeTokens = maxTokens > 0 ? maxTokens - totalTokens - autocompactBufferTokens : 0;
    const freeTokens = firstFiniteNumber(raw.free_tokens, raw.freeTokens, raw.worker_context_packet_free_tokens, computedFreeTokens);
    const rawStatus = raw.status
      || raw.usage_status
      || raw.usageStatus
      || raw.pressure_status
      || raw.pressureStatus
      || raw.level
      || raw.emergency_level
      || raw.emergencyLevel
      || raw.recommendation
      || raw.next_step
      || raw.nextStep
      || "";
    const pressureStatus = normalizeWorkerContextPressureStatus(rawStatus, pressure, freeTokens, compactRecommended);
    const suppressed = raw.suppressed === true || raw.suppress === true || raw.is_suppressed === true || raw.isSuppressed === true;
    const blockedOutcomeCount = firstFiniteNumber(raw.blocked_outcome_count, raw.blockedOutcomeCount, raw.blocked_count, raw.blockedCount);
    const taskCompactedBlockedCount = firstFiniteNumber(raw.task_compacted_blocked_count, raw.taskCompactedBlockedCount);
    const ptlEngaged = raw.engaged === true
      || raw.ptl_emergency_engaged === true
      || raw.ptlEmergencyEngaged === true
      || /ptl.*emergency|emergency.*downgrade|repeated compact failure/i.test(`${raw.reason || ""}\n${raw.method || ""}\n${raw.status || ""}`);
    const repeatedCompactFailure = raw.repeated_compact_failure === true
      || raw.repeatedCompactFailure === true
      || blockedOutcomeCount >= 2
      || taskCompactedBlockedCount > 0
      || (/blocked|fail/.test(String(raw.status || "").toLowerCase()) && /compact|retry|budget/i.test(`${raw.method || ""}\n${raw.reason || ""}`));
    const active = !suppressed && (!!pressureStatus || ptlEngaged || repeatedCompactFailure);
    return {
      source,
      active,
      suppressed,
      status: pressureStatus,
      pressure,
      total_tokens: totalTokens,
      max_tokens: maxTokens,
      free_tokens: freeTokens,
      autocompact_buffer_tokens: autocompactBufferTokens,
      ptl_emergency: ptlEngaged,
      repeated_compact_failure: repeatedCompactFailure,
      blocked_outcome_count: blockedOutcomeCount,
      task_compacted_blocked_count: taskCompactedBlockedCount,
      reason: compactText(raw.reason || raw.recommendation || raw.next_step || raw.nextStep || raw.method || "", 260),
    };
  }).filter(signal => signal.active || signal.suppressed || signal.status || signal.ptl_emergency || signal.repeated_compact_failure);

  const rank: Record<string, number> = { compact_recommended: 1, critical: 2, over_budget: 3 };
  const activeSignals = signals.filter(signal => signal.active);
  const pressureStatus = activeSignals
    .map(signal => signal.status)
    .filter(Boolean)
    .sort((a: string, b: string) => Number(rank[b] || 0) - Number(rank[a] || 0))[0] || "";
  const finiteFreeTokens = activeSignals
    .map(signal => Number(signal.free_tokens || 0))
    .filter(value => Number.isFinite(value) && value !== 0);
  return {
    schema: "ccm-worker-context-pressure-recall-signals-v1",
    active: activeSignals.length > 0,
    signal_count: signals.length,
    active_signal_count: activeSignals.length,
    pressure_status: pressureStatus,
    max_pressure: activeSignals.reduce((max, signal) => Math.max(max, Number(signal.pressure || 0)), 0),
    min_free_tokens: finiteFreeTokens.length ? Math.min(...finiteFreeTokens) : 0,
    ptl_emergency: activeSignals.some(signal => signal.ptl_emergency === true),
    repeated_compact_failure: activeSignals.some(signal => signal.repeated_compact_failure === true),
    signals: activeSignals.slice(-8),
    suppressed_signal_count: signals.filter(signal => signal.suppressed).length,
  };
}

export function queryMentionsWorkerContextPressure(text: string, queryTokens: string[] = []) {
  const haystack = `${text}\n${queryTokens.join("\n")}`.toLowerCase();
  return /workercontextpacket|worker context|context_usage|context usage|context pressure|usage pressure|free_tokens|autocompact|over_budget|compact_recommended|metadata_partial_compact|task_hash_unchanged|ptl emergency|ptl|compact strategy|上下文|压力|预算|压缩/.test(haystack);
}

export function classifyWorkerContextPressureRecallDoc(corpus: string, doc: any = {}) {
  const haystack = `${doc.relPath || ""}\n${doc.file || ""}\n${doc.source || ""}\n${doc.name || ""}\n${doc.description || ""}\n${corpus}`.toLowerCase();
  const kinds: string[] = [];
  const matchedKeywords: string[] = [];
  const addKind = (kind: string, patterns: Array<[string, RegExp]>) => {
    for (const [keyword, pattern] of patterns) {
      if (!pattern.test(haystack)) continue;
      if (!kinds.includes(kind)) kinds.push(kind);
      matchedKeywords.push(keyword);
    }
  };
  addKind("context_usage", [
    ["worker-context-usage-pressure-discipline", /worker-context-usage-pressure-discipline/],
    ["worker_context_packet_context_usage_repair", /worker_context_packet_context_usage_repair|context usage repair/],
    ["context_usage.status", /context_usage\.status|context usage budget/],
    ["free_tokens", /free_tokens|free=/],
    ["autocompact_buffer", /autocompact_buffer/],
  ]);
  addKind("compact_strategy", [
    ["worker-context-compact-strategy", /worker-context-compact-strategy/],
    ["compact_strategy_memory", /compact strategy memory|compact-strategy-memory|compact_strategy/],
    ["metadata_partial_compact", /metadata_partial_compact|metadata partial compact/],
    ["free_token_delta", /free_token_delta|avg_free_token_delta/],
    ["task_hash_unchanged", /task_hash_unchanged/],
  ]);
  addKind("ptl_emergency", [
    ["worker-context-ptl-emergency-downgrade", /worker-context-ptl-emergency-downgrade/],
    ["ptl emergency", /ptl emergency|ptl-emergency|ptl_emergency/],
    ["emergency downgrade", /emergency downgrade|emergency-downgrade/],
    ["maxTaskChars", /maxtaskchars|max_task_chars/],
    ["repeated compact failure", /repeated compact failure/],
  ]);
  return {
    pressure_doc: kinds.length > 0,
    kinds,
    matched_keywords: uniqueStrings(matchedKeywords, 12),
  };
}

export function scoreWorkerContextPressureRecall(corpus: string, doc: any, signals: any = {}, queryText = "", queryTokens: string[] = []) {
  const classification = classifyWorkerContextPressureRecallDoc(corpus, doc);
  if (!classification.pressure_doc) {
    return {
      adjustment: 0,
      matched: [],
      pressure_doc: false,
      kinds: [],
      signal_count: signals.signal_count || 0,
      active_signal_count: signals.active_signal_count || 0,
    };
  }
  const matched: any[] = [];
  let adjustment = 0;
  const status = String(signals.pressure_status || "");
  const pressureWeight = status === "over_budget" ? 8 : status === "critical" ? 6 : status === "compact_recommended" ? 4 : 0;
  const addDelta = (kind: string, delta: number, reason: string) => {
    if (!delta) return;
    adjustment += delta;
    matched.push({ kind, delta, reason });
  };
  if (signals.active) {
    if (classification.kinds.includes("context_usage")) {
      addDelta("context_usage", 8 + Math.min(6, pressureWeight), `${status || "pressure"} context_usage discipline`);
    }
    if (classification.kinds.includes("compact_strategy")) {
      const delta = signals.repeated_compact_failure
        ? 14
        : status === "over_budget"
          ? 12
          : status === "critical"
            ? 10
            : status === "compact_recommended"
              ? 7
              : 5;
      addDelta("compact_strategy", delta, signals.repeated_compact_failure ? "repeated compact failure strategy memory" : `${status || "pressure"} compact strategy memory`);
    }
    if (classification.kinds.includes("ptl_emergency")) {
      const delta = signals.ptl_emergency || signals.repeated_compact_failure
        ? 16
        : status === "over_budget"
          ? 5
          : 0;
      addDelta("ptl_emergency", delta, signals.ptl_emergency ? "ptl emergency engaged" : "over-budget emergency downgrade advisory");
    }
    adjustment = Math.min(28, adjustment);
  } else if (!queryMentionsWorkerContextPressure(queryText, queryTokens)) {
    const delta = classification.kinds.includes("ptl_emergency")
      ? -7
      : classification.kinds.includes("compact_strategy")
        ? -5
        : -4;
    addDelta(classification.kinds[0] || "pressure_doc", delta, "no worker-context pressure signal");
  }
  return {
    adjustment,
    matched,
    pressure_doc: true,
    kinds: classification.kinds,
    matched_keywords: classification.matched_keywords,
    signal_count: signals.signal_count || 0,
    active_signal_count: signals.active_signal_count || 0,
    pressure_status: signals.pressure_status || "",
    ptl_emergency: signals.ptl_emergency === true,
    repeated_compact_failure: signals.repeated_compact_failure === true,
  };
}

export function normalizeWorkerContextPressureRecallUsageState(value: any) {
  const state = String(value || "").toLowerCase().trim();
  if (["used", "ignored", "verified", "mentioned"].includes(state)) return state;
  if (["checked", "reviewed", "validated", "confirmed"].includes(state)) return "verified";
  if (["skipped", "unused", "not_used", "not-used", "not used", "unreferenced"].includes(state)) return "ignored";
  if (["applied", "referenced", "consumed"].includes(state)) return "used";
  return "";
}

export function roundPressureRecallUsageWeight(value: any, precision = 3) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  const factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

export function normalizeWorkerContextPressureRecallUsageAging(options: any = {}) {
  const disabled = options.disableUsageAging === true
    || options.disable_usage_aging === true
    || options.usageAging === false
    || options.usage_aging === false
    || options.pressureRecallUsageAging === false
    || options.pressure_recall_usage_aging === false;
  const explicitNow = options.nowMs
    ?? options.now_ms
    ?? (options.now || options.generatedAt || options.generated_at ? Date.parse(String(options.now || options.generatedAt || options.generated_at)) : undefined);
  const nowMs = Number.isFinite(Number(explicitNow)) && Number(explicitNow) > 0 ? Number(explicitNow) : Date.now();
  const halfLifeDays = Math.max(1, Number(
    options.usageHalfLifeDays
    ?? options.usage_half_life_days
    ?? options.pressureRecallUsageHalfLifeDays
    ?? options.pressure_recall_usage_half_life_days
    ?? GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_HALF_LIFE_DAYS
  ));
  const staleAfterDays = Math.max(halfLifeDays, Number(
    options.usageStaleAfterDays
    ?? options.usage_stale_after_days
    ?? options.pressureRecallUsageStaleAfterDays
    ?? options.pressure_recall_usage_stale_after_days
    ?? GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS
  ));
  const minWeight = Math.max(0, Math.min(1, Number(
    options.usageMinDecayWeight
    ?? options.usage_min_decay_weight
    ?? options.pressureRecallUsageMinDecayWeight
    ?? options.pressure_recall_usage_min_decay_weight
    ?? 0
  )));
  return {
    schema: "ccm-group-typed-memory-pressure-recall-usage-aging-v1",
    enabled: !disabled,
    now_ms: nowMs,
    now: new Date(nowMs).toISOString(),
    half_life_days: halfLifeDays,
    stale_after_days: staleAfterDays,
    min_decay_weight: minWeight,
  };
}

export function workerContextPressureRecallUsageEntryTimeMs(entry: any = {}, fallbackMs = Date.now()) {
  const raw = entry.generated_at
    || entry.generatedAt
    || entry.at
    || entry.updated_at
    || entry.updatedAt
    || entry.last_seen_at
    || entry.lastSeenAt
    || "";
  const parsed = Date.parse(String(raw || ""));
  return Number.isFinite(parsed) ? parsed : fallbackMs;
}

export function workerContextPressureRecallUsageAgeDays(entry: any = {}, aging: any = {}) {
  const nowMs = Number(aging.now_ms || Date.now());
  const timeMs = workerContextPressureRecallUsageEntryTimeMs(entry, nowMs);
  return Math.max(0, (nowMs - timeMs) / (24 * 60 * 60 * 1000));
}

export function workerContextPressureRecallUsageDecayWeight(ageDays: any, aging: any = {}) {
  if (aging.enabled === false) return 1;
  const days = Math.max(0, Number(ageDays || 0));
  const halfLifeDays = Math.max(1, Number(aging.half_life_days || GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_HALF_LIFE_DAYS));
  const weight = Math.pow(0.5, days / halfLifeDays);
  return roundPressureRecallUsageWeight(Math.max(Number(aging.min_decay_weight || 0), weight), 4);
}

export function workerContextPressureRecallStatsKey(row: any = {}, targetProject = "") {
  const relPath = String(row.rel_path || row.relPath || "").trim().toLowerCase();
  const name = String(row.name || "").trim().toLowerCase();
  return [
    String(targetProject || row.target_project || row.targetProject || "").trim().toLowerCase(),
    relPath || checksum(name || row.source || row.value || "pressure-memory", 18),
  ].join("|");
}

export function workerContextPressureRecallUsageRecommendation(stats: any = {}) {
  const weightedTotal = Number(stats.weighted_total_count ?? stats.total_weighted_count ?? 0);
  const rawTotal = Number(stats.total_count || 0);
  const staleCount = Number(stats.stale_count || 0);
  const freshCount = Number(stats.fresh_count || 0);
  if (rawTotal > 0 && weightedTotal > 0 && weightedTotal < 0.5 && staleCount >= rawTotal && freshCount === 0) {
    return "stale_pressure_recall_history";
  }
  const used = Number(stats.weighted_used_count ?? stats.used_weighted_count ?? stats.used_count ?? 0);
  const verified = Number(stats.weighted_verified_count ?? stats.verified_weighted_count ?? stats.verified_count ?? 0);
  const ignored = Number(stats.weighted_ignored_count ?? stats.ignored_weighted_count ?? stats.ignored_count ?? 0);
  const mentioned = Number(stats.weighted_mentioned_count ?? stats.mentioned_weighted_count ?? stats.mentioned_count ?? 0);
  if (used + verified >= ignored + mentioned + 2) return "promote_pressure_recall";
  if (ignored >= used + verified + 2) return "deprioritize_pressure_recall";
  if (mentioned > 0 && used + verified + ignored === 0) return "require_pressure_usage_receipt";
  return "neutral_verify_current_pressure";
}

export function buildWorkerContextPressureRecallUsageEntry(groupId: string, input: any = {}, row: any = {}) {
  const usageState = normalizeWorkerContextPressureRecallUsageState(row.usage_state || row.usageState || row.status || row.state);
  if (!usageState) return null;
  const relPath = String(row.rel_path || row.relPath || "").trim();
  const name = compactText(row.name || row.title || "", 180);
  if (!relPath && !name) return null;
  const targetProject = String(row.target_project || row.targetProject || input.targetProject || input.target_project || "").trim();
  const agent = String(row.agent || input.agent || input.project || targetProject || "").trim();
  const generatedAt = String(input.generatedAt || input.generated_at || row.generated_at || row.generatedAt || now());
  const entryCore = {
    group_id: groupId,
    target_project: targetProject,
    agent,
    task_id: String(input.taskId || input.task_id || row.task_id || row.taskId || "").trim(),
    execution_id: String(input.executionId || input.execution_id || row.execution_id || row.executionId || "").trim(),
    worker_context_packet_id: String(row.worker_context_packet_id || row.workerContextPacketId || input.workerContextPacketId || input.worker_context_packet_id || "").trim(),
    memory_context_snapshot_id: String(row.memory_context_snapshot_id || row.memoryContextSnapshotId || input.memoryContextSnapshotId || input.memory_context_snapshot_id || "").trim(),
    rel_path: relPath,
    name,
    type: String(row.type || "").trim(),
    source: String(row.source || "").trim(),
    kinds: uniqueStrings(Array.isArray(row.kinds) ? row.kinds : [], 8),
    pressure_status: String(row.pressure_status || row.pressureStatus || "").trim(),
    pressure_adjustment: Number(row.pressure_adjustment ?? row.pressureAdjustment ?? row.adjustment ?? 0),
    usage_state: usageState,
    direct_reference: row.direct_reference === true || row.directReference === true,
    referenced: row.referenced === true,
    receipt_status: String(row.receipt_status || row.receiptStatus || "").trim(),
    provenance_status: String(row.provenance_status || row.provenanceStatus || "").trim(),
    repair_status: String(row.repair_status || row.repairStatus || "").trim(),
    repair_work_item_id: String(row.repair_work_item_id || row.repairWorkItemId || row.work_item_id || row.workItemId || "").trim(),
    repair_gap_type: String(row.repair_gap_type || row.repairGapType || row.gap_type || row.gapType || "").trim(),
    current_source_verified: row.current_source_verified === true || row.currentSourceVerified === true,
    reason: compactText(row.reason || row.note || "", 500),
    generated_at: generatedAt,
  };
  return {
    schema: "ccm-group-typed-memory-pressure-recall-usage-entry-v1",
    entry_id: `tmpru_${checksum(entryCore, 18)}`,
    ...entryCore,
  };
}

export function getGroupPressureRecallUsageRepairWorkItemsFile(groupId: string) {
  return require("./group-memory-recall-usage").getGroupPressureRecallUsageRepairWorkItemsFile(groupId);
}

export function normalizePressureRecallUsageRepairStatus(value: any) {
  const status = String(value || "").trim().toLowerCase();
  if (["in_progress", "running", "claimed", "dispatching"].includes(status)) return "in_progress";
  if (["blocked", "needs_info", "needs_user", "waiting"].includes(status)) return "blocked";
  if (["completed", "done", "resolved", "ok"].includes(status)) return "completed";
  if (["cancelled", "canceled", "superseded"].includes(status)) return "cancelled";
  return "pending";
}

export function pressureRecallUsageRepairOpen(status: any) {
  return ["pending", "in_progress", "blocked"].includes(normalizePressureRecallUsageRepairStatus(status));
}

export function normalizeWorkerContextPressureRecallUsageRepairHints(groupId: string, options: any = {}) {
  if (options.disablePressureRecallUsageRepairHints === true
    || options.disable_pressure_recall_usage_repair_hints === true
    || options.disableCrossGroupPressureRecallUsageRepairHints === true
    || options.disable_cross_group_pressure_recall_usage_repair_hints === true) return [];
  const explicit = options.workerContextPressureRecallUsageRepairHints
    || options.worker_context_pressure_recall_usage_repair_hints
    || options.pressureRecallUsageRepairHints
    || options.pressure_recall_usage_repair_hints
    || null;
  const rawItems = Array.isArray(explicit)
    ? explicit
    : Array.isArray(explicit?.items)
      ? explicit.items
      : (() => {
        try {
          const parsed = JSON.parse(fs.readFileSync(getGroupPressureRecallUsageRepairWorkItemsFile(groupId), "utf-8"));
          return Array.isArray(parsed?.items) ? parsed.items : [];
        } catch {
          return [];
        }
      })();
  const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
  const includeClosed = options.includeClosedPressureRecallUsageRepairHints === true
    || options.include_closed_pressure_recall_usage_repair_hints === true;
  return (Array.isArray(rawItems) ? rawItems : [])
    .map((item: any) => {
      const source = String(item.source || "").trim();
      const component = String(item.component || "").trim();
      if (source !== "cross_group_pressure_recall_usage_repair" && component !== "cross_group_pressure_recall_usage") return null;
      const status = normalizePressureRecallUsageRepairStatus(item.status);
      if (!includeClosed && !pressureRecallUsageRepairOpen(status)) return null;
      const itemProject = String(item.target_project || item.targetProject || item.target || "").trim();
      if (targetProject && itemProject && itemProject.toLowerCase() !== targetProject) return null;
      const relPath = String(item.cross_group_pressure_recall_usage_rel_path
        || item.crossGroupPressureRecallUsageRelPath
        || item.repair_target
        || item.repairTarget
        || "").trim();
      return {
        schema: "ccm-group-typed-memory-pressure-recall-usage-repair-hint-v1",
        work_item_id: String(item.work_item_id || item.workItemId || item.id || "").trim(),
        status,
        open: pressureRecallUsageRepairOpen(status),
        priority: String(item.priority || "").trim(),
        gap_type: String(item.cross_group_pressure_recall_usage_gap_type || item.crossGroupPressureRecallUsageGapType || "").trim(),
        rel_path: relPath,
        target_project: itemProject,
        local_recommendation: String(item.local_recommendation || item.localRecommendation || "").trim(),
        cross_group_recommendation: String(item.cross_group_recommendation || item.crossGroupRecommendation || "").trim(),
        reason: compactText(item.cross_group_pressure_recall_usage_reason || item.reason || item.description || "", 420),
        source_group_count: Number(item.source_group_count || item.sourceGroupCount || 0),
        source_groups: Array.isArray(item.source_groups || item.sourceGroups) ? (item.source_groups || item.sourceGroups).slice(0, 8) : [],
        updated_at: String(item.updatedAt || item.updated_at || item.lastSeenAt || item.last_seen_at || "").trim(),
      };
    })
    .filter(Boolean);
}

export function matchWorkerContextPressureRecallUsageRepairHint(row: any = {}, repairHints: any[] = [], fallbackTargetProject = "") {
  if (!Array.isArray(repairHints) || !repairHints.length) return null;
  const relPath = String(row.rel_path || row.relPath || "").trim().toLowerCase();
  const targetProject = String(row.target_project || row.targetProject || fallbackTargetProject || "").trim().toLowerCase();
  return repairHints.find((hint: any) => {
    const hintRelPath = String(hint.rel_path || hint.relPath || "").trim().toLowerCase();
    const hintProject = String(hint.target_project || hint.targetProject || "").trim().toLowerCase();
    if (hintProject && targetProject && hintProject !== targetProject) return false;
    return !!hintRelPath && !!relPath && hintRelPath === relPath;
  }) || null;
}

export function normalizeWorkerContextPressureRecallUsageStatsRow(row: any = {}, aging: any = {}) {
  const clone: any = { ...row };
  const ageDays = workerContextPressureRecallUsageAgeDays({
    last_seen_at: clone.last_seen_at || clone.lastSeenAt || clone.generated_at || clone.generatedAt,
  }, aging);
  const weight = workerContextPressureRecallUsageDecayWeight(ageDays, aging);
  for (const state of ["used", "verified", "ignored", "mentioned"]) {
    const raw = Number(clone[`${state}_count`] || 0);
    clone[`weighted_${state}_count`] = roundPressureRecallUsageWeight(raw * weight);
  }
  clone.weighted_total_count = roundPressureRecallUsageWeight(Number(clone.total_count || 0) * weight);
  clone.decay_weight = weight;
  clone.age_days = roundPressureRecallUsageWeight(ageDays, 2);
  clone.stale_count = ageDays >= Number(aging.stale_after_days || GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS) ? Number(clone.total_count || 0) : 0;
  clone.fresh_count = Number(clone.total_count || 0) - Number(clone.stale_count || 0);
  clone.recommendation = workerContextPressureRecallUsageRecommendation(clone);
  return clone;
}

export function buildWorkerContextPressureRecallUsageStatsRowsFromEntries(entries: any[] = [], aging: any = {}) {
  const stats: Record<string, any> = {};
  for (const entry of Array.isArray(entries) ? entries : []) {
    const usageState = normalizeWorkerContextPressureRecallUsageState(entry?.usage_state || entry?.usageState);
    if (!usageState) continue;
    const key = workerContextPressureRecallStatsKey(entry, entry?.target_project || entry?.targetProject);
    const current = stats[key] || {
      rel_path: entry.rel_path || entry.relPath || "",
      name: entry.name || "",
      type: entry.type || "",
      source: entry.source || "",
      target_project: entry.target_project || entry.targetProject || "",
      kinds: [],
      used_count: 0,
      ignored_count: 0,
      verified_count: 0,
      mentioned_count: 0,
      weighted_used_count: 0,
      weighted_ignored_count: 0,
      weighted_verified_count: 0,
      weighted_mentioned_count: 0,
      total_count: 0,
      weighted_total_count: 0,
      stale_count: 0,
      fresh_count: 0,
      agents: [],
      task_ids: [],
      packet_ids: [],
      group_ids: [],
      provenance_statuses: [],
      repair_work_item_ids: [],
      repair_statuses: [],
      repair_gap_types: [],
      first_seen_at: entry.generated_at || entry.generatedAt || "",
      max_age_days: 0,
      min_age_days: null,
    };
    current.rel_path = current.rel_path || entry.rel_path || entry.relPath || "";
    current.name = current.name || entry.name || "";
    current.type = current.type || entry.type || "";
    current.source = current.source || entry.source || "";
    current.target_project = current.target_project || entry.target_project || entry.targetProject || "";
    current.kinds = uniqueStrings([...(Array.isArray(current.kinds) ? current.kinds : []), ...(Array.isArray(entry.kinds) ? entry.kinds : [])], 12);
    current[`${usageState}_count`] = Number(current[`${usageState}_count`] || 0) + 1;
    current.total_count = Number(current.total_count || 0) + 1;
    const ageDays = workerContextPressureRecallUsageAgeDays(entry, aging);
    const decayWeight = workerContextPressureRecallUsageDecayWeight(ageDays, aging);
    current[`weighted_${usageState}_count`] = Number(current[`weighted_${usageState}_count`] || 0) + decayWeight;
    current.weighted_total_count = Number(current.weighted_total_count || 0) + decayWeight;
    if (ageDays >= Number(aging.stale_after_days || GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS)) current.stale_count = Number(current.stale_count || 0) + 1;
    else current.fresh_count = Number(current.fresh_count || 0) + 1;
    current.max_age_days = Math.max(Number(current.max_age_days || 0), ageDays);
    current.min_age_days = current.min_age_days === null ? ageDays : Math.min(Number(current.min_age_days || ageDays), ageDays);
    const generatedAt = entry.generated_at || entry.generatedAt || "";
    current.first_seen_at = current.first_seen_at && generatedAt
      ? String(current.first_seen_at).localeCompare(String(generatedAt)) <= 0 ? current.first_seen_at : generatedAt
      : current.first_seen_at || generatedAt;
    if (!current.last_seen_at || String(generatedAt || "").localeCompare(String(current.last_seen_at || "")) > 0) {
      current.last_seen_at = generatedAt;
      current.last_usage_state = usageState;
      current.last_agent = entry.agent || "";
      current.last_task_id = entry.task_id || entry.taskId || "";
      current.last_worker_context_packet_id = entry.worker_context_packet_id || entry.workerContextPacketId || "";
      current.last_pressure_status = entry.pressure_status || entry.pressureStatus || "";
      current.last_provenance_status = entry.provenance_status || entry.provenanceStatus || "";
      current.last_repair_status = entry.repair_status || entry.repairStatus || "";
      current.last_repair_work_item_id = entry.repair_work_item_id || entry.repairWorkItemId || "";
      current.last_repair_gap_type = entry.repair_gap_type || entry.repairGapType || "";
    }
    current.agents = uniqueStrings([...(Array.isArray(current.agents) ? current.agents : []), entry.agent].filter(Boolean), 12);
    current.task_ids = uniqueStrings([...(Array.isArray(current.task_ids) ? current.task_ids : []), entry.task_id || entry.taskId].filter(Boolean), 12);
    current.packet_ids = uniqueStrings([...(Array.isArray(current.packet_ids) ? current.packet_ids : []), entry.worker_context_packet_id || entry.workerContextPacketId].filter(Boolean), 12);
    current.group_ids = uniqueStrings([...(Array.isArray(current.group_ids) ? current.group_ids : []), entry.group_id || entry.groupId].filter(Boolean), 24);
    current.provenance_statuses = uniqueStrings([...(Array.isArray(current.provenance_statuses) ? current.provenance_statuses : []), entry.provenance_status || entry.provenanceStatus].filter(Boolean), 12);
    current.repair_work_item_ids = uniqueStrings([...(Array.isArray(current.repair_work_item_ids) ? current.repair_work_item_ids : []), entry.repair_work_item_id || entry.repairWorkItemId].filter(Boolean), 12);
    current.repair_statuses = uniqueStrings([...(Array.isArray(current.repair_statuses) ? current.repair_statuses : []), entry.repair_status || entry.repairStatus].filter(Boolean), 12);
    current.repair_gap_types = uniqueStrings([...(Array.isArray(current.repair_gap_types) ? current.repair_gap_types : []), entry.repair_gap_type || entry.repairGapType].filter(Boolean), 12);
    current.current_source_verified_count = Number(current.current_source_verified_count || 0) + (entry.current_source_verified === true || entry.currentSourceVerified === true ? 1 : 0);
    stats[key] = current;
  }
  return Object.values(stats).map((row: any) => {
    for (const state of ["used", "verified", "ignored", "mentioned"]) {
      row[`weighted_${state}_count`] = roundPressureRecallUsageWeight(row[`weighted_${state}_count`] || 0);
    }
    row.weighted_total_count = roundPressureRecallUsageWeight(row.weighted_total_count || 0);
    row.max_age_days = roundPressureRecallUsageWeight(row.max_age_days || 0, 2);
    row.min_age_days = row.min_age_days === null ? 0 : roundPressureRecallUsageWeight(row.min_age_days || 0, 2);
    row.avg_decay_weight = row.total_count ? roundPressureRecallUsageWeight(Number(row.weighted_total_count || 0) / Number(row.total_count || 1), 4) : 0;
    row.recommendation = workerContextPressureRecallUsageRecommendation(row);
    return row;
  });
}

export function summarizeWorkerContextPressureRecallUsageRows(statsRows: any[] = []) {
  const totals = statsRows.reduce((acc: any, row: any) => {
    acc.used += Number(row.used_count || 0);
    acc.ignored += Number(row.ignored_count || 0);
    acc.verified += Number(row.verified_count || 0);
    acc.mentioned += Number(row.mentioned_count || 0);
    acc.total += Number(row.total_count || 0);
    return acc;
  }, { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 });
  const weightedTotals = statsRows.reduce((acc: any, row: any) => {
    acc.used += Number(row.weighted_used_count || 0);
    acc.ignored += Number(row.weighted_ignored_count || 0);
    acc.verified += Number(row.weighted_verified_count || 0);
    acc.mentioned += Number(row.weighted_mentioned_count || 0);
    acc.total += Number(row.weighted_total_count || 0);
    return acc;
  }, { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 });
  for (const key of Object.keys(weightedTotals)) weightedTotals[key] = roundPressureRecallUsageWeight(weightedTotals[key]);
  return {
    totals,
    weightedTotals,
    stale_memory_count: statsRows.filter((row: any) => row.recommendation === "stale_pressure_recall_history" || Number(row.stale_count || 0) > 0 && Number(row.fresh_count || 0) === 0).length,
    stale_entry_count: statsRows.reduce((sum: number, row: any) => sum + Number(row.stale_count || 0), 0),
    fresh_entry_count: statsRows.reduce((sum: number, row: any) => sum + Number(row.fresh_count || 0), 0),
  };
}

export function sortWorkerContextPressureRecallUsageRows(statsRows: any[] = []) {
  return [...(Array.isArray(statsRows) ? statsRows : [])].sort((a: any, b: any) => {
    const aScore = Number(a.weighted_used_count ?? a.used_count ?? 0) * 3
      + Number(a.weighted_verified_count ?? a.verified_count ?? 0) * 2
      - Number(a.weighted_ignored_count ?? a.ignored_count ?? 0)
      - Number(a.weighted_mentioned_count ?? a.mentioned_count ?? 0);
    const bScore = Number(b.weighted_used_count ?? b.used_count ?? 0) * 3
      + Number(b.weighted_verified_count ?? b.verified_count ?? 0) * 2
      - Number(b.weighted_ignored_count ?? b.ignored_count ?? 0)
      - Number(b.weighted_mentioned_count ?? b.mentioned_count ?? 0);
    return bScore - aScore || String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || ""));
  });
}

export function filterWorkerContextPressureRecallUsageRows(statsRows: any[] = [], options: any = {}) {
  const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
  const docs = Array.isArray(options.docs || options.recalledDocs || options.recalled_docs) ? (options.docs || options.recalledDocs || options.recalled_docs) : [];
  const relPaths = new Set(docs.map((doc: any) => String(doc.relPath || doc.rel_path || "").trim().toLowerCase()).filter(Boolean));
  const names = new Set(docs.map((doc: any) => String(doc.name || "").trim().toLowerCase()).filter(Boolean));
  return sortWorkerContextPressureRecallUsageRows((Array.isArray(statsRows) ? statsRows : [])
    .filter((row: any) => !targetProject || String(row.target_project || "").toLowerCase() === targetProject)
    .filter((row: any) => !relPaths.size && !names.size
      || relPaths.has(String(row.rel_path || "").trim().toLowerCase())
      || names.has(String(row.name || "").trim().toLowerCase())));
}

export function buildWorkerContextPressureRecallUsageSummaryFromRows(groupId: string, statsRows: any[] = [], options: any = {}) {
  const aging = options.aging?.schema ? options.aging : normalizeWorkerContextPressureRecallUsageAging(options);
  const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
  const summaryStats = summarizeWorkerContextPressureRecallUsageRows(statsRows);
  return {
    schema: String(options.schema || "ccm-group-typed-memory-pressure-recall-usage-summary-v1"),
    version: 1,
    groupId,
    target_project: targetProject,
    ledger_file: String(options.ledgerFile || options.ledger_file || ""),
    has_history: statsRows.length > 0,
    memory_count: statsRows.length,
    totals: summaryStats.totals,
    weighted_totals: summaryStats.weightedTotals,
    aging: {
      ...aging,
      stale_memory_count: summaryStats.stale_memory_count,
      stale_entry_count: summaryStats.stale_entry_count,
      fresh_entry_count: summaryStats.fresh_entry_count,
    },
    useful_pressure_memories: statsRows.filter((row: any) => ["promote_pressure_recall", "neutral_verify_current_pressure"].includes(row.recommendation)).slice(0, 8),
    ignored_pressure_memories: statsRows.filter((row: any) => row.recommendation === "deprioritize_pressure_recall").slice(0, 8),
    missing_usage_pressure_memories: statsRows.filter((row: any) => row.recommendation === "require_pressure_usage_receipt").slice(0, 8),
    stale_pressure_memories: statsRows.filter((row: any) => row.recommendation === "stale_pressure_recall_history").slice(0, 8),
    rows: statsRows.slice(0, 16),
    recent_entries: Array.isArray(options.recentEntries || options.recent_entries) ? (options.recentEntries || options.recent_entries).slice(-16) : [],
    updatedAt: String(options.updatedAt || options.updated_at || ""),
  };
}

export function buildGroupTypedMemoryPressureRecallUsageSummary(groupId: string, options: any = {}) {
  return require("./group-memory-recall-usage").buildGroupTypedMemoryPressureRecallUsageSummary(groupId, options);
}

export function buildGroupTypedMemoryPressureRecallUsageProjectSummary(groupId: string, options: any = {}) {
  return require("./group-memory-recall-usage").buildGroupTypedMemoryPressureRecallUsageProjectSummary(groupId, options);
}

export function normalizeWorkerContextPressureRecallUsageHints(groupId: string, options: any = {}) {
  const explicit = options.workerContextPressureRecallUsage
    || options.worker_context_pressure_recall_usage
    || options.pressureRecallUsage
    || options.pressure_recall_usage
    || null;
  const summary = explicit?.schema ? explicit : buildGroupTypedMemoryPressureRecallUsageSummary(groupId, {
    targetProject: options.targetProject || options.target_project,
    nowMs: options.nowMs || options.now_ms,
    now: options.now,
    generatedAt: options.generatedAt || options.generated_at,
    usageHalfLifeDays: options.usageHalfLifeDays || options.usage_half_life_days,
    usageStaleAfterDays: options.usageStaleAfterDays || options.usage_stale_after_days,
    disableUsageAging: options.disableUsageAging || options.disable_usage_aging,
  });
  const crossGroupDisabled = explicit?.schema
    || options.disableCrossGroupPressureRecallUsage === true
    || options.disable_cross_group_pressure_recall_usage === true
    || options.crossGroupPressureRecallUsage === false
    || options.cross_group_pressure_recall_usage === false;
  const crossGroupSummary = crossGroupDisabled ? null : buildGroupTypedMemoryPressureRecallUsageProjectSummary(groupId, {
    targetProject: options.targetProject || options.target_project,
    nowMs: options.nowMs || options.now_ms,
    now: options.now,
    generatedAt: options.generatedAt || options.generated_at,
    usageHalfLifeDays: options.usageHalfLifeDays || options.usage_half_life_days,
    usageStaleAfterDays: options.usageStaleAfterDays || options.usage_stale_after_days,
    disableUsageAging: options.disableUsageAging || options.disable_usage_aging,
    groupIds: options.crossGroupPressureRecallUsageGroupIds
      || options.cross_group_pressure_recall_usage_group_ids
      || options.crossGroupIds
      || options.cross_group_ids,
    maxGroups: options.maxCrossGroupPressureRecallUsageGroups || options.max_cross_group_pressure_recall_usage_groups,
  });
  const rowsFromSummary = (value: any, scope: string) => [
    ...(Array.isArray(value?.useful_pressure_memories || value?.usefulPressureMemories) ? (value.useful_pressure_memories || value.usefulPressureMemories) : []),
    ...(Array.isArray(value?.ignored_pressure_memories || value?.ignoredPressureMemories) ? (value.ignored_pressure_memories || value.ignoredPressureMemories) : []),
    ...(Array.isArray(value?.missing_usage_pressure_memories || value?.missingUsagePressureMemories) ? (value.missing_usage_pressure_memories || value.missingUsagePressureMemories) : []),
    ...(Array.isArray(value?.stale_pressure_memories || value?.stalePressureMemories) ? (value.stale_pressure_memories || value.stalePressureMemories) : []),
    ...(Array.isArray(value?.rows) ? value.rows : []),
  ].map((row: any) => ({
    ...row,
    hint_scope: row.hint_scope || scope,
    source_group_count: row.source_group_count || value?.source_group_count || 0,
    source_groups: row.source_groups || value?.source_groups || [],
  }));
  const localRows = rowsFromSummary(summary, "local_group");
  const localDocKeys = new Set(localRows.map((row: any) => `${String(row.rel_path || row.relPath || "").trim().toLowerCase()}|${String(row.name || "").trim().toLowerCase()}`));
  const crossRows = rowsFromSummary(crossGroupSummary, "cross_group_project")
    .filter((row: any) => !localDocKeys.has(`${String(row.rel_path || row.relPath || "").trim().toLowerCase()}|${String(row.name || "").trim().toLowerCase()}`));
  const rows = [...localRows, ...crossRows];
  const repairHints = normalizeWorkerContextPressureRecallUsageRepairHints(groupId, options);
  const seen = new Set<string>();
  return rows.map((row: any) => {
    const targetProject = String(row.target_project || row.targetProject || summary?.target_project || (summary as any)?.targetProject || crossGroupSummary?.target_project || (crossGroupSummary as any)?.targetProject || options.targetProject || options.target_project || "").trim();
    const repairHint = matchWorkerContextPressureRecallUsageRepairHint(row, repairHints, targetProject);
    const normalized = {
      rel_path: String(row.rel_path || row.relPath || "").trim(),
      name: String(row.name || "").trim(),
      target_project: targetProject,
      hint_scope: String(row.hint_scope || row.hintScope || "").trim() || "local_group",
      source_group_count: Number(row.source_group_count || row.sourceGroupCount || 0),
      group_ids: uniqueStrings(Array.isArray(row.group_ids || row.groupIds) ? (row.group_ids || row.groupIds) : [], 24),
      recommendation: String(row.recommendation || "").trim() || workerContextPressureRecallUsageRecommendation(row),
      used_count: Number(row.used_count || row.usedCount || 0),
      verified_count: Number(row.verified_count || row.verifiedCount || 0),
      ignored_count: Number(row.ignored_count || row.ignoredCount || 0),
      mentioned_count: Number(row.mentioned_count || row.mentionedCount || 0),
      weighted_used_count: Number(row.weighted_used_count || row.used_weighted_count || row.weightedUsedCount || 0),
      weighted_verified_count: Number(row.weighted_verified_count || row.verified_weighted_count || row.weightedVerifiedCount || 0),
      weighted_ignored_count: Number(row.weighted_ignored_count || row.ignored_weighted_count || row.weightedIgnoredCount || 0),
      weighted_mentioned_count: Number(row.weighted_mentioned_count || row.mentioned_weighted_count || row.weightedMentionedCount || 0),
      weighted_total_count: Number(row.weighted_total_count || row.total_weighted_count || row.weightedTotalCount || 0),
      stale_count: Number(row.stale_count || row.staleCount || 0),
      fresh_count: Number(row.fresh_count || row.freshCount || 0),
      avg_decay_weight: Number(row.avg_decay_weight || row.avgDecayWeight || row.decay_weight || row.decayWeight || 0),
      max_age_days: Number(row.max_age_days || row.maxAgeDays || row.age_days || row.ageDays || 0),
      repair_status: repairHint?.status || "",
      repair_open: repairHint?.open === true,
      repair_work_item_id: repairHint?.work_item_id || "",
      repair_gap_type: repairHint?.gap_type || "",
      repair_priority: repairHint?.priority || "",
      repair_reason: repairHint?.reason || "",
      repair_local_recommendation: repairHint?.local_recommendation || "",
      repair_cross_group_recommendation: repairHint?.cross_group_recommendation || "",
      repair_source_group_count: Number(repairHint?.source_group_count || 0),
      provenance_status: repairHint?.open === true
        ? (repairHint?.gap_type === "recommendation_conflict" ? "disputed_under_repair" : "stale_evidence_under_repair")
        : String(row.hint_scope || row.hintScope || "").trim() === "cross_group_project"
          ? "cross_group_project_assist"
          : "local_group_evidence",
    };
    const key = `${normalized.rel_path.toLowerCase()}|${normalized.name.toLowerCase()}|${normalized.recommendation}|${normalized.hint_scope}`;
    if (!normalized.rel_path && !normalized.name || seen.has(key)) return null;
    seen.add(key);
    return normalized;
  }).filter(Boolean);
}

export function scoreWorkerContextPressureRecallUsageHint(doc: any, hints: any[] = [], signals: any = {}) {
  const matched: any[] = [];
  let adjustment = 0;
  if (signals.active !== true || !Array.isArray(hints) || !hints.length) return { adjustment, matched };
  const relPath = String(doc.relPath || doc.rel_path || "").trim().toLowerCase();
  const name = String(doc.name || "").trim().toLowerCase();
  for (const hint of hints) {
    const hintRelPath = String(hint.rel_path || hint.relPath || "").trim().toLowerCase();
    const hintName = String(hint.name || "").trim().toLowerCase();
    const matches = (!!hintRelPath && hintRelPath === relPath) || (!!hintName && hintName === name);
    if (!matches) continue;
    let delta = 0;
    const weightedUsed = Number(hint.weighted_used_count || hint.used_count || 0);
    const weightedVerified = Number(hint.weighted_verified_count || hint.verified_count || 0);
    const weightedIgnored = Number(hint.weighted_ignored_count || hint.ignored_count || 0);
    if (hint.recommendation === "promote_pressure_recall") delta = 5 + Math.min(5, Math.round(weightedUsed + weightedVerified));
    else if (hint.recommendation === "deprioritize_pressure_recall") delta = -7 - Math.min(5, Math.round(weightedIgnored));
    else if (hint.recommendation === "require_pressure_usage_receipt") delta = 1;
    else if (hint.recommendation === "stale_pressure_recall_history") delta = 0;
    else delta = 2;
    adjustment += delta;
    matched.push({
      rel_path: hint.rel_path,
      name: hint.name,
      target_project: hint.target_project || "",
      recommendation: hint.recommendation,
      delta,
      weighted_used_count: hint.weighted_used_count || 0,
      weighted_verified_count: hint.weighted_verified_count || 0,
      weighted_ignored_count: hint.weighted_ignored_count || 0,
      stale_count: hint.stale_count || 0,
      fresh_count: hint.fresh_count || 0,
      avg_decay_weight: hint.avg_decay_weight || 0,
      max_age_days: hint.max_age_days || 0,
      hint_scope: hint.hint_scope || "",
      source_group_count: hint.source_group_count || 0,
      group_ids: hint.group_ids || [],
      provenance_status: hint.provenance_status || "",
      repair_status: hint.repair_status || "",
      repair_open: hint.repair_open === true,
      repair_work_item_id: hint.repair_work_item_id || "",
      repair_gap_type: hint.repair_gap_type || "",
      repair_priority: hint.repair_priority || "",
      repair_reason: hint.repair_reason || "",
      repair_local_recommendation: hint.repair_local_recommendation || "",
      repair_cross_group_recommendation: hint.repair_cross_group_recommendation || "",
      repair_source_group_count: hint.repair_source_group_count || 0,
    });
  }
  return { adjustment, matched };
}

export function normalizePressureProvenanceDispatchFeedbackPolicyForRecall(options: any = {}) {
  const candidate = options.pressureProvenanceDispatchFeedbackPolicy
    || options.pressure_provenance_dispatch_feedback_policy
    || options.pressureProvenancePreDispatchComplianceDispatchPolicy
    || options.pressure_provenance_pre_dispatch_compliance_dispatch_policy
    || null;
  if (!candidate || typeof candidate !== "object") {
    return {
      schema: "ccm-pressure-provenance-feedback-recall-risk-policy-v1",
      active: false,
      disabled: false,
      policyRows: [],
    };
  }
  const policyRows = Array.isArray(candidate.policyRows || candidate.policy_rows)
    ? (candidate.policyRows || candidate.policy_rows)
    : [];
  const disabled = candidate.disabled === true || candidate.disable === true;
  return {
    ...candidate,
    schema: candidate.schema || "ccm-pressure-provenance-feedback-recall-risk-policy-v1",
    active: candidate.active === true && !disabled,
    disabled,
    policyRows,
    targetProject: candidate.targetProject || candidate.target_project || "",
    agentType: candidate.agentType || candidate.agent_type || "unknown",
    severity: candidate.severity || "",
    action: candidate.action || "",
  };
}

export function pressureProvenanceFeedbackRecallRepairQuery(text: string, queryTokens: string[] = []) {
  const haystack = `${text}\n${queryTokens.join("\n")}`.toLowerCase();
  return /memoryprovenanceusage|current_source_verified|currentsourceverified|repairworkitem|repair_work_item|provenance_status|disputed_under_repair|stale_evidence_under_repair|pressure provenance|provenance repair|repair provenance|压力.*来源|来源.*修复|来源核验|记忆.*回执|回执.*核验|回执.*修复/.test(haystack);
}

export function pressureProvenanceFeedbackRecallUnderRepair(value: any = {}) {
  const provenance = String(value.provenance_status || value.provenanceStatus || "").trim().toLowerCase();
  return provenance === "disputed_under_repair"
    || provenance === "stale_evidence_under_repair"
    || !!String(value.repair_work_item_id || value.repairWorkItemId || value.work_item_id || value.workItemId || "").trim()
    || value.repair_open === true
    || value.repairOpen === true;
}

export function scoreWorkerContextPressureFeedbackPolicyRecallRisk(doc: any, corpus: string, pressureUsage: any = {}, policy: any = {}, queryText = "", queryTokens: string[] = []) {
  const active = policy?.active === true && policy?.disabled !== true;
  const matched = Array.isArray(pressureUsage?.matched)
    ? pressureUsage.matched.filter((match: any) => pressureProvenanceFeedbackRecallUnderRepair(match))
    : [];
  const haystack = `${doc.relPath || ""}\n${doc.name || ""}\n${doc.description || ""}\n${corpus}`.toLowerCase();
  const textRisk = /disputed_under_repair|stale_evidence_under_repair|repair_open\s*[:=]\s*true/.test(haystack);
  const riskDoc = matched.length > 0 || pressureProvenanceFeedbackRecallUnderRepair(doc) || textRisk;
  if (!active || !riskDoc) {
    return {
      schema: "ccm-worker-context-pressure-provenance-feedback-recall-risk-v1",
      active,
      adjustment: 0,
      matched,
      risk_doc: riskDoc,
      repair_first: false,
      action: active ? "no_risk_detected" : "policy_inactive",
    };
  }
  const repairFirst = pressureProvenanceFeedbackRecallRepairQuery(queryText, queryTokens);
  const severity = String(policy.severity || "").toLowerCase();
  const delta = repairFirst ? 0 : severity === "high" ? -16 : -12;
  return {
    schema: "ccm-worker-context-pressure-provenance-feedback-recall-risk-v1",
    active: true,
    adjustment: delta,
    matched,
    risk_doc: true,
    text_risk: textRisk,
    repair_first: repairFirst,
    action: repairFirst ? "repair_first_preserve_risky_pressure_memory" : "deprioritize_risky_pressure_memory",
    reason: repairFirst
      ? "feedback policy active; task asks for provenance/repair work, so keep risky pressure memory visible but require repair-first current-source verification"
      : "feedback policy active for this agent/project; risky under-repair pressure memory is downranked unless the task explicitly asks for provenance repair",
    policy_action: policy.action || "",
    policy_severity: policy.severity || "",
    target_project: policy.targetProject || policy.target_project || "",
    agent_type: policy.agentType || policy.agent_type || "unknown",
  };
}

// ===== merged from typed-memory-recall-part-02.ts =====

// Behavior-freeze module extracted mechanically from the former facade.


export function pressureMemoryProvenanceStringList(...values: any[]) {
  return uniqueStrings(values.flatMap(value => {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === "") return [];
    return [value];
  }).map((item: any) => String(item || "").trim()).filter(Boolean), 24);
}

export function pressureMemoryProvenanceRowsFromRawRecovery(entry: any = {}) {
  const recovery = entry.raw_recovery || entry.rawRecovery || {};
  const docs = Array.isArray(recovery.requiredDocs || recovery.required_docs) ? (recovery.requiredDocs || recovery.required_docs) : [];
  return docs.map((doc: any) => ({
    rel_path: doc.rel_path || doc.relPath || "",
    name: doc.name || "",
    provenance_status: doc.provenance_status || doc.provenanceStatus || "",
    repair_work_item_id: doc.repair_work_item_id || doc.repairWorkItemId || "",
    repair_status: doc.repair_status || doc.repairStatus || "",
    repair_gap_type: doc.repair_gap_type || doc.repairGapType || "",
  }));
}

export function pressureProvenancePreDispatchComplianceInputRows(input: any = {}) {
  if (Array.isArray(input)) return input;
  const rows = [
    ...(Array.isArray(input.rows) ? input.rows : []),
    ...(Array.isArray(input.packets) ? input.packets : []),
    ...(Array.isArray(input.violations) ? input.violations : []),
    ...(Array.isArray(input.failures) ? input.failures : []),
    ...(Array.isArray(input.gaps) ? input.gaps : []),
  ];
  if (rows.length) return rows;
  const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
  return groups.flatMap((group: any) => [
    ...(Array.isArray(group.packets) ? group.packets : []),
    ...(Array.isArray(group.violations) ? group.violations : []),
    ...(Array.isArray(group.failures) ? group.failures : []),
    ...(Array.isArray(group.gaps) ? group.gaps : []),
  ].map((row: any) => ({ ...row, groupId: row.groupId || row.group_id || group.groupId || group.group_id || "" })));
}

export function pressureProvenancePreDispatchComplianceRowId(row: any = {}) {
  return `pressure-provenance-pre-dispatch-compliance:${checksum([
    row.groupId,
    row.packet_id,
    row.binding_id,
    row.project,
    row.agent_type,
    row.status,
    row.gap_signature,
    row.rel_paths,
    row.repair_work_item_ids,
  ], 24)}`;
}

export function normalizePressureProvenancePreDispatchComplianceRows(input: any = {}, options: any = {}) {
  const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
  return pressureProvenancePreDispatchComplianceInputRows(input).map((raw: any, index: number) => {
    const entry = raw?.entry || raw?.packet || raw?.violation || raw || {};
    const gaps = [
      ...(Array.isArray(entry.gaps) ? entry.gaps : []),
      ...(Array.isArray(raw?.gaps) ? raw.gaps : []),
    ];
    const gapCodes = uniqueStrings(gaps.map((gap: any) => typeof gap === "string" ? gap : gap?.code || gap?.reason || gap?.type || gap?.severity || "").filter(Boolean), 24);
    const docs = [
      ...(Array.isArray(entry.docs) ? entry.docs : []),
      ...(Array.isArray(entry.requiredDocs) ? entry.requiredDocs : []),
      ...(Array.isArray(entry.required_docs) ? entry.required_docs : []),
    ];
    const relPaths = uniqueStrings([
      ...(Array.isArray(entry.rel_paths) ? entry.rel_paths : []),
      ...(Array.isArray(entry.relPaths) ? entry.relPaths : []),
      ...docs.map((doc: any) => doc.rel_path || doc.relPath || doc.relPath || doc.name || ""),
    ], 40);
    const repairIds = uniqueStrings([
      ...(Array.isArray(entry.repair_work_item_ids) ? entry.repair_work_item_ids : []),
      ...(Array.isArray(entry.repairWorkItemIds) ? entry.repairWorkItemIds : []),
      ...docs.map((doc: any) => doc.repair_work_item_id || doc.repairWorkItemId || ""),
    ], 40);
    const status = String(entry.status || raw?.status || (gapCodes.length ? "non_compliant" : "compliant")).trim().toLowerCase();
    const row = {
      schema: "ccm-pressure-provenance-pre-dispatch-compliance-distilled-row-v1",
      version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
      groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
      packet_id: String(entry.packet_id || entry.packetId || entry.worker_context_packet_id || entry.workerContextPacketId || raw?.packet_id || "").trim(),
      binding_id: String(entry.binding_id || entry.bindingId || entry.worker_context_packet_binding_id || raw?.binding_id || "").trim(),
      assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
      dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
      project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
      agent_type: String(entry.agent_type || entry.agentType || entry.executor || raw?.agent_type || raw?.agentType || options.agentType || options.agent_type || "unknown").trim() || "unknown",
      status,
      pre_dispatch_prompted: entry.pre_dispatch_prompted !== false && entry.preDispatchPrompted !== false,
      required_doc_count: Number(entry.required_doc_count || entry.requiredDocCount || docs.length || 0),
      discipline_doc_count: Number(entry.discipline_doc_count || entry.disciplineDocCount || 0),
      receipt_row_count: Number(entry.receipt_row_count || entry.receiptRowCount || 0),
      missing_receipt: entry.missing_receipt === true || gapCodes.some((code: string) => /child_agent_receipt|missing.*receipt/i.test(code)),
      missing_memory_provenance_usage: entry.missing_memory_provenance_usage === true || gapCodes.some((code: string) => /memoryProvenanceUsage|receipt_memoryProvenanceUsage/i.test(code)),
      current_source_verified_gap: entry.current_source_verified_gap === true || gapCodes.some((code: string) => /currentSourceVerified|current_source_verified/i.test(code)),
      rel_paths: relPaths,
      repair_work_item_ids: repairIds,
      gap_codes: gapCodes,
      gap_signature: gapCodes.join("|"),
      reason: compactText(entry.reason || raw?.reason || gapCodes.join("; ") || "pressure provenance pre-dispatch compliance gap", 1000),
      first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
      last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
      source_index: Number(raw?.source_index || raw?.sourceIndex || index),
    };
    return { ...row, row_id: pressureProvenancePreDispatchComplianceRowId(row) };
  })
    .filter((row: any) => row.groupId || fallbackGroupId)
    .filter((row: any) => row.pre_dispatch_prompted === true && (row.status !== "compliant" || row.gap_codes.length || row.missing_receipt || row.missing_memory_provenance_usage || row.current_source_verified_gap));
}

export function mergePressureProvenancePreDispatchComplianceRows(existing: any[] = [], incoming: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const merged = new Map<string, any>();
  for (const row of existing || []) {
    const id = String(row.row_id || pressureProvenancePreDispatchComplianceRowId(row));
    merged.set(id, { ...row, row_id: id });
  }
  const previousIds = new Set(merged.keys());
  for (const row of incoming || []) {
    const id = String(row.row_id || pressureProvenancePreDispatchComplianceRowId(row));
    const previous = merged.get(id);
    merged.set(id, {
      ...(previous || {}),
      ...row,
      row_id: id,
      first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
      last_seen_at: updatedAt,
      seen_count: Number(previous?.seen_count || 0) + 1,
    });
  }
  const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 120)));
  const rows = [...merged.values()]
    .sort((a: any, b: any) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
    .slice(-limit);
  return {
    rows,
    newRowCount: rows.filter((row: any) => !previousIds.has(row.row_id)).length,
    updatedRowCount: rows.filter((row: any) => previousIds.has(row.row_id) && incoming.some((item: any) => String(item.row_id || "") === row.row_id)).length,
    prunedRowCount: Math.max(0, merged.size - rows.length),
  };
}

export function pressureProvenancePreDispatchComplianceArchive(rows: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const threshold = Math.max(1, Number(options.frequentThreshold || options.frequent_threshold || 2));
  const attributionMap = new Map<string, any>();
  for (const row of rows) {
    const key = `${row.agent_type || "unknown"}|${row.project || "unknown"}`;
    const current = attributionMap.get(key) || {
      agent_type: row.agent_type || "unknown",
      project: row.project || "unknown",
      violation_count: 0,
      packet_count: 0,
      missing_receipt_count: 0,
      missing_memory_provenance_usage_count: 0,
      current_source_verified_gap_count: 0,
      rel_paths: new Set<string>(),
      repair_work_item_ids: new Set<string>(),
      gap_codes: new Set<string>(),
      first_violation_at: "",
      last_violation_at: "",
    };
    current.violation_count += Number(row.seen_count || 1);
    current.packet_count += row.packet_id ? 1 : 0;
    if (row.missing_receipt) current.missing_receipt_count += 1;
    if (row.missing_memory_provenance_usage) current.missing_memory_provenance_usage_count += 1;
    if (row.current_source_verified_gap) current.current_source_verified_gap_count += 1;
    for (const item of row.rel_paths || []) current.rel_paths.add(String(item));
    for (const item of row.repair_work_item_ids || []) current.repair_work_item_ids.add(String(item));
    for (const item of row.gap_codes || []) current.gap_codes.add(String(item));
    current.first_violation_at = current.first_violation_at
      ? [current.first_violation_at, row.first_seen_at || row.last_seen_at || updatedAt].filter(Boolean).sort()[0]
      : String(row.first_seen_at || row.last_seen_at || updatedAt);
    current.last_violation_at = [current.last_violation_at, row.last_seen_at || row.first_seen_at || updatedAt].filter(Boolean).sort().slice(-1)[0] || "";
    attributionMap.set(key, current);
  }
  const attributions = [...attributionMap.values()].map((row: any) => ({
    ...row,
    frequent: Number(row.violation_count || 0) >= threshold,
    rel_paths: [...row.rel_paths].slice(0, 24),
    repair_work_item_ids: [...row.repair_work_item_ids].slice(0, 24),
    gap_codes: [...row.gap_codes].slice(0, 24),
  })).sort((a: any, b: any) => Number(b.violation_count || 0) - Number(a.violation_count || 0) || String(a.agent_type || "").localeCompare(String(b.agent_type || "")));
  return {
    schema: "ccm-pressure-provenance-pre-dispatch-compliance-distillation-v1",
    version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
    archived_count: rows.length,
    frequent_threshold: threshold,
    attribution_count: attributions.length,
    frequent_attribution_count: attributions.filter((row: any) => row.frequent).length,
    missing_receipt_count: rows.filter((row: any) => row.missing_receipt).length,
    missing_memory_provenance_usage_count: rows.filter((row: any) => row.missing_memory_provenance_usage).length,
    current_source_verified_gap_count: rows.filter((row: any) => row.current_source_verified_gap).length,
    attributions,
    rows,
    updatedAt,
  };
}

export function renderPressureProvenancePreDispatchComplianceBody(archive: any = {}, options: any = {}) {
  const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
  const frequent = attributions.filter((row: any) => row.frequent).length ? attributions.filter((row: any) => row.frequent) : attributions;
  const lines = [
    "# Pressure Provenance Pre-Dispatch Compliance",
    "",
    `Generated by CCM pressure provenance pre-dispatch compliance distillation at ${options.updatedAt || now()}.`,
    "This feedback memory records child Agent executors/projects that received pre-dispatch pressure provenance discipline but still failed the final CCM_AGENT_RECEIPT.memoryProvenanceUsage contract.",
    "Dispatch policy: when these executor/project pairs receive disputed_under_repair or stale_evidence_under_repair pressure MEMORY.md, keep the memoryProvenanceUsage example in the worker prompt, require ACK of the receipt contract, and verify final receipts before closing the task.",
    "",
    "## Executor / Project Attribution",
  ];
  for (const row of frequent.slice(0, 20)) {
    lines.push(`- agentType=${row.agent_type || "unknown"}; project=${row.project || "unknown"}; violations=${row.violation_count || 0}; missingReceipt=${row.missing_receipt_count || 0}; missingMemoryProvenanceUsage=${row.missing_memory_provenance_usage_count || 0}; currentSourceVerifiedGap=${row.current_source_verified_gap_count || 0}.`);
    if (row.gap_codes?.length) lines.push(`  Gaps: ${row.gap_codes.slice(0, 8).join(", ")}.`);
    if (row.rel_paths?.length) lines.push(`  Pressure docs: ${row.rel_paths.slice(0, 8).join(", ")}.`);
    if (row.repair_work_item_ids?.length) lines.push(`  Repair work items: ${row.repair_work_item_ids.slice(0, 8).join(", ")}.`);
  }
  lines.push("");
  lines.push("## Stable Rule");
  lines.push("- Pre-dispatch prompting is not sufficient evidence. A task can close only after the child Agent receipt includes memoryProvenanceUsage rows covering every pressure repair memory, including repairStatus, repairGapType, and currentSourceVerified=true for used/verified disputed or stale-under-repair memory.");
  return lines.join("\n").trim() + "\n";
}

export function pressureProvenancePreDispatchComplianceRecoveryRowId(row: any = {}) {
  return `pressure-provenance-compliance-recovery:${checksum([
    row.groupId,
    row.packet_id,
    row.binding_id,
    row.project,
    row.agent_type,
    row.rel_paths,
    row.repair_work_item_ids,
  ], 24)}`;
}

export function normalizePressureProvenancePreDispatchComplianceRecoveryRows(input: any = {}, options: any = {}) {
  const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
  return pressureProvenancePreDispatchComplianceInputRows(input).map((raw: any, index: number) => {
    const entry = raw?.entry || raw?.packet || raw?.recovery || raw || {};
    const docs = [
      ...(Array.isArray(entry.docs) ? entry.docs : []),
      ...(Array.isArray(entry.requiredDocs) ? entry.requiredDocs : []),
      ...(Array.isArray(entry.required_docs) ? entry.required_docs : []),
    ];
    const relPaths = uniqueStrings([
      ...(Array.isArray(entry.rel_paths) ? entry.rel_paths : []),
      ...(Array.isArray(entry.relPaths) ? entry.relPaths : []),
      ...docs.map((doc: any) => doc.rel_path || doc.relPath || doc.name || ""),
    ], 40);
    const repairIds = uniqueStrings([
      ...(Array.isArray(entry.repair_work_item_ids) ? entry.repair_work_item_ids : []),
      ...(Array.isArray(entry.repairWorkItemIds) ? entry.repairWorkItemIds : []),
      ...docs.map((doc: any) => doc.repair_work_item_id || doc.repairWorkItemId || ""),
    ], 40);
    const status = String(entry.status || raw?.status || "compliant").trim().toLowerCase();
    const row = {
      schema: "ccm-pressure-provenance-pre-dispatch-compliance-recovery-row-v1",
      version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
      groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
      packet_id: String(entry.packet_id || entry.packetId || entry.worker_context_packet_id || entry.workerContextPacketId || raw?.packet_id || "").trim(),
      binding_id: String(entry.binding_id || entry.bindingId || entry.worker_context_packet_binding_id || raw?.binding_id || "").trim(),
      assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
      dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
      project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
      agent_type: String(entry.agent_type || entry.agentType || entry.executor || raw?.agent_type || raw?.agentType || options.agentType || options.agent_type || "unknown").trim() || "unknown",
      status,
      pre_dispatch_prompted: entry.pre_dispatch_prompted !== false && entry.preDispatchPrompted !== false,
      required_doc_count: Number(entry.required_doc_count || entry.requiredDocCount || docs.length || 0),
      receipt_row_count: Number(entry.receipt_row_count || entry.receiptRowCount || entry.receipt_count || entry.receiptCount || 0),
      compliant_doc_count: Number(entry.compliant_doc_count || entry.compliantDocCount || docs.length || 0),
      current_source_verified_count: Number(entry.current_source_verified_count || entry.currentSourceVerifiedCount || 0),
      rel_paths: relPaths,
      repair_work_item_ids: repairIds,
      reason: compactText(entry.reason || raw?.reason || "pressure provenance receipt compliant after prior feedback policy", 1000),
      first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
      last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
      source_index: Number(raw?.source_index || raw?.sourceIndex || index),
    };
    return { ...row, row_id: pressureProvenancePreDispatchComplianceRecoveryRowId(row) };
  })
    .filter((row: any) => row.groupId || fallbackGroupId)
    .filter((row: any) => row.pre_dispatch_prompted === true && row.status === "compliant" && Number(row.required_doc_count || 0) > 0);
}

export function mergePressureProvenancePreDispatchComplianceRecoveryRows(existing: any[] = [], incoming: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const merged = new Map<string, any>();
  for (const row of existing || []) {
    const id = String(row.row_id || pressureProvenancePreDispatchComplianceRecoveryRowId(row));
    merged.set(id, { ...row, row_id: id });
  }
  const previousIds = new Set(merged.keys());
  for (const row of incoming || []) {
    const id = String(row.row_id || pressureProvenancePreDispatchComplianceRecoveryRowId(row));
    const previous = merged.get(id);
    merged.set(id, {
      ...(previous || {}),
      ...row,
      row_id: id,
      first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
      last_seen_at: updatedAt,
      seen_count: Number(previous?.seen_count || 0) + 1,
    });
  }
  const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 120)));
  const rows = [...merged.values()]
    .sort((a: any, b: any) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
    .slice(-limit);
  return {
    rows,
    newRowCount: rows.filter((row: any) => !previousIds.has(row.row_id)).length,
    updatedRowCount: rows.filter((row: any) => previousIds.has(row.row_id) && incoming.some((item: any) => String(item.row_id || "") === row.row_id)).length,
    prunedRowCount: Math.max(0, merged.size - rows.length),
  };
}

export function pressureProvenancePreDispatchComplianceRecoveryArchive(rows: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const attributionMap = new Map<string, any>();
  for (const row of rows) {
    const key = `${row.agent_type || "unknown"}|${row.project || "unknown"}`;
    const current = attributionMap.get(key) || {
      agent_type: row.agent_type || "unknown",
      project: row.project || "unknown",
      compliant_count: 0,
      packet_count: 0,
      receipt_row_count: 0,
      compliant_doc_count: 0,
      current_source_verified_count: 0,
      rel_paths: new Set<string>(),
      repair_work_item_ids: new Set<string>(),
      first_compliant_at: "",
      last_compliant_at: "",
    };
    const seenCount = Number(row.seen_count || 1);
    current.compliant_count += seenCount;
    current.packet_count += row.packet_id ? 1 : 0;
    current.receipt_row_count += Number(row.receipt_row_count || 0);
    current.compliant_doc_count += Number(row.compliant_doc_count || 0);
    current.current_source_verified_count += Number(row.current_source_verified_count || 0);
    current.first_compliant_at = current.first_compliant_at
      ? [current.first_compliant_at, row.first_seen_at || row.last_seen_at || updatedAt].filter(Boolean).sort()[0]
      : String(row.first_seen_at || row.last_seen_at || updatedAt);
    current.last_compliant_at = [current.last_compliant_at, row.last_seen_at || row.first_seen_at || updatedAt].filter(Boolean).sort().slice(-1)[0] || "";
    for (const item of row.rel_paths || []) current.rel_paths.add(String(item));
    for (const item of row.repair_work_item_ids || []) current.repair_work_item_ids.add(String(item));
    attributionMap.set(key, current);
  }
  const attributions = [...attributionMap.values()].map((row: any) => ({
    ...row,
    rel_paths: [...row.rel_paths].slice(0, 24),
    repair_work_item_ids: [...row.repair_work_item_ids].slice(0, 24),
  })).sort((a: any, b: any) => Number(b.compliant_count || 0) - Number(a.compliant_count || 0) || String(a.agent_type || "").localeCompare(String(b.agent_type || "")));
  return {
    schema: "ccm-pressure-provenance-pre-dispatch-compliance-recovery-distillation-v1",
    version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
    archived_count: rows.length,
    attribution_count: attributions.length,
    compliant_count: rows.reduce((sum: number, row: any) => sum + Number(row.seen_count || 1), 0),
    receipt_row_count: rows.reduce((sum: number, row: any) => sum + Number(row.receipt_row_count || 0), 0),
    compliant_doc_count: rows.reduce((sum: number, row: any) => sum + Number(row.compliant_doc_count || 0), 0),
    attributions,
    rows,
    updatedAt,
  };
}

export function renderPressureProvenancePreDispatchComplianceRecoveryBody(archive: any = {}, options: any = {}) {
  const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
  const lines = [
    "# Pressure Provenance Compliance Recovery",
    "",
    `Generated by CCM pressure provenance compliance recovery distillation at ${options.updatedAt || now()}.`,
    "This feedback memory records executor/project pairs that later produced compliant memoryProvenanceUsage receipts after receiving pressure provenance discipline.",
    "Recovery policy: compliant receipts do not delete historical violations, but they reduce effective violation pressure so old executor/project mistakes can recover after sustained correct behavior.",
    "",
    "## Executor / Project Recovery",
  ];
  for (const row of attributions.slice(0, 20)) {
    lines.push(`- agentType=${row.agent_type || "unknown"}; project=${row.project || "unknown"}; compliant=${row.compliant_count || 0}; packets=${row.packet_count || 0}; receiptRows=${row.receipt_row_count || 0}; lastCompliantAt=${row.last_compliant_at || ""}.`);
    if (row.rel_paths?.length) lines.push(`  Pressure docs: ${row.rel_paths.slice(0, 8).join(", ")}.`);
    if (row.repair_work_item_ids?.length) lines.push(`  Repair work items: ${row.repair_work_item_ids.slice(0, 8).join(", ")}.`);
  }
  lines.push("");
  lines.push("## Stable Rule");
  lines.push("- Recovery evidence can reduce dispatch feedback policy severity only when it comes from compliant pressure provenance receipts. Historical violation rows remain archived for audit and can become active again if new violations outnumber recovery credits.");
  return lines.join("\n").trim() + "\n";
}

export function normalizePressureProvenanceDispatchPolicyKey(value: any) {
  return String(value || "").trim().toLowerCase();
}

export function pressureProvenanceDispatchPolicyAttributionMatches(row: any = {}, options: any = {}) {
  const targetProject = normalizePressureProvenanceDispatchPolicyKey(options.targetProject || options.target_project || options.project);
  const agentType = normalizePressureProvenanceDispatchPolicyKey(options.agentType || options.agent_type || options.executor || options.runner);
  const rowProject = normalizePressureProvenanceDispatchPolicyKey(row.project || row.target_project || row.targetProject);
  const rowAgentType = normalizePressureProvenanceDispatchPolicyKey(row.agent_type || row.agentType || row.executor || row.runner);
  const projectMatches = !targetProject || !rowProject || rowProject === targetProject || rowProject === "unknown" || rowProject === "*";
  const agentMatches = !agentType || !rowAgentType || rowAgentType === agentType || rowAgentType === "unknown" || rowAgentType === "*";
  return projectMatches && agentMatches;
}

export function pressureProvenanceDispatchPolicyAttributionKey(row: any = {}) {
  return `${normalizePressureProvenanceDispatchPolicyKey(row.agent_type || row.agentType || row.executor || row.runner || "unknown")}|${normalizePressureProvenanceDispatchPolicyKey(row.project || row.target_project || row.targetProject || "unknown")}`;
}

export function buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId: string, options: any = {}) {
  const disabled = options.disabled === true
    || options.disablePolicy === true
    || options.disable_policy === true
    || options.disablePressureProvenanceFeedbackDispatchPolicy === true
    || options.disable_pressure_provenance_feedback_dispatch_policy === true;
  const targetProject = String(options.targetProject || options.target_project || options.project || "").trim();
  const agentType = String(options.agentType || options.agent_type || options.executor || options.runner || "unknown").trim() || "unknown";
  const generatedAt = String(options.generatedAt || options.generated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const archive = ledger.pressureProvenancePreDispatchComplianceArchive || {};
  const recoveryArchive = ledger.pressureProvenancePreDispatchComplianceRecoveryArchive || {};
  const providerOverrideFollowupArchive = ledger.pressureProvenanceProviderDispatchOverrideFollowupArchive || {};
  const providerOverrideFollowupReceiptValidationArchive = ledger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive || {};
  const providerSwitchExecutionArchive = ledger.providerSwitchExecutionArchive || {};
  const providerOverrideFollowupReceiptValidationRows = Array.isArray(providerOverrideFollowupReceiptValidationArchive.rows)
    ? providerOverrideFollowupReceiptValidationArchive.rows
    : [];
  const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
  const violationRows = Array.isArray(archive.rows) ? archive.rows : [];
  const recoveryAttributions = Array.isArray(recoveryArchive.attributions) ? recoveryArchive.attributions : [];
  const providerOverrideFollowupDisabled = options.disableProviderDispatchOverrideFollowupHistory === true
    || options.disable_provider_dispatch_override_followup_history === true
    || options.disableProviderOverrideFollowupHistory === true
    || options.disable_provider_override_followup_history === true;
  const providerOverrideFollowupAttributions = providerOverrideFollowupDisabled
    ? []
    : Array.isArray(providerOverrideFollowupArchive.attributions)
      ? providerOverrideFollowupArchive.attributions
      : [];
  const matchingProviderOverrideFollowupAttributions = providerOverrideFollowupAttributions
    .filter((row: any) => pressureProvenanceDispatchPolicyAttributionMatches(row, { targetProject, agentType }));
  const threshold = Math.max(1, Number(options.frequentThreshold || options.frequent_threshold || archive.frequent_threshold || 2));
  const providerOverrideFollowupReceiptValidationDisabled = options.disableProviderDispatchOverrideFollowupReceiptValidationHistory === true
    || options.disable_provider_dispatch_override_followup_receipt_validation_history === true;
  const providerOverrideFollowupReceiptValidationAttributions = providerOverrideFollowupReceiptValidationDisabled
    ? []
    : Array.isArray(providerOverrideFollowupReceiptValidationArchive.attributions)
      ? providerOverrideFollowupReceiptValidationArchive.attributions
      : [];
  const matchingProviderOverrideFollowupReceiptValidationAttributions = providerOverrideFollowupReceiptValidationAttributions
    .filter((row: any) => pressureProvenanceDispatchPolicyAttributionMatches(row, { targetProject, agentType }));
  const providerSwitchExecutionDisabled = options.disableProviderSwitchExecutionHistory === true
    || options.disable_provider_switch_execution_history === true;
  const providerSwitchExecutionAttributions = providerSwitchExecutionDisabled
    ? []
    : Array.isArray(providerSwitchExecutionArchive.attributions)
      ? providerSwitchExecutionArchive.attributions
      : [];
  const providerSwitchExecutionRows = providerSwitchExecutionDisabled
    ? []
    : Array.isArray(providerSwitchExecutionArchive.rows)
      ? providerSwitchExecutionArchive.rows
      : [];
  const matchingProviderSwitchExecutionAttributions = providerSwitchExecutionAttributions
    .filter((row: any) => pressureProvenanceDispatchPolicyAttributionMatches(row, { targetProject, agentType }));
  const providerSwitchExecutionMismatchThreshold = Math.max(1, Number(
    options.providerSwitchExecutionMismatchThreshold
      || options.provider_switch_execution_mismatch_threshold
      || 2
  ));
  const providerOverrideFollowupReceiptValidationFailureThreshold = Math.max(1, Number(
    options.providerOverrideFollowupReceiptValidationFailureThreshold
      || options.provider_override_followup_receipt_validation_failure_threshold
      || 2
  ));
  const crossGroupProviderReliabilityDisabled = disabled
    || options.disableCrossGroupProviderReliability === true
    || options.disable_cross_group_provider_reliability === true
    || options.crossGroupProviderReliability === false
    || options.cross_group_provider_reliability === false;
  const crossGroupProviderReliabilitySignal = crossGroupProviderReliabilityDisabled
    ? null
    : buildCrossGroupProviderDispatchReliabilitySignal(groupId, {
      ...options,
      agentType,
      generatedAt,
      failureThreshold: providerOverrideFollowupReceiptValidationFailureThreshold,
    });
  const recoveryDisabled = options.disablePressureProvenanceFeedbackRecovery === true
    || options.disable_pressure_provenance_feedback_recovery === true
    || options.disableRecovery === true
    || options.disable_recovery === true;
  const recoveryCreditPerCompliant = Math.max(0, Number(options.recoveryCreditPerCompliant || options.recovery_credit_per_compliant || 1));
  const violationPolicyRows = attributions
    .filter((row: any) => pressureProvenanceDispatchPolicyAttributionMatches(row, { targetProject, agentType }))
    .map((row: any) => {
      const recoveryMatches = recoveryDisabled ? [] : recoveryAttributions
        .filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
          targetProject: row.project || row.target_project || row.targetProject || targetProject,
          agentType: row.agent_type || row.agentType || agentType,
        }));
      const recoveryCount = recoveryMatches.reduce((sum: number, candidate: any) => sum + Number(candidate.compliant_count || 0), 0);
      const recoveryCredit = Math.floor(recoveryCount * recoveryCreditPerCompliant);
      const violationCount = Number(row.violation_count || 0);
      const recoveryLastCompliantAt = recoveryMatches.map((candidate: any) => candidate.last_compliant_at || "").filter(Boolean).sort().slice(-1)[0] || "";
      const matchingViolationRows = violationRows.filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
        targetProject: row.project || row.target_project || row.targetProject || targetProject,
        agentType: row.agent_type || row.agentType || agentType,
      }));
      const postRecoveryViolations = recoveryLastCompliantAt
        ? matchingViolationRows.filter((candidate: any) => String(candidate.last_seen_at || candidate.first_seen_at || "").localeCompare(recoveryLastCompliantAt) > 0)
        : [];
      const postRecoveryViolationCount = postRecoveryViolations.reduce((sum: number, candidate: any) => sum + Number(candidate.seen_count || 1), 0);
      const relapsed = !recoveryDisabled && recoveryCredit > 0 && postRecoveryViolationCount > 0;
      const effectiveViolationCount = Math.max(
        0,
        relapsed ? Math.max(postRecoveryViolationCount, violationCount - recoveryCredit) : violationCount - recoveryCredit
      );
      const providerOverrideFollowupMatches = matchingProviderOverrideFollowupAttributions
        .filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
          targetProject: row.project || row.target_project || row.targetProject || targetProject,
          agentType: row.agent_type || row.agentType || agentType,
        }));
      const providerOverrideFollowup = summarizeProviderDispatchOverrideFollowupPolicyAttributions(providerOverrideFollowupMatches);
      const providerOverrideFollowupFreshAfterLastViolation = !!providerOverrideFollowup.lastCompletedAt
        && !!String(row.last_violation_at || "")
        && providerOverrideFollowup.lastCompletedAt.localeCompare(String(row.last_violation_at || "")) >= 0;
      return {
        agent_type: row.agent_type || "unknown",
        project: row.project || "unknown",
        violation_count: violationCount,
        effective_violation_count: effectiveViolationCount,
        recovered_violation_count: Math.min(violationCount, recoveryCredit),
        recovery_compliant_count: recoveryCount,
        recovery_credit: recoveryCredit,
        recovery_last_compliant_at: recoveryLastCompliantAt,
        recovery_disabled: recoveryDisabled,
        post_recovery_violation_count: postRecoveryViolationCount,
        recovery_streak_broken_at: postRecoveryViolations.map((candidate: any) => candidate.last_seen_at || candidate.first_seen_at || "").filter(Boolean).sort().slice(-1)[0] || "",
        relapsed,
        recovered: !relapsed && violationCount >= threshold && effectiveViolationCount < threshold && recoveryCredit > 0,
        packet_count: Number(row.packet_count || 0),
        missing_receipt_count: Number(row.missing_receipt_count || 0),
        missing_memory_provenance_usage_count: Number(row.missing_memory_provenance_usage_count || 0),
        current_source_verified_gap_count: Number(row.current_source_verified_gap_count || 0),
        frequent: effectiveViolationCount >= threshold || relapsed,
        raw_frequent: row.frequent === true || violationCount >= threshold,
        first_violation_at: row.first_violation_at || "",
        last_violation_at: row.last_violation_at || "",
        rel_paths: uniqueStrings(Array.isArray(row.rel_paths) ? row.rel_paths : [], 12),
        repair_work_item_ids: uniqueStrings(Array.isArray(row.repair_work_item_ids) ? row.repair_work_item_ids : [], 12),
        gap_codes: uniqueStrings(Array.isArray(row.gap_codes) ? row.gap_codes : [], 12),
        provider_override_followup_repaired: providerOverrideFollowup.completedCount > 0,
        provider_override_followup_repaired_count: providerOverrideFollowup.completedCount,
        provider_override_followup_memory_provenance_usage_count: providerOverrideFollowup.memoryUsageCount,
        provider_override_followup_current_source_verified_count: providerOverrideFollowup.verifiedCount,
        provider_override_followup_last_completed_at: providerOverrideFollowup.lastCompletedAt,
        provider_override_followup_fresh_after_last_violation: providerOverrideFollowupFreshAfterLastViolation,
        provider_override_followup_rel_paths: providerOverrideFollowup.relPaths,
        provider_override_followup_work_item_ids: providerOverrideFollowup.followupWorkItemIds,
        provider_override_followup_override_ids: providerOverrideFollowup.overrideIds,
      };
    });
  const violationKeys = new Set(violationPolicyRows.map((row: any) => pressureProvenanceDispatchPolicyAttributionKey(row)));
  const providerOverrideFollowupOnlyRows = matchingProviderOverrideFollowupAttributions
    .filter((row: any) => !violationKeys.has(pressureProvenanceDispatchPolicyAttributionKey(row)))
    .map((row: any) => {
      const providerOverrideFollowup = summarizeProviderDispatchOverrideFollowupPolicyAttributions([row]);
      return {
        agent_type: row.agent_type || row.agentType || "unknown",
        project: row.project || row.target_project || row.targetProject || "unknown",
        violation_count: 0,
        effective_violation_count: 0,
        recovered_violation_count: 0,
        recovery_compliant_count: 0,
        recovery_credit: 0,
        recovery_last_compliant_at: "",
        recovery_disabled: recoveryDisabled,
        post_recovery_violation_count: 0,
        recovery_streak_broken_at: "",
        relapsed: false,
        recovered: true,
        provider_override_followup_only: true,
        provider_override_followup_repaired: providerOverrideFollowup.completedCount > 0,
        provider_override_followup_repaired_count: providerOverrideFollowup.completedCount,
        provider_override_followup_memory_provenance_usage_count: providerOverrideFollowup.memoryUsageCount,
        provider_override_followup_current_source_verified_count: providerOverrideFollowup.verifiedCount,
        provider_override_followup_last_completed_at: providerOverrideFollowup.lastCompletedAt,
        provider_override_followup_fresh_after_last_violation: true,
        provider_override_followup_rel_paths: providerOverrideFollowup.relPaths,
        provider_override_followup_work_item_ids: providerOverrideFollowup.followupWorkItemIds,
        provider_override_followup_override_ids: providerOverrideFollowup.overrideIds,
        packet_count: 0,
        missing_receipt_count: 0,
        missing_memory_provenance_usage_count: 0,
        current_source_verified_gap_count: 0,
        frequent: false,
        raw_frequent: false,
        first_violation_at: "",
        last_violation_at: "",
        rel_paths: providerOverrideFollowup.relPaths,
        repair_work_item_ids: providerOverrideFollowup.followupWorkItemIds,
        gap_codes: ["provider_dispatch_override_followup_repaired"],
      };
    });
  const basePolicyRows = [...violationPolicyRows, ...providerOverrideFollowupOnlyRows];
  const basePolicyKeys = new Set(basePolicyRows.map((row: any) => pressureProvenanceDispatchPolicyAttributionKey(row)));
  const providerOverrideFollowupReceiptValidationOnlyRows = matchingProviderOverrideFollowupReceiptValidationAttributions
    .filter((row: any) => !basePolicyKeys.has(pressureProvenanceDispatchPolicyAttributionKey(row)))
    .map((row: any) => ({
      agent_type: row.agent_type || row.agentType || "unknown",
      project: row.project || row.target_project || row.targetProject || "unknown",
      violation_count: 0,
      effective_violation_count: 0,
      recovered_violation_count: 0,
      recovery_compliant_count: 0,
      recovery_credit: 0,
      recovery_last_compliant_at: "",
      recovery_disabled: recoveryDisabled,
      post_recovery_violation_count: 0,
      recovery_streak_broken_at: "",
      relapsed: false,
      recovered: false,
      provider_override_followup_only: true,
      provider_override_followup_repaired: false,
      provider_override_followup_repaired_count: 0,
      provider_override_followup_memory_provenance_usage_count: 0,
      provider_override_followup_current_source_verified_count: 0,
      provider_override_followup_last_completed_at: "",
      provider_override_followup_fresh_after_last_violation: false,
      provider_override_followup_rel_paths: [],
      provider_override_followup_work_item_ids: [],
      provider_override_followup_override_ids: [],
      packet_count: 0,
      missing_receipt_count: 0,
      missing_memory_provenance_usage_count: 0,
      current_source_verified_gap_count: 0,
      frequent: false,
      raw_frequent: false,
      first_violation_at: "",
      last_violation_at: "",
      rel_paths: [],
      repair_work_item_ids: [],
      gap_codes: [],
    }));
  const validationPolicyRows = [...basePolicyRows, ...providerOverrideFollowupReceiptValidationOnlyRows];
  const validationPolicyKeys = new Set(validationPolicyRows.map((row: any) => pressureProvenanceDispatchPolicyAttributionKey(row)));
  const providerSwitchExecutionOnlyRows = matchingProviderSwitchExecutionAttributions
    .filter((row: any) => !validationPolicyKeys.has(pressureProvenanceDispatchPolicyAttributionKey(row)))
    .map((row: any) => {
      const execution = summarizeProviderSwitchExecutionPolicyAttributions([row]);
      return {
        agent_type: row.agent_type || row.agentType || row.expected_provider || row.expectedProvider || "unknown",
        project: row.project || row.target_project || row.targetProject || "unknown",
        violation_count: 0,
        effective_violation_count: 0,
        recovered_violation_count: 0,
        recovery_compliant_count: 0,
        recovery_credit: 0,
        recovery_last_compliant_at: "",
        recovery_disabled: recoveryDisabled,
        post_recovery_violation_count: 0,
        recovery_streak_broken_at: "",
        relapsed: false,
        recovered: false,
        provider_switch_execution_only: true,
        packet_count: 0,
        missing_receipt_count: 0,
        missing_memory_provenance_usage_count: 0,
        current_source_verified_gap_count: 0,
        frequent: execution.mismatchCount >= providerSwitchExecutionMismatchThreshold,
        raw_frequent: execution.mismatchCount >= providerSwitchExecutionMismatchThreshold,
        first_violation_at: "",
        last_violation_at: "",
        rel_paths: [],
        repair_work_item_ids: [],
        gap_codes: execution.gapCodes,
      };
    });
  const localPolicyRows = [...validationPolicyRows, ...providerSwitchExecutionOnlyRows];
  const crossGroupProviderReliabilityOnlyRows = !localPolicyRows.length && crossGroupProviderReliabilitySignal?.actionable === true
    ? [{
      agent_type: agentType,
      project: targetProject || "unknown",
      violation_count: 0,
      effective_violation_count: 0,
      recovered_violation_count: 0,
      recovery_compliant_count: 0,
      recovery_credit: 0,
      recovery_last_compliant_at: "",
      recovery_disabled: recoveryDisabled,
      post_recovery_violation_count: 0,
      recovery_streak_broken_at: "",
      relapsed: false,
      recovered: false,
      cross_group_provider_reliability_only: true,
      provider_override_followup_only: false,
      provider_override_followup_repaired: false,
      provider_override_followup_repaired_count: 0,
      provider_override_followup_memory_provenance_usage_count: 0,
      provider_override_followup_current_source_verified_count: 0,
      provider_override_followup_last_completed_at: "",
      provider_override_followup_fresh_after_last_violation: false,
      provider_override_followup_rel_paths: [],
      provider_override_followup_work_item_ids: [],
      provider_override_followup_override_ids: [],
      packet_count: 0,
      missing_receipt_count: 0,
      missing_memory_provenance_usage_count: 0,
      current_source_verified_gap_count: 0,
      frequent: false,
      raw_frequent: false,
      first_violation_at: "",
      last_violation_at: "",
      rel_paths: [],
      repair_work_item_ids: [],
      gap_codes: [],
    }]
    : [];
  const matching = [...localPolicyRows, ...crossGroupProviderReliabilityOnlyRows]
    .map((row: any) => {
      const validationMatches = matchingProviderOverrideFollowupReceiptValidationAttributions
        .filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
          targetProject: row.project || row.target_project || row.targetProject || targetProject,
          agentType: row.agent_type || row.agentType || agentType,
        }));
      const validation = summarizeProviderDispatchOverrideFollowupReceiptValidationPolicyAttributions(validationMatches);
      const validationEscalated = validation.consecutiveFailureCount >= providerOverrideFollowupReceiptValidationFailureThreshold;
      const validationRepairVerified = !validationEscalated && validation.repairVerified;
      const localValidationRisk = scoreProviderDispatchReliabilityRows(providerOverrideFollowupReceiptValidationRows.filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
        targetProject: row.project || row.target_project || row.targetProject || targetProject,
        agentType: row.agent_type || row.agentType || agentType,
      })), {
        ...options,
        generatedAt,
      });
      const providerSwitchExecutionMatches = matchingProviderSwitchExecutionAttributions
        .filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
          targetProject: row.project || row.target_project || row.targetProject || targetProject,
          agentType: row.agent_type || row.agentType || agentType,
        }));
      const providerSwitchExecution = summarizeProviderSwitchExecutionPolicyAttributions(providerSwitchExecutionMatches);
      const providerSwitchExecutionEvidenceRows = providerSwitchExecutionRows
        .filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
          targetProject: row.project || row.target_project || row.targetProject || targetProject,
          agentType: row.agent_type || row.agentType || agentType,
        }));
      const providerSwitchExecutionRisk = scoreProviderSwitchExecutionRows(providerSwitchExecutionEvidenceRows, {
        ...options,
        generatedAt,
      });
      const providerSwitchExecutionRowIds = uniqueStrings([
        ...providerSwitchExecution.rowIds,
        ...providerSwitchExecutionEvidenceRows.map((candidate: any) => candidate.row_id || candidate.rowId || "").filter(Boolean),
      ], 32);
      const providerSwitchExecutionMemoryRelPaths = providerSwitchExecution.executedCount > 0 || providerSwitchExecutionEvidenceRows.length
        ? uniqueStrings([
          ...providerSwitchExecution.memoryRelPaths,
          "provider-switch-execution-memory.md",
        ], 8)
        : [];
      const providerSwitchExecutionEscalated = providerSwitchExecution.mismatchCount >= providerSwitchExecutionMismatchThreshold;
      return {
        ...row,
        frequent: row.frequent === true || validationEscalated || providerSwitchExecutionEscalated,
        recovered: row.relapsed !== true && (row.recovered === true || validationRepairVerified),
        provider_override_followup_repaired: row.provider_override_followup_repaired === true || validationRepairVerified,
        provider_override_followup_repaired_count: Math.max(Number(row.provider_override_followup_repaired_count || 0), validationRepairVerified ? validation.passedCount : 0),
        provider_override_followup_last_completed_at: validationRepairVerified ? validation.lastPassedAt : row.provider_override_followup_last_completed_at || "",
        provider_override_followup_fresh_after_last_violation: validationRepairVerified || row.provider_override_followup_fresh_after_last_violation === true,
        provider_override_followup_rel_paths: uniqueStrings([
          ...(Array.isArray(row.provider_override_followup_rel_paths) ? row.provider_override_followup_rel_paths : []),
          ...validation.relPaths,
        ], 16),
        provider_override_followup_work_item_ids: uniqueStrings([
          ...(Array.isArray(row.provider_override_followup_work_item_ids) ? row.provider_override_followup_work_item_ids : []),
          ...validation.followupWorkItemIds,
        ], 16),
        provider_override_followup_override_ids: uniqueStrings([
          ...(Array.isArray(row.provider_override_followup_override_ids) ? row.provider_override_followup_override_ids : []),
          ...validation.overrideIds,
        ], 16),
        provider_override_followup_receipt_validation_attempt_count: validation.attemptCount,
        provider_override_followup_receipt_validation_failed_count: validation.failedCount,
        provider_override_followup_receipt_validation_passed_count: validation.passedCount,
        provider_override_followup_receipt_validation_consecutive_failure_count: validation.consecutiveFailureCount,
        provider_override_followup_receipt_validation_latest_status: validation.latestStatus,
        provider_override_followup_receipt_validation_escalated: validationEscalated,
        provider_override_followup_receipt_validation_repair_verified: validationRepairVerified,
        provider_override_followup_receipt_validation_last_attempt_at: validation.lastAttemptAt,
        provider_override_followup_receipt_validation_last_failed_at: validation.lastFailedAt,
        provider_override_followup_receipt_validation_last_passed_at: validation.lastPassedAt,
        provider_override_followup_receipt_validation_ids: validation.validationIds,
        provider_override_followup_receipt_validation_repair_work_item_ids: validation.repairWorkItemIds,
        provider_override_followup_receipt_validation_rel_paths: validation.relPaths,
        provider_override_followup_receipt_validation_followup_work_item_ids: validation.followupWorkItemIds,
        provider_override_followup_receipt_validation_override_ids: validation.overrideIds,
        provider_override_followup_receipt_validation_gap_codes: validation.gapCodes,
        provider_override_followup_receipt_validation_decayed_failure_score: localValidationRisk.weightedFailureScore,
        provider_override_followup_receipt_validation_decayed_passed_score: localValidationRisk.weightedPassedScore,
        provider_override_followup_receipt_validation_risk_score: localValidationRisk.riskScore,
        provider_override_followup_receipt_validation_risk_confidence: localValidationRisk.confidence,
        provider_override_followup_receipt_validation_half_life_days: localValidationRisk.halfLifeDays,
        provider_switch_execution_history_present: providerSwitchExecution.executedCount > 0,
        provider_switch_execution_executed_count: providerSwitchExecution.executedCount,
        provider_switch_execution_approved_count: providerSwitchExecution.approvedCount,
        provider_switch_execution_passed_count: providerSwitchExecution.passedCount,
        provider_switch_execution_failed_count: providerSwitchExecution.failedCount,
        provider_switch_execution_mismatch_count: providerSwitchExecution.mismatchCount,
        provider_switch_execution_mismatch_escalated: providerSwitchExecutionEscalated,
        provider_switch_execution_mismatch_threshold: providerSwitchExecutionMismatchThreshold,
        provider_switch_execution_expected_provider: providerSwitchExecution.expectedProvider,
        provider_switch_execution_actual_providers: providerSwitchExecution.actualProviders,
        provider_switch_execution_last_executed_at: providerSwitchExecution.lastExecutedAt,
        provider_switch_execution_last_failed_at: providerSwitchExecution.lastFailedAt,
        provider_switch_execution_last_passed_at: providerSwitchExecution.lastPassedAt,
        provider_switch_execution_receipt_ids: providerSwitchExecution.executionReceiptIds,
        provider_switch_execution_decision_receipt_ids: providerSwitchExecution.decisionReceiptIds,
        provider_switch_execution_task_agent_session_ids: providerSwitchExecution.taskAgentSessionIds,
        provider_switch_execution_row_ids: providerSwitchExecutionRowIds,
        provider_switch_execution_memory_rel_paths: providerSwitchExecutionMemoryRelPaths,
        provider_switch_execution_gap_codes: providerSwitchExecution.gapCodes,
        provider_switch_execution_decayed_mismatch_score: providerSwitchExecutionRisk.weightedMismatchScore,
        provider_switch_execution_decayed_failed_score: providerSwitchExecutionRisk.weightedFailedScore,
        provider_switch_execution_decayed_passed_score: providerSwitchExecutionRisk.weightedPassedScore,
        provider_switch_execution_weighted_risk_score: providerSwitchExecutionRisk.weightedRiskScore,
        provider_switch_execution_risk_score: providerSwitchExecutionRisk.riskScore,
        provider_switch_execution_risk_confidence: providerSwitchExecutionRisk.confidence,
        provider_switch_execution_half_life_days: providerSwitchExecutionRisk.halfLifeDays,
        provider_switch_execution_passed_credit: providerSwitchExecutionRisk.passedCredit,
        provider_switch_execution_mismatch_penalty: providerSwitchExecutionRisk.mismatchPenalty,
        cross_group_provider_reliability_guidance: crossGroupProviderReliabilitySignal?.schema ? crossGroupProviderReliabilitySignal : null,
        cross_group_provider_reliability_actionable: crossGroupProviderReliabilitySignal?.actionable === true,
        cross_group_provider_reliability_risk_status: crossGroupProviderReliabilitySignal?.risk_status || "empty",
        cross_group_provider_reliability_risk_score: Number(crossGroupProviderReliabilitySignal?.risk_score || 0),
        cross_group_provider_reliability_confidence: Number(crossGroupProviderReliabilitySignal?.confidence || 0),
        cross_group_provider_reliability_source_group_count: Number(crossGroupProviderReliabilitySignal?.source_group_count || 0),
      };
    })
    .sort((a: any, b: any) => Number(b.effective_violation_count || 0) - Number(a.effective_violation_count || 0) || Number(b.violation_count || 0) - Number(a.violation_count || 0));
  const frequent = matching.filter((row: any) => row.frequent);
  const recovered = matching.filter((row: any) => row.recovered);
  const relapsed = matching.filter((row: any) => row.relapsed);
  const active = !disabled && frequent.length > 0;
  const pressureDiscipline = options.pressureMemoryProvenanceReceiptDiscipline
    || options.pressure_memory_provenance_receipt_discipline
    || null;
  const pressureDisciplineActive = pressureDiscipline?.active === true
    || Number(pressureDiscipline?.docCount || pressureDiscipline?.doc_count || 0) > 0
    || (Array.isArray(pressureDiscipline?.rows) && pressureDiscipline.rows.length > 0);
  const top = frequent[0] || matching[0] || {};
  const policyRows = (active ? frequent : matching).slice(0, Math.max(1, Number(options.maxRows || options.max_rows || 6)));
  return {
    schema: "ccm-pressure-provenance-pre-dispatch-compliance-dispatch-policy-v1",
    version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
    groupId,
    targetProject,
    agentType,
    active,
    disabled,
    generatedAt,
    source: "typed-feedback:pressure-provenance-pre-dispatch-compliance",
    sourceArchiveSchema: archive.schema || "",
    sourceArchiveUpdatedAt: archive.updatedAt || "",
    recoveryArchiveSchema: recoveryArchive.schema || "",
    recoveryArchiveUpdatedAt: recoveryArchive.updatedAt || "",
    providerOverrideFollowupArchiveSchema: providerOverrideFollowupArchive.schema || "",
    providerOverrideFollowupArchiveUpdatedAt: providerOverrideFollowupArchive.updatedAt || "",
    providerOverrideFollowupReceiptValidationArchiveSchema: providerOverrideFollowupReceiptValidationArchive.schema || "",
    providerOverrideFollowupReceiptValidationArchiveUpdatedAt: providerOverrideFollowupReceiptValidationArchive.updatedAt || "",
    providerSwitchExecutionArchiveSchema: providerSwitchExecutionArchive.schema || "",
    providerSwitchExecutionArchiveUpdatedAt: providerSwitchExecutionArchive.updatedAt || "",
    sourceLedgerFile: ledger.file || getGroupTypedMemoryDistillationLedgerFile(groupId),
    frequentThreshold: threshold,
    recoveryEnabled: !recoveryDisabled,
    recoveryCreditPerCompliant,
    attributionCount: attributions.length,
    matchingAttributionCount: matching.length,
    rawFrequentViolationAttributionCount: matching.filter((row: any) => row.raw_frequent).length,
    frequentViolationAttributionCount: frequent.length,
    recoveredAttributionCount: recovered.length,
    relapsedAttributionCount: relapsed.length,
    recoveryAttributionCount: recoveryAttributions.length,
    providerOverrideFollowupHistoryEnabled: !providerOverrideFollowupDisabled,
    providerOverrideFollowupAttributionCount: providerOverrideFollowupAttributions.length,
    matchingProviderOverrideFollowupAttributionCount: matchingProviderOverrideFollowupAttributions.length,
    providerOverrideFollowupRepairedAttributionCount: matching.filter((row: any) => row.provider_override_followup_repaired === true).length,
    providerOverrideFollowupReceiptValidationHistoryEnabled: !providerOverrideFollowupReceiptValidationDisabled,
    providerOverrideFollowupReceiptValidationFailureThreshold,
    providerOverrideFollowupReceiptValidationAttributionCount: providerOverrideFollowupReceiptValidationAttributions.length,
    matchingProviderOverrideFollowupReceiptValidationAttributionCount: matchingProviderOverrideFollowupReceiptValidationAttributions.length,
    providerOverrideFollowupReceiptValidationEscalatedAttributionCount: matching.filter((row: any) => row.provider_override_followup_receipt_validation_escalated === true).length,
    providerOverrideFollowupReceiptValidationRepairedAttributionCount: matching.filter((row: any) => row.provider_override_followup_receipt_validation_repair_verified === true).length,
    providerSwitchExecutionHistoryEnabled: !providerSwitchExecutionDisabled,
    providerSwitchExecutionMismatchThreshold,
    providerSwitchExecutionAttributionCount: providerSwitchExecutionAttributions.length,
    matchingProviderSwitchExecutionAttributionCount: matchingProviderSwitchExecutionAttributions.length,
    providerSwitchExecutionMismatchAttributionCount: matching.filter((row: any) => Number(row.provider_switch_execution_mismatch_count || 0) > 0).length,
    providerSwitchExecutionEscalatedAttributionCount: matching.filter((row: any) => row.provider_switch_execution_mismatch_escalated === true).length,
    providerSwitchExecutionPassedCount: matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_passed_count || 0), 0),
    providerSwitchExecutionFailedCount: matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_failed_count || 0), 0),
    providerSwitchExecutionMismatchCount: matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_mismatch_count || 0), 0),
    providerSwitchExecutionDecayedMismatchScore: providerDispatchReliabilityRound(matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_decayed_mismatch_score || 0), 0)),
    providerSwitchExecutionDecayedFailedScore: providerDispatchReliabilityRound(matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_decayed_failed_score || 0), 0)),
    providerSwitchExecutionDecayedPassedScore: providerDispatchReliabilityRound(matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_decayed_passed_score || 0), 0)),
    providerSwitchExecutionWeightedRiskScore: providerDispatchReliabilityRound(matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_weighted_risk_score || 0), 0)),
    crossGroupProviderReliabilityEnabled: !crossGroupProviderReliabilityDisabled,
    crossGroupProviderReliabilityActionable: crossGroupProviderReliabilitySignal?.actionable === true,
    crossGroupProviderReliabilityRiskStatus: crossGroupProviderReliabilitySignal?.risk_status || "empty",
    crossGroupProviderReliabilityRiskScore: Number(crossGroupProviderReliabilitySignal?.risk_score || 0),
    crossGroupProviderReliabilityConfidence: Number(crossGroupProviderReliabilitySignal?.confidence || 0),
    crossGroupProviderReliabilitySourceGroupCount: Number(crossGroupProviderReliabilitySignal?.source_group_count || 0),
    crossGroupProviderReliabilityGuidance: crossGroupProviderReliabilitySignal?.schema ? crossGroupProviderReliabilitySignal : null,
    pressureMemoryProvenanceDisciplineActive: pressureDisciplineActive,
    action: active
      ? matching.some((row: any) => row.provider_switch_execution_mismatch_escalated === true)
        ? "hold_provider_after_repeated_provider_switch_execution_mismatches"
        : matching.some((row: any) => row.provider_override_followup_receipt_validation_escalated === true)
        ? "hold_provider_after_repeated_override_followup_receipt_validation_failures"
        : relapsed.length
        ? "reactivate_pressure_memory_provenance_receipt_contract_after_recovery_relapse"
        : "strengthen_pressure_memory_provenance_receipt_contract"
      : recovered.length
        ? matching.some((row: any) => row.provider_override_followup_receipt_validation_repair_verified === true)
          ? "monitor_repaired_provider_override_followup_receipt_validation"
          : "monitor_recovered_pressure_memory_provenance_receipt_contract"
        : matching.some((row: any) => Number(row.provider_switch_execution_mismatch_count || 0) > 0)
          ? "monitor_provider_switch_execution_mismatch_history"
        : crossGroupProviderReliabilitySignal?.actionable === true
          ? "monitor_cross_group_provider_reliability_guidance"
          : "monitor_pressure_memory_provenance_receipt_contract",
    severity: active && (
      Number(top.effective_violation_count || top.violation_count || 0) >= threshold * 2
      || Number(top.provider_switch_execution_mismatch_count || 0) >= providerSwitchExecutionMismatchThreshold * 2
    ) ? "high" : active ? "medium" : "none",
    receiptContractMode: pressureDisciplineActive ? "strict_required_for_pressure_memory" : active ? "preemptive_ack_and_empty_usage_allowed" : "default",
    ackRequired: active,
    finalReceiptVerificationRequired: active,
    memoryProvenanceUsageRequiredWhenPressureMemoryPresent: active,
    currentSourceVerificationRequiredWhenUsed: active,
    closeGate: active ? "do_not_close_until_memoryProvenanceUsage_is_present_or_explicitly_empty_with_reason" : "default_receipt_review",
    requiredReceiptFields: active
      ? ["memoryProvenanceUsage", "relPath", "usageState", "provenanceStatus", "repairWorkItemId", "repairStatus", "repairGapType", "currentSourceVerified"]
      : [],
    policyRows,
    relPaths: uniqueStrings(policyRows.flatMap((row: any) => [
      ...(Array.isArray(row.rel_paths) ? row.rel_paths : []),
      ...(Array.isArray(row.provider_override_followup_rel_paths) ? row.provider_override_followup_rel_paths : []),
      ...(Array.isArray(row.provider_override_followup_receipt_validation_rel_paths) ? row.provider_override_followup_receipt_validation_rel_paths : []),
      ...(Array.isArray(row.provider_switch_execution_memory_rel_paths) ? row.provider_switch_execution_memory_rel_paths : []),
    ]), 16),
    repairWorkItemIds: uniqueStrings(policyRows.flatMap((row: any) => [
      ...(Array.isArray(row.repair_work_item_ids) ? row.repair_work_item_ids : []),
      ...(Array.isArray(row.provider_override_followup_work_item_ids) ? row.provider_override_followup_work_item_ids : []),
      ...(Array.isArray(row.provider_override_followup_receipt_validation_repair_work_item_ids) ? row.provider_override_followup_receipt_validation_repair_work_item_ids : []),
    ]), 16),
    gapCodes: uniqueStrings(policyRows.flatMap((row: any) => [
      ...(Array.isArray(row.gap_codes) ? row.gap_codes : []),
      ...(Array.isArray(row.provider_override_followup_receipt_validation_gap_codes) ? row.provider_override_followup_receipt_validation_gap_codes : []),
      ...(Array.isArray(row.provider_switch_execution_gap_codes) ? row.provider_switch_execution_gap_codes : []),
    ]), 16),
    reason: active
      ? top.provider_switch_execution_mismatch_escalated === true
        ? compactText(`Provider switch execution typed memory found ${top.provider_switch_execution_mismatch_count || 0} mismatch(es) for expected provider=${agentType} project=${targetProject || "unknown"}; hold new approved switches for this provider/project until runner/session binding repair is verified.`, 700)
        : top.provider_override_followup_receipt_validation_escalated === true
        ? compactText(`Corrected provider override follow-up receipts failed ${top.provider_override_followup_receipt_validation_consecutive_failure_count || 0} consecutive validation attempt(s) for agentType=${agentType} project=${targetProject || "unknown"}; hold new child Agent dispatch until a receipt satisfies the full relPath/work-item/override-id/current-source contract.`, 700)
        : compactText(`Phase 137 feedback memory found repeated pressure provenance receipt violations for agentType=${agentType} project=${targetProject || "unknown"}; effective violations=${top.effective_violation_count ?? top.violation_count ?? 0} after recovery credits${top.relapsed ? `; recovered attribution relapsed with ${top.post_recovery_violation_count || 0} post-recovery violation(s)` : ""}; require stricter ACK and final receipt verification before child Agent closure.`, 700)
      : disabled
        ? "pressure provenance feedback dispatch policy disabled"
        : recovered.length
          ? matching.some((row: any) => row.provider_override_followup_receipt_validation_repair_verified === true)
            ? "corrected provider override follow-up receipt passed after prior failures; clear the active failure streak, retain audit history, and allow monitored receipt sampling"
            : matching.some((row: any) => row.provider_override_followup_repaired === true)
            ? "matching attribution has verified provider dispatch override follow-up repair history; allow only with receipt sampling and current evidence checks"
            : "matching attribution recovered below frequent violation threshold after compliant pressure provenance receipts"
        : matching.some((row: any) => Number(row.provider_switch_execution_mismatch_count || 0) > 0)
          ? "provider switch execution mismatch history exists; keep future switches under receipt sampling and do not treat past passed switch executions as authorization"
        : crossGroupProviderReliabilitySignal?.actionable === true
          ? `privacy-redacted cross-group provider reliability is ${crossGroupProviderReliabilitySignal.risk_status || "unknown"} for agentType=${agentType}; this is receipt-sampling guidance only and cannot override this group's local hold/allow policy`
        : matching.length
          ? "matching attribution exists but has not reached frequent violation threshold"
          : "no matching pressure provenance pre-dispatch compliance feedback attribution",
  };
}

export function normalizeRecallScope(value: any) {
  return safeSegment(value || "global", "global");
}

export function getGroupTypedMemoryRecallScopeStats(groupId: string, scope = "global") {
  const ledger = readGroupTypedMemoryRecallLedger(groupId);
  const key = normalizeRecallScope(scope);
  const scoped = ledger.scopes?.[key] || {};
  return {
    schema: "ccm-group-typed-memory-recall-scope-stats-v1",
    version: 1,
    groupId,
    scope: key,
    deliveredBytes: Math.max(0, Number(scoped.deliveredBytes || scoped.delivered_bytes || 0)),
    deliveredTokens: Math.max(0, Number(scoped.deliveredTokens || scoped.delivered_tokens || 0)),
    deliveryCount: Math.max(0, Number(scoped.deliveryCount || scoped.delivery_count || 0)),
    deliveredDocumentCount: Math.max(0, Number(scoped.deliveredDocumentCount || scoped.delivered_document_count || 0)),
    compactEpoch: String(scoped.compactEpoch || scoped.compact_epoch || ""),
    taskAgentSessionId: String(scoped.taskAgentSessionId || scoped.task_agent_session_id || ""),
    updatedAt: String(scoped.updatedAt || ""),
    file: ledger.file,
  };
}

export function recordGroupTypedMemoryRecallUnlocked(groupId: string, scope: string, recall: any, query = "", options: any = {}) {
  if (options.disableLedger === true || options.disable_ledger === true || recall?.ignored) return readGroupTypedMemoryRecallLedger(groupId);
  const deliveryCapsule = options.deliveryCapsule || options.delivery_capsule || null;
  const deliveryLease = options.deliveryLease || options.delivery_lease || null;
  const capsuleDeliveredRelPaths = Array.isArray(deliveryCapsule?.delivered_rel_paths || deliveryCapsule?.deliveredRelPaths)
    ? (deliveryCapsule.delivered_rel_paths || deliveryCapsule.deliveredRelPaths).filter(Boolean)
    : null;
  const surfaced = capsuleDeliveredRelPaths !== null
    ? capsuleDeliveredRelPaths
    : Array.isArray(recall?.surfaced) ? recall.surfaced.filter(Boolean) : [];
  if (!surfaced.length) return readGroupTypedMemoryRecallLedger(groupId);
  const ledger = readGroupTypedMemoryRecallLedger(groupId);
  const key = normalizeRecallScope(scope);
  const scoped = ledger.scopes[key] || { docs: {}, updatedAt: "" };
  const at = now();
  if (deliveryLease) {
    const leaseId = String(deliveryLease.lease_id || deliveryLease.leaseId || "");
    const leaseChecksum = String(deliveryLease.lease_checksum || deliveryLease.leaseChecksum || "");
    const leaseGroupId = String(deliveryLease.group_id || deliveryLease.groupId || "");
    const leaseGroupSessionId = String(deliveryLease.group_session_id || deliveryLease.groupSessionId || "");
    const leaseTypedScopeId = leaseGroupSessionId === "default" ? leaseGroupId : `${leaseGroupId}--${leaseGroupSessionId}`;
    const leaseRelPaths = Array.isArray(deliveryLease.delivered_rel_paths || deliveryLease.deliveredRelPaths)
      ? (deliveryLease.delivered_rel_paths || deliveryLease.deliveredRelPaths).map(String).filter(Boolean)
      : [];
    const capsuleRelPaths = Array.isArray(deliveryCapsule?.delivered_rel_paths || deliveryCapsule?.deliveredRelPaths)
      ? (deliveryCapsule.delivered_rel_paths || deliveryCapsule.deliveredRelPaths).map(String).filter(Boolean)
      : [];
    const leaseValid = deliveryLease.schema === "ccm-child-typed-memory-delivery-lease-v1"
      && Number(deliveryLease.version || 0) === 1
      && String(deliveryLease.status || "") === "pending"
      && !!leaseId
      && !!leaseChecksum
      && leaseChecksum === typedMemoryDeliveryLeaseChecksum(deliveryLease)
      && leaseTypedScopeId === groupId
      && normalizeRecallScope(deliveryLease.recall_scope || deliveryLease.recallScope || "") === key
      && String(deliveryLease.task_agent_session_id || deliveryLease.taskAgentSessionId || "").startsWith("tas_")
      && String(deliveryLease.capsule_checksum || deliveryLease.capsuleChecksum || "") === String(deliveryCapsule?.capsule_checksum || deliveryCapsule?.capsuleChecksum || "")
      && Number(deliveryLease.delivered_bytes || deliveryLease.deliveredBytes || 0) === Number(deliveryCapsule?.delivered_bytes || deliveryCapsule?.deliveredBytes || 0)
      && Number(deliveryLease.delivered_tokens || deliveryLease.deliveredTokens || 0) === Number(deliveryCapsule?.delivered_tokens || deliveryCapsule?.deliveredTokens || 0)
      && JSON.stringify(leaseRelPaths) === JSON.stringify(capsuleRelPaths)
      && JSON.stringify(leaseRelPaths) === JSON.stringify(surfaced.map(String));
    if (!leaseValid) return ledger;
    const existingLease = scoped.deliveryLeases?.[leaseId] || null;
    if (existingLease?.status === "committed") {
      if (String(existingLease.leaseChecksum || "") !== leaseChecksum) return ledger;
      scoped.deliveryLeases = scoped.deliveryLeases || {};
      scoped.deliveryLeases[leaseId] = {
        ...existingLease,
        duplicateCount: Math.max(0, Number(existingLease.duplicateCount || 0)) + 1,
        lastDuplicateAt: at,
        lastCommitDuplicate: true,
      };
      scoped.updatedAt = at;
      ledger.scopes[key] = scoped;
      ledger.updatedAt = at;
      writeJsonAtomic(ledger.file, {
        schema: "ccm-group-typed-memory-recall-ledger-v1",
        version: 3,
        scopes: ledger.scopes,
        updatedAt: at,
      });
      return readGroupTypedMemoryRecallLedger(groupId);
    }
  }
  const recalledChecksums = new Map((Array.isArray(recall?.recalled) ? recall.recalled : [])
    .map((doc: any) => [String(doc.relPath || doc.rel_path || "").toLowerCase(), String(doc.checksum || doc.document_checksum || "")])
    .filter(([relPath, documentChecksum]: any) => relPath && documentChecksum));
  const currentChecksums = new Map(scanGroupTypedMemoryDocuments(groupId)
    .map((doc: any) => [String(doc.relPath || "").toLowerCase(), String(doc.checksum || "")]));
  for (const relPath of surfaced) {
    const docKey = String(relPath || "");
    const prev = scoped.docs?.[docKey] || {};
    const documentChecksum = recalledChecksums.get(docKey.toLowerCase()) || currentChecksums.get(docKey.toLowerCase()) || "";
    scoped.docs = scoped.docs || {};
    scoped.docs[docKey] = {
      relPath: docKey,
      documentChecksum,
      firstAt: prev.firstAt || at,
      lastAt: at,
      count: Number(prev.count || 0) + 1,
      lastQueryHash: checksum(String(query || ""), 16),
    };
  }
  const entries = Object.entries(scoped.docs || {}).sort((a: any, b: any) => String(a[1].lastAt || "").localeCompare(String(b[1].lastAt || ""))).slice(-200);
  scoped.docs = Object.fromEntries(entries);
  scoped.updatedAt = at;
  const scopeMetadata = options.scopeMetadata || options.scope_metadata || {};
  scoped.scope = key;
  scoped.scopeKind = String(scopeMetadata.scopeKind || scopeMetadata.scope_kind || scoped.scopeKind || "");
  scoped.targetProject = String(scopeMetadata.targetProject || scopeMetadata.target_project || scoped.targetProject || "");
  scoped.taskId = String(scopeMetadata.taskId || scopeMetadata.task_id || scoped.taskId || "");
  scoped.taskAgentSessionId = String(scopeMetadata.taskAgentSessionId || scopeMetadata.task_agent_session_id || scoped.taskAgentSessionId || "");
  scoped.compactEpoch = String(scopeMetadata.compactEpoch || scopeMetadata.compact_epoch || scoped.compactEpoch || "");
  if (deliveryCapsule?.schema === "ccm-child-typed-memory-delivery-capsule-v1") {
    scoped.deliveredBytes = Math.max(0, Number(scoped.deliveredBytes || 0)) + Math.max(0, Number(deliveryCapsule.delivered_bytes || deliveryCapsule.deliveredBytes || 0));
    scoped.deliveredTokens = Math.max(0, Number(scoped.deliveredTokens || 0)) + Math.max(0, Number(deliveryCapsule.delivered_tokens || deliveryCapsule.deliveredTokens || 0));
    scoped.deliveryCount = Math.max(0, Number(scoped.deliveryCount || 0)) + 1;
    scoped.deliveredDocumentCount = Math.max(0, Number(scoped.deliveredDocumentCount || 0)) + surfaced.length;
    scoped.lastDeliveryCapsuleChecksum = String(deliveryCapsule.capsule_checksum || deliveryCapsule.capsuleChecksum || "");
  }
  if (deliveryLease) {
    const leaseId = String(deliveryLease.lease_id || deliveryLease.leaseId || "");
    scoped.deliveryLeases = scoped.deliveryLeases || {};
    scoped.deliveryLeases[leaseId] = {
      schema: "ccm-child-typed-memory-delivery-lease-commit-v1",
      leaseId,
      leaseChecksum: String(deliveryLease.lease_checksum || deliveryLease.leaseChecksum || ""),
      capsuleChecksum: String(deliveryLease.capsule_checksum || deliveryLease.capsuleChecksum || ""),
      status: "committed",
      commitCount: 1,
      duplicateCount: 0,
      lastCommitDuplicate: false,
      committedAt: at,
      deliveredRelPaths: Array.isArray(deliveryLease.delivered_rel_paths || deliveryLease.deliveredRelPaths) ? (deliveryLease.delivered_rel_paths || deliveryLease.deliveredRelPaths).map(String) : [],
      deliveredBytes: Math.max(0, Number(deliveryLease.delivered_bytes || deliveryLease.deliveredBytes || 0)),
      deliveredTokens: Math.max(0, Number(deliveryLease.delivered_tokens || deliveryLease.deliveredTokens || 0)),
      queryChecksum: String(deliveryLease.query_checksum || deliveryLease.queryChecksum || ""),
      attemptSequence: Math.max(0, Number(deliveryLease.attempt_sequence || deliveryLease.attemptSequence || 0)),
    };
    scoped.deliveryLeases = Object.fromEntries(Object.entries(scoped.deliveryLeases)
      .sort((a: any, b: any) => String(a[1]?.committedAt || "").localeCompare(String(b[1]?.committedAt || "")))
      .slice(-GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_DELIVERY_LEASES_PER_SCOPE));
  }
  ledger.scopes[key] = scoped;
  ledger.scopes = Object.fromEntries(Object.entries(ledger.scopes)
    .sort((a: any, b: any) => String(a[1]?.updatedAt || "").localeCompare(String(b[1]?.updatedAt || "")))
    .slice(-GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_SCOPES));
  ledger.updatedAt = at;
  writeJsonAtomic(ledger.file, {
    schema: "ccm-group-typed-memory-recall-ledger-v1",
    version: 3,
    scopes: ledger.scopes,
    updatedAt: at,
  });
  return readGroupTypedMemoryRecallLedger(groupId);
}

export function recordGroupTypedMemoryRecall(groupId: string, scope: string, recall: any, query = "", options: any = {}) {
  return require("./group-memory-loading").recordGroupTypedMemoryRecall(groupId, scope, recall, query, options);
}

export function typedMemoryStaleCandidateChecksum(candidate: any) {
  return checksum([
    candidate.schema,
    candidate.version,
    candidate.candidate_id,
    candidate.scope_id,
    candidate.target_project,
    candidate.task_id,
    candidate.execution_id,
    candidate.task_agent_session_id,
    candidate.memory_context_snapshot_id,
    candidate.memory_context_snapshot_checksum,
    candidate.delivery_receipt_checksum,
    candidate.rel_path,
    candidate.document_checksum,
    candidate.conflict_kind,
    candidate.recommended_action,
    candidate.conflict_reason,
    candidate.replacement_memory,
    candidate.current_source_relative_path,
    candidate.current_source_observed_checksum,
    candidate.current_source_proof_id,
    candidate.receipt_evidence_checksum,
    candidate.generated_at,
  ], 64);
}

// ===== merged from typed-memory-recall-part-03.ts =====

// Behavior-freeze module extracted mechanically from the former facade.


export function typedMemoryStaleCandidateRejection(scopeId: string, row: any, codes: string[], at: string) {
  const payload = {
    schema: "ccm-group-typed-memory-stale-candidate-rejection-v1",
    version: 1,
    rejection_id: `tmsr_${checksum([scopeId, row.task_id || row.taskId || "", row.execution_id || row.executionId || "", row.task_agent_session_id || row.taskAgentSessionId || "", row.rel_path || row.relPath || "", row.recommended_memory_action || row.recommendedMemoryAction || "", codes], 28)}`,
    scope_id: scopeId,
    task_id: String(row.task_id || row.taskId || ""),
    execution_id: String(row.execution_id || row.executionId || ""),
    task_agent_session_id: String(row.task_agent_session_id || row.taskAgentSessionId || ""),
    rel_path: String(row.rel_path || row.relPath || ""),
    requested_action: String(row.recommended_memory_action || row.recommendedMemoryAction || ""),
    rejection_codes: uniqueStrings(codes).slice(0, 16),
    rejected_at: at,
  };
  return { ...payload, checksum: typedMemoryStaleRejectionChecksum(payload) };
}

export function recordGroupTypedMemoryStaleCandidates(groupId: string, input: any = {}) {
  const scopeId = String(groupId || "").trim();
  const rows = Array.isArray(input.rows) ? input.rows.slice(0, 240) : [];
  const ledger = readGroupTypedMemoryStaleCandidateLedger(scopeId);
  if (ledger.ledger_checksum_valid !== true) {
    return { ...ledger, recorded_count: 0, duplicate_count: 0, rejected_this_run: rows.length, blocked_reason: "ledger_checksum_invalid" };
  }
  const at = String(input.generatedAt || input.generated_at || now());
  if (!isExactGroupTypedMemorySessionScope(scopeId)) {
    const scopeRejections = rows
      .filter((row: any) => row.conflict_detected === true || row.conflictDetected === true)
      .map((row: any) => typedMemoryStaleCandidateRejection(scopeId, row, ["invalid_or_unscoped_group_session"], at));
    return {
      ...ledger,
      rejections: [...ledger.rejections, ...scopeRejections],
      recorded_count: 0,
      duplicate_count: 0,
      rejected_this_run: scopeRejections.length,
      persisted: false,
      blocked_reason: "invalid_or_unscoped_group_session",
    };
  }
  const candidates = [...ledger.candidates.map((candidate: any) => {
    const { status, resolution, ...stored } = candidate;
    return stored;
  })];
  const events = [...ledger.resolution_events];
  const rejections = [...ledger.rejections];
  const docs = new Map(scanGroupTypedMemoryDocumentsRaw(scopeId).map((doc: any) => [String(doc.relPath || "").toLowerCase(), doc]));
  const existingIds = new Set(candidates.map((candidate: any) => String(candidate.candidate_id || "")));
  const existingRejectionIds = new Set(rejections.map((rejection: any) => String(rejection.rejection_id || "")));
  let recordedCount = 0;
  let duplicateCount = 0;
  let rejectedCount = 0;
  for (const row of rows) {
    const conflictDetected = row.conflict_detected === true || row.conflictDetected === true;
    if (!conflictDetected) continue;
    const relPath = String(row.rel_path || row.relPath || "").trim();
    const documentChecksum = String(row.document_checksum || row.documentChecksum || "").trim();
    const action = String(row.recommended_memory_action || row.recommendedMemoryAction || "").trim().toLowerCase();
    const conflictKind = String(row.conflict_kind || row.conflictKind || "behavior_changed").trim().toLowerCase();
    const conflictReason = compactText(row.conflict_reason || row.conflictReason || "", 1200);
    const replacementMemory = compactText(row.replacement_memory || row.replacementMemory || "", 12_000);
    const currentDoc: any = docs.get(relPath.toLowerCase());
    const rejectionCodes: string[] = [];
    if (!isExactGroupTypedMemorySessionScope(scopeId)) rejectionCodes.push("invalid_or_unscoped_group_session");
    if (String(row.usage_state || row.usageState || "").toLowerCase() === "ignored") rejectionCodes.push("ignored_memory_cannot_create_candidate");
    if (!relPath || !documentChecksum || !currentDoc || String(currentDoc.checksum || "") !== documentChecksum) rejectionCodes.push("memory_document_binding_invalid");
    if (row.evidence_valid !== true && row.evidenceValid !== true) rejectionCodes.push("task_snapshot_binding_invalid");
    if (!String(row.task_agent_session_id || row.taskAgentSessionId || "").trim()
      || !String(row.memory_context_snapshot_id || row.memoryContextSnapshotId || "").trim()
      || !String(row.memory_context_snapshot_checksum || row.memoryContextSnapshotChecksum || "").trim()
      || !String(row.delivery_receipt_checksum || row.deliveryReceiptChecksum || "").trim()) rejectionCodes.push("delivery_binding_incomplete");
    const proofValid = row.current_source_proof_valid === true || row.currentSourceProofValid === true;
    const claimedSourceChecksum = String(row.current_source_claimed_checksum || row.currentSourceClaimedChecksum || "").trim().toLowerCase();
    const observedSourceChecksum = String(row.current_source_observed_checksum || row.currentSourceObservedChecksum || "").trim().toLowerCase();
    if (!proofValid || !String(row.current_source_relative_path || row.currentSourceRelativePath || "").trim()
      || !String(row.current_source_proof_id || row.currentSourceProofId || "").trim()
      || !/^[a-f0-9]{64}$/.test(observedSourceChecksum)
      || claimedSourceChecksum !== observedSourceChecksum) rejectionCodes.push("current_source_proof_invalid");
    if (!["update", "remove"].includes(action)) rejectionCodes.push("unsupported_memory_action");
    if (!conflictReason) rejectionCodes.push("missing_conflict_reason");
    if (action === "update" && !replacementMemory) rejectionCodes.push("missing_replacement_memory");
    if (rejectionCodes.length) {
      const rejection = typedMemoryStaleCandidateRejection(scopeId, row, rejectionCodes, at);
      if (existingRejectionIds.has(rejection.rejection_id)) duplicateCount += 1;
      else {
        rejections.push(rejection);
        existingRejectionIds.add(rejection.rejection_id);
        rejectedCount += 1;
      }
      continue;
    }
    const candidateId = `tmsc_${checksum([
      scopeId,
      row.task_id || row.taskId || "",
      row.execution_id || row.executionId || "",
      row.task_agent_session_id || row.taskAgentSessionId || "",
      relPath.toLowerCase(),
      documentChecksum,
      action,
      conflictReason,
      replacementMemory,
      observedSourceChecksum,
    ], 28)}`;
    if (existingIds.has(candidateId)) {
      duplicateCount += 1;
      continue;
    }
    const payload = {
      schema: "ccm-group-typed-memory-stale-candidate-v1",
      version: 1,
      candidate_id: candidateId,
      scope_id: scopeId,
      target_project: String(row.target_project || row.targetProject || input.targetProject || input.target_project || ""),
      task_id: String(row.task_id || row.taskId || input.taskId || input.task_id || ""),
      execution_id: String(row.execution_id || row.executionId || input.executionId || input.execution_id || ""),
      task_agent_session_id: String(row.task_agent_session_id || row.taskAgentSessionId || ""),
      memory_context_snapshot_id: String(row.memory_context_snapshot_id || row.memoryContextSnapshotId || ""),
      memory_context_snapshot_checksum: String(row.memory_context_snapshot_checksum || row.memoryContextSnapshotChecksum || ""),
      delivery_receipt_checksum: String(row.delivery_receipt_checksum || row.deliveryReceiptChecksum || ""),
      rel_path: relPath,
      document_checksum: documentChecksum,
      memory_name: compactText(currentDoc.name || "", 180),
      memory_type: normalizeMemoryType(currentDoc.type),
      conflict_kind: conflictKind,
      recommended_action: action,
      conflict_reason: conflictReason,
      replacement_memory: action === "update" ? replacementMemory : "",
      current_source_relative_path: String(row.current_source_relative_path || row.currentSourceRelativePath || ""),
      current_source_claimed_checksum: claimedSourceChecksum,
      current_source_observed_checksum: observedSourceChecksum,
      current_source_proof_id: String(row.current_source_proof_id || row.currentSourceProofId || ""),
      receipt_evidence_checksum: String(row.receipt_evidence_checksum || row.receiptEvidenceChecksum || ""),
      generated_at: String(row.generated_at || row.generatedAt || at),
    };
    candidates.push({ ...payload, checksum: typedMemoryStaleCandidateChecksum(payload) });
    existingIds.add(candidateId);
    recordedCount += 1;
  }
  const next = writeGroupTypedMemoryStaleCandidateLedger(scopeId, {
    candidates,
    resolution_events: events,
    rejections,
    updated_at: at,
  });
  return { ...next, recorded_count: recordedCount, duplicate_count: duplicateCount, rejected_this_run: rejectedCount };
}

export function verifyTypedMemoryStaleCandidateCurrentSource(candidate: any) {
  const project = String(candidate.target_project || "").trim().toLowerCase();
  const relativePath = String(candidate.current_source_relative_path || "").trim();
  const expectedChecksum = String(candidate.current_source_observed_checksum || "").trim().toLowerCase();
  if (!project || !relativePath || !/^[a-f0-9]{64}$/.test(expectedChecksum)) return { valid: false, status: "candidate_source_binding_invalid" };
  try {
    const db = require("../../core/db");
    const config = (db.getConfigs() || []).find((item: any) => String(item?.name || "").trim().toLowerCase() === project);
    const workDir = String(config ? db.getConfigInfo(config.path)?.[0]?.workDir || "" : "").trim();
    if (!workDir || !fs.existsSync(workDir)) return { valid: false, status: "project_workdir_unavailable" };
    const realRoot = fs.realpathSync(path.resolve(workDir));
    const requested = path.resolve(realRoot, relativePath);
    if (!fs.existsSync(requested)) return { valid: false, status: "source_missing" };
    const realFile = fs.realpathSync(requested);
    const rootPrefix = `${realRoot}${path.sep}`.toLowerCase();
    if (realFile.toLowerCase() !== realRoot.toLowerCase() && !realFile.toLowerCase().startsWith(rootPrefix)) return { valid: false, status: "source_outside_project" };
    if (!fs.statSync(realFile).isFile()) return { valid: false, status: "source_not_file" };
    const observedChecksum = crypto.createHash("sha256").update(fs.readFileSync(realFile)).digest("hex");
    return { valid: observedChecksum === expectedChecksum, status: observedChecksum === expectedChecksum ? "system_file_checksum_match" : "source_changed_since_candidate", observed_checksum: observedChecksum };
  } catch {
    return { valid: false, status: "source_revalidation_failed" };
  }
}

export function resolveGroupTypedMemoryStaleCandidate(groupId: string, input: any = {}) {
  const scopeId = String(groupId || "").trim();
  if (!isExactGroupTypedMemorySessionScope(scopeId)) throw new Error("Stale memory candidate resolution requires exact group--gcs_* scope");
  if (input.explicitConfirmation !== true && input.explicit_confirmation !== true) throw new Error("Stale memory candidate resolution requires explicit user confirmation");
  const reason = compactText(input.reason || "", 800);
  if (!reason) throw new Error("Stale memory candidate resolution requires a reason");
  const requestedAction = String(input.action || "").trim().toLowerCase();
  if (!["confirm_update", "confirm_remove", "reject"].includes(requestedAction)) throw new Error("Unsupported stale memory candidate resolution action");
  const candidateId = String(input.candidateId || input.candidate_id || "").trim();
  const candidateChecksum = String(input.candidateChecksum || input.candidate_checksum || "").trim();
  const ledger = readGroupTypedMemoryStaleCandidateLedger(scopeId);
  if (ledger.ledger_checksum_valid !== true) throw new Error("Stale memory candidate ledger checksum is invalid");
  const candidate = ledger.candidates.find((item: any) => item.candidate_id === candidateId);
  if (!candidate || candidate.status !== "pending") throw new Error("Pending stale memory candidate not found");
  if (!candidateChecksum || candidateChecksum !== candidate.checksum) throw new Error("Stale memory candidate checksum mismatch");
  const action = requestedAction === "reject" ? candidate.recommended_action : requestedAction.replace("confirm_", "");
  if (requestedAction !== "reject" && action !== candidate.recommended_action) throw new Error("Confirmed action does not match candidate recommendation");
  let replacementRelPath = "";
  let replacementDocumentChecksum = "";
  if (requestedAction !== "reject") {
    const doc = scanGroupTypedMemoryDocumentsRaw(scopeId).find((item: any) => String(item.relPath || "").toLowerCase() === String(candidate.rel_path || "").toLowerCase());
    if (!doc || String(doc.checksum || "") !== String(candidate.document_checksum || "")) throw new Error("Memory document changed since candidate creation");
    const sourceProof = verifyTypedMemoryStaleCandidateCurrentSource(candidate);
    if (sourceProof.valid !== true) throw new Error(`Current source proof is no longer valid: ${sourceProof.status}`);
    if (action === "update") {
      const write = upsertGroupTypedMemoryDocument(scopeId, {
        type: candidate.memory_type || "project",
        slug: `stale-replacement-${candidate.candidate_id}`,
        name: `${candidate.memory_name || candidate.rel_path} (confirmed update)`,
        description: candidate.conflict_reason,
        source: `stale-memory-resolution:${candidate.candidate_id}`,
        updatedAt: now(),
        body: candidate.replacement_memory,
      });
      replacementRelPath = path.basename(write.file);
      replacementDocumentChecksum = String(scanGroupTypedMemoryDocumentsRaw(scopeId)
        .find((item: any) => String(item.relPath || "").toLowerCase() === replacementRelPath.toLowerCase())?.checksum || "");
      if (!replacementDocumentChecksum) throw new Error("Replacement memory document could not be verified");
    }
  }
  const at = now();
  const eventPayload = {
    schema: "ccm-group-typed-memory-stale-resolution-event-v1",
    version: 1,
    event_id: `tmse_${checksum([scopeId, candidateId, requestedAction, candidateChecksum, at], 28)}`,
    candidate_id: candidateId,
    candidate_checksum: candidateChecksum,
    scope_id: scopeId,
    action,
    status: requestedAction === "reject" ? "rejected" : "applied",
    rel_path: candidate.rel_path,
    document_checksum: candidate.document_checksum,
    replacement_rel_path: replacementRelPath,
    replacement_document_checksum: replacementDocumentChecksum,
    actor: String(input.actor || "local-user"),
    reason,
    resolved_at: at,
  };
  const event = { ...eventPayload, checksum: typedMemoryStaleResolutionChecksum(eventPayload) };
  const storedCandidates = ledger.candidates.map((item: any) => {
    const { status, resolution, ...stored } = item;
    return stored;
  });
  const next = writeGroupTypedMemoryStaleCandidateLedger(scopeId, {
    candidates: storedCandidates,
    resolution_events: [...ledger.resolution_events, event],
    rejections: ledger.rejections,
    updated_at: at,
  });
  if (event.status === "applied") buildGroupTypedMemoryIndex(scopeId);
  return { event, candidate: next.candidates.find((item: any) => item.candidate_id === candidateId), ledger: next };
}

export function buildGroupTypedMemoryRecallFreshness(doc: any, nowMs = Date.now()) {
  const parsedUpdatedAt = Date.parse(String(doc?.updatedAt || doc?.updated_at || ""));
  const observedMtimeMs = Number(doc?.mtimeMs || doc?.mtime_ms || 0)
    || (Number.isFinite(parsedUpdatedAt) ? parsedUpdatedAt : Number(nowMs || Date.now()));
  const evaluatedAtMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const ageDays = Math.max(0, Math.floor((evaluatedAtMs - observedMtimeMs) / 86_400_000));
  const ageLabel = ageDays === 0 ? "today" : ageDays === 1 ? "yesterday" : `${ageDays} days ago`;
  const stale = ageDays > 1;
  return {
    schema: "ccm-group-typed-memory-recall-freshness-v1",
    version: 1,
    observed_mtime_ms: observedMtimeMs,
    observed_at: new Date(observedMtimeMs).toISOString(),
    evaluated_at: new Date(evaluatedAtMs).toISOString(),
    age_days: ageDays,
    age_label: ageLabel,
    stale_after_days: 1,
    stale,
    current_source_verification_required: true,
    warning: stale
      ? `This memory is ${ageDays} days old. Memories are point-in-time observations, not live state; verify current files, functions, flags, and resources before asserting them as fact.`
      : "",
  };
}

export function buildGroupTypedMemoryRecall(groupId: string, query: string, options: any = {}) {
  return require("./group-memory-loading").buildGroupTypedMemoryRecall(groupId, query, options);
}

export function renderGroupTypedMemoryRecall(recall: any) {
  return require("./group-memory-loading").renderGroupTypedMemoryRecall(recall);
}

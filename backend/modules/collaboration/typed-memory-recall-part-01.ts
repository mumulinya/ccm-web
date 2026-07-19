// Behavior-freeze split from typed-memory-recall.ts (part 1/3).
// Behavior-freeze module extracted mechanically from the former facade.

import * as crypto from "crypto";

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import { CCM_DIR } from "../../core/utils";

import { readJsonWithBackup, withFileLock, writeJsonAtomic as writeJsonAtomicWithBackup } from "../../core/atomic-json-file";

import { buildCrossGroupProviderDispatchReliabilitySignal, getGroupTypedMemoryDistillationLedgerFile, pressureProvenanceProviderDispatchOverrideFollowupArchive, pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive, providerDispatchReliabilityRound, providerSwitchExecutionArchive, readGroupTypedMemoryDistillationLedger, scoreProviderDispatchReliabilityRows, scoreProviderSwitchExecutionRows, summarizeProviderDispatchOverrideFollowupPolicyAttributions, summarizeProviderDispatchOverrideFollowupReceiptValidationPolicyAttributions, summarizeProviderSwitchExecutionPolicyAttributions } from "./typed-memory-distillation-receipts";
import { buildGroupTypedMemoryIndex, scanGroupTypedMemoryDocuments, scanGroupTypedMemoryDocumentsRaw, upsertGroupTypedMemoryDocument } from "./typed-memory-index-build";
import { readGroupTypedMemoryRecallLedger, readGroupTypedMemoryStaleCandidateLedger, writeGroupTypedMemoryStaleCandidateLedger } from "./typed-memory-ledgers";
import { GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION, GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_HALF_LIFE_DAYS, GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS, GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_DELIVERY_LEASES_PER_SCOPE, GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_SCOPES, SEMANTIC_RECALL_CONCEPTS, checksum, compactText, firstFiniteNumber, isExactGroupTypedMemorySessionScope, normalizeMemoryType, now, safeSegment, tokens, typedMemoryDeliveryLeaseChecksum, typedMemoryStaleRejectionChecksum, typedMemoryStaleResolutionChecksum, uniqueStrings, writeJsonAtomic } from "./typed-memory-shared";

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

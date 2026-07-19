"use strict";
// Behavior-freeze split from collaboration-memory-gates-part-02.ts (part 1/2).
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectTaskTypedMemoryRecallDocs = collectTaskTypedMemoryRecallDocs;
exports.collectReceiptTypedMemoryUsageRows = collectReceiptTypedMemoryUsageRows;
exports.configuredProjectWorkDir = configuredProjectWorkDir;
exports.verifyTypedMemoryCurrentSourceEvidence = verifyTypedMemoryCurrentSourceEvidence;
exports.typedMemoryUsageStateFromReceipt = typedMemoryUsageStateFromReceipt;
exports.collectTaskTypedMemoryConsumptionRows = collectTaskTypedMemoryConsumptionRows;
exports.normalizeTypedMemoryPressureUsageState = normalizeTypedMemoryPressureUsageState;
// Behavior-freeze split from collaboration-memory-gates.ts (part 2/3).
/** Task memory gate collection, receipt evaluation, and visible summaries. Behavior-preserving extraction from the collaboration facade. */
const collaboration_1 = require("./collaboration");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const memory_1 = require("./memory");
const provider_tool_access_evidence_1 = require("../../agents/provider-tool-access-evidence");
const collaboration_memory_gates_part_01_1 = require("./collaboration-memory-gates-part-01");
function collectTaskTypedMemoryRecallDocs(task = {}, context = {}) {
    const docs = new Map();
    const addRecall = (value, source = "", fallbackAgent = "") => {
        const recall = (0, collaboration_memory_gates_part_01_1.extractTypedMemoryRecallFromValue)(value);
        if (!recall?.schema || recall.ignored === true)
            return;
        const recalled = Array.isArray(recall.recalled) ? recall.recalled : [];
        const targetProject = String(value?.target_project
            || value?.targetProject
            || value?.project
            || value?.memory?.target_project
            || value?.memory?.targetProject
            || fallbackAgent
            || task?.target_project
            || "").trim();
        for (const doc of recalled) {
            const relPath = String(doc.relPath || doc.rel_path || "").trim();
            const documentChecksum = String(doc.checksum || doc.document_checksum || doc.documentChecksum || "").trim();
            if (!relPath || !documentChecksum)
                continue;
            const semantic = doc.semanticReference || doc.semantic_reference || {};
            const freshness = doc.freshness || {};
            const key = `${targetProject.toLowerCase()}|${relPath.toLowerCase()}|${documentChecksum}`;
            docs.set(key, {
                schema: "ccm-task-typed-memory-recall-doc-v1",
                group_id: task?.group_id || task?.groupId || value?.group_id || value?.groupId || "",
                group_session_id: task?.group_session_id || task?.groupSessionId || value?.group_session_id || value?.groupSessionId || value?.memory?.group_session_id || value?.memory?.groupSessionId || "",
                target_project: targetProject,
                rel_path: relPath,
                name: String(doc.name || ""),
                type: String(doc.type || ""),
                document_checksum: documentChecksum,
                score: Number(doc.score || 0),
                memory_age_days: Math.max(0, Number(freshness.age_days || freshness.ageDays || 0)),
                memory_age_label: String(freshness.age_label || freshness.ageLabel || "today"),
                memory_stale: freshness.stale === true,
                memory_freshness_checksum: String(recall.memoryFreshness?.checksum || recall.memory_freshness?.checksum || ""),
                current_source_verification_required: freshness.current_source_verification_required !== false,
                query_concepts: Array.isArray(semantic.queryConcepts) ? semantic.queryConcepts.slice(0, 24) : [],
                query_polarities: Array.isArray(semantic.queryPolarities) ? semantic.queryPolarities.slice(0, 12) : [],
                query_relations: Array.isArray(semantic.queryRelations) ? semantic.queryRelations.slice(0, 12) : [],
                source_ref: source,
            });
        }
    };
    addRecall(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
    addRecall(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
    for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
        addRecall(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
        addRecall(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
    }
    for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
        addRecall(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
        addRecall(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
    }
    for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
        addRecall(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
    }
    (0, collaboration_memory_gates_part_01_1.forEachTaskAgentMemoryContextSnapshotSource)(context, addRecall);
    addRecall(context.execution, "execution", task?.target_project);
    return [...docs.values()];
}
function collectReceiptTypedMemoryUsageRows(receipt = {}) {
    const rows = Array.isArray(receipt.typedMemoryUsage || receipt.typed_memory_usage)
        ? (receipt.typedMemoryUsage || receipt.typed_memory_usage)
        : [];
    return rows.map((row) => ({
        rel_path: String(row.relPath || row.rel_path || row.path || "").trim(),
        usage_state: normalizeTypedMemoryPressureUsageState(row.usageState || row.usage_state || row.status || row.state || ""),
        current_source_verified: row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true,
        current_source_evidence: row.currentSourceEvidence || row.current_source_evidence || null,
        reason: (0, memory_1.compactMemoryText)(row.reason || row.note || row.evidence || "", 500),
        conflict_detected: row.conflictDetected === true || row.conflict_detected === true,
        conflict_kind: String(row.conflictKind || row.conflict_kind || "").trim().toLowerCase(),
        recommended_memory_action: String(row.recommendedMemoryAction || row.recommended_memory_action || "").trim().toLowerCase(),
        conflict_reason: (0, memory_1.compactMemoryText)(row.conflictReason || row.conflict_reason || "", 1200),
        replacement_memory: (0, memory_1.compactMemoryText)(row.replacementMemory || row.replacement_memory || "", 12_000),
    })).filter((row) => row.rel_path && row.usage_state).slice(0, 120);
}
function configuredProjectWorkDir(project) {
    const target = String(project || "").trim().toLowerCase();
    if (!target)
        return "";
    try {
        const config = (0, db_1.getConfigs)().find((item) => String(item?.name || "").trim().toLowerCase() === target);
        return String(config ? (0, db_1.getConfigInfo)(config.path)?.[0]?.workDir || "" : "").trim();
    }
    catch {
        return "";
    }
}
function verifyTypedMemoryCurrentSourceEvidence(evidence = null, project = "", context = {}) {
    const sourcePath = String(evidence?.sourcePath || evidence?.source_path || evidence?.path || "").trim();
    const claimedChecksum = String(evidence?.sourceChecksum || evidence?.source_checksum || evidence?.sha256 || evidence?.checksum || "").trim().toLowerCase();
    const evidenceType = String(evidence?.evidenceType || evidence?.evidence_type || evidence?.type || "file_read").trim().toLowerCase();
    const explicitWorkDir = String(context.projectWorkDir || context.project_work_dir
        || context.projectWorkDirs?.[project] || context.project_work_dirs?.[project] || "").trim();
    const workDir = explicitWorkDir || configuredProjectWorkDir(project);
    const base = {
        schema: "ccm-typed-memory-current-source-file-proof-v1",
        valid: false,
        status: "missing_proof",
        evidence_type: evidenceType,
        relative_path: "",
        claimed_checksum: claimedChecksum,
        observed_checksum: "",
        proof_id: "",
    };
    if (!sourcePath || !claimedChecksum)
        return base;
    if (evidenceType !== "file_read")
        return { ...base, status: "unsupported_evidence_type" };
    if (!/^[a-f0-9]{64}$/.test(claimedChecksum))
        return { ...base, status: "invalid_claimed_checksum" };
    if (!workDir || !fs.existsSync(workDir))
        return { ...base, status: "project_workdir_unavailable" };
    try {
        const realRoot = fs.realpathSync(path.resolve(workDir));
        const requested = path.isAbsolute(sourcePath) ? path.resolve(sourcePath) : path.resolve(realRoot, sourcePath);
        if (!fs.existsSync(requested))
            return { ...base, status: "source_missing" };
        const realFile = fs.realpathSync(requested);
        const rootPrefix = `${realRoot}${path.sep}`.toLowerCase();
        if (realFile.toLowerCase() !== realRoot.toLowerCase() && !realFile.toLowerCase().startsWith(rootPrefix)) {
            return { ...base, status: "source_outside_project" };
        }
        const stat = fs.statSync(realFile);
        if (!stat.isFile())
            return { ...base, status: "source_not_file" };
        if (stat.size > 16 * 1024 * 1024)
            return { ...base, status: "source_too_large" };
        const observedChecksum = crypto.createHash("sha256").update(fs.readFileSync(realFile)).digest("hex");
        const relativePath = path.relative(realRoot, realFile).replace(/\\/g, "/") || path.basename(realFile);
        const valid = observedChecksum === claimedChecksum;
        return {
            ...base,
            valid,
            status: valid ? "system_file_checksum_match" : "source_checksum_mismatch",
            relative_path: relativePath,
            observed_checksum: observedChecksum,
            proof_id: valid ? `tmcp_${crypto.createHash("sha256").update(JSON.stringify([project, relativePath, observedChecksum])).digest("hex").slice(0, 28)}` : "",
        };
    }
    catch {
        return { ...base, status: "source_read_failed" };
    }
}
function typedMemoryUsageStateFromReceipt(doc, receipt = {}, context = {}) {
    const relPath = String(doc.rel_path || "");
    const name = String(doc.name || "");
    const structured = collectReceiptTypedMemoryUsageRows(receipt).find((row) => String(row.rel_path || "").toLowerCase() === relPath.toLowerCase());
    const usedRows = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
    const ignoredRows = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
    const usedText = usedRows.map((item) => String(item || "")).join("\n");
    const ignoredText = ignoredRows.map((item) => String(item || "")).join("\n");
    const refs = (0, collaboration_1.uniqueStrings)(relPath, name, relPath ? path.basename(relPath) : "").filter(Boolean);
    const cites = (text) => refs.some((ref) => text.toLowerCase().includes(ref.toLowerCase()));
    if (structured) {
        const claimedState = structured.current_source_verified && structured.usage_state === "used" ? "verified" : structured.usage_state;
        const currentSourceProof = verifyTypedMemoryCurrentSourceEvidence(structured.current_source_evidence, String(doc.target_project || receipt.agent || receipt.project || ""), context);
        const state = claimedState === "verified" && currentSourceProof.valid !== true ? "used" : claimedState;
        return {
            usage_state: state,
            claimed_usage_state: claimedState,
            current_source_verified: state === "verified" && currentSourceProof.valid === true,
            current_source_proof: currentSourceProof,
            direct_reference: true,
            evidence_tier: currentSourceProof.valid === true && state === "verified" ? "system_current_source_file_proof" : "bound_structured_receipt",
            evidence_confidence: currentSourceProof.valid === true && state === "verified" ? 1 : 0.75,
            anomaly_codes: claimedState === "verified" && state !== "verified" ? ["verified_without_system_current_source_proof"] : [],
            reason: structured.reason || "typedMemoryUsage cites surfaced relPath",
            conflict_detected: structured.conflict_detected === true,
            conflict_kind: structured.conflict_kind,
            recommended_memory_action: structured.recommended_memory_action,
            conflict_reason: structured.conflict_reason,
            replacement_memory: structured.replacement_memory,
        };
    }
    if (cites(ignoredText))
        return { usage_state: "ignored", claimed_usage_state: "ignored", current_source_verified: false, current_source_proof: null, direct_reference: true, evidence_tier: "bound_text_receipt", evidence_confidence: 0.5, anomaly_codes: [], reason: "memoryIgnored cites surfaced relPath" };
    if (cites(usedText)) {
        const verified = /verified|validated|checked|current source|re-read|当前源|当前文件|最新源|重读|核验|验证|检查/i.test(usedText);
        return { usage_state: "used", claimed_usage_state: verified ? "verified" : "used", current_source_verified: false, current_source_proof: null, direct_reference: true, evidence_tier: "bound_text_receipt", evidence_confidence: 0.5, anomaly_codes: verified ? ["verified_without_structured_current_source_proof"] : [], reason: "memoryUsed cites surfaced relPath" };
    }
    return { usage_state: "mentioned", claimed_usage_state: "mentioned", current_source_verified: false, current_source_proof: null, direct_reference: false, evidence_tier: "snapshot_surfaced_only", evidence_confidence: 0.25, anomaly_codes: [], reason: "surfaced typed memory missing per-relPath receipt declaration" };
}
function collectTaskTypedMemoryConsumptionRows(task = {}, receipts = [], context = {}) {
    const docs = collectTaskTypedMemoryRecallDocs(task, context);
    if (!docs.length)
        return [];
    const providerEvidenceRows = Array.isArray(context.providerToolAccessEvidence || context.provider_tool_access_evidence)
        ? (context.providerToolAccessEvidence || context.provider_tool_access_evidence)
        : [];
    const receiptCandidates = Array.isArray(receipts) ? receipts : [];
    const accessFor = (doc, snapshot, currentSourceProof = {}) => {
        const expected = {
            groupId: doc.group_id || task?.group_id || task?.groupId || "",
            groupSessionId: doc.group_session_id || task?.group_session_id || task?.groupSessionId || "",
            taskId: task?.id || "",
            executionId: snapshot.execution_id || snapshot.executionId || "",
            taskAgentSessionId: snapshot.task_agent_session_id || snapshot.taskAgentSessionId || "",
        };
        const evidence = providerEvidenceRows.find((candidate) => (0, provider_tool_access_evidence_1.verifyProviderToolAccessEvidence)(candidate, expected).valid === true) || null;
        const match = evidence ? (0, provider_tool_access_evidence_1.matchProviderToolAccessEvidence)(evidence, [
            doc.rel_path,
            doc.name,
            currentSourceProof.relative_path,
        ].filter(Boolean)) : { matched: false, eventCount: 0, events: [] };
        return {
            access_state: match.matched ? "read_observed" : evidence?.captureStatus === "observed" ? "no_matching_read_observed" : String(evidence?.captureStatus || "capture_missing"),
            access_event_count: Number(match.eventCount || 0),
            access_evidence_checksum: String(evidence?.checksum || ""),
            access_event_checksums: (Array.isArray(match.events) ? match.events : []).map((event) => String(event.eventChecksum || "")).filter(Boolean).slice(0, 20),
            access_capture_status: String(evidence?.captureStatus || "capture_missing"),
            access_evidence_valid: !!evidence,
        };
    };
    const claimedRows = receiptCandidates.flatMap((receipt) => {
        const validation = (0, collaboration_memory_gates_part_01_1.evaluateReceiptTaskAgentMemoryContextSnapshot)(task, receipt, context);
        const validSnapshot = Array.isArray(validation.rows) ? validation.rows.find((row) => row.pass === true) : null;
        if (validation.required !== true || validation.pass !== true || !validSnapshot)
            return [];
        const expectedGroupId = String(task?.group_id || task?.groupId || "").trim();
        const expectedGroupSessionId = String(task?.group_session_id || task?.groupSessionId || "default").trim();
        if (String(validSnapshot.group_id || "").trim() !== expectedGroupId
            || String(validSnapshot.group_session_id || "default").trim() !== expectedGroupSessionId)
            return [];
        const agent = (0, collaboration_memory_gates_part_01_1.normalizeMemoryGateAgent)(receipt.agent || receipt.project || task?.target_project);
        const matchingDocs = docs.filter((doc) => {
            const target = (0, collaboration_memory_gates_part_01_1.normalizeMemoryGateAgent)(doc.target_project);
            return !target || !agent || target === agent;
        });
        const receiptEvidenceChecksum = crypto.createHash("sha256").update(JSON.stringify({
            typedMemoryUsage: receipt.typedMemoryUsage || receipt.typed_memory_usage || [],
            memoryUsed: receipt.memoryUsed || receipt.memory_used || [],
            memoryIgnored: receipt.memoryIgnored || receipt.memory_ignored || [],
            memoryContextUsage: receipt.memoryContextUsage || receipt.memory_context_usage || receipt.agentMemoryContextUsage || receipt.agent_memory_context_usage || null,
        })).digest("hex");
        return matchingDocs.map((doc) => {
            const usage = typedMemoryUsageStateFromReceipt(doc, receipt, context);
            const currentSourceProof = usage.current_source_proof || {};
            const access = accessFor(doc, {
                ...validSnapshot,
                execution_id: receipt.execution_id || receipt.executionId || context.execution?.id || context.execution?.execution_id || "",
            }, currentSourceProof);
            return {
                ...doc,
                agent: receipt.agent || receipt.project || doc.target_project || "",
                agent_type: validSnapshot.agent_type || validSnapshot.runtime || "",
                task_id: task?.id || "",
                execution_id: receipt.execution_id || receipt.executionId || context.execution?.id || context.execution?.execution_id || "",
                task_agent_session_id: validSnapshot.task_agent_session_id || "",
                memory_context_snapshot_id: validSnapshot.snapshot_id || "",
                memory_context_snapshot_checksum: validSnapshot.checksum || "",
                delivery_receipt_checksum: validSnapshot.delivery_receipt?.checksum || "",
                model_context_loaded: validSnapshot.memory_context_consumption_receipt_valid === true,
                model_context_consumption_challenge_id: validSnapshot.memory_context_consumption_challenge_id || "",
                model_context_consumption_receipt_signature: validSnapshot.memory_context_consumption_receipt_signature || "",
                usage_state: usage.usage_state,
                claimed_usage_state: usage.claimed_usage_state,
                current_source_verified: usage.current_source_verified === true,
                current_source_proof_valid: currentSourceProof.valid === true,
                current_source_relative_path: currentSourceProof.relative_path || "",
                current_source_claimed_checksum: currentSourceProof.claimed_checksum || "",
                current_source_observed_checksum: currentSourceProof.observed_checksum || "",
                current_source_proof_id: currentSourceProof.proof_id || "",
                verification_status: currentSourceProof.status || (usage.claimed_usage_state === "verified" ? "missing_proof" : "not_requested"),
                evidence_tier: usage.evidence_tier,
                evidence_confidence: usage.evidence_confidence,
                anomaly_codes: usage.anomaly_codes || [],
                direct_reference: usage.direct_reference === true,
                reason: usage.reason,
                conflict_detected: usage.conflict_detected === true,
                conflict_kind: usage.conflict_kind || "",
                recommended_memory_action: usage.recommended_memory_action || "",
                conflict_reason: usage.conflict_reason || "",
                replacement_memory: usage.replacement_memory || "",
                evidence_valid: true,
                receipt_evidence_checksum: receiptEvidenceChecksum,
                lifecycle_state: usage.usage_state === "ignored" ? "ignored" : usage.usage_state === "verified" ? "verified" : usage.usage_state === "used" ? "used" : "delivered_unreported",
                delivery_state: "delivered",
                ...access,
                memory_used: receipt.memoryUsed || receipt.memory_used || [],
                memory_ignored: receipt.memoryIgnored || receipt.memory_ignored || [],
                typed_memory_usage: receipt.typedMemoryUsage || receipt.typed_memory_usage || [],
            };
        });
    }).slice(0, 320);
    const claimedObservationKeys = new Set(claimedRows.map((row) => [
        row.task_agent_session_id,
        row.memory_context_snapshot_id,
        String(row.rel_path || "").toLowerCase(),
        row.document_checksum,
    ].join("|")));
    const deliveryRows = (0, collaboration_memory_gates_part_01_1.getTaskAgentMemoryContextSnapshotSources)(context)
        .map(collaboration_memory_gates_part_01_1.summarizeTaskAgentMemoryContextSnapshot)
        .filter((snapshot) => snapshot.memory_context_delivered === true && snapshot.delivery_receipt_checksum_valid === true)
        .flatMap((snapshot) => {
        const expectedGroupId = String(task?.group_id || task?.groupId || "").trim();
        const expectedGroupSessionId = String(task?.group_session_id || task?.groupSessionId || "default").trim();
        if (String(snapshot.group_id || "").trim() !== expectedGroupId
            || String(snapshot.group_session_id || "default").trim() !== expectedGroupSessionId)
            return [];
        const target = (0, collaboration_memory_gates_part_01_1.normalizeMemoryGateAgent)(snapshot.project || task?.target_project);
        const hasMatchingReceiptCandidate = receiptCandidates.some((receipt) => {
            const receiptTarget = (0, collaboration_memory_gates_part_01_1.normalizeMemoryGateAgent)(receipt.agent || receipt.project || task?.target_project);
            return !target || !receiptTarget || target === receiptTarget;
        });
        if (hasMatchingReceiptCandidate)
            return [];
        return docs.filter((doc) => {
            const docTarget = (0, collaboration_memory_gates_part_01_1.normalizeMemoryGateAgent)(doc.target_project);
            return !docTarget || !target || docTarget === target;
        }).flatMap((doc) => {
            const key = [snapshot.task_agent_session_id, snapshot.snapshot_id, String(doc.rel_path || "").toLowerCase(), doc.document_checksum].join("|");
            if (claimedObservationKeys.has(key))
                return [];
            const deliveryReceipt = snapshot.delivery_receipt || {};
            const access = accessFor(doc, {
                ...snapshot,
                execution_id: deliveryReceipt.executionId || deliveryReceipt.execution_id || "",
            });
            const modelContextLoaded = snapshot.memory_context_consumption_receipt_valid === true;
            return [{
                    ...doc,
                    agent: snapshot.project || doc.target_project || "",
                    agent_type: snapshot.agent_type || "",
                    task_id: task?.id || "",
                    execution_id: deliveryReceipt.executionId || deliveryReceipt.execution_id || "",
                    task_agent_session_id: snapshot.task_agent_session_id || "",
                    memory_context_snapshot_id: snapshot.snapshot_id || "",
                    memory_context_snapshot_checksum: snapshot.checksum || "",
                    delivery_receipt_checksum: deliveryReceipt.checksum || "",
                    usage_state: "mentioned",
                    claimed_usage_state: "mentioned",
                    lifecycle_state: modelContextLoaded ? "loaded_unreported" : "delivered_unreported",
                    delivery_state: modelContextLoaded ? "model_loaded" : "delivered",
                    current_source_verified: false,
                    current_source_proof_valid: false,
                    verification_status: "not_reported",
                    evidence_tier: modelContextLoaded ? "model_mcp_load_receipt" : "system_delivery_receipt",
                    evidence_confidence: modelContextLoaded ? 0.55 : 0.35,
                    anomaly_codes: [modelContextLoaded ? "typed_memory_loaded_usage_unreported" : "typed_memory_usage_unreported"],
                    direct_reference: false,
                    reason: modelContextLoaded
                        ? "the Provider model acknowledged loading the exact trusted memory context, but no per-document semantic usage receipt was recorded"
                        : "typed memory was delivered to the exact task session but no valid bound usage receipt was recorded",
                    evidence_valid: true,
                    receipt_evidence_checksum: crypto.createHash("sha256").update(JSON.stringify([deliveryReceipt.checksum || "", "delivered_unreported"])).digest("hex"),
                    ...access,
                    model_context_loaded: modelContextLoaded,
                    model_context_consumption_challenge_id: snapshot.memory_context_consumption_challenge_id || "",
                    model_context_consumption_receipt_signature: snapshot.memory_context_consumption_receipt_signature || "",
                    memory_used: [],
                    memory_ignored: [],
                    typed_memory_usage: [],
                }];
        });
    });
    return [...claimedRows, ...deliveryRows].slice(0, 320);
}
function normalizeTypedMemoryPressureUsageState(value) {
    const text = String(value || "").trim().toLowerCase();
    if (/verified|validated|checked|current_source_verified|current source|re-read|核验|验证|当前源|已检查/.test(text))
        return "verified";
    if (/ignored|ignore|skip|unused|not_used|未使用|不使用|忽略|跳过/.test(text))
        return "ignored";
    if (/used|use|applied|referenced|consumed|使用|采用|应用|引用|参考/.test(text))
        return "used";
    if (/mentioned|surfaced|shown|presented|提及|出现|下发/.test(text))
        return "mentioned";
    return text;
}
//# sourceMappingURL=collaboration-memory-gates-part-02-part-01.js.map
"use strict";
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
exports.collectTaskGlobalMemoryReceiptGates = collectTaskGlobalMemoryReceiptGates;
exports.extractGlobalMemoryHealthGateFromValue = extractGlobalMemoryHealthGateFromValue;
exports.collectTaskGlobalMemoryHealthGates = collectTaskGlobalMemoryHealthGates;
exports.extractTypedMemoryRecallFromValue = extractTypedMemoryRecallFromValue;
exports.collectTaskTypedMemoryPressureRecallDocs = collectTaskTypedMemoryPressureRecallDocs;
// Behavior-freeze split from collaboration-memory-gates-part-01.ts (part 2/2).
// Behavior-freeze split from collaboration-memory-gates.ts (part 1/3).
/** Task memory gate collection, receipt evaluation, and visible summaries. Behavior-preserving extraction from the collaboration facade. */
const collaboration_1 = require("./collaboration");
const crypto = __importStar(require("crypto"));
const collaboration_memory_gates_part_01_part_01_1 = require("./collaboration-memory-gates-part-01-part-01");
function collectTaskGlobalMemoryReceiptGates(task = {}, context = {}) {
    const gates = new Map();
    const addRecall = (value, source = "", fallbackAgent = "") => {
        const recall = (0, collaboration_memory_gates_part_01_part_01_1.extractGlobalAgentMemoryRecallFromValue)(value);
        if (!recall?.schema)
            return;
        const items = (Array.isArray(recall.items) ? recall.items : [])
            .filter((item) => item?.id || item?.globalMemoryId || item?.global_memory_id)
            .slice(0, 20);
        if (!items.length)
            return;
        const targetProject = String(value?.target_project || value?.targetProject || value?.memory?.target_project || fallbackAgent || task?.target_project || "").trim();
        const itemRows = items.map((item) => {
            const arbitration = item.arbitration || {};
            const semanticRisk = arbitration.semanticRisk || {};
            const cross = item.crossGroupSuppression || arbitration.crossGroupSuppression || {};
            const freshness = cross.freshness || {};
            const semanticRiskScore = Number(arbitration.semanticRiskScore || semanticRisk.score || 0);
            const crossSuppression = cross.suppressed === true
                ? "background_only"
                : cross.advisory === true
                    ? "advisory"
                    : "";
            const risky = arbitration.demoted === true
                || arbitration.conflict === true
                || semanticRiskScore >= 60
                || cross.suppressed === true
                || cross.advisory === true;
            return {
                global_memory_id: String(item.id || item.globalMemoryId || item.global_memory_id || "").trim(),
                type: item.type || "memory",
                status: arbitration.status || "active_global_context",
                action: arbitration.action || "",
                demoted: arbitration.demoted === true,
                conflict: arbitration.conflict === true,
                semantic_risk_score: semanticRiskScore,
                semantic_risk_level: semanticRisk.level || (semanticRiskScore >= 80 ? "high" : semanticRiskScore >= 60 ? "medium" : semanticRiskScore > 0 ? "low" : "none"),
                semantic_reasons: Array.isArray(arbitration.semanticReasons) ? arbitration.semanticReasons.slice(0, 8) : (semanticRisk.reasons || []).slice?.(0, 8) || [],
                cross_group_suppression: crossSuppression,
                cross_group_reason: cross.reason || "",
                cross_group_superseded: freshness.supersededByNewerGlobalMemory === true,
                cross_group_decayed: freshness.decayedToAdvisory === true,
                requires_current_source_verification: risky,
                requires_background_only: cross.suppressed === true || arbitration.demoted === true || arbitration.conflict === true,
            };
        }).filter((item) => item.global_memory_id);
        if (!itemRows.length)
            return;
        const gateId = `gmr:${crypto.createHash("sha256").update([targetProject, source, itemRows.map((item) => item.global_memory_id).join("|")].join("\0")).digest("hex").slice(0, 14)}`;
        gates.set(gateId, {
            schema: "ccm-child-agent-global-memory-receipt-gate-v1",
            gate_id: gateId,
            target_project: targetProject,
            source,
            item_count: itemRows.length,
            risky_count: itemRows.filter((item) => item.requires_current_source_verification).length,
            required_global_memory_ids: itemRows.map((item) => item.global_memory_id),
            items: itemRows,
            raw: recall,
        });
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
    (0, collaboration_memory_gates_part_01_part_01_1.forEachTaskAgentMemoryContextSnapshotSource)(context, addRecall);
    addRecall(context.execution, "execution", task?.target_project);
    return [...gates.values()];
}
function extractGlobalMemoryHealthGateFromValue(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.global_memory_health_gate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.global_memory_health_gate;
    if (value.globalMemoryHealthGate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.globalMemoryHealthGate;
    if (value.global_agent_memory?.memory_health_gate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.global_agent_memory.memory_health_gate;
    if (value.globalAgentMemory?.memoryHealthGate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.globalAgentMemory.memoryHealthGate;
    if (value.references?.global_memory_health_gate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.references.global_memory_health_gate;
    if (value.references?.globalMemoryHealthGate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.references.globalMemoryHealthGate;
    if (value.references?.memory_context)
        return extractGlobalMemoryHealthGateFromValue(value.references.memory_context);
    if (value.references?.memoryContext)
        return extractGlobalMemoryHealthGateFromValue(value.references.memoryContext);
    if (value.worker_context_packet)
        return extractGlobalMemoryHealthGateFromValue(value.worker_context_packet);
    if (value.workerContextPacket)
        return extractGlobalMemoryHealthGateFromValue(value.workerContextPacket);
    if (value.memory)
        return extractGlobalMemoryHealthGateFromValue(value.memory);
    if (value.group_memory)
        return extractGlobalMemoryHealthGateFromValue(value.group_memory);
    return null;
}
function collectTaskGlobalMemoryHealthGates(task = {}, context = {}) {
    const gates = new Map();
    const addGate = (value, source = "", fallbackAgent = "") => {
        const gate = extractGlobalMemoryHealthGateFromValue(value);
        if (!gate?.schema)
            return;
        const gateId = String(gate.gate_id || gate.gateId || "").trim();
        if (!gateId)
            return;
        const targetProject = String(gate.target_project || gate.targetProject || value?.target_project || value?.targetProject || value?.memory?.target_project || fallbackAgent || task?.target_project || "").trim();
        const existing = gates.get(gateId) || {};
        gates.set(gateId, {
            ...existing,
            schema: "ccm-child-agent-global-memory-health-gate-receipt-gate-v1",
            gate_id: gateId,
            target_project: targetProject || existing.target_project || "",
            group_id: gate.group_id || gate.groupId || existing.group_id || "",
            status: gate.status || existing.status || "unknown",
            action: gate.action || existing.action || "",
            pass: gate.pass === true,
            active_contamination_count: Number(gate.active_contamination_count || gate.activeContaminationCount || existing.active_contamination_count || 0),
            residue_contamination_count: Number(gate.residue_contamination_count || gate.residueContaminationCount || existing.residue_contamination_count || 0),
            selftest_bypass: gate.selftest_bypass === true || gate.selftestBypass === true || existing.selftest_bypass === true,
            fail_blocks_global_memory_recall: gate.policy?.fail_blocks_global_memory_recall !== false,
            required_action: gate.status === "fail" || gate.action === "block_global_agent_memory_recall"
                ? "must_ignore_global_agent_memory_and_reference_gate"
                : gate.status === "warn"
                    ? "must_ack_residue_warning_before_global_memory_use"
                    : "must_ack_health_gate",
            source: source || existing.source || "",
            raw: gate,
        });
    };
    addGate(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
    addGate(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
    for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
        addGate(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
        addGate(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
    }
    for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
        addGate(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
        addGate(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
    }
    for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
        addGate(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
    }
    (0, collaboration_memory_gates_part_01_part_01_1.forEachTaskAgentMemoryContextSnapshotSource)(context, addGate);
    addGate(context.execution, "execution", task?.target_project);
    return [...gates.values()];
}
function extractTypedMemoryRecallFromValue(value, depth = 0) {
    if (!value || typeof value !== "object" || depth > 6)
        return null;
    if (value.schema === "ccm-group-typed-memory-recall-v1")
        return value;
    const candidates = [
        value.group_state?.typedMemory?.recall,
        value.group_state?.typed_memory?.recall,
        value.groupState?.typedMemory?.recall,
        value.groupState?.typed_memory?.recall,
        value.typedMemory?.recall,
        value.typed_memory?.recall,
        value.typedMemoryRecall,
        value.typed_memory_recall,
        value.recall,
    ];
    for (const candidate of candidates) {
        if (candidate?.schema === "ccm-group-typed-memory-recall-v1")
            return candidate;
    }
    return extractTypedMemoryRecallFromValue(value.memory, depth + 1)
        || extractTypedMemoryRecallFromValue(value.group_memory, depth + 1)
        || extractTypedMemoryRecallFromValue(value.groupMemory, depth + 1)
        || extractTypedMemoryRecallFromValue(value.worker_context_packet, depth + 1)
        || extractTypedMemoryRecallFromValue(value.workerContextPacket, depth + 1)
        || extractTypedMemoryRecallFromValue(value.references?.memory_context, depth + 1)
        || extractTypedMemoryRecallFromValue(value.references?.memoryContext, depth + 1);
}
function collectTaskTypedMemoryPressureRecallDocs(task = {}, context = {}) {
    const docs = new Map();
    const addRecall = (value, source = "", fallbackAgent = "") => {
        const recall = extractTypedMemoryRecallFromValue(value);
        if (!recall?.schema)
            return;
        const scoring = recall.workerContextPressureScoring || recall.worker_context_pressure_scoring || {};
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
            const pressure = doc.workerContextPressureRecall || doc.worker_context_pressure_recall || {};
            const adjustment = Number(pressure.adjustment || 0);
            if (adjustment <= 0 && scoring.active !== true)
                continue;
            const relPath = String(doc.relPath || doc.rel_path || "").trim();
            if (!relPath)
                continue;
            const key = `${targetProject.toLowerCase()}|${relPath.toLowerCase()}`;
            const existing = docs.get(key) || {};
            docs.set(key, {
                ...existing,
                schema: "ccm-task-typed-memory-pressure-recall-doc-v1",
                group_id: task?.group_id || task?.groupId || value?.group_id || value?.groupId || existing.group_id || "",
                target_project: targetProject || existing.target_project || "",
                rel_path: relPath,
                name: doc.name || existing.name || "",
                type: doc.type || existing.type || "",
                source: doc.source || existing.source || "",
                score: Number(doc.score || existing.score || 0),
                pressure_adjustment: Math.max(Number(existing.pressure_adjustment || 0), adjustment),
                pressure_status: pressure.pressure_status || scoring.pressure_status || existing.pressure_status || "",
                kinds: (0, collaboration_1.uniqueStrings)([...(Array.isArray(existing.kinds) ? existing.kinds : []), ...(Array.isArray(pressure.kinds) ? pressure.kinds : [])]).slice(0, 12),
                source_ref: source || existing.source_ref || "",
                raw: doc,
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
    (0, collaboration_memory_gates_part_01_part_01_1.forEachTaskAgentMemoryContextSnapshotSource)(context, addRecall);
    addRecall(context.execution, "execution", task?.target_project);
    return [...docs.values()];
}
//# sourceMappingURL=collaboration-memory-gates-part-01-part-02.js.map
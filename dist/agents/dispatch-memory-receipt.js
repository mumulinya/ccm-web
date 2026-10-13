"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDispatchMemoryReceipt = normalizeDispatchMemoryReceipt;
/** Retain the bounded agent declaration across receipt parsing. This is only
 * a declaration; acceptance still verifies it against the server snapshot. */
function normalizeDispatchMemoryReceipt(raw) {
    const text = (value, limit = 200) => typeof value === "string" ? value.trim().slice(0, limit) : "";
    const source = raw.agentMemoryContextUsage || raw.agent_memory_context_usage || raw.memoryContextUsage || raw.memory_context_usage;
    const usage = source && typeof source === "object" && !Array.isArray(source) ? {
        bindingId: text(source.bindingId || source.binding_id),
        groupSessionId: text(source.groupSessionId || source.group_session_id),
        sessionMemoryChecksum: text(source.sessionMemoryChecksum || source.session_memory_checksum),
        modelExtractionExecutionId: text(source.modelExtractionExecutionId || source.model_extraction_execution_id),
        modelExtractionReplayStatus: text(source.modelExtractionReplayStatus || source.model_extraction_replay_status),
        factSupersessionGraphChecksum: text(source.factSupersessionGraphChecksum || source.fact_supersession_graph_checksum),
        usageState: text(source.usageState || source.usage_state, 24),
        reason: text(source.reason, 800),
    } : null;
    const citations = raw.memoryFactCitations || raw.memory_fact_citations;
    return {
        task_agent_session_id: text(raw.task_agent_session_id || raw.taskAgentSessionId),
        memory_context_snapshot_id: text(raw.memory_context_snapshot_id || raw.memoryContextSnapshotId),
        memory_context_snapshot_checksum: text(raw.memory_context_snapshot_checksum || raw.memoryContextSnapshotChecksum),
        agentMemoryContextUsage: usage,
        memoryFactCitations: (Array.isArray(citations) ? citations : []).filter(row => row && typeof row === "object").slice(0, 40).map(row => ({
            evidenceId: text(row.evidenceId || row.evidence_id),
            section: text(row.section),
            sectionChecksum: text(row.sectionChecksum || row.section_checksum),
            sourceTranscriptChecksum: text(row.sourceTranscriptChecksum || row.source_transcript_checksum),
            sourceMessageIds: (Array.isArray(row.sourceMessageIds || row.source_message_ids) ? row.sourceMessageIds || row.source_message_ids : []).slice(0, 40).map(id => text(id)).filter(Boolean),
            factId: text(row.factId || row.fact_id),
            factChecksum: text(row.factChecksum || row.fact_checksum),
            usage: text(row.usage || row.reason, 800),
        })),
    };
}
//# sourceMappingURL=dispatch-memory-receipt.js.map
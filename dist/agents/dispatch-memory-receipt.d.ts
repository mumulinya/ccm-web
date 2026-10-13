/** Retain the bounded agent declaration across receipt parsing. This is only
 * a declaration; acceptance still verifies it against the server snapshot. */
export declare function normalizeDispatchMemoryReceipt(raw: any): {
    task_agent_session_id: string;
    memory_context_snapshot_id: string;
    memory_context_snapshot_checksum: string;
    agentMemoryContextUsage: {
        bindingId: string;
        groupSessionId: string;
        sessionMemoryChecksum: string;
        modelExtractionExecutionId: string;
        modelExtractionReplayStatus: string;
        factSupersessionGraphChecksum: string;
        usageState: string;
        reason: string;
    };
    memoryFactCitations: {
        evidenceId: string;
        section: string;
        sectionChecksum: string;
        sourceTranscriptChecksum: string;
        sourceMessageIds: any;
        factId: string;
        factChecksum: string;
        usage: string;
    }[];
};

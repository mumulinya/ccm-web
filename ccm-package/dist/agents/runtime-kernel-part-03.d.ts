export declare function runAgentRuntimeKernelSelfTest(): {
    pass: boolean;
    checks: {
        readAllowed: boolean;
        highRiskAsks: boolean;
        contextBudgetComputed: boolean;
        contextUsageComputed: any;
        workerPacketHasMemoryReinjectionProof: boolean;
        workerPacketHasAckGate: boolean;
        workerPacketRendersContextUsage: boolean;
        workerPacketRendersMemory: boolean;
        contractInjectionHasId: any;
        replaySuiteShape: boolean;
    };
    read: import("./runtime-kernel-part-02").AgentRuntimeLifecycleRecord;
    high: import("./runtime-kernel-part-02").AgentRuntimeLifecycleRecord;
    packet: any;
    replay: {
        pass: boolean;
        total: number;
        needs_review: number;
        replays: {
            success: boolean;
            trace_id: string;
            event_count: any;
            lifecycle_count: any;
            tool_or_dispatch_count: any;
            blocked_count: any;
            contract_injection_count: any;
            ack_signal_count: any;
            verdict: string;
            latest_events: any;
        }[];
    };
};
export declare function runWorkerContextUsageSelfTest(): {
    pass: boolean;
    checks: {
        schema: boolean;
        categorizesTaskAndMemory: boolean;
        categorizesReplayBrief: boolean;
        categorizesTypedRecall: boolean;
        categorizesMemoryReinjectionProof: boolean;
        keepsBudgetBuffers: boolean;
        suggestsReductions: boolean;
        statusOk: boolean;
        renderedMentionsUsage: boolean;
    };
    usage: {
        status: any;
        total_tokens: any;
        free_tokens: any;
        top_categories: any;
    };
};
export declare function runWorkerContextProviderDispatchOverrideFollowupReceiptContractSelfTest(): {
    pass: boolean;
    checks: {
        packetCarriesContract: boolean;
        acceptanceRequiresSamplingReceipt: boolean;
        usageCategorizesContract: boolean;
        renderedShowsContract: boolean;
        advisoryDoesNotHold: boolean;
    };
    contract: {
        schema: any;
        active: boolean;
        rel_paths: any;
        followup_work_item_ids: any;
    };
    acceptance: any;
};

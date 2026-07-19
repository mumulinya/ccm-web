export declare function runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest(): {
    pass: boolean;
    checks: {
        invalidOverrideDoesNotBypassHold: boolean;
        validOverrideDispatchesOnce: boolean;
        validDecisionCarriesOverrideReceipt: boolean;
        bindingLedgerPersistsOverride: boolean;
        ledgerCountersTrackOverride: boolean;
    };
    invalid: {
        action: any;
        dispatch_ready: any;
        override_valid: boolean;
        gaps: any;
    };
    valid: {
        action: any;
        dispatch_ready: any;
        override_valid: boolean;
        next_step: any;
    };
    ledger: {
        providerDispatchDecisionCount: any;
        providerDispatchHoldDecisionCount: any;
        providerDispatchOverrideDecisionCount: any;
    };
};
export declare function runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest(): {
    pass: boolean;
    checks: {
        overrideDispatchCreatesFollowupWorkItem: boolean;
        completionRequiresVerifiedMemoryProvenanceUsage: boolean;
        bindingLedgerPersistsCompletion: boolean;
        followupRepairWorkItemClosed: boolean;
    };
    followup: {
        work_item_id: any;
        before_status: string;
        after_status: string;
    };
    completion: {
        status: any;
        completion_ok: boolean;
        memory_provenance_usage_count: any;
        current_source_verified_count: any;
    };
    ledger: {
        providerDispatchOverrideCompletionCount: any;
    };
};

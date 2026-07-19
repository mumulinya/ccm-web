export declare function runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest(): {
    pass: boolean;
    checks: {
        repairedHistoryFeedsProviderAdvisory: boolean;
        repairedHistoryAllowsSamplingNotHold: boolean;
        preDispatchGateCarriesRepairedHistory: any;
        activeRelapseStillWinsOverHistory: boolean;
        holdDecisionStillRequiresRepair: boolean;
    };
    repaired: {
        health_status: any;
        dispatch_policy: any;
        provider_override_followup_repaired: boolean;
        action: any;
        dispatch_ready: any;
    };
    relapsed: {
        health_status: any;
        dispatch_policy: any;
        provider_override_followup_repaired: boolean;
        provider_override_followup_fresh_after_last_violation: boolean;
        action: any;
        dispatch_ready: any;
    };
};
export declare function runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest(): {
    pass: boolean;
    checks: {
        invalidReceiptFailsContract: any;
        validReceiptPassesContract: boolean;
        ledgerPersistsFinalValidation: boolean;
        ledgerCountersTrackValidation: boolean;
    };
    invalid: {
        status: any;
        gaps: any;
    };
    valid: {
        status: any;
        contract_satisfied: boolean;
        covered_rel_path_count: any;
        covered_followup_work_item_count: any;
        covered_override_id_count: any;
    };
};
export declare function runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest(): {
    pass: boolean;
    checks: {
        everyAttemptIsArchived: boolean;
        typedFeedbackDocumentWritten: any;
        repeatedFailuresEscalatePolicy: boolean;
        repeatedFailuresBlockDispatch: boolean;
        verifiedRepairClearsOnlyActiveStreak: boolean;
        repairedProviderReturnsToSampling: boolean;
        repairedPacketCarriesSamplingContract: boolean;
    };
    archive: {
        attempt_count: any;
        failed_count: any;
        passed_count: any;
        consecutive_failure_count: any;
        repair_verified: boolean;
    };
    escalated: {
        action: string;
        health_status: any;
        dispatch_policy: any;
        dispatch_ready: any;
    };
    repaired: {
        action: string;
        health_status: any;
        dispatch_policy: any;
        dispatch_ready: any;
    };
};
export declare function runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest(): {
    pass: boolean;
    checks: {
        recentEvidenceOutweighsOldRepairedHistory: boolean;
        crossGroupSignalIsActionableAndDecayed: boolean;
        privacyBoundaryRemovesGroupContent: boolean;
        crossGroupGuidanceOnlyAddsSampling: boolean;
        explicitPolicyDisableSuppressesCrossGuidance: boolean;
        workerPacketCarriesOnlySanitizedGuidance: boolean;
        localPolicyRemainsAuthoritative: boolean;
    };
    oldRepaired: {
        risk_status: any;
        risk_score: any;
        weighted_failure_score: any;
    };
    recentFailure: {
        risk_status: any;
        risk_score: any;
        weighted_failure_score: any;
    };
    cross: {
        risk_status: any;
        source_group_count: any;
        action: string;
        dispatch_policy: any;
        dispatch_ready: any;
    };
    local: {
        action: string;
        dispatch_policy: any;
        dispatch_ready: any;
    };
};

export declare function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairLifecycleContextSelfTest(): {
    pass: boolean;
    checks: {
        readyBriefInjectedIntoGroupMainAndCoordinator: boolean;
        globalAgentExcludesGroupScopedRepairContext: boolean;
        globalAgentCannotClaimOrAssign: boolean;
        lifecycleTransitionsPendingClaimedDispatched: boolean;
        exactAssignmentBindingCreated: boolean;
        unassignedAndMismatchedChildrenSeeNoBrief: boolean;
        exactChildAndWorkerPacketReceiveOneBrief: boolean;
        approvalAndExecutionAreSeparated: boolean;
        expiredAndCrossGroupReceiptsBlocked: boolean;
        replayAndConsumedStateTamperBlocked: boolean;
        persistentQualityGateAcceptsHealthyAndRejectsTamper: boolean;
        resolvedBriefRemovedFromAllContexts: boolean;
        evidenceTasksAndApprovalsPreserved: boolean;
    };
    lifecycle: {
        claimed: any;
        dispatched: any;
        resolved: any;
    };
    assignment: {
        binding_id: any;
        packet_brief_count: any;
    };
    receipt: {
        expiredBlocked: boolean;
        crossGroupBlocked: boolean;
        replayBlocked: boolean;
        consumedStateTamperBlocked: boolean;
    };
    quality: {
        before: {
            id: any;
            status: any;
            report: any;
        };
        after: {
            id: any;
            status: any;
            report: any;
        };
    };
};
export declare function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionSelfTest(): {
    pass: boolean;
    checks: {
        allCrashBoundariesPersistAnOpenTransaction: boolean;
        writeBeforePhaseInterruptionsRetainPreviousDurablePhase: boolean;
        preparedWalPrecedesAnyRepairLedgerMutation: boolean;
        discoveryPreservesArtifactsBoundByOpenResolutionTransactions: boolean;
        concurrentMutationBlockedWhileTransactionOpen: boolean;
        startupReconciliationRecoversEveryOpenTransaction: boolean;
        completedTransactionsCarryAllPhaseProofs: any;
        allRepairLedgersConvergeToTerminalState: any;
        repeatedReconciliationIsIdempotent: boolean;
        otherGroupLedgersRemainByteStable: boolean;
        schedulerRunsRealResolutionRecovery: boolean;
        qualityGateAcceptsRecoveredStateAndRejectsTamper: boolean;
        transactionAndLedgerTamperFailClosed: boolean;
        recoveryCreatesNoTasksApprovalsOrDeletionAuthority: boolean;
    };
    crashMatrix: {
        requested: any;
        durablePhase: any;
        status: any;
    }[];
    recovery: {
        recoveredNow: any;
        completed: any;
        open: any;
        invalid: any;
    };
    scheduler: {
        failed: any;
        recoveredNow: any;
        open: any;
    };
    quality: {
        before: any;
        after: any;
    };
};
export declare function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscoverySelfTest(): {
    pass: boolean;
    checks: {
        terminalResolutionHistoryCompactsWithAuditRoot: boolean;
        terminalDetailedTransactionEvidenceRemainsFrozenAcrossDiscovery: boolean;
        walFirstDiscoveryRecoversExactTransaction: any;
        missingReceiptTransactionIsFoundDirectlyFromWal: any;
        crossGroupAndChecksumTamperAreNotAutoRecovered: any;
        invalidTransactionsAreFullyContainedWithoutTasks: boolean;
        containmentDoesNotRewriteInvalidWalRows: boolean;
        repeatedDiscoveryIsIdempotent: boolean;
        startupBatchCoversMultipleGroups: boolean;
        schedulerAcceptsContainedInvalidState: boolean;
        qualityGateAcceptsHealthyOrContainedAndRejectsCompactTamper: boolean;
        recoveryAndContainmentCreateNoTasksApprovalsOrDeletion: boolean;
    };
    compact: {
        retained: any;
        compacted: any;
        history: any;
    };
    discovery: {
        recovered: any;
        invalid: any;
        contained: any;
        repairs: any;
        briefs: any;
    };
    scheduler: {
        failed: any;
        contained: any;
    };
    quality: {
        before: any;
        afterCompactTamper: any;
    };
};

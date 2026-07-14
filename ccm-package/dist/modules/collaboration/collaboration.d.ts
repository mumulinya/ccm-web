export { FEISHU_SCOPES, sendFeishuReportMessage } from "./feishu";
export { loadGroups } from "./storage";
export { runGroupMemoryStorageRecoverySelfTest } from "./memory";
export { claimReadyDailyDevBacklog, importSharedDocsToDailyDevBacklog, markDailyDevBacklogStatus, } from "./daily-dev-backlog";
export declare function deriveTaskLifecycle(task: any, executions?: any[]): {
    state: string;
    terminal: boolean;
    keepsSession: boolean;
};
export declare function evaluateReceiptTaskAgentMemoryContextSnapshot(task: any, receipt?: any, context?: any): {
    schema: string;
    required: boolean;
    pass: boolean;
    snapshot_ids: any[];
    matched_snapshot_ids: any[];
    missing_snapshot_ids: any[];
    task_agent_session_ids: any[];
    receipt_task_agent_session_id: string;
    receipt_memory_context_snapshot_id: string;
    receipt_memory_context_snapshot_checksum: string;
    declared_usage: any;
    declared_binding_id: string;
    declared_group_session_id: string;
    declared_session_memory_checksum: string;
    declared_model_extraction_execution_id: string;
    declared_model_extraction_replay_status: string;
    declared_fact_supersession_graph_checksum: string;
    declared_usage_state: string;
    declared_memory_fact_citations: any;
    memory_fact_citations_required: boolean;
    memory_fact_citations_passed: boolean;
    system_delivery_required: boolean;
    system_delivery_passed: boolean;
    agent_declaration_required: boolean;
    agent_declaration_passed: boolean;
    gate_ids: string[];
    matched_gate_ids: string[];
    rows: any[];
};
export declare function collectTaskTypedMemoryConsumptionRows(task?: any, receipts?: any[], context?: any): any[];
export declare function runCollaborationUxSelfTest(): {
    pass: boolean;
    checks: {
        completionReadinessShowsFriendlyBlockers: boolean;
        completionReadinessHidesTechnicalIds: any;
        completionAcceptanceNamesQueueAndSessionBlockers: boolean;
        acceptanceReviewVisibleTextHidesProtocolTerms: boolean;
        acceptanceReviewKeepsRawGateDetailsTechnical: boolean;
        simplePhaseLanguage: boolean;
        conciseAgentLanguage: boolean;
        simpleActions: boolean;
        revertedPhase: boolean;
        technicalIdsStayCollapsed: boolean;
        userWorkflowTimelineVisible: any;
        workerHandoffTimelineVisible: boolean;
        progressCheckpointsVisible: boolean;
        progressCheckpointsHideProtocol: boolean;
        liveCheckpointStageEventsVisible: boolean;
        liveCheckpointSupervisorCompletionVisible: boolean;
        liveCheckpointStageEventsHideProtocol: boolean;
        globalMissionHandoffComplete: boolean;
        globalMissionQueuedMessageHasContext: boolean;
        globalDirectDispatchCompletionSyncReady: boolean;
        globalDirectDispatchWeakAcceptanceNotSynced: boolean;
        globalDirectDispatchCompletionMessageFriendly: boolean;
        globalDirectDispatchContinuationSyncReady: boolean;
        globalDirectDispatchContinuationMessageFriendly: boolean;
        globalDirectDispatchRollbackSyncReady: boolean;
        globalDirectDispatchRollbackMessageFriendly: boolean;
        teamShutdownGateBlocksOpenSession: boolean;
        teamShutdownGatePassesAfterClose: boolean;
        independentReviewGateBlocksComplexChange: any;
        independentReviewGatePassesWithEvidence: boolean;
        independentReviewGapDraftGuidesReviewer: boolean;
        independentReviewFailedGapDraftRoutesRework: boolean;
        liveTodoPlanVisible: boolean;
        groupWeakAcceptanceOnlyStaysInReview: boolean;
        workItemsVisible: boolean;
        workItemSelfTestPasses: boolean;
        workerHandoffSelfTestPasses: boolean;
        globalMemoryHealthGateReceiptSelfTestPasses: boolean;
        taskAgentMemoryContextSnapshotReceiptSelfTestPasses: boolean;
        workerContinuationHandoffBuildsRuntime: any;
        workerContinuationHandoffRenderedForDispatch: boolean;
        liveTodoReviewing: any;
        liveTodoReworking: any;
        continuationStatusVisible: any;
        goalRevisionContinuationStatusVisible: any;
        continuationStatusHidesProtocol: boolean;
        liveTodoFailedNeedsConfirmation: any;
        liveTodoCancelled: any;
        liveTodoRestoresRecoveryContext: any;
        liveTodoEvidenceTraceable: any;
        liveTodoFailureHasActions: any;
        agentQaVisible: boolean;
        agentQaUserPreviewVisible: any;
        agentQaUserPreviewHidesProtocol: boolean;
        conflictWarningsVisible: any;
        greetingDoesNotCreateTaskCard: boolean;
        ordinaryQuestionDoesNotCreateTaskCard: boolean;
        explicitDevelopmentCreatesTaskCard: boolean;
        groupIntentGatewayBlocksRuleFallbackWrite: boolean;
        groupIntentGatewayAllowsLlmDelegate: boolean;
        groupIntentGatewayKeepsLlmDirectAnswerReadOnly: boolean;
        projectTaskModeQuestionDoesNotCreatePersistentTask: boolean;
        projectTaskQuestionUsesReadOnlyAnalysis: boolean;
        explicitAnalysisGreetingDoesNotReadProjects: boolean;
        explicitAnalysisModeReadsProjectContext: boolean;
        projectAnalysisReadsSafeCodeSnapshot: boolean;
        forceTaskCanBypassIntentGate: boolean;
        nonTaskCardIsHidden: boolean;
        planModeHighRiskRequiresConfirmation: boolean;
        planModeLowRiskAutoContinues: boolean;
        awaitingPlanCardNeedsUser: boolean;
        awaitingPlanCardShowsPlan: boolean;
        planModeStepsVisible: any;
        awaitingPlanCardShowsSteps: any;
        awaitingPlanCardShowsClarificationQuestions: any;
        awaitingPlanCardCanRevise: boolean;
        revisedPlanCardStaysInPlanMode: boolean;
        revisedPlanFeedbackVisible: any;
        revisedPlanAnswersClarificationQuestions: any;
        confirmedPlanFeedbackCarried: any;
        confirmedPlanExecutionFollowupVisible: any;
        confirmedPlanFeedbackVisible: boolean;
        workOrderPreviewVisible: any;
        executionStoryShowsCodingFlow: boolean;
        acceptanceReviewHardGateVisible: boolean;
        missingEvidenceAcceptanceReviewBlocksCompletion: boolean;
        memoryGateAcceptanceReviewVisible: boolean;
        reinjectionGateAcceptanceReviewVisible: boolean;
        planAlignmentVisible: boolean;
        missingEvidencePlanAlignmentShowsDeviation: boolean;
        userHandoffVisible: boolean;
        userHandoffSummaryCardsVisible: boolean;
        ordinaryQuestionHasNoUserHandoff: boolean;
        userHandoffHidesProtocol: boolean;
        agentCoordinationProtocolVisible: any;
        agentCoordinationHeartbeatVisible: boolean;
        agentCoordinationContractSyncVisible: boolean;
        agentCoordinationReceiptQualityScores: boolean;
        childAgentPlanReviewVisible: any;
        childAgentPlanReviewNeedsRevisionVisible: any;
        agentCoordinationMemoryGateVisible: boolean;
        agentCoordinationReinjectionGateVisible: boolean;
        agentCoordinationReinjectionUsageGateVisible: boolean;
        childAgentHandoffQualityGateBlocksAdvisoryResult: boolean;
        childAgentHandoffQualityCreatesTargetedRework: boolean;
        childAgentHandoffQualityVisibleTextFriendly: boolean;
        agentCoordinationTargetedReworkForMissingEvidence: boolean;
        agentProgressSummaryVisible: boolean;
        agentProgressSummaryHidesProtocol: boolean;
        agentProgressSummaryTracksWaitingAgent: boolean;
        agentProgressSummaryUsesSessionProgress: boolean;
        agentProgressSummarySessionProgressHidesProtocol: boolean;
        changeSummaryVisible: boolean;
        changeSummaryActionDataReady: boolean;
        receiptReworkSummaryVisible: boolean;
        receiptReworkMemoryGateGapVisible: boolean;
        receiptReworkReinjectionGateGapVisible: boolean;
        receiptReworkReinjectionUsageGapVisible: boolean;
        receiptReworkResolvedVisible: boolean;
        receiptReworkVisibleTextHidesProtocol: boolean;
        agentCoordinationVisibleTextHidesProtocol: boolean;
        agentCoordinationAckReviewApproved: any;
        agentCoordinationContractTransferReady: any;
        ackGapBlocksCompletion: boolean;
        ackGapCreatesRewriteDraft: boolean;
        contractGapCreatesInjectionDraft: boolean;
        recoveredTestAgentFailureDoesNotRemainGap: boolean;
        coordinatorOwnedReviewNeedDoesNotRemainGap: boolean;
        coordinatorOwnedReviewNeedIsAdvisory: boolean;
        coordinatorOwnedDirectReviewNeedIsAdvisory: boolean;
        genericCoordinatorNeedsUserStateIsNotAConcreteBlocker: boolean;
        sameSessionReworkInheritsApprovedAck: boolean;
        differentSessionReworkDoesNotInheritAck: boolean;
        targetedReworkIncludesWorkItemContext: boolean;
        watchdogSeesStalledWorkItem: boolean;
        contractInjectionGateRequiresConsumerReceipt: boolean;
        contractInjectionGateRecognizesConsumerRerun: boolean;
        contractInjectionGateRequiresConsumptionQuality: boolean;
        contractInjectionGateRejectsGenericApiAssignment: boolean;
        taskCardShowsRuntimeKernel: any;
        runtimeKernelShowsMemoryGate: any;
        runtimeKernelShowsReinjectionGate: any;
        runtimeKernelShowsReinjectionUsageGate: any;
        agentCoordinationEventStreamVisible: boolean;
        agentCoordinationMemoryGateEventVisible: boolean;
        agentCoordinationReinjectionGateEventVisible: boolean;
        acceptanceReviewIncludesAckGate: boolean;
        agentCoordinationContractInjectAction: boolean;
        reportHasFourUserSections: boolean;
        reportHidesProtocol: boolean;
        groupReportFormatsObjects: boolean;
        acknowledgementHasCleanPunctuation: boolean;
        dispatchLaunchSummaryVisible: boolean;
        dispatchLaunchSummaryHidesProtocol: boolean;
        dispatchLaunchSummaryDoneTargetStaysReviewing: boolean;
        followupClassification: boolean;
        qualityFollowupContinuationDecision: boolean;
        followupDetection: boolean;
    };
    card: {
        version: number;
        visible: boolean;
        task_id: any;
        title: any;
        goal: any;
        phase: string;
        phase_label: any;
        status: any;
        progress: any;
        active_agents: string[];
        agents: {
            name: string;
            status: any;
            summary: string;
            blockers: any;
        }[];
        live_todo_plan: {
            title: string;
            source: string;
            schema: string;
            display: {
                max_visible_steps: number;
                quiet_completed: boolean;
                show_current_focus: boolean;
            };
            phase: string;
            task_id: any;
            updated_at: any;
            verification_nudge: boolean;
            verification_reminder: {
                schema: string;
                status: string;
                title: string;
                headline: string;
                reason: string;
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            steps: any[];
        };
        work_items: import("../../agents/work-items").MainAgentWorkItem[];
        work_item_summary: {
            total: number;
            counts: any;
            active: string[];
            blocked: {
                id: string;
                target: string;
                blockers: string[];
            }[];
            next_claimable: {
                id: string;
                target: string;
                subject: string;
            }[];
            dependency_summary: {
                schema: string;
                title: string;
                status: string;
                status_label: string;
                headline: string;
                rows: {
                    id: string;
                    target: string;
                    subject: string;
                    status: import("../../agents/work-items").MainAgentWorkItemStatus;
                    dependency_count: number;
                    open_dependency_count: number;
                    dependencies: {
                        id: string;
                        label: string;
                        status: import("../../agents/work-items").MainAgentWorkItemStatus;
                        completed: boolean;
                    }[];
                    label: string;
                    next_action: string;
                }[];
                ready: {
                    id: string;
                    target: string;
                    subject: string;
                    label: string;
                }[];
                next_claimable: {
                    id: string;
                    target: string;
                    subject: string;
                }[];
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            verification_nudge: boolean;
            verification_reminder: {
                schema: string;
                status: string;
                title: string;
                headline: string;
                reason: string;
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            all_completed: boolean;
        };
        work_item_claim_summary: any;
        workItemClaimSummary: any;
        work_item_unlock_summary: any;
        workItemUnlockSummary: any;
        completion_readiness_summary: {
            schema: string;
            title: string;
            status: string;
            status_label: string;
            headline: string;
            rows: {
                target: string;
                subject: string;
                status: string;
                status_label: string;
            }[];
            open_session_count: number;
            unresolved_work_item_count: number;
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
            technical: {
                unresolved_work_item_ids: any[];
                open_session_ids: any;
            };
        };
        completionReadinessSummary: {
            schema: string;
            title: string;
            status: string;
            status_label: string;
            headline: string;
            rows: {
                target: string;
                subject: string;
                status: string;
                status_label: string;
            }[];
            open_session_count: number;
            unresolved_work_item_count: number;
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
            technical: {
                unresolved_work_item_ids: any[];
                open_session_ids: any;
            };
        };
        display_stream: {
            schema: string;
            type: string;
            user_visible: boolean;
            user_visible_text: string;
            text_message: {
                type: string;
                text: string;
            };
            tool_use_summary: {
                type: string;
                tool_summary: string;
                counts: {
                    reads: number;
                    writes: number;
                    dispatches: number;
                    receipts: number;
                    verifications: number;
                    executions: number;
                };
                hidden_tool_uses: number;
            };
            workchain: {
                schema: string;
                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                mode: string;
                status: string;
                phase: string;
                user_visible_text: string;
                stages: {
                    id: string;
                    label: string;
                    status: string;
                    summary: string;
                }[];
                todo_plan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                todoPlan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                progress_checkpoints: {
                    schema: string;
                    title: string;
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        raw_events_default_collapsed: boolean;
                    };
                    items: any[];
                };
                completion_summary: {
                    headline: string;
                    evidence: string[];
                    files: any[];
                    verification: string[];
                    acceptance: string[];
                    independent_review: string[];
                    independentReview: string[];
                    post_review_spot_check: any;
                    postReviewSpotCheck: any;
                    post_review_spot_check_summary: any;
                    postReviewSpotCheckSummary: any;
                    post_review_spot_check_gate: any;
                    postReviewSpotCheckGate: any;
                    post_review_spot_check_required: boolean;
                    post_review_spot_check_gate_passed: boolean;
                    risks: string[];
                    next_action: string;
                    verification_status: string;
                    risk_status: string;
                    final_summary_quality: {
                        schema: string;
                        required: boolean;
                        passed: boolean;
                        checks: {
                            id: string;
                            label: string;
                            passed: boolean;
                            detail: string;
                        }[];
                        missing: string[];
                        verification_status: string;
                        risk_status: string;
                        source: string;
                    };
                    quality_followup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    qualityFollowup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    terminal: boolean;
                };
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    final_summary_required: boolean;
                };
                technical_details: {
                    id: string;
                    title: string;
                    items: any[];
                }[];
            };
            completion_summary: {
                headline: string;
                evidence: string[];
                files: any[];
                verification: string[];
                acceptance: string[];
                independent_review: string[];
                independentReview: string[];
                post_review_spot_check: any;
                postReviewSpotCheck: any;
                post_review_spot_check_summary: any;
                postReviewSpotCheckSummary: any;
                post_review_spot_check_gate: any;
                postReviewSpotCheckGate: any;
                post_review_spot_check_required: boolean;
                post_review_spot_check_gate_passed: boolean;
                risks: string[];
                next_action: string;
                verification_status: string;
                risk_status: string;
                final_summary_quality: {
                    schema: string;
                    required: boolean;
                    passed: boolean;
                    checks: {
                        id: string;
                        label: string;
                        passed: boolean;
                        detail: string;
                    }[];
                    missing: string[];
                    verification_status: string;
                    risk_status: string;
                    source: string;
                };
                quality_followup: {
                    schema: string;
                    title: string;
                    headline: string;
                    missing: string[];
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                qualityFollowup: {
                    schema: string;
                    title: string;
                    headline: string;
                    missing: string[];
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                todo_plan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                todoPlan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                terminal: boolean;
            };
            todo_plan: {
                schema: string;
                source: string;
                title: string;
                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                mode: string;
                task_id: string;
                run_id: string;
                mission_id: string;
                steps: any[];
                current_step: any;
                currentStep: any;
                completed_count: number;
                total_count: number;
                progress_label: string;
                visible_steps: any[];
                visibleSteps: any[];
                archived_steps_count: number;
                archivedStepsCount: number;
                archive_summary: string;
                archiveSummary: string;
                quality_followup_required: boolean;
                qualityFollowupRequired: boolean;
                quality_followup: any;
                qualityFollowup: any;
                verification_nudge: boolean;
                verification_reminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                verificationReminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                display_policy: {
                    user_visible: boolean;
                    hide_for_ordinary_conversation: boolean;
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    quiet_completed: boolean;
                    archive_completed_todo: boolean;
                    archiveCompletedTodo: boolean;
                    archived_when_complete: boolean;
                    archivedWhenComplete: boolean;
                    visible_when_completed: boolean;
                    visibleWhenCompleted: boolean;
                    max_visible_steps: number;
                };
            };
            todoPlan: {
                schema: string;
                source: string;
                title: string;
                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                mode: string;
                task_id: string;
                run_id: string;
                mission_id: string;
                steps: any[];
                current_step: any;
                currentStep: any;
                completed_count: number;
                total_count: number;
                progress_label: string;
                visible_steps: any[];
                visibleSteps: any[];
                archived_steps_count: number;
                archivedStepsCount: number;
                archive_summary: string;
                archiveSummary: string;
                quality_followup_required: boolean;
                qualityFollowupRequired: boolean;
                quality_followup: any;
                qualityFollowup: any;
                verification_nudge: boolean;
                verification_reminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                verificationReminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                display_policy: {
                    user_visible: boolean;
                    hide_for_ordinary_conversation: boolean;
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    quiet_completed: boolean;
                    archive_completed_todo: boolean;
                    archiveCompletedTodo: boolean;
                    archived_when_complete: boolean;
                    archivedWhenComplete: boolean;
                    visible_when_completed: boolean;
                    visibleWhenCompleted: boolean;
                    max_visible_steps: number;
                };
            };
            verification_reminder: {
                schema: string;
                status: string;
                title: string;
                headline: string;
                reason: string;
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            verificationReminder: {
                schema: string;
                status: string;
                title: string;
                headline: string;
                reason: string;
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            progress_checkpoints: {
                schema: string;
                title: string;
                display_policy: {
                    user_visible: boolean;
                    hide_for_ordinary_conversation: boolean;
                    raw_events_default_collapsed: boolean;
                };
                items: any[];
            };
            dispatch_launch_summary: any;
            dispatchLaunchSummary: any;
            delivery_report: any;
            workchain_stages: {
                id: string;
                label: string;
                status: string;
                summary: string;
            }[];
            technical_details: {
                id: string;
                title: string;
                items: any[];
            }[];
            raw_events: any[];
            todo: {
                visible: boolean;
                surface: string;
                tool_message_visible: boolean;
                quiet_completed: boolean;
            };
            terminology: {
                sanitized: boolean;
                blocked_terms: string[];
            };
        };
        displayStream: {
            schema: string;
            type: string;
            user_visible: boolean;
            user_visible_text: string;
            text_message: {
                type: string;
                text: string;
            };
            tool_use_summary: {
                type: string;
                tool_summary: string;
                counts: {
                    reads: number;
                    writes: number;
                    dispatches: number;
                    receipts: number;
                    verifications: number;
                    executions: number;
                };
                hidden_tool_uses: number;
            };
            workchain: {
                schema: string;
                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                mode: string;
                status: string;
                phase: string;
                user_visible_text: string;
                stages: {
                    id: string;
                    label: string;
                    status: string;
                    summary: string;
                }[];
                todo_plan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                todoPlan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                progress_checkpoints: {
                    schema: string;
                    title: string;
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        raw_events_default_collapsed: boolean;
                    };
                    items: any[];
                };
                completion_summary: {
                    headline: string;
                    evidence: string[];
                    files: any[];
                    verification: string[];
                    acceptance: string[];
                    independent_review: string[];
                    independentReview: string[];
                    post_review_spot_check: any;
                    postReviewSpotCheck: any;
                    post_review_spot_check_summary: any;
                    postReviewSpotCheckSummary: any;
                    post_review_spot_check_gate: any;
                    postReviewSpotCheckGate: any;
                    post_review_spot_check_required: boolean;
                    post_review_spot_check_gate_passed: boolean;
                    risks: string[];
                    next_action: string;
                    verification_status: string;
                    risk_status: string;
                    final_summary_quality: {
                        schema: string;
                        required: boolean;
                        passed: boolean;
                        checks: {
                            id: string;
                            label: string;
                            passed: boolean;
                            detail: string;
                        }[];
                        missing: string[];
                        verification_status: string;
                        risk_status: string;
                        source: string;
                    };
                    quality_followup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    qualityFollowup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    terminal: boolean;
                };
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    final_summary_required: boolean;
                };
                technical_details: {
                    id: string;
                    title: string;
                    items: any[];
                }[];
            };
            completion_summary: {
                headline: string;
                evidence: string[];
                files: any[];
                verification: string[];
                acceptance: string[];
                independent_review: string[];
                independentReview: string[];
                post_review_spot_check: any;
                postReviewSpotCheck: any;
                post_review_spot_check_summary: any;
                postReviewSpotCheckSummary: any;
                post_review_spot_check_gate: any;
                postReviewSpotCheckGate: any;
                post_review_spot_check_required: boolean;
                post_review_spot_check_gate_passed: boolean;
                risks: string[];
                next_action: string;
                verification_status: string;
                risk_status: string;
                final_summary_quality: {
                    schema: string;
                    required: boolean;
                    passed: boolean;
                    checks: {
                        id: string;
                        label: string;
                        passed: boolean;
                        detail: string;
                    }[];
                    missing: string[];
                    verification_status: string;
                    risk_status: string;
                    source: string;
                };
                quality_followup: {
                    schema: string;
                    title: string;
                    headline: string;
                    missing: string[];
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                qualityFollowup: {
                    schema: string;
                    title: string;
                    headline: string;
                    missing: string[];
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                todo_plan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                todoPlan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                terminal: boolean;
            };
            todo_plan: {
                schema: string;
                source: string;
                title: string;
                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                mode: string;
                task_id: string;
                run_id: string;
                mission_id: string;
                steps: any[];
                current_step: any;
                currentStep: any;
                completed_count: number;
                total_count: number;
                progress_label: string;
                visible_steps: any[];
                visibleSteps: any[];
                archived_steps_count: number;
                archivedStepsCount: number;
                archive_summary: string;
                archiveSummary: string;
                quality_followup_required: boolean;
                qualityFollowupRequired: boolean;
                quality_followup: any;
                qualityFollowup: any;
                verification_nudge: boolean;
                verification_reminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                verificationReminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                display_policy: {
                    user_visible: boolean;
                    hide_for_ordinary_conversation: boolean;
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    quiet_completed: boolean;
                    archive_completed_todo: boolean;
                    archiveCompletedTodo: boolean;
                    archived_when_complete: boolean;
                    archivedWhenComplete: boolean;
                    visible_when_completed: boolean;
                    visibleWhenCompleted: boolean;
                    max_visible_steps: number;
                };
            };
            todoPlan: {
                schema: string;
                source: string;
                title: string;
                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                mode: string;
                task_id: string;
                run_id: string;
                mission_id: string;
                steps: any[];
                current_step: any;
                currentStep: any;
                completed_count: number;
                total_count: number;
                progress_label: string;
                visible_steps: any[];
                visibleSteps: any[];
                archived_steps_count: number;
                archivedStepsCount: number;
                archive_summary: string;
                archiveSummary: string;
                quality_followup_required: boolean;
                qualityFollowupRequired: boolean;
                quality_followup: any;
                qualityFollowup: any;
                verification_nudge: boolean;
                verification_reminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                verificationReminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                display_policy: {
                    user_visible: boolean;
                    hide_for_ordinary_conversation: boolean;
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    quiet_completed: boolean;
                    archive_completed_todo: boolean;
                    archiveCompletedTodo: boolean;
                    archived_when_complete: boolean;
                    archivedWhenComplete: boolean;
                    visible_when_completed: boolean;
                    visibleWhenCompleted: boolean;
                    max_visible_steps: number;
                };
            };
            verification_reminder: {
                schema: string;
                status: string;
                title: string;
                headline: string;
                reason: string;
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            verificationReminder: {
                schema: string;
                status: string;
                title: string;
                headline: string;
                reason: string;
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            progress_checkpoints: {
                schema: string;
                title: string;
                display_policy: {
                    user_visible: boolean;
                    hide_for_ordinary_conversation: boolean;
                    raw_events_default_collapsed: boolean;
                };
                items: any[];
            };
            dispatch_launch_summary: any;
            dispatchLaunchSummary: any;
            delivery_report: any;
            workchain_stages: {
                id: string;
                label: string;
                status: string;
                summary: string;
            }[];
            technical_details: {
                id: string;
                title: string;
                items: any[];
            }[];
            raw_events: any[];
            todo: {
                visible: boolean;
                surface: string;
                tool_message_visible: boolean;
                quiet_completed: boolean;
            };
            terminology: {
                sanitized: boolean;
                blocked_terms: string[];
            };
        };
        progress_checkpoints: {
            schema: string;
            title: string;
            display_policy: {
                user_visible: boolean;
                hide_for_ordinary_conversation: boolean;
                raw_events_default_collapsed: boolean;
            };
            items: any[];
        };
        progressCheckpoints: {
            schema: string;
            title: string;
            display_policy: {
                user_visible: boolean;
                hide_for_ordinary_conversation: boolean;
                raw_events_default_collapsed: boolean;
            };
            items: any[];
        };
        mainAgentDecision: {
            version: number;
            trace_id: any;
            group_id: any;
            task_id: any;
            message_id: string;
            coordinator: any;
            mode: string;
            decision: {
                selected_actions: string[];
                dispatch_policy: {
                    action: string;
                    reason: string;
                    nextStep: any;
                };
                reason: string;
            };
            internal_loop: {
                version: number;
                source: string;
                pattern: string;
                current_stage: string;
                current_label: string;
                progress: {
                    completed: number;
                    total: number;
                };
                stages: {
                    id: string;
                    label: string;
                    title: string;
                    status: string;
                    purpose: string;
                    actions: string[];
                    tool_choice: any;
                    evidence: string[];
                }[];
                next_action: string;
            };
            loop: {
                version: number;
                source: string;
                pattern: string;
                current_stage: string;
                current_label: string;
                progress: {
                    completed: number;
                    total: number;
                };
                stages: {
                    id: string;
                    label: string;
                    title: string;
                    status: string;
                    purpose: string;
                    actions: string[];
                    tool_choice: any;
                    evidence: string[];
                }[];
                next_action: string;
            };
            user_plan_steps: any;
            dispatch_launch_summary: {
                schema: string;
                title: string;
                mode: string;
                task_id: any;
                headline: string;
                rows: {
                    id: any;
                    agent: string;
                    role: string;
                    task: string;
                    reason: string;
                    depends_on: any;
                    status: string;
                    status_label: string;
                }[];
                acceptance: string[];
                next_action: string;
                technical_hint: string;
                display_policy: {
                    user_visible: boolean;
                    hide_for_ordinary_conversation: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                };
            };
            dispatchLaunchSummary: {
                schema: string;
                title: string;
                mode: string;
                task_id: any;
                headline: string;
                rows: {
                    id: any;
                    agent: string;
                    role: string;
                    task: string;
                    reason: string;
                    depends_on: any;
                    status: string;
                    status_label: string;
                }[];
                acceptance: string[];
                next_action: string;
                technical_hint: string;
                display_policy: {
                    user_visible: boolean;
                    hide_for_ordinary_conversation: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                };
            };
            display_stream: {
                schema: string;
                type: string;
                user_visible: boolean;
                user_visible_text: string;
                text_message: {
                    type: string;
                    text: string;
                };
                tool_use_summary: {
                    type: string;
                    tool_summary: string;
                    counts: {
                        reads: number;
                        writes: number;
                        dispatches: number;
                        receipts: number;
                        verifications: number;
                        executions: number;
                    };
                    hidden_tool_uses: number;
                };
                workchain: {
                    schema: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    status: string;
                    phase: string;
                    user_visible_text: string;
                    stages: {
                        id: string;
                        label: string;
                        status: string;
                        summary: string;
                    }[];
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    progress_checkpoints: {
                        schema: string;
                        title: string;
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            raw_events_default_collapsed: boolean;
                        };
                        items: any[];
                    };
                    completion_summary: {
                        headline: string;
                        evidence: string[];
                        files: any[];
                        verification: string[];
                        acceptance: string[];
                        independent_review: string[];
                        independentReview: string[];
                        post_review_spot_check: any;
                        postReviewSpotCheck: any;
                        post_review_spot_check_summary: any;
                        postReviewSpotCheckSummary: any;
                        post_review_spot_check_gate: any;
                        postReviewSpotCheckGate: any;
                        post_review_spot_check_required: boolean;
                        post_review_spot_check_gate_passed: boolean;
                        risks: string[];
                        next_action: string;
                        verification_status: string;
                        risk_status: string;
                        final_summary_quality: {
                            schema: string;
                            required: boolean;
                            passed: boolean;
                            checks: {
                                id: string;
                                label: string;
                                passed: boolean;
                                detail: string;
                            }[];
                            missing: string[];
                            verification_status: string;
                            risk_status: string;
                            source: string;
                        };
                        quality_followup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        qualityFollowup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        todo_plan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        todoPlan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        terminal: boolean;
                    };
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        final_summary_required: boolean;
                    };
                    technical_details: {
                        id: string;
                        title: string;
                        items: any[];
                    }[];
                };
                completion_summary: {
                    headline: string;
                    evidence: string[];
                    files: any[];
                    verification: string[];
                    acceptance: string[];
                    independent_review: string[];
                    independentReview: string[];
                    post_review_spot_check: any;
                    postReviewSpotCheck: any;
                    post_review_spot_check_summary: any;
                    postReviewSpotCheckSummary: any;
                    post_review_spot_check_gate: any;
                    postReviewSpotCheckGate: any;
                    post_review_spot_check_required: boolean;
                    post_review_spot_check_gate_passed: boolean;
                    risks: string[];
                    next_action: string;
                    verification_status: string;
                    risk_status: string;
                    final_summary_quality: {
                        schema: string;
                        required: boolean;
                        passed: boolean;
                        checks: {
                            id: string;
                            label: string;
                            passed: boolean;
                            detail: string;
                        }[];
                        missing: string[];
                        verification_status: string;
                        risk_status: string;
                        source: string;
                    };
                    quality_followup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    qualityFollowup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    terminal: boolean;
                };
                todo_plan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                todoPlan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                verification_reminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                verificationReminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                progress_checkpoints: {
                    schema: string;
                    title: string;
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        raw_events_default_collapsed: boolean;
                    };
                    items: any[];
                };
                dispatch_launch_summary: any;
                dispatchLaunchSummary: any;
                delivery_report: any;
                workchain_stages: {
                    id: string;
                    label: string;
                    status: string;
                    summary: string;
                }[];
                technical_details: {
                    id: string;
                    title: string;
                    items: any[];
                }[];
                raw_events: any[];
                todo: {
                    visible: boolean;
                    surface: string;
                    tool_message_visible: boolean;
                    quiet_completed: boolean;
                };
                terminology: {
                    sanitized: boolean;
                    blocked_terms: string[];
                };
            };
            displayStream: {
                schema: string;
                type: string;
                user_visible: boolean;
                user_visible_text: string;
                text_message: {
                    type: string;
                    text: string;
                };
                tool_use_summary: {
                    type: string;
                    tool_summary: string;
                    counts: {
                        reads: number;
                        writes: number;
                        dispatches: number;
                        receipts: number;
                        verifications: number;
                        executions: number;
                    };
                    hidden_tool_uses: number;
                };
                workchain: {
                    schema: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    status: string;
                    phase: string;
                    user_visible_text: string;
                    stages: {
                        id: string;
                        label: string;
                        status: string;
                        summary: string;
                    }[];
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    progress_checkpoints: {
                        schema: string;
                        title: string;
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            raw_events_default_collapsed: boolean;
                        };
                        items: any[];
                    };
                    completion_summary: {
                        headline: string;
                        evidence: string[];
                        files: any[];
                        verification: string[];
                        acceptance: string[];
                        independent_review: string[];
                        independentReview: string[];
                        post_review_spot_check: any;
                        postReviewSpotCheck: any;
                        post_review_spot_check_summary: any;
                        postReviewSpotCheckSummary: any;
                        post_review_spot_check_gate: any;
                        postReviewSpotCheckGate: any;
                        post_review_spot_check_required: boolean;
                        post_review_spot_check_gate_passed: boolean;
                        risks: string[];
                        next_action: string;
                        verification_status: string;
                        risk_status: string;
                        final_summary_quality: {
                            schema: string;
                            required: boolean;
                            passed: boolean;
                            checks: {
                                id: string;
                                label: string;
                                passed: boolean;
                                detail: string;
                            }[];
                            missing: string[];
                            verification_status: string;
                            risk_status: string;
                            source: string;
                        };
                        quality_followup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        qualityFollowup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        todo_plan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        todoPlan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        terminal: boolean;
                    };
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        final_summary_required: boolean;
                    };
                    technical_details: {
                        id: string;
                        title: string;
                        items: any[];
                    }[];
                };
                completion_summary: {
                    headline: string;
                    evidence: string[];
                    files: any[];
                    verification: string[];
                    acceptance: string[];
                    independent_review: string[];
                    independentReview: string[];
                    post_review_spot_check: any;
                    postReviewSpotCheck: any;
                    post_review_spot_check_summary: any;
                    postReviewSpotCheckSummary: any;
                    post_review_spot_check_gate: any;
                    postReviewSpotCheckGate: any;
                    post_review_spot_check_required: boolean;
                    post_review_spot_check_gate_passed: boolean;
                    risks: string[];
                    next_action: string;
                    verification_status: string;
                    risk_status: string;
                    final_summary_quality: {
                        schema: string;
                        required: boolean;
                        passed: boolean;
                        checks: {
                            id: string;
                            label: string;
                            passed: boolean;
                            detail: string;
                        }[];
                        missing: string[];
                        verification_status: string;
                        risk_status: string;
                        source: string;
                    };
                    quality_followup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    qualityFollowup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    terminal: boolean;
                };
                todo_plan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                todoPlan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                verification_reminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                verificationReminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                progress_checkpoints: {
                    schema: string;
                    title: string;
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        raw_events_default_collapsed: boolean;
                    };
                    items: any[];
                };
                dispatch_launch_summary: any;
                dispatchLaunchSummary: any;
                delivery_report: any;
                workchain_stages: {
                    id: string;
                    label: string;
                    status: string;
                    summary: string;
                }[];
                technical_details: {
                    id: string;
                    title: string;
                    items: any[];
                }[];
                raw_events: any[];
                todo: {
                    visible: boolean;
                    surface: string;
                    tool_message_visible: boolean;
                    quiet_completed: boolean;
                };
                terminology: {
                    sanitized: boolean;
                    blocked_terms: string[];
                };
            };
            todo_plan: any;
            verification_reminder: any;
            verificationReminder: any;
            permissions: {
                action_id: string;
                risk: string;
                allowed: boolean;
                reason: string;
            }[];
            observation: {
                live_task_phase: string;
                receipt_count: number;
                acceptance_gate_passed: boolean;
                needs_replan: boolean;
            };
            verify: {
                passed: boolean;
                blocked_actions: string[];
                conclusion: string;
            };
            reply: {
                kind: string;
                message_id: string;
                preview: any;
            };
            created_at: string;
        };
        main_agent_decision: {
            version: number;
            trace_id: any;
            group_id: any;
            task_id: any;
            message_id: string;
            coordinator: any;
            mode: string;
            decision: {
                selected_actions: string[];
                dispatch_policy: {
                    action: string;
                    reason: string;
                    nextStep: any;
                };
                reason: string;
            };
            internal_loop: {
                version: number;
                source: string;
                pattern: string;
                current_stage: string;
                current_label: string;
                progress: {
                    completed: number;
                    total: number;
                };
                stages: {
                    id: string;
                    label: string;
                    title: string;
                    status: string;
                    purpose: string;
                    actions: string[];
                    tool_choice: any;
                    evidence: string[];
                }[];
                next_action: string;
            };
            loop: {
                version: number;
                source: string;
                pattern: string;
                current_stage: string;
                current_label: string;
                progress: {
                    completed: number;
                    total: number;
                };
                stages: {
                    id: string;
                    label: string;
                    title: string;
                    status: string;
                    purpose: string;
                    actions: string[];
                    tool_choice: any;
                    evidence: string[];
                }[];
                next_action: string;
            };
            user_plan_steps: any;
            dispatch_launch_summary: {
                schema: string;
                title: string;
                mode: string;
                task_id: any;
                headline: string;
                rows: {
                    id: any;
                    agent: string;
                    role: string;
                    task: string;
                    reason: string;
                    depends_on: any;
                    status: string;
                    status_label: string;
                }[];
                acceptance: string[];
                next_action: string;
                technical_hint: string;
                display_policy: {
                    user_visible: boolean;
                    hide_for_ordinary_conversation: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                };
            };
            dispatchLaunchSummary: {
                schema: string;
                title: string;
                mode: string;
                task_id: any;
                headline: string;
                rows: {
                    id: any;
                    agent: string;
                    role: string;
                    task: string;
                    reason: string;
                    depends_on: any;
                    status: string;
                    status_label: string;
                }[];
                acceptance: string[];
                next_action: string;
                technical_hint: string;
                display_policy: {
                    user_visible: boolean;
                    hide_for_ordinary_conversation: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                };
            };
            display_stream: {
                schema: string;
                type: string;
                user_visible: boolean;
                user_visible_text: string;
                text_message: {
                    type: string;
                    text: string;
                };
                tool_use_summary: {
                    type: string;
                    tool_summary: string;
                    counts: {
                        reads: number;
                        writes: number;
                        dispatches: number;
                        receipts: number;
                        verifications: number;
                        executions: number;
                    };
                    hidden_tool_uses: number;
                };
                workchain: {
                    schema: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    status: string;
                    phase: string;
                    user_visible_text: string;
                    stages: {
                        id: string;
                        label: string;
                        status: string;
                        summary: string;
                    }[];
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    progress_checkpoints: {
                        schema: string;
                        title: string;
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            raw_events_default_collapsed: boolean;
                        };
                        items: any[];
                    };
                    completion_summary: {
                        headline: string;
                        evidence: string[];
                        files: any[];
                        verification: string[];
                        acceptance: string[];
                        independent_review: string[];
                        independentReview: string[];
                        post_review_spot_check: any;
                        postReviewSpotCheck: any;
                        post_review_spot_check_summary: any;
                        postReviewSpotCheckSummary: any;
                        post_review_spot_check_gate: any;
                        postReviewSpotCheckGate: any;
                        post_review_spot_check_required: boolean;
                        post_review_spot_check_gate_passed: boolean;
                        risks: string[];
                        next_action: string;
                        verification_status: string;
                        risk_status: string;
                        final_summary_quality: {
                            schema: string;
                            required: boolean;
                            passed: boolean;
                            checks: {
                                id: string;
                                label: string;
                                passed: boolean;
                                detail: string;
                            }[];
                            missing: string[];
                            verification_status: string;
                            risk_status: string;
                            source: string;
                        };
                        quality_followup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        qualityFollowup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        todo_plan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        todoPlan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        terminal: boolean;
                    };
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        final_summary_required: boolean;
                    };
                    technical_details: {
                        id: string;
                        title: string;
                        items: any[];
                    }[];
                };
                completion_summary: {
                    headline: string;
                    evidence: string[];
                    files: any[];
                    verification: string[];
                    acceptance: string[];
                    independent_review: string[];
                    independentReview: string[];
                    post_review_spot_check: any;
                    postReviewSpotCheck: any;
                    post_review_spot_check_summary: any;
                    postReviewSpotCheckSummary: any;
                    post_review_spot_check_gate: any;
                    postReviewSpotCheckGate: any;
                    post_review_spot_check_required: boolean;
                    post_review_spot_check_gate_passed: boolean;
                    risks: string[];
                    next_action: string;
                    verification_status: string;
                    risk_status: string;
                    final_summary_quality: {
                        schema: string;
                        required: boolean;
                        passed: boolean;
                        checks: {
                            id: string;
                            label: string;
                            passed: boolean;
                            detail: string;
                        }[];
                        missing: string[];
                        verification_status: string;
                        risk_status: string;
                        source: string;
                    };
                    quality_followup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    qualityFollowup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    terminal: boolean;
                };
                todo_plan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                todoPlan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                verification_reminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                verificationReminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                progress_checkpoints: {
                    schema: string;
                    title: string;
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        raw_events_default_collapsed: boolean;
                    };
                    items: any[];
                };
                dispatch_launch_summary: any;
                dispatchLaunchSummary: any;
                delivery_report: any;
                workchain_stages: {
                    id: string;
                    label: string;
                    status: string;
                    summary: string;
                }[];
                technical_details: {
                    id: string;
                    title: string;
                    items: any[];
                }[];
                raw_events: any[];
                todo: {
                    visible: boolean;
                    surface: string;
                    tool_message_visible: boolean;
                    quiet_completed: boolean;
                };
                terminology: {
                    sanitized: boolean;
                    blocked_terms: string[];
                };
            };
            displayStream: {
                schema: string;
                type: string;
                user_visible: boolean;
                user_visible_text: string;
                text_message: {
                    type: string;
                    text: string;
                };
                tool_use_summary: {
                    type: string;
                    tool_summary: string;
                    counts: {
                        reads: number;
                        writes: number;
                        dispatches: number;
                        receipts: number;
                        verifications: number;
                        executions: number;
                    };
                    hidden_tool_uses: number;
                };
                workchain: {
                    schema: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    status: string;
                    phase: string;
                    user_visible_text: string;
                    stages: {
                        id: string;
                        label: string;
                        status: string;
                        summary: string;
                    }[];
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    progress_checkpoints: {
                        schema: string;
                        title: string;
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            raw_events_default_collapsed: boolean;
                        };
                        items: any[];
                    };
                    completion_summary: {
                        headline: string;
                        evidence: string[];
                        files: any[];
                        verification: string[];
                        acceptance: string[];
                        independent_review: string[];
                        independentReview: string[];
                        post_review_spot_check: any;
                        postReviewSpotCheck: any;
                        post_review_spot_check_summary: any;
                        postReviewSpotCheckSummary: any;
                        post_review_spot_check_gate: any;
                        postReviewSpotCheckGate: any;
                        post_review_spot_check_required: boolean;
                        post_review_spot_check_gate_passed: boolean;
                        risks: string[];
                        next_action: string;
                        verification_status: string;
                        risk_status: string;
                        final_summary_quality: {
                            schema: string;
                            required: boolean;
                            passed: boolean;
                            checks: {
                                id: string;
                                label: string;
                                passed: boolean;
                                detail: string;
                            }[];
                            missing: string[];
                            verification_status: string;
                            risk_status: string;
                            source: string;
                        };
                        quality_followup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        qualityFollowup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        todo_plan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        todoPlan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        terminal: boolean;
                    };
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        final_summary_required: boolean;
                    };
                    technical_details: {
                        id: string;
                        title: string;
                        items: any[];
                    }[];
                };
                completion_summary: {
                    headline: string;
                    evidence: string[];
                    files: any[];
                    verification: string[];
                    acceptance: string[];
                    independent_review: string[];
                    independentReview: string[];
                    post_review_spot_check: any;
                    postReviewSpotCheck: any;
                    post_review_spot_check_summary: any;
                    postReviewSpotCheckSummary: any;
                    post_review_spot_check_gate: any;
                    postReviewSpotCheckGate: any;
                    post_review_spot_check_required: boolean;
                    post_review_spot_check_gate_passed: boolean;
                    risks: string[];
                    next_action: string;
                    verification_status: string;
                    risk_status: string;
                    final_summary_quality: {
                        schema: string;
                        required: boolean;
                        passed: boolean;
                        checks: {
                            id: string;
                            label: string;
                            passed: boolean;
                            detail: string;
                        }[];
                        missing: string[];
                        verification_status: string;
                        risk_status: string;
                        source: string;
                    };
                    quality_followup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    qualityFollowup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    terminal: boolean;
                };
                todo_plan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                todoPlan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                verification_reminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                verificationReminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                progress_checkpoints: {
                    schema: string;
                    title: string;
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        raw_events_default_collapsed: boolean;
                    };
                    items: any[];
                };
                dispatch_launch_summary: any;
                dispatchLaunchSummary: any;
                delivery_report: any;
                workchain_stages: {
                    id: string;
                    label: string;
                    status: string;
                    summary: string;
                }[];
                technical_details: {
                    id: string;
                    title: string;
                    items: any[];
                }[];
                raw_events: any[];
                todo: {
                    visible: boolean;
                    surface: string;
                    tool_message_visible: boolean;
                    quiet_completed: boolean;
                };
                terminology: {
                    sanitized: boolean;
                    blocked_terms: string[];
                };
            };
            todo_plan: any;
            verification_reminder: any;
            verificationReminder: any;
            permissions: {
                action_id: string;
                risk: string;
                allowed: boolean;
                reason: string;
            }[];
            observation: {
                live_task_phase: string;
                receipt_count: number;
                acceptance_gate_passed: boolean;
                needs_replan: boolean;
            };
            verify: {
                passed: boolean;
                blocked_actions: string[];
                conclusion: string;
            };
            reply: {
                kind: string;
                message_id: string;
                preview: any;
            };
            created_at: string;
        };
        workflow_timeline: any;
        agent_questions: any;
        conflict_warnings: any;
        work_order_preview: {
            title: string;
            source: string;
            ready: boolean;
            requires_confirmation: boolean;
            summary: string;
            orders: any;
        };
        execution_story: {
            title: string;
            style: string;
            current_step: string;
            steps: {
                id: string;
                label: string;
                detail: string;
                status: string;
                evidence: any;
            }[];
        };
        acceptance_review: {
            title: string;
            pass: boolean;
            status: string;
            headline: string;
            checks: any[];
            missing: any[];
            next_action: string;
            technical: {
                raw_gate_checks: any;
            };
        };
        plan_alignment: {
            schema: string;
            title: string;
            status: string;
            status_label: string;
            headline: string;
            checks: any[];
            deviations: {
                id: any;
                label: any;
                reason: any;
            }[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
            };
        };
        planAlignment: {
            schema: string;
            title: string;
            status: string;
            status_label: string;
            headline: string;
            checks: any[];
            deviations: {
                id: any;
                label: any;
                reason: any;
            }[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
            };
        };
        agent_coordination: {
            version: number;
            source: string;
            title: string;
            health: number;
            status: string;
            ack_review: any;
            child_plan_review: {
                schema: string;
                title: string;
                status: string;
                status_label: string;
                headline: string;
                approved_count: any;
                waiting_count: any;
                needs_revision_count: any;
                rows: any;
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            handoff: any;
            heartbeat: {
                id: string;
                text: string;
            }[];
            contract_sync: {
                required: boolean;
                status: string;
                summary: string;
                endpoints: string[];
                files: string[];
                changes: any;
            };
            contract_transfer: {
                required: boolean;
                status: string;
                rows: any;
                next_action: string;
            };
            contract_injection_gate: {
                required: boolean;
                pass: boolean;
                rows: any[];
                missing: any[];
                unconsumed: any[];
                status: string;
                summary: string;
            };
            memory_gate_summary: {
                schema: string;
                required: any;
                pass: any;
                status: string;
                status_label: string;
                summary: string;
                gate_count: number;
                gate_ids: string[];
                missing_gate_ids: string[];
                missing_count: number;
                rows: any;
            };
            global_memory_receipt_summary: {
                schema: string;
                required: any;
                pass: boolean;
                status: any;
                status_label: string;
                summary: any;
                gate_count: number;
                global_memory_count: number;
                gate_ids: string[];
                global_memory_ids: string[];
                missing_global_memory_ids: string[];
                unsafe_used_global_memory_ids: string[];
                missing_current_verification_ids: string[];
                missing_semantic_acknowledgement_ids: string[];
                missing_cross_group_acknowledgement_ids: string[];
                missing_count: any;
                rows: any;
            };
            global_memory_health_gate_summary: {
                schema: string;
                required: any;
                pass: boolean;
                status: any;
                status_label: string;
                summary: any;
                gate_count: number;
                gate_ids: string[];
                missing_gate_ids: string[];
                missing_ignore_gate_ids: string[];
                missing_warning_ack_gate_ids: string[];
                blocked_global_memory_used_gate_ids: string[];
                missing_count: any;
                rows: any;
            };
            read_plan_revalidation_gate_summary: {
                schema: string;
                required: any;
                pass: any;
                status: string;
                status_label: string;
                summary: string;
                gate_count: number;
                gate_ids: string[];
                missing_gate_ids: string[];
                missing_read_plan_ids: string[];
                session_mismatch_gate_ids: string[];
                session_mismatch_count: number;
                session_required: any;
                session_matched: any;
                missing_count: any;
                rows: any;
            };
            post_compact_reinjection_gate_summary: {
                schema: string;
                required: any;
                pass: any;
                status: string;
                status_label: string;
                summary: string;
                gate_count: number;
                candidate_count: any;
                candidate_usage_counts: any;
                gate_ids: string[];
                missing_gate_ids: string[];
                missing_candidate_reference_gate_ids: string[];
                missing_candidate_usage_gate_ids: string[];
                missing_candidate_usage_candidate_ids: string[];
                missing_count: number;
                rows: any;
            };
            api_microcompact_receipt_summary: {
                schema: string;
                required: any;
                pass: any;
                status: string;
                status_label: string;
                summary: string;
                plan_count: number;
                plan_checksums: string[];
                missing_plan_checksums: string[];
                unsafe_native_applied_plan_checksums: string[];
                session_mismatch_plan_checksums: string[];
                native_applied_count: any;
                advisory_count: any;
                ignored_count: any;
                missing_count: number;
                rows: any;
            };
            post_compact_dispatch_marker_summary: {
                schema: string;
                required: boolean;
                pass: boolean;
                status: string;
                status_label: string;
                summary: string;
                marker_count: number;
                first_dispatch_count: any;
                marker_ids: string[];
                boundary_ids: string[];
                rows: any;
            };
            runtime_kernel: any;
            coordination_events: any[];
            receipt_quality: {
                agent: any;
                status: any;
                summary: string;
                quality: {
                    score: number;
                    grade: string;
                    pass: boolean;
                    checks: ({
                        id: string;
                        label: string;
                        ok: boolean;
                        detail?: undefined;
                    } | {
                        id: string;
                        label: string;
                        ok: any;
                        detail: string;
                    })[];
                    task_agent_memory_snapshot: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        snapshot_ids: any[];
                        matched_snapshot_ids: any[];
                        missing_snapshot_ids: any[];
                        task_agent_session_ids: any[];
                        receipt_task_agent_session_id: string;
                        receipt_memory_context_snapshot_id: string;
                        receipt_memory_context_snapshot_checksum: string;
                        declared_usage: any;
                        declared_binding_id: string;
                        declared_group_session_id: string;
                        declared_session_memory_checksum: string;
                        declared_model_extraction_execution_id: string;
                        declared_model_extraction_replay_status: string;
                        declared_fact_supersession_graph_checksum: string;
                        declared_usage_state: string;
                        declared_memory_fact_citations: any;
                        memory_fact_citations_required: boolean;
                        memory_fact_citations_passed: boolean;
                        system_delivery_required: boolean;
                        system_delivery_passed: boolean;
                        agent_declaration_required: boolean;
                        agent_declaration_passed: boolean;
                        gate_ids: string[];
                        matched_gate_ids: string[];
                        rows: any[];
                    };
                    memory_gate: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        gate_ids: any;
                        missing_gate_ids: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    } | {
                        pass: boolean;
                        missing_gate_ids: any[];
                        proven_by_memory_context_snapshot: boolean;
                        schema: string;
                        required: boolean;
                        gate_ids: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    global_memory_gate: {
                        schema: string;
                        required: boolean;
                        pass: any;
                        gate_ids: any;
                        global_memory_ids: string[];
                        missing_global_memory_ids: string[];
                        missing_usage_state_ids: string[];
                        unsafe_used_global_memory_ids: string[];
                        missing_current_verification_ids: string[];
                        missing_semantic_acknowledgement_ids: string[];
                        missing_cross_group_acknowledgement_ids: string[];
                        used_global_memory_ids: string[];
                        ignored_global_memory_ids: string[];
                        verified_global_memory_ids: string[];
                        background_global_memory_ids: string[];
                        advisory_global_memory_ids: string[];
                        rows: any;
                        structured_usage_rows: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    global_memory_health_gate: {
                        schema: string;
                        required: boolean;
                        pass: any;
                        gate_ids: any;
                        missing_gate_ids: any;
                        fail_gate_ids: any;
                        warn_gate_ids: any;
                        missing_ignore_gate_ids: any;
                        missing_warning_ack_gate_ids: any;
                        blocked_global_memory_used_gate_ids: any;
                        rows: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    } | {
                        pass: boolean;
                        missing_gate_ids: any[];
                        proven_by_memory_context_snapshot: boolean;
                        rows: any;
                        schema: string;
                        required: boolean;
                        gate_ids: any;
                        fail_gate_ids: any;
                        warn_gate_ids: any;
                        missing_ignore_gate_ids: any;
                        missing_warning_ack_gate_ids: any;
                        blocked_global_memory_used_gate_ids: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    read_plan_revalidation_gate: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        gate_ids: any;
                        missing_gate_ids: any;
                        missing_read_plan_ids: string[];
                        session_required: any;
                        session_matched: any;
                        session_mismatch_gate_ids: any;
                        current_source_verified: any;
                        ignored_with_reason: any;
                        rows: any;
                        declared: boolean;
                        structured_usage_rows: any;
                        used: any;
                        ignored: any;
                    };
                    post_compact_reinjection_gate: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        gate_ids: any;
                        missing_gate_ids: any;
                        candidate_count: any;
                        candidate_reference_required: any;
                        candidate_reference_passed: any;
                        candidate_usage_required: any;
                        candidate_usage_declared_passed: any;
                        candidate_usage_strict_required: any;
                        candidate_usage_strict_passed: any;
                        referenced_candidate_ids: string[];
                        all_candidates_declared: any;
                        missing_candidate_reference_gate_ids: any;
                        missing_candidate_usage_gate_ids: any;
                        missing_candidate_usage_candidate_ids: string[];
                        candidate_usage_rows: any;
                        candidate_usage_counts: {
                            used: any;
                            ignored: any;
                            verified: any;
                            mentioned: any;
                            unreferenced: any;
                        };
                        used_candidate_ids: string[];
                        ignored_candidate_ids: string[];
                        verified_candidate_ids: string[];
                        mentioned_only_candidate_ids: string[];
                        unreferenced_candidate_ids: string[];
                        structured_candidate_usage_rows: {
                            gate_id: string;
                            candidate_id: string;
                            kind: string;
                            value: string;
                            usage_state: string;
                            reason: string;
                            raw: any;
                        }[];
                        candidate_rows: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    api_microcompact: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        plan_checksums: any;
                        missing_plan_checksums: any;
                        unsafe_native_applied_plan_checksums: any;
                        session_mismatch_plan_checksums: any;
                        native_applied_count: any;
                        advisory_count: any;
                        ignored_count: any;
                        rows: any;
                        declared: boolean;
                        structured_usage_rows: {
                            plan_checksum: string;
                            apply_plan_checksum: string;
                            request_patch_checksum: string;
                            task_agent_session_id: string;
                            native_session_id: string;
                            memory_context_snapshot_id: string;
                            memory_context_snapshot_checksum: string;
                            usage_state: string;
                            native_applied: boolean;
                            advisory_only: boolean;
                            reason: string;
                            raw: any;
                        }[];
                        used: any;
                        ignored: any;
                    };
                    handoff_quality: {
                        schema: string;
                        pass: boolean;
                        status: string;
                        status_label: string;
                        reason: string;
                        evidence: {
                            has_handoff_hint: boolean;
                            has_no_execution_hint: boolean;
                            has_concrete_files: boolean;
                            has_concrete_actions: boolean;
                            has_executed_verification: boolean;
                            missing_required_files: boolean;
                            missing_required_verification: boolean;
                            hints: string[];
                        };
                    };
                    missing: string[];
                };
            }[];
            weak_receipts: {
                agent: any;
                status: any;
                summary: string;
                quality: {
                    score: number;
                    grade: string;
                    pass: boolean;
                    checks: ({
                        id: string;
                        label: string;
                        ok: boolean;
                        detail?: undefined;
                    } | {
                        id: string;
                        label: string;
                        ok: any;
                        detail: string;
                    })[];
                    task_agent_memory_snapshot: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        snapshot_ids: any[];
                        matched_snapshot_ids: any[];
                        missing_snapshot_ids: any[];
                        task_agent_session_ids: any[];
                        receipt_task_agent_session_id: string;
                        receipt_memory_context_snapshot_id: string;
                        receipt_memory_context_snapshot_checksum: string;
                        declared_usage: any;
                        declared_binding_id: string;
                        declared_group_session_id: string;
                        declared_session_memory_checksum: string;
                        declared_model_extraction_execution_id: string;
                        declared_model_extraction_replay_status: string;
                        declared_fact_supersession_graph_checksum: string;
                        declared_usage_state: string;
                        declared_memory_fact_citations: any;
                        memory_fact_citations_required: boolean;
                        memory_fact_citations_passed: boolean;
                        system_delivery_required: boolean;
                        system_delivery_passed: boolean;
                        agent_declaration_required: boolean;
                        agent_declaration_passed: boolean;
                        gate_ids: string[];
                        matched_gate_ids: string[];
                        rows: any[];
                    };
                    memory_gate: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        gate_ids: any;
                        missing_gate_ids: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    } | {
                        pass: boolean;
                        missing_gate_ids: any[];
                        proven_by_memory_context_snapshot: boolean;
                        schema: string;
                        required: boolean;
                        gate_ids: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    global_memory_gate: {
                        schema: string;
                        required: boolean;
                        pass: any;
                        gate_ids: any;
                        global_memory_ids: string[];
                        missing_global_memory_ids: string[];
                        missing_usage_state_ids: string[];
                        unsafe_used_global_memory_ids: string[];
                        missing_current_verification_ids: string[];
                        missing_semantic_acknowledgement_ids: string[];
                        missing_cross_group_acknowledgement_ids: string[];
                        used_global_memory_ids: string[];
                        ignored_global_memory_ids: string[];
                        verified_global_memory_ids: string[];
                        background_global_memory_ids: string[];
                        advisory_global_memory_ids: string[];
                        rows: any;
                        structured_usage_rows: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    global_memory_health_gate: {
                        schema: string;
                        required: boolean;
                        pass: any;
                        gate_ids: any;
                        missing_gate_ids: any;
                        fail_gate_ids: any;
                        warn_gate_ids: any;
                        missing_ignore_gate_ids: any;
                        missing_warning_ack_gate_ids: any;
                        blocked_global_memory_used_gate_ids: any;
                        rows: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    } | {
                        pass: boolean;
                        missing_gate_ids: any[];
                        proven_by_memory_context_snapshot: boolean;
                        rows: any;
                        schema: string;
                        required: boolean;
                        gate_ids: any;
                        fail_gate_ids: any;
                        warn_gate_ids: any;
                        missing_ignore_gate_ids: any;
                        missing_warning_ack_gate_ids: any;
                        blocked_global_memory_used_gate_ids: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    read_plan_revalidation_gate: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        gate_ids: any;
                        missing_gate_ids: any;
                        missing_read_plan_ids: string[];
                        session_required: any;
                        session_matched: any;
                        session_mismatch_gate_ids: any;
                        current_source_verified: any;
                        ignored_with_reason: any;
                        rows: any;
                        declared: boolean;
                        structured_usage_rows: any;
                        used: any;
                        ignored: any;
                    };
                    post_compact_reinjection_gate: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        gate_ids: any;
                        missing_gate_ids: any;
                        candidate_count: any;
                        candidate_reference_required: any;
                        candidate_reference_passed: any;
                        candidate_usage_required: any;
                        candidate_usage_declared_passed: any;
                        candidate_usage_strict_required: any;
                        candidate_usage_strict_passed: any;
                        referenced_candidate_ids: string[];
                        all_candidates_declared: any;
                        missing_candidate_reference_gate_ids: any;
                        missing_candidate_usage_gate_ids: any;
                        missing_candidate_usage_candidate_ids: string[];
                        candidate_usage_rows: any;
                        candidate_usage_counts: {
                            used: any;
                            ignored: any;
                            verified: any;
                            mentioned: any;
                            unreferenced: any;
                        };
                        used_candidate_ids: string[];
                        ignored_candidate_ids: string[];
                        verified_candidate_ids: string[];
                        mentioned_only_candidate_ids: string[];
                        unreferenced_candidate_ids: string[];
                        structured_candidate_usage_rows: {
                            gate_id: string;
                            candidate_id: string;
                            kind: string;
                            value: string;
                            usage_state: string;
                            reason: string;
                            raw: any;
                        }[];
                        candidate_rows: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    api_microcompact: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        plan_checksums: any;
                        missing_plan_checksums: any;
                        unsafe_native_applied_plan_checksums: any;
                        session_mismatch_plan_checksums: any;
                        native_applied_count: any;
                        advisory_count: any;
                        ignored_count: any;
                        rows: any;
                        declared: boolean;
                        structured_usage_rows: {
                            plan_checksum: string;
                            apply_plan_checksum: string;
                            request_patch_checksum: string;
                            task_agent_session_id: string;
                            native_session_id: string;
                            memory_context_snapshot_id: string;
                            memory_context_snapshot_checksum: string;
                            usage_state: string;
                            native_applied: boolean;
                            advisory_only: boolean;
                            reason: string;
                            raw: any;
                        }[];
                        used: any;
                        ignored: any;
                    };
                    handoff_quality: {
                        schema: string;
                        pass: boolean;
                        status: string;
                        status_label: string;
                        reason: string;
                        evidence: {
                            has_handoff_hint: boolean;
                            has_no_execution_hint: boolean;
                            has_concrete_files: boolean;
                            has_concrete_actions: boolean;
                            has_executed_verification: boolean;
                            missing_required_files: boolean;
                            missing_required_verification: boolean;
                            hints: string[];
                        };
                    };
                    missing: string[];
                };
            }[];
            targeted_rework: any[];
            next_action: string;
        };
        agentCoordination: {
            version: number;
            source: string;
            title: string;
            health: number;
            status: string;
            ack_review: any;
            child_plan_review: {
                schema: string;
                title: string;
                status: string;
                status_label: string;
                headline: string;
                approved_count: any;
                waiting_count: any;
                needs_revision_count: any;
                rows: any;
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            handoff: any;
            heartbeat: {
                id: string;
                text: string;
            }[];
            contract_sync: {
                required: boolean;
                status: string;
                summary: string;
                endpoints: string[];
                files: string[];
                changes: any;
            };
            contract_transfer: {
                required: boolean;
                status: string;
                rows: any;
                next_action: string;
            };
            contract_injection_gate: {
                required: boolean;
                pass: boolean;
                rows: any[];
                missing: any[];
                unconsumed: any[];
                status: string;
                summary: string;
            };
            memory_gate_summary: {
                schema: string;
                required: any;
                pass: any;
                status: string;
                status_label: string;
                summary: string;
                gate_count: number;
                gate_ids: string[];
                missing_gate_ids: string[];
                missing_count: number;
                rows: any;
            };
            global_memory_receipt_summary: {
                schema: string;
                required: any;
                pass: boolean;
                status: any;
                status_label: string;
                summary: any;
                gate_count: number;
                global_memory_count: number;
                gate_ids: string[];
                global_memory_ids: string[];
                missing_global_memory_ids: string[];
                unsafe_used_global_memory_ids: string[];
                missing_current_verification_ids: string[];
                missing_semantic_acknowledgement_ids: string[];
                missing_cross_group_acknowledgement_ids: string[];
                missing_count: any;
                rows: any;
            };
            global_memory_health_gate_summary: {
                schema: string;
                required: any;
                pass: boolean;
                status: any;
                status_label: string;
                summary: any;
                gate_count: number;
                gate_ids: string[];
                missing_gate_ids: string[];
                missing_ignore_gate_ids: string[];
                missing_warning_ack_gate_ids: string[];
                blocked_global_memory_used_gate_ids: string[];
                missing_count: any;
                rows: any;
            };
            read_plan_revalidation_gate_summary: {
                schema: string;
                required: any;
                pass: any;
                status: string;
                status_label: string;
                summary: string;
                gate_count: number;
                gate_ids: string[];
                missing_gate_ids: string[];
                missing_read_plan_ids: string[];
                session_mismatch_gate_ids: string[];
                session_mismatch_count: number;
                session_required: any;
                session_matched: any;
                missing_count: any;
                rows: any;
            };
            post_compact_reinjection_gate_summary: {
                schema: string;
                required: any;
                pass: any;
                status: string;
                status_label: string;
                summary: string;
                gate_count: number;
                candidate_count: any;
                candidate_usage_counts: any;
                gate_ids: string[];
                missing_gate_ids: string[];
                missing_candidate_reference_gate_ids: string[];
                missing_candidate_usage_gate_ids: string[];
                missing_candidate_usage_candidate_ids: string[];
                missing_count: number;
                rows: any;
            };
            api_microcompact_receipt_summary: {
                schema: string;
                required: any;
                pass: any;
                status: string;
                status_label: string;
                summary: string;
                plan_count: number;
                plan_checksums: string[];
                missing_plan_checksums: string[];
                unsafe_native_applied_plan_checksums: string[];
                session_mismatch_plan_checksums: string[];
                native_applied_count: any;
                advisory_count: any;
                ignored_count: any;
                missing_count: number;
                rows: any;
            };
            post_compact_dispatch_marker_summary: {
                schema: string;
                required: boolean;
                pass: boolean;
                status: string;
                status_label: string;
                summary: string;
                marker_count: number;
                first_dispatch_count: any;
                marker_ids: string[];
                boundary_ids: string[];
                rows: any;
            };
            runtime_kernel: any;
            coordination_events: any[];
            receipt_quality: {
                agent: any;
                status: any;
                summary: string;
                quality: {
                    score: number;
                    grade: string;
                    pass: boolean;
                    checks: ({
                        id: string;
                        label: string;
                        ok: boolean;
                        detail?: undefined;
                    } | {
                        id: string;
                        label: string;
                        ok: any;
                        detail: string;
                    })[];
                    task_agent_memory_snapshot: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        snapshot_ids: any[];
                        matched_snapshot_ids: any[];
                        missing_snapshot_ids: any[];
                        task_agent_session_ids: any[];
                        receipt_task_agent_session_id: string;
                        receipt_memory_context_snapshot_id: string;
                        receipt_memory_context_snapshot_checksum: string;
                        declared_usage: any;
                        declared_binding_id: string;
                        declared_group_session_id: string;
                        declared_session_memory_checksum: string;
                        declared_model_extraction_execution_id: string;
                        declared_model_extraction_replay_status: string;
                        declared_fact_supersession_graph_checksum: string;
                        declared_usage_state: string;
                        declared_memory_fact_citations: any;
                        memory_fact_citations_required: boolean;
                        memory_fact_citations_passed: boolean;
                        system_delivery_required: boolean;
                        system_delivery_passed: boolean;
                        agent_declaration_required: boolean;
                        agent_declaration_passed: boolean;
                        gate_ids: string[];
                        matched_gate_ids: string[];
                        rows: any[];
                    };
                    memory_gate: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        gate_ids: any;
                        missing_gate_ids: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    } | {
                        pass: boolean;
                        missing_gate_ids: any[];
                        proven_by_memory_context_snapshot: boolean;
                        schema: string;
                        required: boolean;
                        gate_ids: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    global_memory_gate: {
                        schema: string;
                        required: boolean;
                        pass: any;
                        gate_ids: any;
                        global_memory_ids: string[];
                        missing_global_memory_ids: string[];
                        missing_usage_state_ids: string[];
                        unsafe_used_global_memory_ids: string[];
                        missing_current_verification_ids: string[];
                        missing_semantic_acknowledgement_ids: string[];
                        missing_cross_group_acknowledgement_ids: string[];
                        used_global_memory_ids: string[];
                        ignored_global_memory_ids: string[];
                        verified_global_memory_ids: string[];
                        background_global_memory_ids: string[];
                        advisory_global_memory_ids: string[];
                        rows: any;
                        structured_usage_rows: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    global_memory_health_gate: {
                        schema: string;
                        required: boolean;
                        pass: any;
                        gate_ids: any;
                        missing_gate_ids: any;
                        fail_gate_ids: any;
                        warn_gate_ids: any;
                        missing_ignore_gate_ids: any;
                        missing_warning_ack_gate_ids: any;
                        blocked_global_memory_used_gate_ids: any;
                        rows: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    } | {
                        pass: boolean;
                        missing_gate_ids: any[];
                        proven_by_memory_context_snapshot: boolean;
                        rows: any;
                        schema: string;
                        required: boolean;
                        gate_ids: any;
                        fail_gate_ids: any;
                        warn_gate_ids: any;
                        missing_ignore_gate_ids: any;
                        missing_warning_ack_gate_ids: any;
                        blocked_global_memory_used_gate_ids: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    read_plan_revalidation_gate: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        gate_ids: any;
                        missing_gate_ids: any;
                        missing_read_plan_ids: string[];
                        session_required: any;
                        session_matched: any;
                        session_mismatch_gate_ids: any;
                        current_source_verified: any;
                        ignored_with_reason: any;
                        rows: any;
                        declared: boolean;
                        structured_usage_rows: any;
                        used: any;
                        ignored: any;
                    };
                    post_compact_reinjection_gate: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        gate_ids: any;
                        missing_gate_ids: any;
                        candidate_count: any;
                        candidate_reference_required: any;
                        candidate_reference_passed: any;
                        candidate_usage_required: any;
                        candidate_usage_declared_passed: any;
                        candidate_usage_strict_required: any;
                        candidate_usage_strict_passed: any;
                        referenced_candidate_ids: string[];
                        all_candidates_declared: any;
                        missing_candidate_reference_gate_ids: any;
                        missing_candidate_usage_gate_ids: any;
                        missing_candidate_usage_candidate_ids: string[];
                        candidate_usage_rows: any;
                        candidate_usage_counts: {
                            used: any;
                            ignored: any;
                            verified: any;
                            mentioned: any;
                            unreferenced: any;
                        };
                        used_candidate_ids: string[];
                        ignored_candidate_ids: string[];
                        verified_candidate_ids: string[];
                        mentioned_only_candidate_ids: string[];
                        unreferenced_candidate_ids: string[];
                        structured_candidate_usage_rows: {
                            gate_id: string;
                            candidate_id: string;
                            kind: string;
                            value: string;
                            usage_state: string;
                            reason: string;
                            raw: any;
                        }[];
                        candidate_rows: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    api_microcompact: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        plan_checksums: any;
                        missing_plan_checksums: any;
                        unsafe_native_applied_plan_checksums: any;
                        session_mismatch_plan_checksums: any;
                        native_applied_count: any;
                        advisory_count: any;
                        ignored_count: any;
                        rows: any;
                        declared: boolean;
                        structured_usage_rows: {
                            plan_checksum: string;
                            apply_plan_checksum: string;
                            request_patch_checksum: string;
                            task_agent_session_id: string;
                            native_session_id: string;
                            memory_context_snapshot_id: string;
                            memory_context_snapshot_checksum: string;
                            usage_state: string;
                            native_applied: boolean;
                            advisory_only: boolean;
                            reason: string;
                            raw: any;
                        }[];
                        used: any;
                        ignored: any;
                    };
                    handoff_quality: {
                        schema: string;
                        pass: boolean;
                        status: string;
                        status_label: string;
                        reason: string;
                        evidence: {
                            has_handoff_hint: boolean;
                            has_no_execution_hint: boolean;
                            has_concrete_files: boolean;
                            has_concrete_actions: boolean;
                            has_executed_verification: boolean;
                            missing_required_files: boolean;
                            missing_required_verification: boolean;
                            hints: string[];
                        };
                    };
                    missing: string[];
                };
            }[];
            weak_receipts: {
                agent: any;
                status: any;
                summary: string;
                quality: {
                    score: number;
                    grade: string;
                    pass: boolean;
                    checks: ({
                        id: string;
                        label: string;
                        ok: boolean;
                        detail?: undefined;
                    } | {
                        id: string;
                        label: string;
                        ok: any;
                        detail: string;
                    })[];
                    task_agent_memory_snapshot: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        snapshot_ids: any[];
                        matched_snapshot_ids: any[];
                        missing_snapshot_ids: any[];
                        task_agent_session_ids: any[];
                        receipt_task_agent_session_id: string;
                        receipt_memory_context_snapshot_id: string;
                        receipt_memory_context_snapshot_checksum: string;
                        declared_usage: any;
                        declared_binding_id: string;
                        declared_group_session_id: string;
                        declared_session_memory_checksum: string;
                        declared_model_extraction_execution_id: string;
                        declared_model_extraction_replay_status: string;
                        declared_fact_supersession_graph_checksum: string;
                        declared_usage_state: string;
                        declared_memory_fact_citations: any;
                        memory_fact_citations_required: boolean;
                        memory_fact_citations_passed: boolean;
                        system_delivery_required: boolean;
                        system_delivery_passed: boolean;
                        agent_declaration_required: boolean;
                        agent_declaration_passed: boolean;
                        gate_ids: string[];
                        matched_gate_ids: string[];
                        rows: any[];
                    };
                    memory_gate: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        gate_ids: any;
                        missing_gate_ids: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    } | {
                        pass: boolean;
                        missing_gate_ids: any[];
                        proven_by_memory_context_snapshot: boolean;
                        schema: string;
                        required: boolean;
                        gate_ids: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    global_memory_gate: {
                        schema: string;
                        required: boolean;
                        pass: any;
                        gate_ids: any;
                        global_memory_ids: string[];
                        missing_global_memory_ids: string[];
                        missing_usage_state_ids: string[];
                        unsafe_used_global_memory_ids: string[];
                        missing_current_verification_ids: string[];
                        missing_semantic_acknowledgement_ids: string[];
                        missing_cross_group_acknowledgement_ids: string[];
                        used_global_memory_ids: string[];
                        ignored_global_memory_ids: string[];
                        verified_global_memory_ids: string[];
                        background_global_memory_ids: string[];
                        advisory_global_memory_ids: string[];
                        rows: any;
                        structured_usage_rows: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    global_memory_health_gate: {
                        schema: string;
                        required: boolean;
                        pass: any;
                        gate_ids: any;
                        missing_gate_ids: any;
                        fail_gate_ids: any;
                        warn_gate_ids: any;
                        missing_ignore_gate_ids: any;
                        missing_warning_ack_gate_ids: any;
                        blocked_global_memory_used_gate_ids: any;
                        rows: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    } | {
                        pass: boolean;
                        missing_gate_ids: any[];
                        proven_by_memory_context_snapshot: boolean;
                        rows: any;
                        schema: string;
                        required: boolean;
                        gate_ids: any;
                        fail_gate_ids: any;
                        warn_gate_ids: any;
                        missing_ignore_gate_ids: any;
                        missing_warning_ack_gate_ids: any;
                        blocked_global_memory_used_gate_ids: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    read_plan_revalidation_gate: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        gate_ids: any;
                        missing_gate_ids: any;
                        missing_read_plan_ids: string[];
                        session_required: any;
                        session_matched: any;
                        session_mismatch_gate_ids: any;
                        current_source_verified: any;
                        ignored_with_reason: any;
                        rows: any;
                        declared: boolean;
                        structured_usage_rows: any;
                        used: any;
                        ignored: any;
                    };
                    post_compact_reinjection_gate: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        gate_ids: any;
                        missing_gate_ids: any;
                        candidate_count: any;
                        candidate_reference_required: any;
                        candidate_reference_passed: any;
                        candidate_usage_required: any;
                        candidate_usage_declared_passed: any;
                        candidate_usage_strict_required: any;
                        candidate_usage_strict_passed: any;
                        referenced_candidate_ids: string[];
                        all_candidates_declared: any;
                        missing_candidate_reference_gate_ids: any;
                        missing_candidate_usage_gate_ids: any;
                        missing_candidate_usage_candidate_ids: string[];
                        candidate_usage_rows: any;
                        candidate_usage_counts: {
                            used: any;
                            ignored: any;
                            verified: any;
                            mentioned: any;
                            unreferenced: any;
                        };
                        used_candidate_ids: string[];
                        ignored_candidate_ids: string[];
                        verified_candidate_ids: string[];
                        mentioned_only_candidate_ids: string[];
                        unreferenced_candidate_ids: string[];
                        structured_candidate_usage_rows: {
                            gate_id: string;
                            candidate_id: string;
                            kind: string;
                            value: string;
                            usage_state: string;
                            reason: string;
                            raw: any;
                        }[];
                        candidate_rows: any;
                        declared: boolean;
                        used: any;
                        ignored: any;
                    };
                    api_microcompact: {
                        schema: string;
                        required: boolean;
                        pass: boolean;
                        plan_checksums: any;
                        missing_plan_checksums: any;
                        unsafe_native_applied_plan_checksums: any;
                        session_mismatch_plan_checksums: any;
                        native_applied_count: any;
                        advisory_count: any;
                        ignored_count: any;
                        rows: any;
                        declared: boolean;
                        structured_usage_rows: {
                            plan_checksum: string;
                            apply_plan_checksum: string;
                            request_patch_checksum: string;
                            task_agent_session_id: string;
                            native_session_id: string;
                            memory_context_snapshot_id: string;
                            memory_context_snapshot_checksum: string;
                            usage_state: string;
                            native_applied: boolean;
                            advisory_only: boolean;
                            reason: string;
                            raw: any;
                        }[];
                        used: any;
                        ignored: any;
                    };
                    handoff_quality: {
                        schema: string;
                        pass: boolean;
                        status: string;
                        status_label: string;
                        reason: string;
                        evidence: {
                            has_handoff_hint: boolean;
                            has_no_execution_hint: boolean;
                            has_concrete_files: boolean;
                            has_concrete_actions: boolean;
                            has_executed_verification: boolean;
                            missing_required_files: boolean;
                            missing_required_verification: boolean;
                            hints: string[];
                        };
                    };
                    missing: string[];
                };
            }[];
            targeted_rework: any[];
            next_action: string;
        };
        agent_progress_summary: {
            schema: string;
            title: string;
            status: string;
            status_label: string;
            headline: string;
            rows: {
                agent: string;
                role: string;
                status: string;
                status_label: string;
                summary: string;
                current_focus: string;
                evidence: any[];
                files_changed_count: number;
                verification_count: number;
                blockers: string[];
                next_action: string;
            }[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
            };
        };
        agentProgressSummary: {
            schema: string;
            title: string;
            status: string;
            status_label: string;
            headline: string;
            rows: {
                agent: string;
                role: string;
                status: string;
                status_label: string;
                summary: string;
                current_focus: string;
                evidence: any[];
                files_changed_count: number;
                verification_count: number;
                blockers: string[];
                next_action: string;
            }[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
            };
        };
        change_summary: {
            schema: string;
            title: string;
            status: string;
            status_label: string;
            headline: string;
            file_count: number;
            additions: any;
            deletions: any;
            files: any[];
            agents: {
                agent: string;
                role: string;
                file_count: number;
                additions: any;
                deletions: any;
                files: any[];
            }[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
            };
        };
        changeSummary: {
            schema: string;
            title: string;
            status: string;
            status_label: string;
            headline: string;
            file_count: number;
            additions: any;
            deletions: any;
            files: any[];
            agents: {
                agent: string;
                role: string;
                file_count: number;
                additions: any;
                deletions: any;
                files: any[];
            }[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
            };
        };
        receipt_rework_summary: {
            schema: string;
            title: string;
            status: string;
            status_label: string;
            headline: string;
            gaps: any[];
            active_rework: {
                target: string;
                title: any;
                reason: string;
                at: any;
                status: any;
            }[];
            resolved: {
                target: any;
                title: string;
                reason: string;
                at: any;
                status: string;
            }[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
            };
        };
        receiptReworkSummary: {
            schema: string;
            title: string;
            status: string;
            status_label: string;
            headline: string;
            gaps: any[];
            active_rework: {
                target: string;
                title: any;
                reason: string;
                at: any;
                status: any;
            }[];
            resolved: {
                target: any;
                title: string;
                reason: string;
                at: any;
                status: string;
            }[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
            };
        };
        user_handoff: {
            schema: string;
            title: string;
            status: string;
            status_label: string;
            headline: string;
            primary_action: any;
            secondary_actions: any[];
            summary_cards: {
                id: string;
                label: string;
                value: string;
                tone: string;
            }[];
            evidence: string[];
            unresolved: string[];
            next_action: any;
            technical_hint: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
        };
        userHandoff: {
            schema: string;
            title: string;
            status: string;
            status_label: string;
            headline: string;
            primary_action: any;
            secondary_actions: any[];
            summary_cards: {
                id: string;
                label: string;
                value: string;
                tone: string;
            }[];
            evidence: string[];
            unresolved: string[];
            next_action: any;
            technical_hint: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
        };
        runtime_kernel: any;
        runtimeKernel: any;
        recovery_summary: {
            schema: string;
            title: string;
            status: string;
            mode: any;
            status_label: string;
            headline: any;
            revalidated: {
                goal: boolean;
                state: boolean;
                acceptance: boolean;
            };
            preserved: string[];
            remaining_gaps: string[];
            next_action: any;
            technical: {
                recovery_checks: any;
                lease_recovery_count: number;
                previous_status: any;
                recovered_at: any;
                decision_code: any;
                decision_reason: any;
                authorization_preserved: boolean;
                authorization_evidence: any;
            };
        };
        recoverySummary: {
            schema: string;
            title: string;
            status: string;
            mode: any;
            status_label: string;
            headline: any;
            revalidated: {
                goal: boolean;
                state: boolean;
                acceptance: boolean;
            };
            preserved: string[];
            remaining_gaps: string[];
            next_action: any;
            technical: {
                recovery_checks: any;
                lease_recovery_count: number;
                previous_status: any;
                recovered_at: any;
                decision_code: any;
                decision_reason: any;
                authorization_preserved: boolean;
                authorization_evidence: any;
            };
        };
        continuation_status: {
            schema: string;
            title: string;
            status: string;
            status_label: any;
            headline: string;
            kind: string;
            kind_label: any;
            strategy: string;
            route_label: string;
            replan_required: boolean;
            interrupt_current_run: boolean;
            target: string;
            reason: string;
            handoff_steps: {
                id: string;
                label: string;
                detail: string;
            }[];
            next_action: string;
            at: any;
            technical: {
                source: string;
                kind: string;
                work_item_id: string;
            };
        };
        continuationStatus: {
            schema: string;
            title: string;
            status: string;
            status_label: any;
            headline: string;
            kind: string;
            kind_label: any;
            strategy: string;
            route_label: string;
            replan_required: boolean;
            interrupt_current_run: boolean;
            target: string;
            reason: string;
            handoff_steps: {
                id: string;
                label: string;
                detail: string;
            }[];
            next_action: string;
            at: any;
            technical: {
                source: string;
                kind: string;
                work_item_id: string;
            };
        };
        plan_mode: {
            title: any;
            mode: any;
            requires_confirmation: boolean;
            auto_continue: boolean;
            confirmation_status: any;
            accepted_at: any;
            accepted_feedback: string;
            next_step: any;
            steps: any;
            risk: {
                level: any;
                summary: any;
                reasons: any;
            };
            impact_scope: {
                areas: any;
                projects: any;
                multi_agent: boolean;
            };
            read_only_exploration: {
                summary: string;
                projects: any;
                knowledge_used: boolean;
                code_snapshot_used: boolean;
            };
            acceptance: any;
            clarification_questions: any;
            needs_clarification: boolean;
            permission_boundaries: any;
            session_strategy: any;
            revision: {
                status: any;
                count: number;
                feedback: string;
                revised_at: any;
                next_step: any;
            };
        };
        completed: string[];
        blockers: string[];
        next_action: string;
        delivery_report: any;
        deliveryReport: any;
        post_review_spot_check_summary: any;
        postReviewSpotCheckSummary: any;
        completion_card: any;
        completionCard: any;
        pickup_summary: any;
        pickupSummary: any;
        delivery: {
            headline: any;
            files: string[];
            changes: any;
            verification: string[];
            risks: string[];
            acceptance_passed: boolean;
        };
        actions: any[];
        technical: {
            trace_id: any;
            execution_ids: any[];
            session_ids: any[];
            source_ingestion: any;
            requirement_extraction: any;
            work_item_ids: any[];
            work_item_summary: {
                total: number;
                counts: any;
                active: string[];
                blocked: {
                    id: string;
                    target: string;
                    blockers: string[];
                }[];
                next_claimable: {
                    id: string;
                    target: string;
                    subject: string;
                }[];
                dependency_summary: {
                    schema: string;
                    title: string;
                    status: string;
                    status_label: string;
                    headline: string;
                    rows: {
                        id: string;
                        target: string;
                        subject: string;
                        status: import("../../agents/work-items").MainAgentWorkItemStatus;
                        dependency_count: number;
                        open_dependency_count: number;
                        dependencies: {
                            id: string;
                            label: string;
                            status: import("../../agents/work-items").MainAgentWorkItemStatus;
                            completed: boolean;
                        }[];
                        label: string;
                        next_action: string;
                    }[];
                    ready: {
                        id: string;
                        target: string;
                        subject: string;
                        label: string;
                    }[];
                    next_claimable: {
                        id: string;
                        target: string;
                        subject: string;
                    }[];
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                verification_nudge: boolean;
                verification_reminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                all_completed: boolean;
            };
            work_item_claim_summary: any;
            work_item_unlock_summary: any;
            completion_readiness_summary: {
                schema: string;
                title: string;
                status: string;
                status_label: string;
                headline: string;
                rows: {
                    target: string;
                    subject: string;
                    status: string;
                    status_label: string;
                }[];
                open_session_count: number;
                unresolved_work_item_count: number;
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
                technical: {
                    unresolved_work_item_ids: any[];
                    open_session_ids: any;
                };
            };
            recovery_summary: {
                schema: string;
                title: string;
                status: string;
                mode: any;
                status_label: string;
                headline: any;
                revalidated: {
                    goal: boolean;
                    state: boolean;
                    acceptance: boolean;
                };
                preserved: string[];
                remaining_gaps: string[];
                next_action: any;
                technical: {
                    recovery_checks: any;
                    lease_recovery_count: number;
                    previous_status: any;
                    recovered_at: any;
                    decision_code: any;
                    decision_reason: any;
                    authorization_preserved: boolean;
                    authorization_evidence: any;
                };
            };
            continuation_state: any;
            receipt_rework_summary: {
                schema: string;
                title: string;
                status: string;
                status_label: string;
                headline: string;
                gaps: any[];
                active_rework: {
                    target: string;
                    title: any;
                    reason: string;
                    at: any;
                    status: any;
                }[];
                resolved: {
                    target: any;
                    title: string;
                    reason: string;
                    at: any;
                    status: string;
                }[];
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                };
            };
            agent_progress_summary: {
                schema: string;
                title: string;
                status: string;
                status_label: string;
                headline: string;
                rows: {
                    agent: string;
                    role: string;
                    status: string;
                    status_label: string;
                    summary: string;
                    current_focus: string;
                    evidence: any[];
                    files_changed_count: number;
                    verification_count: number;
                    blockers: string[];
                    next_action: string;
                }[];
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                };
            };
            change_summary: {
                schema: string;
                title: string;
                status: string;
                status_label: string;
                headline: string;
                file_count: number;
                additions: any;
                deletions: any;
                files: any[];
                agents: {
                    agent: string;
                    role: string;
                    file_count: number;
                    additions: any;
                    deletions: any;
                    files: any[];
                }[];
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                };
            };
            plan_alignment: {
                schema: string;
                title: string;
                status: string;
                status_label: string;
                headline: string;
                checks: any[];
                deviations: {
                    id: any;
                    label: any;
                    reason: any;
                }[];
                next_action: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                };
            };
            user_handoff: {
                schema: string;
                title: string;
                status: string;
                status_label: string;
                headline: string;
                primary_action: any;
                secondary_actions: any[];
                summary_cards: {
                    id: string;
                    label: string;
                    value: string;
                    tone: string;
                }[];
                evidence: string[];
                unresolved: string[];
                next_action: any;
                technical_hint: string;
                display_policy: {
                    user_text_first: boolean;
                    technical_default_collapsed: boolean;
                    hide_internal_protocols: boolean;
                    show_for_ordinary_conversation: boolean;
                };
            };
            post_review_spot_check: any;
            gap_fingerprint: string;
            entity_chain_endpoint: string;
            mainAgentDecision: {
                version: number;
                trace_id: any;
                group_id: any;
                task_id: any;
                message_id: string;
                coordinator: any;
                mode: string;
                decision: {
                    selected_actions: string[];
                    dispatch_policy: {
                        action: string;
                        reason: string;
                        nextStep: any;
                    };
                    reason: string;
                };
                internal_loop: {
                    version: number;
                    source: string;
                    pattern: string;
                    current_stage: string;
                    current_label: string;
                    progress: {
                        completed: number;
                        total: number;
                    };
                    stages: {
                        id: string;
                        label: string;
                        title: string;
                        status: string;
                        purpose: string;
                        actions: string[];
                        tool_choice: any;
                        evidence: string[];
                    }[];
                    next_action: string;
                };
                loop: {
                    version: number;
                    source: string;
                    pattern: string;
                    current_stage: string;
                    current_label: string;
                    progress: {
                        completed: number;
                        total: number;
                    };
                    stages: {
                        id: string;
                        label: string;
                        title: string;
                        status: string;
                        purpose: string;
                        actions: string[];
                        tool_choice: any;
                        evidence: string[];
                    }[];
                    next_action: string;
                };
                user_plan_steps: any;
                dispatch_launch_summary: {
                    schema: string;
                    title: string;
                    mode: string;
                    task_id: any;
                    headline: string;
                    rows: {
                        id: any;
                        agent: string;
                        role: string;
                        task: string;
                        reason: string;
                        depends_on: any;
                        status: string;
                        status_label: string;
                    }[];
                    acceptance: string[];
                    next_action: string;
                    technical_hint: string;
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                    };
                };
                dispatchLaunchSummary: {
                    schema: string;
                    title: string;
                    mode: string;
                    task_id: any;
                    headline: string;
                    rows: {
                        id: any;
                        agent: string;
                        role: string;
                        task: string;
                        reason: string;
                        depends_on: any;
                        status: string;
                        status_label: string;
                    }[];
                    acceptance: string[];
                    next_action: string;
                    technical_hint: string;
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                    };
                };
                display_stream: {
                    schema: string;
                    type: string;
                    user_visible: boolean;
                    user_visible_text: string;
                    text_message: {
                        type: string;
                        text: string;
                    };
                    tool_use_summary: {
                        type: string;
                        tool_summary: string;
                        counts: {
                            reads: number;
                            writes: number;
                            dispatches: number;
                            receipts: number;
                            verifications: number;
                            executions: number;
                        };
                        hidden_tool_uses: number;
                    };
                    workchain: {
                        schema: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        status: string;
                        phase: string;
                        user_visible_text: string;
                        stages: {
                            id: string;
                            label: string;
                            status: string;
                            summary: string;
                        }[];
                        todo_plan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        todoPlan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        progress_checkpoints: {
                            schema: string;
                            title: string;
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                raw_events_default_collapsed: boolean;
                            };
                            items: any[];
                        };
                        completion_summary: {
                            headline: string;
                            evidence: string[];
                            files: any[];
                            verification: string[];
                            acceptance: string[];
                            independent_review: string[];
                            independentReview: string[];
                            post_review_spot_check: any;
                            postReviewSpotCheck: any;
                            post_review_spot_check_summary: any;
                            postReviewSpotCheckSummary: any;
                            post_review_spot_check_gate: any;
                            postReviewSpotCheckGate: any;
                            post_review_spot_check_required: boolean;
                            post_review_spot_check_gate_passed: boolean;
                            risks: string[];
                            next_action: string;
                            verification_status: string;
                            risk_status: string;
                            final_summary_quality: {
                                schema: string;
                                required: boolean;
                                passed: boolean;
                                checks: {
                                    id: string;
                                    label: string;
                                    passed: boolean;
                                    detail: string;
                                }[];
                                missing: string[];
                                verification_status: string;
                                risk_status: string;
                                source: string;
                            };
                            quality_followup: {
                                schema: string;
                                title: string;
                                headline: string;
                                missing: string[];
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            qualityFollowup: {
                                schema: string;
                                title: string;
                                headline: string;
                                missing: string[];
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            todo_plan: {
                                schema: string;
                                source: string;
                                title: string;
                                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                                mode: string;
                                task_id: string;
                                run_id: string;
                                mission_id: string;
                                steps: any[];
                                current_step: any;
                                currentStep: any;
                                completed_count: number;
                                total_count: number;
                                progress_label: string;
                                visible_steps: any[];
                                visibleSteps: any[];
                                archived_steps_count: number;
                                archivedStepsCount: number;
                                archive_summary: string;
                                archiveSummary: string;
                                quality_followup_required: boolean;
                                qualityFollowupRequired: boolean;
                                quality_followup: any;
                                qualityFollowup: any;
                                verification_nudge: boolean;
                                verification_reminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                verificationReminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                display_policy: {
                                    user_visible: boolean;
                                    hide_for_ordinary_conversation: boolean;
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    quiet_completed: boolean;
                                    archive_completed_todo: boolean;
                                    archiveCompletedTodo: boolean;
                                    archived_when_complete: boolean;
                                    archivedWhenComplete: boolean;
                                    visible_when_completed: boolean;
                                    visibleWhenCompleted: boolean;
                                    max_visible_steps: number;
                                };
                            };
                            todoPlan: {
                                schema: string;
                                source: string;
                                title: string;
                                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                                mode: string;
                                task_id: string;
                                run_id: string;
                                mission_id: string;
                                steps: any[];
                                current_step: any;
                                currentStep: any;
                                completed_count: number;
                                total_count: number;
                                progress_label: string;
                                visible_steps: any[];
                                visibleSteps: any[];
                                archived_steps_count: number;
                                archivedStepsCount: number;
                                archive_summary: string;
                                archiveSummary: string;
                                quality_followup_required: boolean;
                                qualityFollowupRequired: boolean;
                                quality_followup: any;
                                qualityFollowup: any;
                                verification_nudge: boolean;
                                verification_reminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                verificationReminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                display_policy: {
                                    user_visible: boolean;
                                    hide_for_ordinary_conversation: boolean;
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    quiet_completed: boolean;
                                    archive_completed_todo: boolean;
                                    archiveCompletedTodo: boolean;
                                    archived_when_complete: boolean;
                                    archivedWhenComplete: boolean;
                                    visible_when_completed: boolean;
                                    visibleWhenCompleted: boolean;
                                    max_visible_steps: number;
                                };
                            };
                            terminal: boolean;
                        };
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            final_summary_required: boolean;
                        };
                        technical_details: {
                            id: string;
                            title: string;
                            items: any[];
                        }[];
                    };
                    completion_summary: {
                        headline: string;
                        evidence: string[];
                        files: any[];
                        verification: string[];
                        acceptance: string[];
                        independent_review: string[];
                        independentReview: string[];
                        post_review_spot_check: any;
                        postReviewSpotCheck: any;
                        post_review_spot_check_summary: any;
                        postReviewSpotCheckSummary: any;
                        post_review_spot_check_gate: any;
                        postReviewSpotCheckGate: any;
                        post_review_spot_check_required: boolean;
                        post_review_spot_check_gate_passed: boolean;
                        risks: string[];
                        next_action: string;
                        verification_status: string;
                        risk_status: string;
                        final_summary_quality: {
                            schema: string;
                            required: boolean;
                            passed: boolean;
                            checks: {
                                id: string;
                                label: string;
                                passed: boolean;
                                detail: string;
                            }[];
                            missing: string[];
                            verification_status: string;
                            risk_status: string;
                            source: string;
                        };
                        quality_followup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        qualityFollowup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        todo_plan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        todoPlan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        terminal: boolean;
                    };
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    progress_checkpoints: {
                        schema: string;
                        title: string;
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            raw_events_default_collapsed: boolean;
                        };
                        items: any[];
                    };
                    dispatch_launch_summary: any;
                    dispatchLaunchSummary: any;
                    delivery_report: any;
                    workchain_stages: {
                        id: string;
                        label: string;
                        status: string;
                        summary: string;
                    }[];
                    technical_details: {
                        id: string;
                        title: string;
                        items: any[];
                    }[];
                    raw_events: any[];
                    todo: {
                        visible: boolean;
                        surface: string;
                        tool_message_visible: boolean;
                        quiet_completed: boolean;
                    };
                    terminology: {
                        sanitized: boolean;
                        blocked_terms: string[];
                    };
                };
                displayStream: {
                    schema: string;
                    type: string;
                    user_visible: boolean;
                    user_visible_text: string;
                    text_message: {
                        type: string;
                        text: string;
                    };
                    tool_use_summary: {
                        type: string;
                        tool_summary: string;
                        counts: {
                            reads: number;
                            writes: number;
                            dispatches: number;
                            receipts: number;
                            verifications: number;
                            executions: number;
                        };
                        hidden_tool_uses: number;
                    };
                    workchain: {
                        schema: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        status: string;
                        phase: string;
                        user_visible_text: string;
                        stages: {
                            id: string;
                            label: string;
                            status: string;
                            summary: string;
                        }[];
                        todo_plan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        todoPlan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        progress_checkpoints: {
                            schema: string;
                            title: string;
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                raw_events_default_collapsed: boolean;
                            };
                            items: any[];
                        };
                        completion_summary: {
                            headline: string;
                            evidence: string[];
                            files: any[];
                            verification: string[];
                            acceptance: string[];
                            independent_review: string[];
                            independentReview: string[];
                            post_review_spot_check: any;
                            postReviewSpotCheck: any;
                            post_review_spot_check_summary: any;
                            postReviewSpotCheckSummary: any;
                            post_review_spot_check_gate: any;
                            postReviewSpotCheckGate: any;
                            post_review_spot_check_required: boolean;
                            post_review_spot_check_gate_passed: boolean;
                            risks: string[];
                            next_action: string;
                            verification_status: string;
                            risk_status: string;
                            final_summary_quality: {
                                schema: string;
                                required: boolean;
                                passed: boolean;
                                checks: {
                                    id: string;
                                    label: string;
                                    passed: boolean;
                                    detail: string;
                                }[];
                                missing: string[];
                                verification_status: string;
                                risk_status: string;
                                source: string;
                            };
                            quality_followup: {
                                schema: string;
                                title: string;
                                headline: string;
                                missing: string[];
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            qualityFollowup: {
                                schema: string;
                                title: string;
                                headline: string;
                                missing: string[];
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            todo_plan: {
                                schema: string;
                                source: string;
                                title: string;
                                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                                mode: string;
                                task_id: string;
                                run_id: string;
                                mission_id: string;
                                steps: any[];
                                current_step: any;
                                currentStep: any;
                                completed_count: number;
                                total_count: number;
                                progress_label: string;
                                visible_steps: any[];
                                visibleSteps: any[];
                                archived_steps_count: number;
                                archivedStepsCount: number;
                                archive_summary: string;
                                archiveSummary: string;
                                quality_followup_required: boolean;
                                qualityFollowupRequired: boolean;
                                quality_followup: any;
                                qualityFollowup: any;
                                verification_nudge: boolean;
                                verification_reminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                verificationReminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                display_policy: {
                                    user_visible: boolean;
                                    hide_for_ordinary_conversation: boolean;
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    quiet_completed: boolean;
                                    archive_completed_todo: boolean;
                                    archiveCompletedTodo: boolean;
                                    archived_when_complete: boolean;
                                    archivedWhenComplete: boolean;
                                    visible_when_completed: boolean;
                                    visibleWhenCompleted: boolean;
                                    max_visible_steps: number;
                                };
                            };
                            todoPlan: {
                                schema: string;
                                source: string;
                                title: string;
                                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                                mode: string;
                                task_id: string;
                                run_id: string;
                                mission_id: string;
                                steps: any[];
                                current_step: any;
                                currentStep: any;
                                completed_count: number;
                                total_count: number;
                                progress_label: string;
                                visible_steps: any[];
                                visibleSteps: any[];
                                archived_steps_count: number;
                                archivedStepsCount: number;
                                archive_summary: string;
                                archiveSummary: string;
                                quality_followup_required: boolean;
                                qualityFollowupRequired: boolean;
                                quality_followup: any;
                                qualityFollowup: any;
                                verification_nudge: boolean;
                                verification_reminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                verificationReminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                display_policy: {
                                    user_visible: boolean;
                                    hide_for_ordinary_conversation: boolean;
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    quiet_completed: boolean;
                                    archive_completed_todo: boolean;
                                    archiveCompletedTodo: boolean;
                                    archived_when_complete: boolean;
                                    archivedWhenComplete: boolean;
                                    visible_when_completed: boolean;
                                    visibleWhenCompleted: boolean;
                                    max_visible_steps: number;
                                };
                            };
                            terminal: boolean;
                        };
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            final_summary_required: boolean;
                        };
                        technical_details: {
                            id: string;
                            title: string;
                            items: any[];
                        }[];
                    };
                    completion_summary: {
                        headline: string;
                        evidence: string[];
                        files: any[];
                        verification: string[];
                        acceptance: string[];
                        independent_review: string[];
                        independentReview: string[];
                        post_review_spot_check: any;
                        postReviewSpotCheck: any;
                        post_review_spot_check_summary: any;
                        postReviewSpotCheckSummary: any;
                        post_review_spot_check_gate: any;
                        postReviewSpotCheckGate: any;
                        post_review_spot_check_required: boolean;
                        post_review_spot_check_gate_passed: boolean;
                        risks: string[];
                        next_action: string;
                        verification_status: string;
                        risk_status: string;
                        final_summary_quality: {
                            schema: string;
                            required: boolean;
                            passed: boolean;
                            checks: {
                                id: string;
                                label: string;
                                passed: boolean;
                                detail: string;
                            }[];
                            missing: string[];
                            verification_status: string;
                            risk_status: string;
                            source: string;
                        };
                        quality_followup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        qualityFollowup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        todo_plan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        todoPlan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        terminal: boolean;
                    };
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    progress_checkpoints: {
                        schema: string;
                        title: string;
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            raw_events_default_collapsed: boolean;
                        };
                        items: any[];
                    };
                    dispatch_launch_summary: any;
                    dispatchLaunchSummary: any;
                    delivery_report: any;
                    workchain_stages: {
                        id: string;
                        label: string;
                        status: string;
                        summary: string;
                    }[];
                    technical_details: {
                        id: string;
                        title: string;
                        items: any[];
                    }[];
                    raw_events: any[];
                    todo: {
                        visible: boolean;
                        surface: string;
                        tool_message_visible: boolean;
                        quiet_completed: boolean;
                    };
                    terminology: {
                        sanitized: boolean;
                        blocked_terms: string[];
                    };
                };
                todo_plan: any;
                verification_reminder: any;
                verificationReminder: any;
                permissions: {
                    action_id: string;
                    risk: string;
                    allowed: boolean;
                    reason: string;
                }[];
                observation: {
                    live_task_phase: string;
                    receipt_count: number;
                    acceptance_gate_passed: boolean;
                    needs_replan: boolean;
                };
                verify: {
                    passed: boolean;
                    blocked_actions: string[];
                    conclusion: string;
                };
                reply: {
                    kind: string;
                    message_id: string;
                    preview: any;
                };
                created_at: string;
            };
            main_agent_decision: {
                version: number;
                trace_id: any;
                group_id: any;
                task_id: any;
                message_id: string;
                coordinator: any;
                mode: string;
                decision: {
                    selected_actions: string[];
                    dispatch_policy: {
                        action: string;
                        reason: string;
                        nextStep: any;
                    };
                    reason: string;
                };
                internal_loop: {
                    version: number;
                    source: string;
                    pattern: string;
                    current_stage: string;
                    current_label: string;
                    progress: {
                        completed: number;
                        total: number;
                    };
                    stages: {
                        id: string;
                        label: string;
                        title: string;
                        status: string;
                        purpose: string;
                        actions: string[];
                        tool_choice: any;
                        evidence: string[];
                    }[];
                    next_action: string;
                };
                loop: {
                    version: number;
                    source: string;
                    pattern: string;
                    current_stage: string;
                    current_label: string;
                    progress: {
                        completed: number;
                        total: number;
                    };
                    stages: {
                        id: string;
                        label: string;
                        title: string;
                        status: string;
                        purpose: string;
                        actions: string[];
                        tool_choice: any;
                        evidence: string[];
                    }[];
                    next_action: string;
                };
                user_plan_steps: any;
                dispatch_launch_summary: {
                    schema: string;
                    title: string;
                    mode: string;
                    task_id: any;
                    headline: string;
                    rows: {
                        id: any;
                        agent: string;
                        role: string;
                        task: string;
                        reason: string;
                        depends_on: any;
                        status: string;
                        status_label: string;
                    }[];
                    acceptance: string[];
                    next_action: string;
                    technical_hint: string;
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                    };
                };
                dispatchLaunchSummary: {
                    schema: string;
                    title: string;
                    mode: string;
                    task_id: any;
                    headline: string;
                    rows: {
                        id: any;
                        agent: string;
                        role: string;
                        task: string;
                        reason: string;
                        depends_on: any;
                        status: string;
                        status_label: string;
                    }[];
                    acceptance: string[];
                    next_action: string;
                    technical_hint: string;
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                    };
                };
                display_stream: {
                    schema: string;
                    type: string;
                    user_visible: boolean;
                    user_visible_text: string;
                    text_message: {
                        type: string;
                        text: string;
                    };
                    tool_use_summary: {
                        type: string;
                        tool_summary: string;
                        counts: {
                            reads: number;
                            writes: number;
                            dispatches: number;
                            receipts: number;
                            verifications: number;
                            executions: number;
                        };
                        hidden_tool_uses: number;
                    };
                    workchain: {
                        schema: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        status: string;
                        phase: string;
                        user_visible_text: string;
                        stages: {
                            id: string;
                            label: string;
                            status: string;
                            summary: string;
                        }[];
                        todo_plan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        todoPlan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        progress_checkpoints: {
                            schema: string;
                            title: string;
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                raw_events_default_collapsed: boolean;
                            };
                            items: any[];
                        };
                        completion_summary: {
                            headline: string;
                            evidence: string[];
                            files: any[];
                            verification: string[];
                            acceptance: string[];
                            independent_review: string[];
                            independentReview: string[];
                            post_review_spot_check: any;
                            postReviewSpotCheck: any;
                            post_review_spot_check_summary: any;
                            postReviewSpotCheckSummary: any;
                            post_review_spot_check_gate: any;
                            postReviewSpotCheckGate: any;
                            post_review_spot_check_required: boolean;
                            post_review_spot_check_gate_passed: boolean;
                            risks: string[];
                            next_action: string;
                            verification_status: string;
                            risk_status: string;
                            final_summary_quality: {
                                schema: string;
                                required: boolean;
                                passed: boolean;
                                checks: {
                                    id: string;
                                    label: string;
                                    passed: boolean;
                                    detail: string;
                                }[];
                                missing: string[];
                                verification_status: string;
                                risk_status: string;
                                source: string;
                            };
                            quality_followup: {
                                schema: string;
                                title: string;
                                headline: string;
                                missing: string[];
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            qualityFollowup: {
                                schema: string;
                                title: string;
                                headline: string;
                                missing: string[];
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            todo_plan: {
                                schema: string;
                                source: string;
                                title: string;
                                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                                mode: string;
                                task_id: string;
                                run_id: string;
                                mission_id: string;
                                steps: any[];
                                current_step: any;
                                currentStep: any;
                                completed_count: number;
                                total_count: number;
                                progress_label: string;
                                visible_steps: any[];
                                visibleSteps: any[];
                                archived_steps_count: number;
                                archivedStepsCount: number;
                                archive_summary: string;
                                archiveSummary: string;
                                quality_followup_required: boolean;
                                qualityFollowupRequired: boolean;
                                quality_followup: any;
                                qualityFollowup: any;
                                verification_nudge: boolean;
                                verification_reminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                verificationReminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                display_policy: {
                                    user_visible: boolean;
                                    hide_for_ordinary_conversation: boolean;
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    quiet_completed: boolean;
                                    archive_completed_todo: boolean;
                                    archiveCompletedTodo: boolean;
                                    archived_when_complete: boolean;
                                    archivedWhenComplete: boolean;
                                    visible_when_completed: boolean;
                                    visibleWhenCompleted: boolean;
                                    max_visible_steps: number;
                                };
                            };
                            todoPlan: {
                                schema: string;
                                source: string;
                                title: string;
                                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                                mode: string;
                                task_id: string;
                                run_id: string;
                                mission_id: string;
                                steps: any[];
                                current_step: any;
                                currentStep: any;
                                completed_count: number;
                                total_count: number;
                                progress_label: string;
                                visible_steps: any[];
                                visibleSteps: any[];
                                archived_steps_count: number;
                                archivedStepsCount: number;
                                archive_summary: string;
                                archiveSummary: string;
                                quality_followup_required: boolean;
                                qualityFollowupRequired: boolean;
                                quality_followup: any;
                                qualityFollowup: any;
                                verification_nudge: boolean;
                                verification_reminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                verificationReminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                display_policy: {
                                    user_visible: boolean;
                                    hide_for_ordinary_conversation: boolean;
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    quiet_completed: boolean;
                                    archive_completed_todo: boolean;
                                    archiveCompletedTodo: boolean;
                                    archived_when_complete: boolean;
                                    archivedWhenComplete: boolean;
                                    visible_when_completed: boolean;
                                    visibleWhenCompleted: boolean;
                                    max_visible_steps: number;
                                };
                            };
                            terminal: boolean;
                        };
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            final_summary_required: boolean;
                        };
                        technical_details: {
                            id: string;
                            title: string;
                            items: any[];
                        }[];
                    };
                    completion_summary: {
                        headline: string;
                        evidence: string[];
                        files: any[];
                        verification: string[];
                        acceptance: string[];
                        independent_review: string[];
                        independentReview: string[];
                        post_review_spot_check: any;
                        postReviewSpotCheck: any;
                        post_review_spot_check_summary: any;
                        postReviewSpotCheckSummary: any;
                        post_review_spot_check_gate: any;
                        postReviewSpotCheckGate: any;
                        post_review_spot_check_required: boolean;
                        post_review_spot_check_gate_passed: boolean;
                        risks: string[];
                        next_action: string;
                        verification_status: string;
                        risk_status: string;
                        final_summary_quality: {
                            schema: string;
                            required: boolean;
                            passed: boolean;
                            checks: {
                                id: string;
                                label: string;
                                passed: boolean;
                                detail: string;
                            }[];
                            missing: string[];
                            verification_status: string;
                            risk_status: string;
                            source: string;
                        };
                        quality_followup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        qualityFollowup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        todo_plan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        todoPlan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        terminal: boolean;
                    };
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    progress_checkpoints: {
                        schema: string;
                        title: string;
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            raw_events_default_collapsed: boolean;
                        };
                        items: any[];
                    };
                    dispatch_launch_summary: any;
                    dispatchLaunchSummary: any;
                    delivery_report: any;
                    workchain_stages: {
                        id: string;
                        label: string;
                        status: string;
                        summary: string;
                    }[];
                    technical_details: {
                        id: string;
                        title: string;
                        items: any[];
                    }[];
                    raw_events: any[];
                    todo: {
                        visible: boolean;
                        surface: string;
                        tool_message_visible: boolean;
                        quiet_completed: boolean;
                    };
                    terminology: {
                        sanitized: boolean;
                        blocked_terms: string[];
                    };
                };
                displayStream: {
                    schema: string;
                    type: string;
                    user_visible: boolean;
                    user_visible_text: string;
                    text_message: {
                        type: string;
                        text: string;
                    };
                    tool_use_summary: {
                        type: string;
                        tool_summary: string;
                        counts: {
                            reads: number;
                            writes: number;
                            dispatches: number;
                            receipts: number;
                            verifications: number;
                            executions: number;
                        };
                        hidden_tool_uses: number;
                    };
                    workchain: {
                        schema: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        status: string;
                        phase: string;
                        user_visible_text: string;
                        stages: {
                            id: string;
                            label: string;
                            status: string;
                            summary: string;
                        }[];
                        todo_plan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        todoPlan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        progress_checkpoints: {
                            schema: string;
                            title: string;
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                raw_events_default_collapsed: boolean;
                            };
                            items: any[];
                        };
                        completion_summary: {
                            headline: string;
                            evidence: string[];
                            files: any[];
                            verification: string[];
                            acceptance: string[];
                            independent_review: string[];
                            independentReview: string[];
                            post_review_spot_check: any;
                            postReviewSpotCheck: any;
                            post_review_spot_check_summary: any;
                            postReviewSpotCheckSummary: any;
                            post_review_spot_check_gate: any;
                            postReviewSpotCheckGate: any;
                            post_review_spot_check_required: boolean;
                            post_review_spot_check_gate_passed: boolean;
                            risks: string[];
                            next_action: string;
                            verification_status: string;
                            risk_status: string;
                            final_summary_quality: {
                                schema: string;
                                required: boolean;
                                passed: boolean;
                                checks: {
                                    id: string;
                                    label: string;
                                    passed: boolean;
                                    detail: string;
                                }[];
                                missing: string[];
                                verification_status: string;
                                risk_status: string;
                                source: string;
                            };
                            quality_followup: {
                                schema: string;
                                title: string;
                                headline: string;
                                missing: string[];
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            qualityFollowup: {
                                schema: string;
                                title: string;
                                headline: string;
                                missing: string[];
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            todo_plan: {
                                schema: string;
                                source: string;
                                title: string;
                                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                                mode: string;
                                task_id: string;
                                run_id: string;
                                mission_id: string;
                                steps: any[];
                                current_step: any;
                                currentStep: any;
                                completed_count: number;
                                total_count: number;
                                progress_label: string;
                                visible_steps: any[];
                                visibleSteps: any[];
                                archived_steps_count: number;
                                archivedStepsCount: number;
                                archive_summary: string;
                                archiveSummary: string;
                                quality_followup_required: boolean;
                                qualityFollowupRequired: boolean;
                                quality_followup: any;
                                qualityFollowup: any;
                                verification_nudge: boolean;
                                verification_reminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                verificationReminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                display_policy: {
                                    user_visible: boolean;
                                    hide_for_ordinary_conversation: boolean;
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    quiet_completed: boolean;
                                    archive_completed_todo: boolean;
                                    archiveCompletedTodo: boolean;
                                    archived_when_complete: boolean;
                                    archivedWhenComplete: boolean;
                                    visible_when_completed: boolean;
                                    visibleWhenCompleted: boolean;
                                    max_visible_steps: number;
                                };
                            };
                            todoPlan: {
                                schema: string;
                                source: string;
                                title: string;
                                surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                                mode: string;
                                task_id: string;
                                run_id: string;
                                mission_id: string;
                                steps: any[];
                                current_step: any;
                                currentStep: any;
                                completed_count: number;
                                total_count: number;
                                progress_label: string;
                                visible_steps: any[];
                                visibleSteps: any[];
                                archived_steps_count: number;
                                archivedStepsCount: number;
                                archive_summary: string;
                                archiveSummary: string;
                                quality_followup_required: boolean;
                                qualityFollowupRequired: boolean;
                                quality_followup: any;
                                qualityFollowup: any;
                                verification_nudge: boolean;
                                verification_reminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                verificationReminder: {
                                    schema: string;
                                    status: string;
                                    title: string;
                                    headline: string;
                                    reason: string;
                                    next_action: string;
                                    display_policy: {
                                        user_text_first: boolean;
                                        technical_default_collapsed: boolean;
                                        hide_internal_protocols: boolean;
                                        show_for_ordinary_conversation: boolean;
                                    };
                                };
                                display_policy: {
                                    user_visible: boolean;
                                    hide_for_ordinary_conversation: boolean;
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    quiet_completed: boolean;
                                    archive_completed_todo: boolean;
                                    archiveCompletedTodo: boolean;
                                    archived_when_complete: boolean;
                                    archivedWhenComplete: boolean;
                                    visible_when_completed: boolean;
                                    visibleWhenCompleted: boolean;
                                    max_visible_steps: number;
                                };
                            };
                            terminal: boolean;
                        };
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            final_summary_required: boolean;
                        };
                        technical_details: {
                            id: string;
                            title: string;
                            items: any[];
                        }[];
                    };
                    completion_summary: {
                        headline: string;
                        evidence: string[];
                        files: any[];
                        verification: string[];
                        acceptance: string[];
                        independent_review: string[];
                        independentReview: string[];
                        post_review_spot_check: any;
                        postReviewSpotCheck: any;
                        post_review_spot_check_summary: any;
                        postReviewSpotCheckSummary: any;
                        post_review_spot_check_gate: any;
                        postReviewSpotCheckGate: any;
                        post_review_spot_check_required: boolean;
                        post_review_spot_check_gate_passed: boolean;
                        risks: string[];
                        next_action: string;
                        verification_status: string;
                        risk_status: string;
                        final_summary_quality: {
                            schema: string;
                            required: boolean;
                            passed: boolean;
                            checks: {
                                id: string;
                                label: string;
                                passed: boolean;
                                detail: string;
                            }[];
                            missing: string[];
                            verification_status: string;
                            risk_status: string;
                            source: string;
                        };
                        quality_followup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        qualityFollowup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        todo_plan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        todoPlan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        terminal: boolean;
                    };
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    progress_checkpoints: {
                        schema: string;
                        title: string;
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            raw_events_default_collapsed: boolean;
                        };
                        items: any[];
                    };
                    dispatch_launch_summary: any;
                    dispatchLaunchSummary: any;
                    delivery_report: any;
                    workchain_stages: {
                        id: string;
                        label: string;
                        status: string;
                        summary: string;
                    }[];
                    technical_details: {
                        id: string;
                        title: string;
                        items: any[];
                    }[];
                    raw_events: any[];
                    todo: {
                        visible: boolean;
                        surface: string;
                        tool_message_visible: boolean;
                        quiet_completed: boolean;
                    };
                    terminology: {
                        sanitized: boolean;
                        blocked_terms: string[];
                    };
                };
                todo_plan: any;
                verification_reminder: any;
                verificationReminder: any;
                permissions: {
                    action_id: string;
                    risk: string;
                    allowed: boolean;
                    reason: string;
                }[];
                observation: {
                    live_task_phase: string;
                    receipt_count: number;
                    acceptance_gate_passed: boolean;
                    needs_replan: boolean;
                };
                verify: {
                    passed: boolean;
                    blocked_actions: string[];
                    conclusion: string;
                };
                reply: {
                    kind: string;
                    message_id: string;
                    preview: any;
                };
                created_at: string;
            };
            runtime_kernel: any;
            display_stream: {
                schema: string;
                type: string;
                user_visible: boolean;
                user_visible_text: string;
                text_message: {
                    type: string;
                    text: string;
                };
                tool_use_summary: {
                    type: string;
                    tool_summary: string;
                    counts: {
                        reads: number;
                        writes: number;
                        dispatches: number;
                        receipts: number;
                        verifications: number;
                        executions: number;
                    };
                    hidden_tool_uses: number;
                };
                workchain: {
                    schema: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    status: string;
                    phase: string;
                    user_visible_text: string;
                    stages: {
                        id: string;
                        label: string;
                        status: string;
                        summary: string;
                    }[];
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    progress_checkpoints: {
                        schema: string;
                        title: string;
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            raw_events_default_collapsed: boolean;
                        };
                        items: any[];
                    };
                    completion_summary: {
                        headline: string;
                        evidence: string[];
                        files: any[];
                        verification: string[];
                        acceptance: string[];
                        independent_review: string[];
                        independentReview: string[];
                        post_review_spot_check: any;
                        postReviewSpotCheck: any;
                        post_review_spot_check_summary: any;
                        postReviewSpotCheckSummary: any;
                        post_review_spot_check_gate: any;
                        postReviewSpotCheckGate: any;
                        post_review_spot_check_required: boolean;
                        post_review_spot_check_gate_passed: boolean;
                        risks: string[];
                        next_action: string;
                        verification_status: string;
                        risk_status: string;
                        final_summary_quality: {
                            schema: string;
                            required: boolean;
                            passed: boolean;
                            checks: {
                                id: string;
                                label: string;
                                passed: boolean;
                                detail: string;
                            }[];
                            missing: string[];
                            verification_status: string;
                            risk_status: string;
                            source: string;
                        };
                        quality_followup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        qualityFollowup: {
                            schema: string;
                            title: string;
                            headline: string;
                            missing: string[];
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        todo_plan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        todoPlan: {
                            schema: string;
                            source: string;
                            title: string;
                            surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                            mode: string;
                            task_id: string;
                            run_id: string;
                            mission_id: string;
                            steps: any[];
                            current_step: any;
                            currentStep: any;
                            completed_count: number;
                            total_count: number;
                            progress_label: string;
                            visible_steps: any[];
                            visibleSteps: any[];
                            archived_steps_count: number;
                            archivedStepsCount: number;
                            archive_summary: string;
                            archiveSummary: string;
                            quality_followup_required: boolean;
                            qualityFollowupRequired: boolean;
                            quality_followup: any;
                            qualityFollowup: any;
                            verification_nudge: boolean;
                            verification_reminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            verificationReminder: {
                                schema: string;
                                status: string;
                                title: string;
                                headline: string;
                                reason: string;
                                next_action: string;
                                display_policy: {
                                    user_text_first: boolean;
                                    technical_default_collapsed: boolean;
                                    hide_internal_protocols: boolean;
                                    show_for_ordinary_conversation: boolean;
                                };
                            };
                            display_policy: {
                                user_visible: boolean;
                                hide_for_ordinary_conversation: boolean;
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                quiet_completed: boolean;
                                archive_completed_todo: boolean;
                                archiveCompletedTodo: boolean;
                                archived_when_complete: boolean;
                                archivedWhenComplete: boolean;
                                visible_when_completed: boolean;
                                visibleWhenCompleted: boolean;
                                max_visible_steps: number;
                            };
                        };
                        terminal: boolean;
                    };
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        final_summary_required: boolean;
                    };
                    technical_details: {
                        id: string;
                        title: string;
                        items: any[];
                    }[];
                };
                completion_summary: {
                    headline: string;
                    evidence: string[];
                    files: any[];
                    verification: string[];
                    acceptance: string[];
                    independent_review: string[];
                    independentReview: string[];
                    post_review_spot_check: any;
                    postReviewSpotCheck: any;
                    post_review_spot_check_summary: any;
                    postReviewSpotCheckSummary: any;
                    post_review_spot_check_gate: any;
                    postReviewSpotCheckGate: any;
                    post_review_spot_check_required: boolean;
                    post_review_spot_check_gate_passed: boolean;
                    risks: string[];
                    next_action: string;
                    verification_status: string;
                    risk_status: string;
                    final_summary_quality: {
                        schema: string;
                        required: boolean;
                        passed: boolean;
                        checks: {
                            id: string;
                            label: string;
                            passed: boolean;
                            detail: string;
                        }[];
                        missing: string[];
                        verification_status: string;
                        risk_status: string;
                        source: string;
                    };
                    quality_followup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    qualityFollowup: {
                        schema: string;
                        title: string;
                        headline: string;
                        missing: string[];
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    todo_plan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    todoPlan: {
                        schema: string;
                        source: string;
                        title: string;
                        surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                        mode: string;
                        task_id: string;
                        run_id: string;
                        mission_id: string;
                        steps: any[];
                        current_step: any;
                        currentStep: any;
                        completed_count: number;
                        total_count: number;
                        progress_label: string;
                        visible_steps: any[];
                        visibleSteps: any[];
                        archived_steps_count: number;
                        archivedStepsCount: number;
                        archive_summary: string;
                        archiveSummary: string;
                        quality_followup_required: boolean;
                        qualityFollowupRequired: boolean;
                        quality_followup: any;
                        qualityFollowup: any;
                        verification_nudge: boolean;
                        verification_reminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        verificationReminder: {
                            schema: string;
                            status: string;
                            title: string;
                            headline: string;
                            reason: string;
                            next_action: string;
                            display_policy: {
                                user_text_first: boolean;
                                technical_default_collapsed: boolean;
                                hide_internal_protocols: boolean;
                                show_for_ordinary_conversation: boolean;
                            };
                        };
                        display_policy: {
                            user_visible: boolean;
                            hide_for_ordinary_conversation: boolean;
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            quiet_completed: boolean;
                            archive_completed_todo: boolean;
                            archiveCompletedTodo: boolean;
                            archived_when_complete: boolean;
                            archivedWhenComplete: boolean;
                            visible_when_completed: boolean;
                            visibleWhenCompleted: boolean;
                            max_visible_steps: number;
                        };
                    };
                    terminal: boolean;
                };
                todo_plan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                todoPlan: {
                    schema: string;
                    source: string;
                    title: string;
                    surface: import("../../agents/workchain").MainAgentWorkchainSurface;
                    mode: string;
                    task_id: string;
                    run_id: string;
                    mission_id: string;
                    steps: any[];
                    current_step: any;
                    currentStep: any;
                    completed_count: number;
                    total_count: number;
                    progress_label: string;
                    visible_steps: any[];
                    visibleSteps: any[];
                    archived_steps_count: number;
                    archivedStepsCount: number;
                    archive_summary: string;
                    archiveSummary: string;
                    quality_followup_required: boolean;
                    qualityFollowupRequired: boolean;
                    quality_followup: any;
                    qualityFollowup: any;
                    verification_nudge: boolean;
                    verification_reminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    verificationReminder: {
                        schema: string;
                        status: string;
                        title: string;
                        headline: string;
                        reason: string;
                        next_action: string;
                        display_policy: {
                            user_text_first: boolean;
                            technical_default_collapsed: boolean;
                            hide_internal_protocols: boolean;
                            show_for_ordinary_conversation: boolean;
                        };
                    };
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        quiet_completed: boolean;
                        archive_completed_todo: boolean;
                        archiveCompletedTodo: boolean;
                        archived_when_complete: boolean;
                        archivedWhenComplete: boolean;
                        visible_when_completed: boolean;
                        visibleWhenCompleted: boolean;
                        max_visible_steps: number;
                    };
                };
                verification_reminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                verificationReminder: {
                    schema: string;
                    status: string;
                    title: string;
                    headline: string;
                    reason: string;
                    next_action: string;
                    display_policy: {
                        user_text_first: boolean;
                        technical_default_collapsed: boolean;
                        hide_internal_protocols: boolean;
                        show_for_ordinary_conversation: boolean;
                    };
                };
                progress_checkpoints: {
                    schema: string;
                    title: string;
                    display_policy: {
                        user_visible: boolean;
                        hide_for_ordinary_conversation: boolean;
                        raw_events_default_collapsed: boolean;
                    };
                    items: any[];
                };
                dispatch_launch_summary: any;
                dispatchLaunchSummary: any;
                delivery_report: any;
                workchain_stages: {
                    id: string;
                    label: string;
                    status: string;
                    summary: string;
                }[];
                technical_details: {
                    id: string;
                    title: string;
                    items: any[];
                }[];
                raw_events: any[];
                todo: {
                    visible: boolean;
                    surface: string;
                    tool_message_visible: boolean;
                    quiet_completed: boolean;
                };
                terminology: {
                    sanitized: boolean;
                    blocked_terms: string[];
                };
            };
        };
        updated_at: any;
    };
    report: string;
};
export declare function runMemoryDispatchGateReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        goodReceiptPassesGate: boolean;
        ignoredReceiptCanSatisfyGate: boolean;
        missingGateHardFailsQuality: boolean;
        deliverySummaryRecordsGate: any;
        acceptanceGateBlocksMissingGate: any;
        goodDeliverySummaryPassesGate: boolean;
    };
    good: {
        score: number;
        grade: string;
        memoryGate: {
            schema: string;
            required: boolean;
            pass: boolean;
            gate_ids: any;
            missing_gate_ids: any;
            declared: boolean;
            used: any;
            ignored: any;
        } | {
            pass: boolean;
            missing_gate_ids: any[];
            proven_by_memory_context_snapshot: boolean;
            schema: string;
            required: boolean;
            gate_ids: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
    missing: {
        score: number;
        grade: string;
        memoryGate: {
            schema: string;
            required: boolean;
            pass: boolean;
            gate_ids: any;
            missing_gate_ids: any;
            declared: boolean;
            used: any;
            ignored: any;
        } | {
            pass: boolean;
            missing_gate_ids: any[];
            proven_by_memory_context_snapshot: boolean;
            schema: string;
            required: boolean;
            gate_ids: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
};
export declare function runPressureMemoryProvenanceReceiptUsageSelfTest(): {
    pass: boolean;
    checks: {
        receiptParserKeepsStructuredProvenance: boolean;
        collectionPrefersStructuredProvenance: boolean;
        ledgerPersistsProvenance: boolean;
        statsAggregateProvenance: boolean;
    };
    receipt: {
        memoryProvenanceUsage: any;
    };
    rows: any[];
    ledger: {
        entry: any;
        stat: any;
    };
};
export declare function runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        snapshotPersistedOnSession: any;
        deliverySummaryCollectsGateFromSessionSnapshot: boolean;
        goodReceiptMatchesExactSnapshot: boolean;
        goodDeliveryPassesMemoryGate: boolean;
        wrongSessionFailsSnapshotGate: boolean;
        wrongSessionBlocksAcceptance: any;
        forgedFactCitationBlocksAcceptance: boolean;
        foreignSourceMessageCitationBlocksAcceptance: boolean;
        runtimeKernelShowsSnapshotMismatch: boolean;
    };
    snapshot: {
        schema: any;
        snapshot_id: any;
        snapshot_file: any;
        checksum: any;
        generated_at: any;
        task_agent_session_id: any;
        task_id: any;
        group_id: any;
        project: any;
        agent_type: any;
        native_session_id: any;
        turn: number;
        worker_context_packet_id: any;
        worker_handoff_id: any;
        memory_context_checksum: any;
        rendered_prompt_checksum: any;
        group_session_memory_binding: any;
        group_session_id: any;
        group_session_scope_id: any;
        session_memory_checksum: any;
        memory_binding_id: any;
        model_extraction_execution_id: any;
        model_extraction_receipt_checksum: any;
        model_extraction_history_head_checksum: any;
        model_extraction_replay_status: any;
        model_extraction_replay_execution_id: any;
        model_extraction_evidence_valid: boolean;
        fact_supersession_graph_checksum: any;
        fact_supersession_graph_valid: boolean;
        session_lifecycle_fence_required: boolean;
        session_lifecycle_fence_valid: boolean;
        session_lifecycle_status: any;
        session_lifecycle_generation: number;
        session_lifecycle_head_id: any;
        session_lifecycle_head_checksum: any;
        active_fact_count: any;
        delivery_receipt: any;
        delivery_receipt_checksum_valid: boolean;
        memory_context_delivered: boolean;
        gate_ids: string[];
        replay_repair_dispatch_brief_ids: any[];
        replay_repair_dispatch_briefs: any[];
    };
    good: any;
    wrong: any;
    wrongCitation: any;
    wrongSourceMessage: any;
};
export declare function runGlobalMemoryUsageReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        goodReceiptPassesGlobalMemoryGate: boolean;
        missingGlobalMemoryHardFailsQuality: boolean;
        unsafeBackgroundUseHardFailsQuality: boolean;
        deliverySummaryRecordsMissingGlobalMemory: boolean;
        acceptanceGateBlocksMissingGlobalMemory: any;
        runtimeKernelShowsGlobalMemoryGap: boolean;
        unsafeSummaryShowsUnsafeUse: any;
        goodDeliverySummaryPassesGate: boolean;
    };
    good: {
        score: number;
        grade: string;
        globalMemoryGate: {
            schema: string;
            required: boolean;
            pass: any;
            gate_ids: any;
            global_memory_ids: string[];
            missing_global_memory_ids: string[];
            missing_usage_state_ids: string[];
            unsafe_used_global_memory_ids: string[];
            missing_current_verification_ids: string[];
            missing_semantic_acknowledgement_ids: string[];
            missing_cross_group_acknowledgement_ids: string[];
            used_global_memory_ids: string[];
            ignored_global_memory_ids: string[];
            verified_global_memory_ids: string[];
            background_global_memory_ids: string[];
            advisory_global_memory_ids: string[];
            rows: any;
            structured_usage_rows: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
    missing: {
        score: number;
        grade: string;
        globalMemoryGate: {
            schema: string;
            required: boolean;
            pass: any;
            gate_ids: any;
            global_memory_ids: string[];
            missing_global_memory_ids: string[];
            missing_usage_state_ids: string[];
            unsafe_used_global_memory_ids: string[];
            missing_current_verification_ids: string[];
            missing_semantic_acknowledgement_ids: string[];
            missing_cross_group_acknowledgement_ids: string[];
            used_global_memory_ids: string[];
            ignored_global_memory_ids: string[];
            verified_global_memory_ids: string[];
            background_global_memory_ids: string[];
            advisory_global_memory_ids: string[];
            rows: any;
            structured_usage_rows: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
    unsafe: {
        score: number;
        grade: string;
        globalMemoryGate: {
            schema: string;
            required: boolean;
            pass: any;
            gate_ids: any;
            global_memory_ids: string[];
            missing_global_memory_ids: string[];
            missing_usage_state_ids: string[];
            unsafe_used_global_memory_ids: string[];
            missing_current_verification_ids: string[];
            missing_semantic_acknowledgement_ids: string[];
            missing_cross_group_acknowledgement_ids: string[];
            used_global_memory_ids: string[];
            ignored_global_memory_ids: string[];
            verified_global_memory_ids: string[];
            background_global_memory_ids: string[];
            advisory_global_memory_ids: string[];
            rows: any;
            structured_usage_rows: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
};
export declare function runGlobalMemoryHealthGateReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        goodReceiptPassesHealthGate: any;
        missingHealthGateHardFailsQuality: boolean;
        unsafeBlockedGlobalMemoryUseHardFails: any;
        warnGateRequiresAcknowledgement: any;
        deliverySummaryRecordsMissingHealthGate: boolean;
        acceptanceGateBlocksMissingHealthGate: any;
        runtimeKernelShowsHealthGateGap: boolean;
        unsafeSummaryShowsBlockedMemoryUse: any;
        goodDeliverySummaryPassesHealthGate: boolean;
    };
    good: {
        score: number;
        grade: string;
        healthGate: {
            schema: string;
            required: boolean;
            pass: any;
            gate_ids: any;
            missing_gate_ids: any;
            fail_gate_ids: any;
            warn_gate_ids: any;
            missing_ignore_gate_ids: any;
            missing_warning_ack_gate_ids: any;
            blocked_global_memory_used_gate_ids: any;
            rows: any;
            declared: boolean;
            used: any;
            ignored: any;
        } | {
            pass: boolean;
            missing_gate_ids: any[];
            proven_by_memory_context_snapshot: boolean;
            rows: any;
            schema: string;
            required: boolean;
            gate_ids: any;
            fail_gate_ids: any;
            warn_gate_ids: any;
            missing_ignore_gate_ids: any;
            missing_warning_ack_gate_ids: any;
            blocked_global_memory_used_gate_ids: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
    missing: {
        score: number;
        grade: string;
        healthGate: {
            schema: string;
            required: boolean;
            pass: any;
            gate_ids: any;
            missing_gate_ids: any;
            fail_gate_ids: any;
            warn_gate_ids: any;
            missing_ignore_gate_ids: any;
            missing_warning_ack_gate_ids: any;
            blocked_global_memory_used_gate_ids: any;
            rows: any;
            declared: boolean;
            used: any;
            ignored: any;
        } | {
            pass: boolean;
            missing_gate_ids: any[];
            proven_by_memory_context_snapshot: boolean;
            rows: any;
            schema: string;
            required: boolean;
            gate_ids: any;
            fail_gate_ids: any;
            warn_gate_ids: any;
            missing_ignore_gate_ids: any;
            missing_warning_ack_gate_ids: any;
            blocked_global_memory_used_gate_ids: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
    unsafe: {
        score: number;
        grade: string;
        healthGate: {
            schema: string;
            required: boolean;
            pass: any;
            gate_ids: any;
            missing_gate_ids: any;
            fail_gate_ids: any;
            warn_gate_ids: any;
            missing_ignore_gate_ids: any;
            missing_warning_ack_gate_ids: any;
            blocked_global_memory_used_gate_ids: any;
            rows: any;
            declared: boolean;
            used: any;
            ignored: any;
        } | {
            pass: boolean;
            missing_gate_ids: any[];
            proven_by_memory_context_snapshot: boolean;
            rows: any;
            schema: string;
            required: boolean;
            gate_ids: any;
            fail_gate_ids: any;
            warn_gate_ids: any;
            missing_ignore_gate_ids: any;
            missing_warning_ack_gate_ids: any;
            blocked_global_memory_used_gate_ids: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
    warn: {
        score: number;
        grade: string;
        healthGate: {
            schema: string;
            required: boolean;
            pass: any;
            gate_ids: any;
            missing_gate_ids: any;
            fail_gate_ids: any;
            warn_gate_ids: any;
            missing_ignore_gate_ids: any;
            missing_warning_ack_gate_ids: any;
            blocked_global_memory_used_gate_ids: any;
            rows: any;
            declared: boolean;
            used: any;
            ignored: any;
        } | {
            pass: boolean;
            missing_gate_ids: any[];
            proven_by_memory_context_snapshot: boolean;
            rows: any;
            schema: string;
            required: boolean;
            gate_ids: any;
            fail_gate_ids: any;
            warn_gate_ids: any;
            missing_ignore_gate_ids: any;
            missing_warning_ack_gate_ids: any;
            blocked_global_memory_used_gate_ids: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
};
export declare function runReadPlanRevalidationGateReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        goodReceiptPassesGate: boolean;
        wrongSessionHardFailsQuality: boolean;
        missingCurrentSourceHardFailsQuality: boolean;
        uniqueGateSessionBoundShorthandPasses: boolean;
        shorthandStillFailsWrongSession: boolean;
        uniqueGateSessionBoundCurrentSourceActionPasses: boolean;
        currentSourceActionStillFailsWrongSession: boolean;
        boundCurrentDiffEvidencePasses: boolean;
        currentDiffEvidenceStillFailsWrongSession: boolean;
        latestSessionTurnSupersedesOlderReadPlanGate: boolean;
        deliverySummaryRecordsGate: boolean;
        acceptanceGateBlocksWrongSession: any;
        runtimeKernelShowsWrongSession: boolean;
        goodDeliverySummaryPassesGate: boolean;
    };
    good: {
        score: number;
        grade: string;
        readPlanRevalidationGate: {
            schema: string;
            required: boolean;
            pass: boolean;
            gate_ids: any;
            missing_gate_ids: any;
            missing_read_plan_ids: string[];
            session_required: any;
            session_matched: any;
            session_mismatch_gate_ids: any;
            current_source_verified: any;
            ignored_with_reason: any;
            rows: any;
            declared: boolean;
            structured_usage_rows: any;
            used: any;
            ignored: any;
        };
    };
    wrongSession: {
        score: number;
        grade: string;
        readPlanRevalidationGate: {
            schema: string;
            required: boolean;
            pass: boolean;
            gate_ids: any;
            missing_gate_ids: any;
            missing_read_plan_ids: string[];
            session_required: any;
            session_matched: any;
            session_mismatch_gate_ids: any;
            current_source_verified: any;
            ignored_with_reason: any;
            rows: any;
            declared: boolean;
            structured_usage_rows: any;
            used: any;
            ignored: any;
        };
    };
    missingCurrentSource: {
        score: number;
        grade: string;
        readPlanRevalidationGate: {
            schema: string;
            required: boolean;
            pass: boolean;
            gate_ids: any;
            missing_gate_ids: any;
            missing_read_plan_ids: string[];
            session_required: any;
            session_matched: any;
            session_mismatch_gate_ids: any;
            current_source_verified: any;
            ignored_with_reason: any;
            rows: any;
            declared: boolean;
            structured_usage_rows: any;
            used: any;
            ignored: any;
        };
    };
    boundShorthand: {
        score: number;
        grade: string;
        readPlanRevalidationGate: {
            schema: string;
            required: boolean;
            pass: boolean;
            gate_ids: any;
            missing_gate_ids: any;
            missing_read_plan_ids: string[];
            session_required: any;
            session_matched: any;
            session_mismatch_gate_ids: any;
            current_source_verified: any;
            ignored_with_reason: any;
            rows: any;
            declared: boolean;
            structured_usage_rows: any;
            used: any;
            ignored: any;
        };
    };
};
export declare function runApiMicrocompactReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        goodReceiptPassesApiMicrocompactGate: boolean;
        ignoredReceiptPassesAsDeclaredNotSupported: boolean;
        missingReceiptHardFailsQuality: boolean;
        unsafeNativeApplyHardFailsQuality: any;
        nativeApplyPassesWithBoundChecksums: boolean;
        nativeApplyMissingChecksumsHardFails: any;
        sessionBoundApiMicrocompactReceiptPasses: boolean;
        wrongSessionApiMicrocompactReceiptFails: any;
        deliverySummaryRecordsMissingApiMicrocompact: boolean;
        acceptanceGateBlocksMissingApiMicrocompact: any;
        runtimeKernelShowsApiMicrocompactGap: boolean;
        goodDeliverySummaryPassesApiMicrocompact: boolean;
    };
    good: {
        score: number;
        grade: string;
        apiMicrocompact: {
            schema: string;
            required: boolean;
            pass: boolean;
            plan_checksums: any;
            missing_plan_checksums: any;
            unsafe_native_applied_plan_checksums: any;
            session_mismatch_plan_checksums: any;
            native_applied_count: any;
            advisory_count: any;
            ignored_count: any;
            rows: any;
            declared: boolean;
            structured_usage_rows: {
                plan_checksum: string;
                apply_plan_checksum: string;
                request_patch_checksum: string;
                task_agent_session_id: string;
                native_session_id: string;
                memory_context_snapshot_id: string;
                memory_context_snapshot_checksum: string;
                usage_state: string;
                native_applied: boolean;
                advisory_only: boolean;
                reason: string;
                raw: any;
            }[];
            used: any;
            ignored: any;
        };
    };
    missing: {
        score: number;
        grade: string;
        apiMicrocompact: {
            schema: string;
            required: boolean;
            pass: boolean;
            plan_checksums: any;
            missing_plan_checksums: any;
            unsafe_native_applied_plan_checksums: any;
            session_mismatch_plan_checksums: any;
            native_applied_count: any;
            advisory_count: any;
            ignored_count: any;
            rows: any;
            declared: boolean;
            structured_usage_rows: {
                plan_checksum: string;
                apply_plan_checksum: string;
                request_patch_checksum: string;
                task_agent_session_id: string;
                native_session_id: string;
                memory_context_snapshot_id: string;
                memory_context_snapshot_checksum: string;
                usage_state: string;
                native_applied: boolean;
                advisory_only: boolean;
                reason: string;
                raw: any;
            }[];
            used: any;
            ignored: any;
        };
    };
    unsafe: {
        score: number;
        grade: string;
        apiMicrocompact: {
            schema: string;
            required: boolean;
            pass: boolean;
            plan_checksums: any;
            missing_plan_checksums: any;
            unsafe_native_applied_plan_checksums: any;
            session_mismatch_plan_checksums: any;
            native_applied_count: any;
            advisory_count: any;
            ignored_count: any;
            rows: any;
            declared: boolean;
            structured_usage_rows: {
                plan_checksum: string;
                apply_plan_checksum: string;
                request_patch_checksum: string;
                task_agent_session_id: string;
                native_session_id: string;
                memory_context_snapshot_id: string;
                memory_context_snapshot_checksum: string;
                usage_state: string;
                native_applied: boolean;
                advisory_only: boolean;
                reason: string;
                raw: any;
            }[];
            used: any;
            ignored: any;
        };
    };
    native: {
        score: number;
        grade: string;
        apiMicrocompact: {
            schema: string;
            required: boolean;
            pass: boolean;
            plan_checksums: any;
            missing_plan_checksums: any;
            unsafe_native_applied_plan_checksums: any;
            session_mismatch_plan_checksums: any;
            native_applied_count: any;
            advisory_count: any;
            ignored_count: any;
            rows: any;
            declared: boolean;
            structured_usage_rows: {
                plan_checksum: string;
                apply_plan_checksum: string;
                request_patch_checksum: string;
                task_agent_session_id: string;
                native_session_id: string;
                memory_context_snapshot_id: string;
                memory_context_snapshot_checksum: string;
                usage_state: string;
                native_applied: boolean;
                advisory_only: boolean;
                reason: string;
                raw: any;
            }[];
            used: any;
            ignored: any;
        };
    };
    nativeMissingChecksum: {
        score: number;
        grade: string;
        apiMicrocompact: {
            schema: string;
            required: boolean;
            pass: boolean;
            plan_checksums: any;
            missing_plan_checksums: any;
            unsafe_native_applied_plan_checksums: any;
            session_mismatch_plan_checksums: any;
            native_applied_count: any;
            advisory_count: any;
            ignored_count: any;
            rows: any;
            declared: boolean;
            structured_usage_rows: {
                plan_checksum: string;
                apply_plan_checksum: string;
                request_patch_checksum: string;
                task_agent_session_id: string;
                native_session_id: string;
                memory_context_snapshot_id: string;
                memory_context_snapshot_checksum: string;
                usage_state: string;
                native_applied: boolean;
                advisory_only: boolean;
                reason: string;
                raw: any;
            }[];
            used: any;
            ignored: any;
        };
    };
    sessionBound: {
        score: number;
        grade: string;
        apiMicrocompact: {
            schema: string;
            required: boolean;
            pass: boolean;
            plan_checksums: any;
            missing_plan_checksums: any;
            unsafe_native_applied_plan_checksums: any;
            session_mismatch_plan_checksums: any;
            native_applied_count: any;
            advisory_count: any;
            ignored_count: any;
            rows: any;
            declared: boolean;
            structured_usage_rows: {
                plan_checksum: string;
                apply_plan_checksum: string;
                request_patch_checksum: string;
                task_agent_session_id: string;
                native_session_id: string;
                memory_context_snapshot_id: string;
                memory_context_snapshot_checksum: string;
                usage_state: string;
                native_applied: boolean;
                advisory_only: boolean;
                reason: string;
                raw: any;
            }[];
            used: any;
            ignored: any;
        };
    };
    wrongSession: {
        score: number;
        grade: string;
        apiMicrocompact: {
            schema: string;
            required: boolean;
            pass: boolean;
            plan_checksums: any;
            missing_plan_checksums: any;
            unsafe_native_applied_plan_checksums: any;
            session_mismatch_plan_checksums: any;
            native_applied_count: any;
            advisory_count: any;
            ignored_count: any;
            rows: any;
            declared: boolean;
            structured_usage_rows: {
                plan_checksum: string;
                apply_plan_checksum: string;
                request_patch_checksum: string;
                task_agent_session_id: string;
                native_session_id: string;
                memory_context_snapshot_id: string;
                memory_context_snapshot_checksum: string;
                usage_state: string;
                native_applied: boolean;
                advisory_only: boolean;
                reason: string;
                raw: any;
            }[];
            used: any;
            ignored: any;
        };
    };
    ignored: {
        score: number;
        grade: string;
        apiMicrocompact: {
            schema: string;
            required: boolean;
            pass: boolean;
            plan_checksums: any;
            missing_plan_checksums: any;
            unsafe_native_applied_plan_checksums: any;
            session_mismatch_plan_checksums: any;
            native_applied_count: any;
            advisory_count: any;
            ignored_count: any;
            rows: any;
            declared: boolean;
            structured_usage_rows: {
                plan_checksum: string;
                apply_plan_checksum: string;
                request_patch_checksum: string;
                task_agent_session_id: string;
                native_session_id: string;
                memory_context_snapshot_id: string;
                memory_context_snapshot_checksum: string;
                usage_state: string;
                native_applied: boolean;
                advisory_only: boolean;
                reason: string;
                raw: any;
            }[];
            used: any;
            ignored: any;
        };
    };
};
export declare function runPostCompactReinjectionGateReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        goodReceiptPassesGate: boolean;
        ignoredReceiptCanSatisfyGate: boolean;
        structuredCandidateUsagePassesGate: boolean;
        partialCandidateUsageHardFailsStrictGate: boolean;
        missingGateHardFailsQuality: boolean;
        missingCandidateHardFailsQuality: boolean;
        missingUsageHardFailsQuality: boolean;
        deliverySummaryRecordsGate: any;
        acceptanceGateBlocksMissingGate: any;
        visibleSummaryRecordsCandidateCount: boolean;
        visibleSummaryRecordsMissingUsage: boolean;
        goodDeliverySummaryPassesGate: boolean;
    };
    good: {
        score: number;
        grade: string;
        reinjectionGate: {
            schema: string;
            required: boolean;
            pass: boolean;
            gate_ids: any;
            missing_gate_ids: any;
            candidate_count: any;
            candidate_reference_required: any;
            candidate_reference_passed: any;
            candidate_usage_required: any;
            candidate_usage_declared_passed: any;
            candidate_usage_strict_required: any;
            candidate_usage_strict_passed: any;
            referenced_candidate_ids: string[];
            all_candidates_declared: any;
            missing_candidate_reference_gate_ids: any;
            missing_candidate_usage_gate_ids: any;
            missing_candidate_usage_candidate_ids: string[];
            candidate_usage_rows: any;
            candidate_usage_counts: {
                used: any;
                ignored: any;
                verified: any;
                mentioned: any;
                unreferenced: any;
            };
            used_candidate_ids: string[];
            ignored_candidate_ids: string[];
            verified_candidate_ids: string[];
            mentioned_only_candidate_ids: string[];
            unreferenced_candidate_ids: string[];
            structured_candidate_usage_rows: {
                gate_id: string;
                candidate_id: string;
                kind: string;
                value: string;
                usage_state: string;
                reason: string;
                raw: any;
            }[];
            candidate_rows: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
    structuredGood: {
        score: number;
        grade: string;
        reinjectionGate: {
            schema: string;
            required: boolean;
            pass: boolean;
            gate_ids: any;
            missing_gate_ids: any;
            candidate_count: any;
            candidate_reference_required: any;
            candidate_reference_passed: any;
            candidate_usage_required: any;
            candidate_usage_declared_passed: any;
            candidate_usage_strict_required: any;
            candidate_usage_strict_passed: any;
            referenced_candidate_ids: string[];
            all_candidates_declared: any;
            missing_candidate_reference_gate_ids: any;
            missing_candidate_usage_gate_ids: any;
            missing_candidate_usage_candidate_ids: string[];
            candidate_usage_rows: any;
            candidate_usage_counts: {
                used: any;
                ignored: any;
                verified: any;
                mentioned: any;
                unreferenced: any;
            };
            used_candidate_ids: string[];
            ignored_candidate_ids: string[];
            verified_candidate_ids: string[];
            mentioned_only_candidate_ids: string[];
            unreferenced_candidate_ids: string[];
            structured_candidate_usage_rows: {
                gate_id: string;
                candidate_id: string;
                kind: string;
                value: string;
                usage_state: string;
                reason: string;
                raw: any;
            }[];
            candidate_rows: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
    missing: {
        score: number;
        grade: string;
        reinjectionGate: {
            schema: string;
            required: boolean;
            pass: boolean;
            gate_ids: any;
            missing_gate_ids: any;
            candidate_count: any;
            candidate_reference_required: any;
            candidate_reference_passed: any;
            candidate_usage_required: any;
            candidate_usage_declared_passed: any;
            candidate_usage_strict_required: any;
            candidate_usage_strict_passed: any;
            referenced_candidate_ids: string[];
            all_candidates_declared: any;
            missing_candidate_reference_gate_ids: any;
            missing_candidate_usage_gate_ids: any;
            missing_candidate_usage_candidate_ids: string[];
            candidate_usage_rows: any;
            candidate_usage_counts: {
                used: any;
                ignored: any;
                verified: any;
                mentioned: any;
                unreferenced: any;
            };
            used_candidate_ids: string[];
            ignored_candidate_ids: string[];
            verified_candidate_ids: string[];
            mentioned_only_candidate_ids: string[];
            unreferenced_candidate_ids: string[];
            structured_candidate_usage_rows: {
                gate_id: string;
                candidate_id: string;
                kind: string;
                value: string;
                usage_state: string;
                reason: string;
                raw: any;
            }[];
            candidate_rows: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
    missingCandidate: {
        score: number;
        grade: string;
        reinjectionGate: {
            schema: string;
            required: boolean;
            pass: boolean;
            gate_ids: any;
            missing_gate_ids: any;
            candidate_count: any;
            candidate_reference_required: any;
            candidate_reference_passed: any;
            candidate_usage_required: any;
            candidate_usage_declared_passed: any;
            candidate_usage_strict_required: any;
            candidate_usage_strict_passed: any;
            referenced_candidate_ids: string[];
            all_candidates_declared: any;
            missing_candidate_reference_gate_ids: any;
            missing_candidate_usage_gate_ids: any;
            missing_candidate_usage_candidate_ids: string[];
            candidate_usage_rows: any;
            candidate_usage_counts: {
                used: any;
                ignored: any;
                verified: any;
                mentioned: any;
                unreferenced: any;
            };
            used_candidate_ids: string[];
            ignored_candidate_ids: string[];
            verified_candidate_ids: string[];
            mentioned_only_candidate_ids: string[];
            unreferenced_candidate_ids: string[];
            structured_candidate_usage_rows: {
                gate_id: string;
                candidate_id: string;
                kind: string;
                value: string;
                usage_state: string;
                reason: string;
                raw: any;
            }[];
            candidate_rows: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
    missingUsage: {
        score: number;
        grade: string;
        reinjectionGate: {
            schema: string;
            required: boolean;
            pass: boolean;
            gate_ids: any;
            missing_gate_ids: any;
            candidate_count: any;
            candidate_reference_required: any;
            candidate_reference_passed: any;
            candidate_usage_required: any;
            candidate_usage_declared_passed: any;
            candidate_usage_strict_required: any;
            candidate_usage_strict_passed: any;
            referenced_candidate_ids: string[];
            all_candidates_declared: any;
            missing_candidate_reference_gate_ids: any;
            missing_candidate_usage_gate_ids: any;
            missing_candidate_usage_candidate_ids: string[];
            candidate_usage_rows: any;
            candidate_usage_counts: {
                used: any;
                ignored: any;
                verified: any;
                mentioned: any;
                unreferenced: any;
            };
            used_candidate_ids: string[];
            ignored_candidate_ids: string[];
            verified_candidate_ids: string[];
            mentioned_only_candidate_ids: string[];
            unreferenced_candidate_ids: string[];
            structured_candidate_usage_rows: {
                gate_id: string;
                candidate_id: string;
                kind: string;
                value: string;
                usage_state: string;
                reason: string;
                raw: any;
            }[];
            candidate_rows: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
    partialUsage: {
        score: number;
        grade: string;
        reinjectionGate: {
            schema: string;
            required: boolean;
            pass: boolean;
            gate_ids: any;
            missing_gate_ids: any;
            candidate_count: any;
            candidate_reference_required: any;
            candidate_reference_passed: any;
            candidate_usage_required: any;
            candidate_usage_declared_passed: any;
            candidate_usage_strict_required: any;
            candidate_usage_strict_passed: any;
            referenced_candidate_ids: string[];
            all_candidates_declared: any;
            missing_candidate_reference_gate_ids: any;
            missing_candidate_usage_gate_ids: any;
            missing_candidate_usage_candidate_ids: string[];
            candidate_usage_rows: any;
            candidate_usage_counts: {
                used: any;
                ignored: any;
                verified: any;
                mentioned: any;
                unreferenced: any;
            };
            used_candidate_ids: string[];
            ignored_candidate_ids: string[];
            verified_candidate_ids: string[];
            mentioned_only_candidate_ids: string[];
            unreferenced_candidate_ids: string[];
            structured_candidate_usage_rows: {
                gate_id: string;
                candidate_id: string;
                kind: string;
                value: string;
                usage_state: string;
                reason: string;
                raw: any;
            }[];
            candidate_rows: any;
            declared: boolean;
            used: any;
            ignored: any;
        };
    };
};
export declare function runPostCompactDispatchMarkerVisibleSelfTest(): {
    pass: boolean;
    checks: {
        summaryRecordsMarker: boolean;
        runtimeKernelRecordsMarker: boolean;
        agentCoordinationRecordsMarker: boolean;
        taskCardRuntimeRecordsMarker: boolean;
    };
    markerSummary: any;
};
export declare function buildEvidenceGateFollowUps(group: any, outputs: string[]): any[];
export declare function runCoordinatorReworkProtocolSelfTest(): {
    pass: boolean;
    checks: {
        hasReworkPacket: boolean;
        hasVisibleSummary: boolean;
        hasRound: boolean;
        hasRoutePacket: boolean;
        hasContinuationSemantics: boolean;
        hasScratchpadContext: boolean;
        hasOriginalRequirement: boolean;
        hasCoordinatorPlan: boolean;
        hasReason: boolean;
        hasVerification: boolean;
        hasReceipt: boolean;
        failedRouteKeepsSameWorker: boolean;
        independentRouteUsesFreshVerifier: boolean;
        independentVerifierSelectsTestAgent: boolean;
        independentVerifierExcludesOriginalTarget: boolean;
        independentVerifierReportsMissingCandidate: boolean;
        nativeTestAgentDoesNotRequireGroupMembership: boolean;
        postReviewSpotCheckContractPasses: boolean;
        postReviewSpotCheckReusesSameVerifierAndHandoff: boolean;
        coordinatorReviewLoopAllowsRepairRecheckAndFinalAcceptance: boolean;
        structuredTestAgentReceiptSkipsGenericWorkerFollowUp: boolean;
        hardReviewRouteSuppressesConflictingLlmFollowUps: boolean;
        needsRecheckCreatesSameTestAgentWorkOrderContinuation: any;
        needsEnvironmentPreparesConditionsBeforeRecheck: any;
        implementationReworkSchedulesTestAgentRecheck: boolean;
        coordinatorReviewBudgetCoversRepairRecheckAndAcceptance: boolean;
        latestTestAgentReviewSupersedesStaleFailure: any;
        independentReworkDispatchesToVerifier: boolean;
        independentReworkTaskNamesReviewSubject: any;
        independentReworkBuildsNativeTestAgentHandoff: boolean;
        descriptiveVerificationEvidenceIsNotExecutedAsShell: any;
        commandOnlyHandoffCarriesAdversarialWaiver: boolean;
        testAgentAcceptanceExcludesCoordinatorResponsibilities: boolean;
        independentReworkKeepsNativeHandoffOutOfVisibleText: boolean;
        nativeTestAgentReportBecomesIndependentReviewReceipt: boolean;
        nativeTestAgentReceiptConsumesVerdictArtifact: boolean;
        nativeFailedTestAgentReceiptRequestsRework: boolean;
        nativeTestAgentUnknownCoverageReportBlocksWithoutVerdictArtifact: boolean;
        nativeTestAgentUnknownCoverageVisibleOutputDoesNotAccept: boolean;
        nativeTestAgentNotVerifiedCoverageReportRequestsReworkWithoutVerdictArtifact: boolean;
        nativeTestAgentNotVerifiedCoverageVisibleOutputShowsRework: boolean;
        nativeFailedTestAgentVisibleOutputShowsReworkPath: boolean;
        nativeFailedTestAgentVisibleOutputHidesRawVerdict: boolean;
        nativeTestAgentOutputCarriesReceiptAndArtifacts: boolean;
        nativeTestAgentVisibleOutputUsesFriendlyLabels: boolean;
        nativeTestAgentReceiptIncludesBrowserEvidenceSummary: boolean;
        nativeTestAgentReceiptIncludesBrowserFlowSummary: import("../../test-agent").TestAgentAcceptanceSummary;
        nativeTestAgentReceiptIncludesSafeAuthenticationSummary: boolean;
        nativeTestAgentReceiptIncludesActionEffectAndAdversarialEvidence: boolean;
        failedActionEffectAndAdversarialEvidenceOverridePass: boolean;
        incompleteActionRecoveryAndAdversarialEvidenceRequireRecheck: boolean;
        needsRecheckVisibleOutputAvoidsImplementationRework: boolean;
        failedAuthenticationOverridesLegacyPass: boolean;
        blockedAuthenticationNeedsUserWithoutLeakingCredentials: boolean;
        nativeTestAgentReceiptIncludesMultiSessionBrowserSummary: boolean;
        nativeTestAgentReviewSummaryReadyForGroupCard: boolean;
        configuredMultiSessionBrowserCheckAddsRequiredCoverage: boolean;
        nativeTestAgentPlanSummaryShowsMultiSessionWork: boolean;
        nativeTestAgentReceiptIncludesUploadDownloadEvidenceSummary: boolean;
        nativeTestAgentReceiptIncludesTableEvidenceSummary: boolean;
        nativeTestAgentVisibleOutputIncludesBrowserEvidenceSummary: boolean;
        nativeTestAgentVisibleOutputIncludesUploadDownloadEvidenceSummary: boolean;
        nativeTestAgentVisibleOutputIncludesTableEvidenceSummary: boolean;
        nativeTestAgentTableFailureSummaryHidesLocatorDetails: boolean;
        nativeTestAgentPlanSummaryIsUserReadable: boolean;
        nativeTestAgentPlanSummaryUsesFriendlyArtifactLabels: boolean;
        nativeTestAgentInvalidPlanBlocksBeforeExecution: boolean;
        nativeTestAgentRunnerBypassesThirdPartyToolSync: boolean;
        independentReviewGateCreatesFollowUp: boolean;
        independentReviewGateRoutesToTestAgent: any;
        failedIndependentReviewCreatesImplementationRework: any;
        failedIndependentReviewRoutesBackToImplementationWorker: boolean;
        failedIndependentReviewDoesNotSpawnVerifierAgain: any;
        independentReworkBlocksWithoutVerifier: any;
        wrongDirectionRequestsStop: boolean;
        wrongDirectionContinuationInterruptsOldRun: boolean;
        routeLabelsAreUserFriendly: boolean;
    };
    routes: {
        failedRoute: {
            schema: string;
            project: string;
            strategy: string;
            continuationStrategy: string;
            continuation_strategy: string;
            user_label: string;
            reason: string;
            context_overlap: any;
            requires_stop: boolean;
            requires_fresh_verifier: boolean;
            signals: string[];
        };
        independentRoute: {
            schema: string;
            project: string;
            strategy: string;
            continuationStrategy: string;
            continuation_strategy: string;
            user_label: string;
            reason: string;
            context_overlap: any;
            requires_stop: boolean;
            requires_fresh_verifier: boolean;
            signals: string[];
        };
        wrongDirectionRoute: {
            schema: string;
            project: string;
            strategy: string;
            continuationStrategy: string;
            continuation_strategy: string;
            user_label: string;
            reason: string;
            context_overlap: any;
            requires_stop: boolean;
            requires_fresh_verifier: boolean;
            signals: string[];
        };
    };
    independent_verifier: {
        verifierSelection: {
            schema: string;
            available: boolean;
            originalTarget: string;
            targetName: any;
            reason: string;
            nativeTestAgent: {
                available: boolean;
                project: string;
                workDir: string;
            } | {
                available: boolean;
                project?: undefined;
                readonly workDir?: undefined;
            };
            candidates: any[];
        };
        noVerifierSelection: {
            schema: string;
            available: boolean;
            originalTarget: string;
            targetName: any;
            reason: string;
            nativeTestAgent: {
                available: boolean;
                project: string;
                workDir: string;
            } | {
                available: boolean;
                project?: undefined;
                readonly workDir?: undefined;
            };
            candidates: any[];
        };
        independentFollowUp: any;
        independentGateFollowUps: any[];
        independentGateRoutedFollowUp: any;
        failedReviewReworkFollowUps: any[];
        failedReviewRoutedFollowUp: any;
        blockedIndependentFollowUp: any;
    };
    staged_review: {
        needsRecheckReviewFollowUps: any[];
        needsRecheckRoutedFollowUp: any;
        environmentReviewFollowUps: any[];
        environmentRoutedFollowUp: any;
        scheduledRechecks: any[];
        scheduledRecheckRoutedFollowUp: any;
        latestReviewWinsGate: {
            required: boolean;
            pass: boolean;
            status: string;
            reason: string;
            file_change_count: number;
            high_risk_files: {
                project: any;
                path: any;
            }[];
            evidence_count: number;
            passed_count: number;
            failed_count: number;
            needs_recheck_count: number;
            needs_environment_count: number;
            needs_user_count: number;
            evidence: any[];
            failed_evidence: any[];
            recheck_evidence: any[];
            environment_evidence: any[];
            needs_user_evidence: any[];
        };
    };
};
export declare function enqueueTask(taskId: string, ctx: CollabCtx): {
    queued: boolean;
    message: string;
    blocked?: undefined;
    duplicate_block_suppressed?: undefined;
    reason?: undefined;
    readiness?: undefined;
    targetKey?: undefined;
    position?: undefined;
} | {
    queued: boolean;
    blocked: boolean;
    duplicate_block_suppressed: boolean;
    reason: string;
    message: any;
    readiness: any;
    targetKey?: undefined;
    position?: undefined;
} | {
    queued: boolean;
    message: string;
    targetKey: string;
    position: number;
    blocked?: undefined;
    duplicate_block_suppressed?: undefined;
    reason?: undefined;
    readiness?: undefined;
};
export declare function createAndQueueTask(task: any, ctx: CollabCtx): {
    task: any;
    queueResult: {
        queued: boolean;
        message: string;
        blocked?: undefined;
        duplicate_block_suppressed?: undefined;
        reason?: undefined;
        readiness?: undefined;
        targetKey?: undefined;
        position?: undefined;
    } | {
        queued: boolean;
        blocked: boolean;
        duplicate_block_suppressed: boolean;
        reason: string;
        message: any;
        readiness: any;
        targetKey?: undefined;
        position?: undefined;
    } | {
        queued: boolean;
        message: string;
        targetKey: string;
        position: number;
        blocked?: undefined;
        duplicate_block_suppressed?: undefined;
        reason?: undefined;
        readiness?: undefined;
    };
};
export declare function resumeTaskQueues(ctx: CollabCtx, options?: any): {
    resumed: number;
    auto_resumed: number;
    manual_pending: number;
    skipped: number;
    total: number;
    trace_backfilled: number;
    manual_recovery: boolean;
    mixed_recovery: boolean;
    recovery_policy: string;
    test_agent_runner_recovery: {
        schema: string;
        total: number;
        running: number;
        interrupted: number;
        retention: {
            schema: string;
            scanned: number;
            removedRecords: number;
            removedFiles: number;
        };
    };
    results: any[];
    queue_status: {
        total_queued: number;
        running_targets: number;
        target_status: any;
        pending_tasks: number;
        in_progress_tasks: number;
        failed_tasks: number;
        running_task_ids: string[];
    };
};
export declare function runTaskWatchdog(ctx: CollabCtx, options?: any): {
    success: boolean;
    recovered: number;
    total_recoverable: number;
    stale_recovered: number;
    stale_recoverable: number;
    work_item_stalled_total: number;
    work_item_requeued: any;
    work_item_results: any[];
    blocked_recovery: any;
    runtime_failed_total: number;
    runtime_retried: any;
    runtime_queued: any;
    gap_rework_total: number;
    gap_continued: number;
    gap_queued: number;
    gap_results: any[];
    gap_continue_skipped_reason: string;
    runtime_retry: any;
    runtime_retry_skipped_reason: string;
    execution_readiness: {
        ready: boolean;
        mode: string;
        message: string;
        fix_actions: string[];
        childProcess: any;
        externalRunner: {
            active: boolean;
            status: any;
            detail: any;
            pid: number;
            process_alive: boolean;
            updated_at: any;
            age_ms: number;
            pending_requests: number;
            requests: number;
            results: number;
            last_result: any;
        };
        probe: any;
        probeHealth: {
            status: string;
            successFresh: boolean;
            failureRecent: boolean;
            message: any;
        };
    } | {
        ready: boolean;
        mode: string;
        message: string;
        fix_actions: any[];
        childProcess: any;
        probe: any;
        probeHealth: {
            status: string;
            successFresh: boolean;
            failureRecent: boolean;
            message: any;
        };
        externalRunner?: undefined;
    };
    daily_dev_execution_readiness: {
        ready: boolean;
        mode: string;
        message: string;
        fix_actions: string[];
        childProcess: any;
        externalRunner: {
            active: boolean;
            status: any;
            detail: any;
            pid: number;
            process_alive: boolean;
            updated_at: any;
            age_ms: number;
            pending_requests: number;
            requests: number;
            results: number;
            last_result: any;
        };
        probe: any;
        probeHealth: {
            status: string;
            successFresh: boolean;
            failureRecent: boolean;
            message: any;
        };
    } | {
        ready: boolean;
        mode: string;
        message: string;
        fix_actions: any[];
        childProcess: any;
        probe: any;
        probeHealth: {
            status: string;
            successFresh: boolean;
            failureRecent: boolean;
            message: any;
        };
        externalRunner?: undefined;
    };
    results: any[];
    status: {
        stale_ms: number;
        checked_at: string;
        stale_pending: any[];
        stalled_in_progress: any[];
        running_long: any[];
        runtime_failed: any[];
        gap_rework: any[];
        work_item_stalled: any[];
        queue_status: {
            total_queued: number;
            running_targets: number;
            target_status: any;
            pending_tasks: number;
            in_progress_tasks: number;
            failed_tasks: number;
            running_task_ids: string[];
        };
    };
};
export declare function runAgentRecoveryMonitorOnce(ctx: CollabCtx, options?: any): Promise<{
    success: boolean;
    skipped: boolean;
    reason: string;
    work: {
        blocked_pending: {
            id: any;
            title: any;
            status: any;
            target_key: string;
            blocked_at: any;
            status_detail: string;
        }[];
        runtime_failed: {
            id: any;
            title: any;
            status: any;
            target_key: string;
            retry_count: number;
            reason: string;
        }[];
        total: number;
    };
}> | Promise<{
    success: boolean;
    skipped: boolean;
    work: {
        blocked_pending: {
            id: any;
            title: any;
            status: any;
            target_key: string;
            blocked_at: any;
            status_detail: string;
        }[];
        runtime_failed: {
            id: any;
            title: any;
            status: any;
            target_key: string;
            retry_count: number;
            reason: string;
        }[];
        total: number;
    };
    probe_groups: any[];
    target_results: any[];
    failures: any[];
    message: any;
    probe: any;
    blocked_recovery: {
        total_blocked: any;
        recovered: any;
        results: any[];
    };
    runtime_recovery: {
        success: boolean;
        total_recoverable: any;
        retried: any;
        queued: any;
        auto_execute: boolean;
        results: any[];
        queue_status: {
            total_queued: number;
            running_targets: number;
            target_status: any;
            pending_tasks: number;
            in_progress_tasks: number;
            failed_tasks: number;
            running_task_ids: string[];
        };
    };
}>;
export declare function startAgentRecoveryMonitor(ctx: CollabCtx): void;
export declare function stopAgentRecoveryMonitor(): void;
export declare function startTaskWatchdog(ctx: CollabCtx): void;
export declare function stopTaskWatchdog(): void;
export declare function buildDailyDevAgentDiagnostics(): {
    success: boolean;
    generated_at: string;
    readiness: string;
    ready: boolean;
    summary: string;
    counts: {
        checks: number;
        ok: number;
        warn: number;
        fail: number;
        groups: number;
        readyGroups: number;
        projectConfigs: number;
        cronJobs: number;
        enabledCronJobs: number;
        autoTasks: number;
    };
    autopilot: {
        mode: string;
        ready: boolean;
        headline: string;
        counts: {
            executableGroups: number;
            readyBacklogs: number;
            sharedFiles: number;
            continuationGaps: number;
            dailyDevCronJobs: number;
            queuedTasks: number;
            recoveryWork: number;
            verificationConfigured: number;
            verificationInferred: number;
            verificationMissing: number;
            agentProbeReady: number;
            agentProbeExecutable: number;
        };
        next_actions: string[];
        recent_cron: {
            id: any;
            name: any;
            last_status: any;
            last_result: any;
            last_run: any;
            last_run_meta: any;
        }[];
    };
    agent_probe_matrix: {
        total: number;
        executable: number;
        ready: number;
        blocked: number;
        missing: number;
        stale: number;
        failed_recent: number;
        group_total: number;
        group_ready: number;
        groups: {
            group_id: any;
            group_name: any;
            orchestratorEnabled: boolean;
            executable: number;
            ready: number;
            missing: number;
            stale: number;
            failed_recent: number;
            all_ready: boolean;
            targets: {
                project: any;
                agent_type: any;
                effective_agent_type: any;
                fallback_active: boolean;
                ready: any;
                probe_status: any;
            }[];
        }[];
        targets: any[];
    };
    checks: any[];
    groups: {
        id: any;
        name: any;
        orchestratorEnabled: boolean;
        coordinator: any;
        sharedFiles: any;
        backlogFiles: any;
        readyBacklogs: number;
        backlogCounts: any;
        memberCount: any;
        readyMemberCount: any;
        members: any;
    }[];
    queue_status: {
        total_queued: number;
        running_targets: number;
        target_status: any;
        pending_tasks: number;
        in_progress_tasks: number;
        failed_tasks: number;
        running_task_ids: string[];
    };
};
export interface CollabCtx {
    PORT: number;
    callAgent: (projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, workspaceTarget?: any) => Promise<string>;
    callAgentForGroupStream: (projectName: string, message: string, workDir: string, agentType: string, options?: any) => Promise<string>;
    setAgentActivity: (name: string, state: string, detail?: string, workspaceTarget?: any, durationMs?: number, metadata?: any) => void;
    broadcastPetSpeech: (agent: string, payload: any) => void;
    createFileChangeSnapshot: (workDir: string) => any;
    getFileChanges: (projectName: string, beforeSnapshot?: any) => any;
    recordMetric: (agent: string, data: any) => void;
    toolManager: any;
    buildUploadedFilesContext: (files: any[], title?: string) => string;
    summarizeUploadedFiles: (files: any[]) => string;
    buildFilesContext: (files: any[], title?: string) => string;
    collectRequestBuffer: (req: any) => Promise<Buffer>;
    getMultipartBoundary: (contentType: string) => string;
    parseMultipart: (buffer: Buffer, boundary: string) => any;
    getSharedFilePath: (name: string) => string;
    createSharedFileRecord: (name: string, source?: string) => any;
    normalizeSharedFileList: (files: any[]) => any[];
    onTaskStatusChange?: (task: any, status: string, result?: string) => void | Promise<void>;
}
export declare function runCollaborationProtocolSelfTest(): {
    pass: boolean;
    reworkProtocol: {
        pass: boolean;
        checks: {
            hasReworkPacket: boolean;
            hasVisibleSummary: boolean;
            hasRound: boolean;
            hasRoutePacket: boolean;
            hasContinuationSemantics: boolean;
            hasScratchpadContext: boolean;
            hasOriginalRequirement: boolean;
            hasCoordinatorPlan: boolean;
            hasReason: boolean;
            hasVerification: boolean;
            hasReceipt: boolean;
            failedRouteKeepsSameWorker: boolean;
            independentRouteUsesFreshVerifier: boolean;
            independentVerifierSelectsTestAgent: boolean;
            independentVerifierExcludesOriginalTarget: boolean;
            independentVerifierReportsMissingCandidate: boolean;
            nativeTestAgentDoesNotRequireGroupMembership: boolean;
            postReviewSpotCheckContractPasses: boolean;
            postReviewSpotCheckReusesSameVerifierAndHandoff: boolean;
            coordinatorReviewLoopAllowsRepairRecheckAndFinalAcceptance: boolean;
            structuredTestAgentReceiptSkipsGenericWorkerFollowUp: boolean;
            hardReviewRouteSuppressesConflictingLlmFollowUps: boolean;
            needsRecheckCreatesSameTestAgentWorkOrderContinuation: any;
            needsEnvironmentPreparesConditionsBeforeRecheck: any;
            implementationReworkSchedulesTestAgentRecheck: boolean;
            coordinatorReviewBudgetCoversRepairRecheckAndAcceptance: boolean;
            latestTestAgentReviewSupersedesStaleFailure: any;
            independentReworkDispatchesToVerifier: boolean;
            independentReworkTaskNamesReviewSubject: any;
            independentReworkBuildsNativeTestAgentHandoff: boolean;
            descriptiveVerificationEvidenceIsNotExecutedAsShell: any;
            commandOnlyHandoffCarriesAdversarialWaiver: boolean;
            testAgentAcceptanceExcludesCoordinatorResponsibilities: boolean;
            independentReworkKeepsNativeHandoffOutOfVisibleText: boolean;
            nativeTestAgentReportBecomesIndependentReviewReceipt: boolean;
            nativeTestAgentReceiptConsumesVerdictArtifact: boolean;
            nativeFailedTestAgentReceiptRequestsRework: boolean;
            nativeTestAgentUnknownCoverageReportBlocksWithoutVerdictArtifact: boolean;
            nativeTestAgentUnknownCoverageVisibleOutputDoesNotAccept: boolean;
            nativeTestAgentNotVerifiedCoverageReportRequestsReworkWithoutVerdictArtifact: boolean;
            nativeTestAgentNotVerifiedCoverageVisibleOutputShowsRework: boolean;
            nativeFailedTestAgentVisibleOutputShowsReworkPath: boolean;
            nativeFailedTestAgentVisibleOutputHidesRawVerdict: boolean;
            nativeTestAgentOutputCarriesReceiptAndArtifacts: boolean;
            nativeTestAgentVisibleOutputUsesFriendlyLabels: boolean;
            nativeTestAgentReceiptIncludesBrowserEvidenceSummary: boolean;
            nativeTestAgentReceiptIncludesBrowserFlowSummary: import("../../test-agent").TestAgentAcceptanceSummary;
            nativeTestAgentReceiptIncludesSafeAuthenticationSummary: boolean;
            nativeTestAgentReceiptIncludesActionEffectAndAdversarialEvidence: boolean;
            failedActionEffectAndAdversarialEvidenceOverridePass: boolean;
            incompleteActionRecoveryAndAdversarialEvidenceRequireRecheck: boolean;
            needsRecheckVisibleOutputAvoidsImplementationRework: boolean;
            failedAuthenticationOverridesLegacyPass: boolean;
            blockedAuthenticationNeedsUserWithoutLeakingCredentials: boolean;
            nativeTestAgentReceiptIncludesMultiSessionBrowserSummary: boolean;
            nativeTestAgentReviewSummaryReadyForGroupCard: boolean;
            configuredMultiSessionBrowserCheckAddsRequiredCoverage: boolean;
            nativeTestAgentPlanSummaryShowsMultiSessionWork: boolean;
            nativeTestAgentReceiptIncludesUploadDownloadEvidenceSummary: boolean;
            nativeTestAgentReceiptIncludesTableEvidenceSummary: boolean;
            nativeTestAgentVisibleOutputIncludesBrowserEvidenceSummary: boolean;
            nativeTestAgentVisibleOutputIncludesUploadDownloadEvidenceSummary: boolean;
            nativeTestAgentVisibleOutputIncludesTableEvidenceSummary: boolean;
            nativeTestAgentTableFailureSummaryHidesLocatorDetails: boolean;
            nativeTestAgentPlanSummaryIsUserReadable: boolean;
            nativeTestAgentPlanSummaryUsesFriendlyArtifactLabels: boolean;
            nativeTestAgentInvalidPlanBlocksBeforeExecution: boolean;
            nativeTestAgentRunnerBypassesThirdPartyToolSync: boolean;
            independentReviewGateCreatesFollowUp: boolean;
            independentReviewGateRoutesToTestAgent: any;
            failedIndependentReviewCreatesImplementationRework: any;
            failedIndependentReviewRoutesBackToImplementationWorker: boolean;
            failedIndependentReviewDoesNotSpawnVerifierAgain: any;
            independentReworkBlocksWithoutVerifier: any;
            wrongDirectionRequestsStop: boolean;
            wrongDirectionContinuationInterruptsOldRun: boolean;
            routeLabelsAreUserFriendly: boolean;
        };
        routes: {
            failedRoute: {
                schema: string;
                project: string;
                strategy: string;
                continuationStrategy: string;
                continuation_strategy: string;
                user_label: string;
                reason: string;
                context_overlap: any;
                requires_stop: boolean;
                requires_fresh_verifier: boolean;
                signals: string[];
            };
            independentRoute: {
                schema: string;
                project: string;
                strategy: string;
                continuationStrategy: string;
                continuation_strategy: string;
                user_label: string;
                reason: string;
                context_overlap: any;
                requires_stop: boolean;
                requires_fresh_verifier: boolean;
                signals: string[];
            };
            wrongDirectionRoute: {
                schema: string;
                project: string;
                strategy: string;
                continuationStrategy: string;
                continuation_strategy: string;
                user_label: string;
                reason: string;
                context_overlap: any;
                requires_stop: boolean;
                requires_fresh_verifier: boolean;
                signals: string[];
            };
        };
        independent_verifier: {
            verifierSelection: {
                schema: string;
                available: boolean;
                originalTarget: string;
                targetName: any;
                reason: string;
                nativeTestAgent: {
                    available: boolean;
                    project: string;
                    workDir: string;
                } | {
                    available: boolean;
                    project?: undefined;
                    readonly workDir?: undefined;
                };
                candidates: any[];
            };
            noVerifierSelection: {
                schema: string;
                available: boolean;
                originalTarget: string;
                targetName: any;
                reason: string;
                nativeTestAgent: {
                    available: boolean;
                    project: string;
                    workDir: string;
                } | {
                    available: boolean;
                    project?: undefined;
                    readonly workDir?: undefined;
                };
                candidates: any[];
            };
            independentFollowUp: any;
            independentGateFollowUps: any[];
            independentGateRoutedFollowUp: any;
            failedReviewReworkFollowUps: any[];
            failedReviewRoutedFollowUp: any;
            blockedIndependentFollowUp: any;
        };
        staged_review: {
            needsRecheckReviewFollowUps: any[];
            needsRecheckRoutedFollowUp: any;
            environmentReviewFollowUps: any[];
            environmentRoutedFollowUp: any;
            scheduledRechecks: any[];
            scheduledRecheckRoutedFollowUp: any;
            latestReviewWinsGate: {
                required: boolean;
                pass: boolean;
                status: string;
                reason: string;
                file_change_count: number;
                high_risk_files: {
                    project: any;
                    path: any;
                }[];
                evidence_count: number;
                passed_count: number;
                failed_count: number;
                needs_recheck_count: number;
                needs_environment_count: number;
                needs_user_count: number;
                evidence: any[];
                failed_evidence: any[];
                recheck_evidence: any[];
                environment_evidence: any[];
                needs_user_evidence: any[];
            };
        };
    };
    agentCollaborationProtocol: {
        pass: boolean;
        checks: {
            capabilityRouting: boolean;
            taskAndExecutionBound: boolean;
            permissionDoesNotExpand: boolean;
            admissionPasses: boolean;
            duplicateStops: boolean;
            evidenceAccepted: boolean;
            conflictingAnswerStops: boolean;
            timeoutReturnsToCoordinator: boolean;
            sideEffectDetected: boolean;
        };
        route: {
            targetName: any;
            strategy: string;
            candidates: any;
        };
        contract: any;
        admission: {
            allowed: boolean;
            code: string;
            reason: string;
            existing_id?: undefined;
        } | {
            allowed: boolean;
            code: string;
            reason: string;
            existing_id: any;
        };
        duplicate: {
            allowed: boolean;
            code: string;
            reason: string;
            existing_id?: undefined;
        } | {
            allowed: boolean;
            code: string;
            reason: string;
            existing_id: any;
        };
        answer: {
            status: string;
            accepted: boolean;
            score: number;
            evidence: string[];
            polarity: string;
            conflicts_with: any[];
            reason: string;
            arbitrated_by: string;
            arbitrated_at: string;
        };
        opposing: {
            status: string;
            accepted: boolean;
            score: number;
            evidence: string[];
            polarity: string;
            conflicts_with: any[];
            reason: string;
            arbitrated_by: string;
            arbitrated_at: string;
        };
        timeout: {
            timed_out: boolean;
            status: string;
            deadline_at: string;
            checked_at: string;
            recovery: string;
            reason: string;
        };
        permissionOk: {
            pass: boolean;
            mode: string;
            violations: ({
                type: string;
                path: string;
            } | {
                type: string;
                detail: string;
            })[];
            reason: string;
        };
        permissionDenied: {
            pass: boolean;
            mode: string;
            violations: ({
                type: string;
                path: string;
            } | {
                type: string;
                detail: string;
            })[];
            reason: string;
        };
    };
    startupTaskRecovery: {
        pass: boolean;
        checks: {
            startedAuthorizedTaskAutoResumes: boolean;
            confirmedQueuedTaskAutoResumes: boolean;
            awaitingConfirmationStaysManual: boolean;
            userPauseStaysManual: boolean;
            runtimeDebtStaysManual: boolean;
            missingAuthorizationStaysManual: boolean;
            startupManualHoldNeedsExplicitResume: boolean;
            explicitResumeCanReleaseStartupHold: boolean;
            mixedBatchIsPartitioned: boolean;
            userCopyHidesTechnicalEvidence: boolean;
        };
        samples: {
            started: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            queuedConfirmed: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            awaitingConfirmation: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            userPaused: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            runtimeDebt: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            missingAuthorization: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            heldWithoutOverride: import("./startup-task-recovery").StartupTaskRecoveryDecision;
            heldWithOverride: import("./startup-task-recovery").StartupTaskRecoveryDecision;
        };
    };
    testAgentRunner: {
        pass: boolean;
        stableSourceFingerprint: boolean;
        recordsReconcile: boolean;
    };
    taskDocumentContextPreview: string;
    taskDocumentChecks: {
        hasBusinessGoal: boolean;
        hasAcceptance: boolean;
        hasSourceDocument: boolean;
        mergeKeepsTaskDocument: boolean;
    };
    structuredAssignmentChecks: {
        hasTwoMentions: boolean;
        preservesTarget: boolean;
        preservesTask: boolean;
        preservesDependency: boolean;
        preservesContinuation: boolean;
    };
    executionFixChecks: {
        hasCliCheck: boolean;
        hasApiNetworkHint: boolean;
        hasRetryAction: boolean;
    };
    executionFixActions: string[];
    probeHealthChecks: {
        recentFailureBlocks: boolean;
        freshSuccessPasses: boolean;
        probeCanRetryAfterRecentFailure: boolean;
        probeFailureKeepsRunnerError: boolean;
        freshProbeEnablesImmediateRecovery: boolean;
        staleProbeDoesNotEnableImmediateRecovery: boolean;
        dailyDevRequiresFreshProbe: boolean;
        dailyDevWatchdogGapsRequireFreshProbe: boolean;
        dailyDevFreshProbePasses: boolean;
        dailyDevFreshProbeMustMatchTarget: boolean;
        groupProbeRequiresAllMembers: boolean;
        groupProbeAllMembersPass: boolean;
        explicitProjectBypassesGroupWideProbe: boolean;
        targetProbeKeysAreIsolated: boolean;
        targetProbePartialMatchWorks: boolean;
        recoveryProbeGroupsAreTargeted: boolean;
        recoveryProbePayloadKeepsTarget: boolean;
        recoveryTargetMatchWorks: boolean;
        generalTaskDoesNotRequireProbe: boolean;
    };
    taskNotificationChecks: {
        hasXmlEnvelope: boolean;
        hasTaskId: boolean;
        hasCompletedStatus: boolean;
        detectsMissingReceipt: boolean;
        missingReceiptFollowUpHasUserPreview: boolean;
        missingReceiptSummaryFriendly: boolean;
        missingReceiptSummaryHidesProtocol: boolean;
        displaySelfTestPasses: boolean;
    };
    taskNotificationDisplay: {
        pass: boolean;
        checks: {
            keepsInternalEnvelopeForCoordinator: boolean;
            missingReceiptSummaryFriendly: boolean;
            missingReceiptResultKeepsUsefulText: boolean;
            completedSummaryPreserved: boolean;
            visibleNotificationTextHidesProtocol: boolean;
        };
        samples: {
            missing: any;
            completed: any;
        };
    };
    dependencyGateChecks: {
        doneDependencyPasses: boolean;
        blockedDependencyStopsDownstream: boolean;
        blockedDependencyExplainsReason: boolean;
        latestRecoveredReceiptUnblocksDownstream: boolean;
    };
    notificationDeliveryChecks: {
        summaryHasWorkerNotification: boolean;
        summaryKeepsNotificationTaskId: boolean;
        summaryUsesNotificationAgent: any;
        userReportHidesNotificationProtocol: boolean;
    };
    continuationGapChecks: {
        workerNotificationTriggersGap: any;
        draftIncludesWorkerNotification: boolean;
        draftIncludesSameWorkerStrategy: boolean;
        missingCoordinationTriggersGap: any;
        draftIncludesCoordinationEvidenceGap: boolean;
        firstGapCanAutoContinue: boolean;
        unchangedGapDoesNotLoop: boolean;
        changedGapAllowsNewTargetedAttempt: boolean;
        exhaustedGapNeedsUserDecision: boolean;
        automaticContinuationIsInternal: boolean;
        userTaskCardExplainsNextAction: boolean;
        userTaskCardHidesProtocolTerms: boolean;
    };
    scratchpadChecks: {
        storesWorkerLedger: boolean;
        contextIncludesScratchpad: boolean;
        contextIncludesWorkerSummary: boolean;
    };
    coordinatorVisibleMessageSelfTest: {
        pass: boolean;
        visible: string;
        friendly: string;
    };
    agentQaRequirementChecks: {
        infersExplicitAskAgentRequirement: boolean;
        explicitFalseDisablesRequirement: boolean;
        missingQaBlocksAcceptance: boolean;
    };
    globalMissionRequirementChecks: {
        codeTaskDefaultsToIndependentReview: boolean;
        explicitNonCodeTaskCanDisableReview: boolean;
        targetRequirementOverridesMissionDefault: boolean;
    };
};
export declare function updateTask(id: string, updates: any): any;
export declare function refreshGlobalDevelopmentMissions(): any[];
export declare function getGlobalDevelopmentMission(id: string): {
    mission: any;
    children: any[];
};
export declare function removeTaskFromQueues(taskId: string): number;
export declare function superviseGlobalDevelopmentMissionCycle(id: string, ctx: CollabCtx, options?: any): {
    success: boolean;
    error: string;
    terminal: boolean;
    mission?: undefined;
    children?: undefined;
    waiting_user?: undefined;
    actions?: undefined;
} | {
    success: boolean;
    mission: any;
    children: any[];
    terminal: boolean;
    waiting_user: any[];
    actions: any[];
    error?: undefined;
};
export declare function controlGlobalDevelopmentMission(id: string, operation: string, ctx: CollabCtx, payload?: any): Promise<{
    success: boolean;
    status: number;
    error: string;
} | {
    mission: any;
    children: any[];
    success: boolean;
    operation: string;
    continuation_kind: string;
    continuation_summary: {
        schema: string;
        kind: string;
        source: string;
        replan_required: boolean;
        interrupt_current_run: boolean;
        affected_task_count: number;
        queued_task_count: number;
        deferred_task_count: number;
        interruption_requested_count: number;
        interrupted_task_count: number;
        interruption_failed_count: number;
        failed_task_count: number;
        results: any[];
        at: string;
    };
    status?: undefined;
    error?: undefined;
} | {
    mission: any;
    children: any[];
    success: boolean;
    operation: string;
    status?: undefined;
    error?: undefined;
}>;
export declare function createGlobalDevelopmentMission(payload: any, ctx: CollabCtx): {
    success: boolean;
    duplicate: boolean;
    mission: any;
    children: any;
    rejected: any[];
} | {
    success: boolean;
    mission: any;
    children: any[];
    rejected: any[];
    duplicate?: undefined;
};
export declare function continueDailyDevTasksFromGaps(ctx: CollabCtx, options?: any): {
    success: boolean;
    total_candidates: number;
    continued: number;
    queued: number;
    blocked: number;
    failed: number;
    limit: number;
    max_per_task: number;
    results: any[];
};
export declare function retryTask(id: string, ctx: CollabCtx, reason?: string, autoExecute?: boolean): {
    success: boolean;
    status: number;
    error: string;
    task?: undefined;
    queued?: undefined;
    queue_result?: undefined;
    queue_status?: undefined;
} | {
    success: boolean;
    task: any;
    queued: boolean;
    queue_result: {
        queued: boolean;
        message: string;
        blocked?: undefined;
        duplicate_block_suppressed?: undefined;
        reason?: undefined;
        readiness?: undefined;
        targetKey?: undefined;
        position?: undefined;
    } | {
        queued: boolean;
        blocked: boolean;
        duplicate_block_suppressed: boolean;
        reason: string;
        message: any;
        readiness: any;
        targetKey?: undefined;
        position?: undefined;
    } | {
        queued: boolean;
        message: string;
        targetKey: string;
        position: number;
        blocked?: undefined;
        duplicate_block_suppressed?: undefined;
        reason?: undefined;
        readiness?: undefined;
    };
    queue_status: {
        total_queued: number;
        running_targets: number;
        target_status: any;
        pending_tasks: number;
        in_progress_tasks: number;
        failed_tasks: number;
        running_task_ids: string[];
    };
    status?: undefined;
    error?: undefined;
};
export declare function purgeArchivedTask(id: string): any;
export declare function handleCollaborationApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;

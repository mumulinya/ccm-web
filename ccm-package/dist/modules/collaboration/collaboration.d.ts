export { FEISHU_SCOPES, sendFeishuReportMessage } from "./feishu";
export { loadGroups } from "./storage";
export { runGroupMemoryStorageRecoverySelfTest } from "./memory";
export { claimReadyDailyDevBacklog, importSharedDocsToDailyDevBacklog, markDailyDevBacklogStatus, } from "./daily-dev-backlog";
export declare function deriveTaskLifecycle(task: any, executions?: any[]): {
    state: string;
    terminal: boolean;
    keepsSession: boolean;
};
export declare function runCollaborationUxSelfTest(): {
    pass: boolean;
    checks: {
        simplePhaseLanguage: boolean;
        conciseAgentLanguage: boolean;
        simpleActions: boolean;
        revertedPhase: boolean;
        technicalIdsStayCollapsed: boolean;
        userWorkflowTimelineVisible: any;
        liveTodoPlanVisible: boolean;
        liveTodoReviewing: any;
        liveTodoReworking: any;
        liveTodoFailedNeedsConfirmation: any;
        liveTodoCancelled: any;
        liveTodoEvidenceTraceable: any;
        liveTodoFailureHasActions: any;
        agentQaVisible: boolean;
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
        workOrderPreviewVisible: any;
        executionStoryShowsCodingFlow: boolean;
        acceptanceReviewHardGateVisible: boolean;
        missingEvidenceAcceptanceReviewBlocksCompletion: boolean;
        agentCoordinationProtocolVisible: any;
        agentCoordinationHeartbeatVisible: boolean;
        agentCoordinationContractSyncVisible: boolean;
        agentCoordinationReceiptQualityScores: boolean;
        agentCoordinationTargetedReworkForMissingEvidence: boolean;
        agentCoordinationAckReviewApproved: boolean;
        agentCoordinationContractTransferReady: any;
        ackGapBlocksCompletion: boolean;
        ackGapCreatesRewriteDraft: boolean;
        contractGapCreatesInjectionDraft: boolean;
        contractInjectionGateRequiresConsumerReceipt: boolean;
        contractInjectionGateRecognizesConsumerRerun: boolean;
        contractInjectionGateRequiresConsumptionQuality: boolean;
        contractInjectionGateRejectsGenericApiAssignment: boolean;
        taskCardShowsRuntimeKernel: any;
        agentCoordinationEventStreamVisible: boolean;
        acceptanceReviewIncludesAckGate: boolean;
        agentCoordinationContractInjectAction: boolean;
        reportHasFourUserSections: boolean;
        reportHidesProtocol: boolean;
        groupReportFormatsObjects: boolean;
        acknowledgementHasCleanPunctuation: boolean;
        followupClassification: boolean;
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
            steps: any[];
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
            checks: {
                ok: boolean;
                detail: any;
                id: string;
                label: string;
            }[];
            missing: string[];
            next_action: string;
        };
        agent_coordination: {
            version: number;
            source: string;
            title: string;
            health: number;
            status: string;
            ack_review: {
                status: string;
                rows: {
                    agent: any;
                    status: string;
                    reason: string;
                    understood_goal: string;
                    planned_scope: any[];
                    forbidden_scope: any[];
                    verification_plan: any[];
                    unclear: any[];
                }[];
                rejected: {
                    agent: any;
                    status: string;
                    reason: string;
                    understood_goal: string;
                    planned_scope: any[];
                    forbidden_scope: any[];
                    verification_plan: any[];
                    unclear: any[];
                }[];
                next_action: string;
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
                    checks: {
                        id: string;
                        label: string;
                        ok: boolean;
                    }[];
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
                    checks: {
                        id: string;
                        label: string;
                        ok: boolean;
                    }[];
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
            ack_review: {
                status: string;
                rows: {
                    agent: any;
                    status: string;
                    reason: string;
                    understood_goal: string;
                    planned_scope: any[];
                    forbidden_scope: any[];
                    verification_plan: any[];
                    unclear: any[];
                }[];
                rejected: {
                    agent: any;
                    status: string;
                    reason: string;
                    understood_goal: string;
                    planned_scope: any[];
                    forbidden_scope: any[];
                    verification_plan: any[];
                    unclear: any[];
                }[];
                next_action: string;
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
                    checks: {
                        id: string;
                        label: string;
                        ok: boolean;
                    }[];
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
                    checks: {
                        id: string;
                        label: string;
                        ok: boolean;
                    }[];
                    missing: string[];
                };
            }[];
            targeted_rework: any[];
            next_action: string;
        };
        runtime_kernel: any;
        runtimeKernel: any;
        plan_mode: {
            title: any;
            mode: any;
            requires_confirmation: boolean;
            auto_continue: boolean;
            next_step: any;
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
            permission_boundaries: any;
            session_strategy: any;
        };
        completed: string[];
        blockers: string[];
        next_action: string;
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
export declare function buildEvidenceGateFollowUps(group: any, outputs: string[]): any[];
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
    total: number;
    trace_backfilled: number;
    manual_recovery: boolean;
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
} | {
    resumed: number;
    total: number;
    trace_backfilled: number;
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
    manual_recovery?: undefined;
};
export declare function runTaskWatchdog(ctx: CollabCtx, options?: any): {
    success: boolean;
    recovered: number;
    total_recoverable: number;
    stale_recovered: number;
    stale_recoverable: number;
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
export interface CollabCtx {
    PORT: number;
    callAgent: (projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, workspaceTarget?: any) => Promise<string>;
    callAgentForGroupStream: (projectName: string, message: string, workDir: string, agentType: string, options?: any) => Promise<string>;
    setAgentActivity: (name: string, state: string, detail?: string, workspaceTarget?: any, durationMs?: number) => void;
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
            hasRound: boolean;
            hasContinuationSemantics: boolean;
            hasScratchpadContext: boolean;
            hasOriginalRequirement: boolean;
            hasCoordinatorPlan: boolean;
            hasReason: boolean;
            hasVerification: boolean;
            hasReceipt: boolean;
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
    agentQaRequirementChecks: {
        infersExplicitAskAgentRequirement: boolean;
        explicitFalseDisablesRequirement: boolean;
        missingQaBlocksAcceptance: boolean;
    };
};
export declare function refreshGlobalDevelopmentMissions(): any[];
export declare function getGlobalDevelopmentMission(id: string): {
    mission: any;
    children: any[];
};
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
export declare function handleCollaborationApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;

export declare function isTaskPaused(task: any): boolean;
export declare function getTaskFailureText(task: any): string;
export declare function getChildAgentIsolationMode(group?: any, task?: any): import("../../agents/worktree").ChildAgentIsolationMode;
export declare function isRecoverableRuntimeFailure(task: any): boolean;
export declare function isAgentExecutionBlockedPendingTask(task: any): boolean;
export declare function isPositiveAcceptanceEvidenceText(value: any): boolean;
export declare function isBareAcceptanceMarker(value: any): boolean;
export declare function isStrongExecutedVerificationText(value: any): boolean;
export declare function flattenAcceptanceEvidenceRows(...values: any[]): any[];
export declare function evidenceRowText(row: any): string;
export declare function rowEvidenceCount(row: any): number;
export declare function isStrongPositiveReviewRow(row: any): boolean;
export declare function hasStrongTaskAcceptanceEvidence(task: any, executions?: any[], explicitSummary?: any): boolean;
export declare function deriveTaskLifecycle(task: any, executions?: any[]): {
    state: string;
    terminal: boolean;
    keepsSession: boolean;
};
export declare function buildTaskPreflightReasoning(task: any, reason?: string, recovery?: boolean): import("../../agents/reasoning-loop").AgentReasoningState;
export declare function getTaskRecoveryChecks(task: any): any;
export declare function hasTaskRecoveryEvidence(task: any): boolean;
export declare function buildMainAgentRecoverySummary(task: any, phase: string, sessions?: any[], workItems?: any[], gapItems?: any[]): {
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
export declare function taskCardPhase(task: any, executions: any[]): string;
export declare function taskCardGapLabel(item: any): string;
export declare function userAgentRole(project: string): "项目" | "测试" | "前端" | "后端";
export declare function userAgentProgress(worker: any): string;
export declare function sanitizeUserAgentProgressText(value: any, fallback?: string, max?: number): string;
export declare function normalizeUserAgentProgressStatus(status: any, phase?: string): "pending" | "completed" | "failed" | "running" | "blocked";
export declare function userAgentProgressStatusLabel(status: any): "失败" | "待补齐" | "执行中" | "等待中" | "已回传结果";
export declare function userAgentProgressDefaultSummary(agent: string, status: string, currentFocus?: string, blockers?: string[]): string;
export declare function userAgentProgressNextAction(status: string, currentFocus?: string): "等待我纳入验收和最终总结" | "我会按缺口精准返工" | "继续执行，完成后提交结果和验证" | "等待前置条件满足后派发" | "等待我分配下一步";
export declare function userAgentSessionStatus(session: any): string;
export declare function userAgentSessionSummary(session: any, status: string): string;
export declare function userAgentSessionEvidence(session: any, status: string): {
    id: string;
    label: string;
    value: string;
    detail: string;
};
export declare function agentNameMatches(value: any, name: string): boolean;
export declare function latestAgentMatch(rows: any[], name: string, picker: (item: any) => any): any;
export declare function isVisibleChildAgentName(name: string): boolean;
export declare function buildUserAgentProgressSummary(task: any, summary?: any, workers?: any[], executions?: any[], sessions?: any[], workItems?: any[], phase?: string): {
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
export declare function normalizeUserChangeFile(item: any, fallback?: any): any;
export declare function pushUserChangeFiles(target: any[], value: any, fallback?: any): void;
export declare function userChangeFileKey(file: any): string;
export declare function isGenericChangeOwner(value: any): boolean;
export declare function pickChangeOwner(current: any, incoming: any): string;
export declare function mergeUserChangeFile(current: any, incoming: any): any;
export declare function uniqueUserChangeFiles(rawFiles: any[]): any[];
export declare function buildUserChangeSummary(task: any, summary?: any, workers?: any[], workItems?: any[]): {
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
export declare function buildUserTaskActions(task: any, phase: string, executions: any[]): any[];
export declare function getTaskWorkItems(task: any, executions?: any[]): import("../../agents/work-items").MainAgentWorkItem[];
export declare function stableTaskEntityId(prefix: string, value: any): string;
export declare function groupSessionIdForTask(task: any): string;
export declare function buildTaskEntityChain(taskId: string): {
    version: number;
    task: {
        id: any;
        trace_id: any;
        group_id: any;
        title: any;
        status: any;
        workflow_type: any;
        collaboration_state: any;
        created_at: any;
        updated_at: any;
    };
    messages: {
        id: string;
        task_id: string;
        group_id: any;
        role: any;
        agent: any;
        type: any;
        timestamp: any;
        summary: string;
    }[];
    dispatches: import("./dispatch-records").DispatchRecord[];
    work_items: import("../../agents/work-items").MainAgentWorkItem[];
    executions: {
        id: any;
        task_id: any;
        project: any;
        state: any;
        runtime: any;
        workspace: any;
        process_ids: any;
        green: any;
        failure: any;
        updated_at: any;
    }[];
    sessions: any;
    trace: {
        trace_id: any;
        created_at: any;
        events: any;
    };
    receipts: {
        id: string;
        task_id: string;
        agent: any;
        status: any;
        summary: string;
        files_changed: any;
        verification: any;
        blockers: any;
        needs: any;
    }[];
    acceptance: {
        id: string;
        task_id: string;
        pass: boolean;
        gate: any;
        reviewed_at: any;
    };
    report: {
        id: string;
        task_id: string;
        status: any;
        content: any;
        generated_at: any;
    };
    links: {
        message_ids: any[];
        dispatch_ids: any[];
        work_item_ids: any[];
        execution_ids: any[];
        session_ids: any;
        receipt_ids: any[];
        acceptance_id: string;
        report_id: string;
    };
    consistency: {
        pass: boolean;
        checks: {
            task_has_trace: boolean;
            messages_reference_task: boolean;
            dispatches_reference_task: boolean;
            executions_reference_task: boolean;
            sessions_reference_task: any;
            work_items_reference_task: boolean;
            completed_task_has_acceptance: boolean;
            completed_task_has_report: boolean;
        };
    };
    generated_at: string;
};
export declare function buildTaskCardView(task: any, executions: any[], sessions: any[]): {
    version: number;
    visible: boolean;
    presentation: string;
    task_id: any;
    task_thread_id: any;
    title: any;
    goal: any;
    phase: string;
    phase_label: any;
    runtime_status: {
        schema: string;
        phase: string;
        phase_label: string;
        terminal: boolean;
        active: boolean;
        waiting: boolean;
        blocker_kind: string;
        status_detail: string;
        next_action: string;
        started_at: string;
        last_activity_at: string;
        completed_at: string;
        queue_position: number;
        review_round: number;
        max_review_rounds: number;
        provider_retry: {
            state: any;
            attempts: number;
            retry_after: any;
        };
        recovery_count: number;
    };
    status_detail: any;
    status: any;
    usage_summary: any;
    progress: any;
    active_agents: string[];
    responsible_projects: string[];
    responsibleProjects: string[];
    requires_confirmation: boolean;
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
        dispatch_launch_summary: any;
        dispatchLaunchSummary: any;
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
        dispatch_launch_summary: any;
        dispatchLaunchSummary: any;
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
            quality: any;
        }[];
        weak_receipts: {
            agent: any;
            status: any;
            summary: string;
            quality: any;
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
            quality: any;
        }[];
        weak_receipts: {
            agent: any;
            status: any;
            summary: string;
            quality: any;
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
    requirement_epic: {
        schema: any;
        content_hash: any;
        version: number;
        title: any;
        items: any;
        child_task_ids: any;
        summary: any;
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
        steps_hidden_count: number;
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
        architecture_plan: {
            goal: string;
            boundaries: any;
            data_relationships: any;
            dependency_steps: any;
            source_snapshot_checksum: any;
        };
        read_only_exploration: {
            summary: string;
            projects: any;
            knowledge_used: boolean;
            code_snapshot_used: boolean;
            source_ready: boolean;
            source_snapshot_checksum: any;
            source_evidence: any;
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
        gap_fingerprint: any;
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
            dispatch_launch_summary: any;
            dispatchLaunchSummary: any;
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
            dispatch_launch_summary: any;
            dispatchLaunchSummary: any;
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
export declare function normalizeContinuationKind(kind: string): string;
export declare function buildContinuationUserDecision(input?: any): {
    kind: string;
    kind_label: any;
    strategy: string;
    route_label: string;
    title: string;
    headline: string;
    reason: string;
    target: string;
    replan_required: boolean;
    interrupt_current_run: boolean;
    next_action: string;
    status_detail: string;
    steps: {
        id: string;
        label: string;
        detail: string;
    }[];
    timeline_type: string;
    timeline_detail: string;
};
export declare function buildUserContinuationStatus(task: any, phase?: string): {
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
export declare function shouldResumeAfterGoalRevisionInterruption(task: any, executionFollowupRevision?: number): boolean;
export declare function buildGoalRevisionInterruptedStatus(pending?: any[]): string;
export declare function shouldShowUserTaskCard(task: any, summary?: any, executions?: any[]): boolean;
export declare function timelineStatusForUser(item: any): "done" | "pending" | "failed" | "active" | "warning";
export declare function timelineLabelForUser(item: any): string;
export declare function buildUserWorkflowTimeline(task: any, summary: any, phase: string): any;
export declare function buildUserAgentQuestionRows(summary: any): any;
export declare function buildUserConflictWarnings(summary: any): any;
export declare function splitUserAcceptanceText(value: any): string[];
export declare function getTaskPlanMode(task: any): any;
export declare function buildUserWorkOrderPreview(task: any, summary?: any, planMode?: any): {
    title: string;
    source: string;
    ready: boolean;
    requires_confirmation: boolean;
    summary: string;
    orders: any;
};
export declare function executionStoryStatus(conditionDone: boolean, conditionActive: boolean, phase: string): "done" | "pending" | "failed" | "active" | "warning";
export declare function buildUserExecutionStory(task: any, summary?: any, executions?: any[], phase?: string, workOrderPreview?: any): {
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
export declare function buildUserCompletionReadinessSummary(task: any, summary?: any, workItems?: any[], phase?: string): {
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
export declare function sanitizeAcceptanceVisibleText(value: any, fallback?: string, max?: number): string;
export declare function normalizeUserAcceptanceCheck(item: any, context?: any): any;
export declare function buildUserAcceptanceReview(task: any, summary?: any, executions?: any[], phase?: string): {
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
export declare function planAlignmentEvidenceLabels(summary?: any, task?: any): {
    files: string[];
    verification: string[];
    receipts: any[];
    assignments: any;
};
export declare function planCriterionStatus(criterion: string, summary?: any, task?: any, acceptanceReview?: any): {
    ok: boolean;
    evidence: any[];
    detail: string;
};
export declare function buildUserPlanAlignmentReview(task: any, summary?: any, phase?: string, planMode?: any, workOrderPreview?: any, acceptanceReview?: any): {
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
export declare function buildUserHandoffSummary(task: any, summary?: any, phase?: string, nextAction?: string, blockers?: string[], acceptanceReview?: any, planAlignment?: any, changeSummary?: any): {
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
export declare function buildLiveMainAgentTodoPlan(task: any, phase: string, workers: any[], executions: any[], summary?: any): {
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
export declare function buildLiveMainAgentDecisionForTask(task: any, phase: string, liveTodoPlan: any, summary?: any): {
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
    dispatch_launch_summary: any;
    dispatchLaunchSummary: any;
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
export declare function getDashboardWorkerRows(task: any): {
    agent: string;
    task: any;
    status: any;
    summary: any;
    files_changed: any;
    verification: any;
    blockers: any[];
}[];
export declare function normalizeMainAgentActionIds(ids: any[]): string[];
export declare function buildGroupMainAgentInternalLoop(input: {
    mode: string;
    actionIds: string[];
    permissions: any[];
    taskIntent?: any;
    dispatchPolicy?: any;
    assignments?: any[];
    observations?: any;
    verified?: boolean;
}): {
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
export declare function buildUserVisiblePlanStep(input: {
    id: string;
    content: string;
    status: string;
    activeForm?: string;
    detail?: string;
    evidence?: any[];
    actions?: any[];
}): {
    id: string;
    content: string;
    subject: string;
    activeForm: string;
    active_form: string;
    summary: string;
    status: string;
    detail: string;
    user_visible: boolean;
    technical: boolean;
    evidence: any[];
    actions: any[];
};
export declare function buildMainAgentPlanVerificationReminder(input: {
    mode?: string;
    phase?: string;
    steps?: any[];
    summary?: any;
    task?: any;
    verified?: boolean;
}): {
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
export declare function normalizeLiveTodoStatus(status: string): string;
export declare function buildTodoStepEvidence(input: {
    task: any;
    summary: any;
    workers: any[];
    executions: any[];
    stepId: string;
    phase: string;
}): any[];
export declare function buildTodoStepActions(input: {
    task: any;
    stepId: string;
    status: string;
    phase: string;
    summary: any;
}): any[];
export declare function loopStageStatus(stage: any, input: {
    mode: string;
    actionIds: string[];
    blockedActions: string[];
    observations: any;
    verified?: boolean;
}): "in_progress" | "pending" | "completed" | "skipped" | "needs_confirmation";
export declare function planStepHasVerificationSignal(step: any): boolean;
export declare function summaryHasExecutedVerification(summary?: any): boolean;
export declare const GROUP_MAIN_AGENT_LOOP_STAGES: {
    id: string;
    label: string;
    title: string;
    actions: string[];
    purpose: string;
}[];
export declare const MAIN_AGENT_VERIFICATION_STEP_PATTERN: RegExp;

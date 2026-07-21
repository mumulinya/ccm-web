declare function buildMainAgentDecisionChain(input: {
    groupId: string;
    traceId: string;
    messageId?: string;
    taskId?: string;
    coordinator?: string;
    mode?: "conversation" | "project_analysis" | "project_task" | "delegation" | "followup" | "governance";
    messageMode?: string;
    taskIntent?: any;
    dispatchPolicy?: any;
    assignments?: any[];
    observations?: any;
    reply?: any;
    explicitGovernance?: boolean;
}): {
    version: number;
    trace_id: string;
    group_id: string;
    task_id: string;
    message_id: string;
    coordinator: string;
    mode: "project_analysis" | "conversation" | "delegation" | "followup" | "project_task" | "governance";
    decision: {
        selected_actions: any;
        dispatch_policy: any;
        reason: any;
    };
    internal_loop: any;
    loop: any;
    user_plan_steps: any[];
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
            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
    todo_plan: {
        title: string;
        source: string;
        schema: string;
        display: {
            max_visible_steps: number;
            quiet_completed: boolean;
            show_current_focus: boolean;
            user_visible: boolean;
            hide_for_simple_conversation: boolean;
        };
        strategy: string;
        verification_nudge: boolean;
        verification_reminder: any;
        steps: any[];
    };
    verification_reminder: any;
    verificationReminder: any;
    permissions: {
        action_id: string;
        risk: string;
        allowed: boolean;
        permission_mode: string;
        reason: string;
    }[];
    observation: any;
    verify: {
        passed: any;
        blocked_actions: string[];
        conclusion: string;
    };
    reply: {
        kind: any;
        message_id: any;
        preview: string;
    };
    created_at: string;
};
export declare function appendMainAgentDecisionTrace(input: Parameters<typeof buildMainAgentDecisionChain>[0]): {
    version: number;
    trace_id: string;
    group_id: string;
    task_id: string;
    message_id: string;
    coordinator: string;
    mode: "project_analysis" | "conversation" | "delegation" | "followup" | "project_task" | "governance";
    decision: {
        selected_actions: any;
        dispatch_policy: any;
        reason: any;
    };
    internal_loop: any;
    loop: any;
    user_plan_steps: any[];
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
            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
    todo_plan: {
        title: string;
        source: string;
        schema: string;
        display: {
            max_visible_steps: number;
            quiet_completed: boolean;
            show_current_focus: boolean;
            user_visible: boolean;
            hide_for_simple_conversation: boolean;
        };
        strategy: string;
        verification_nudge: boolean;
        verification_reminder: any;
        steps: any[];
    };
    verification_reminder: any;
    verificationReminder: any;
    permissions: {
        action_id: string;
        risk: string;
        allowed: boolean;
        permission_mode: string;
        reason: string;
    }[];
    observation: any;
    verify: {
        passed: any;
        blocked_actions: string[];
        conclusion: string;
    };
    reply: {
        kind: any;
        message_id: any;
        preview: string;
    };
    created_at: string;
};
export declare function applyMainAgentDecisionPetState(ctx: any, decision: any): void;
export declare function runGroupMainAgentToolLoopSelfTest(): {
    pass: boolean;
    checks: {
        conversationDoesNotCreateTask: boolean;
        projectAnalysisIsReadOnly: boolean;
        explicitTaskCreatesAndDispatches: any;
        highRiskGovernanceBlockedWithoutExplicitCommand: boolean;
        allHaveTraceShape: boolean;
        allHaveUserTodoPlan: boolean;
        conversationTodoSkipsDispatch: boolean;
        projectTaskTodoTracksExecution: boolean;
        governanceTodoNeedsConfirmation: boolean;
        planVerificationReminderVisibleWhenTaskPlanMissesVerification: boolean;
        planVerificationReminderNotSuppressedByReviewOnlyStep: boolean;
        planVerificationReminderHiddenForOrdinaryConversation: boolean;
        projectTaskTodoHasVerificationStepNoReminder: boolean;
        allHaveInternalLoop: boolean;
        conversationLoopSkipsAct: any;
        projectAnalysisLoopReadOnly: any;
        projectTaskLoopActsAndMonitors: any;
        governanceLoopBlocksUnauthorizedAct: any;
    };
    samples: {
        conversation: {
            version: number;
            trace_id: string;
            group_id: string;
            task_id: string;
            message_id: string;
            coordinator: string;
            mode: "project_analysis" | "conversation" | "delegation" | "followup" | "project_task" | "governance";
            decision: {
                selected_actions: any;
                dispatch_policy: any;
                reason: any;
            };
            internal_loop: any;
            loop: any;
            user_plan_steps: any[];
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            todo_plan: {
                title: string;
                source: string;
                schema: string;
                display: {
                    max_visible_steps: number;
                    quiet_completed: boolean;
                    show_current_focus: boolean;
                    user_visible: boolean;
                    hide_for_simple_conversation: boolean;
                };
                strategy: string;
                verification_nudge: boolean;
                verification_reminder: any;
                steps: any[];
            };
            verification_reminder: any;
            verificationReminder: any;
            permissions: {
                action_id: string;
                risk: string;
                allowed: boolean;
                permission_mode: string;
                reason: string;
            }[];
            observation: any;
            verify: {
                passed: any;
                blocked_actions: string[];
                conclusion: string;
            };
            reply: {
                kind: any;
                message_id: any;
                preview: string;
            };
            created_at: string;
        };
        analysis: {
            version: number;
            trace_id: string;
            group_id: string;
            task_id: string;
            message_id: string;
            coordinator: string;
            mode: "project_analysis" | "conversation" | "delegation" | "followup" | "project_task" | "governance";
            decision: {
                selected_actions: any;
                dispatch_policy: any;
                reason: any;
            };
            internal_loop: any;
            loop: any;
            user_plan_steps: any[];
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            todo_plan: {
                title: string;
                source: string;
                schema: string;
                display: {
                    max_visible_steps: number;
                    quiet_completed: boolean;
                    show_current_focus: boolean;
                    user_visible: boolean;
                    hide_for_simple_conversation: boolean;
                };
                strategy: string;
                verification_nudge: boolean;
                verification_reminder: any;
                steps: any[];
            };
            verification_reminder: any;
            verificationReminder: any;
            permissions: {
                action_id: string;
                risk: string;
                allowed: boolean;
                permission_mode: string;
                reason: string;
            }[];
            observation: any;
            verify: {
                passed: any;
                blocked_actions: string[];
                conclusion: string;
            };
            reply: {
                kind: any;
                message_id: any;
                preview: string;
            };
            created_at: string;
        };
        projectTask: {
            version: number;
            trace_id: string;
            group_id: string;
            task_id: string;
            message_id: string;
            coordinator: string;
            mode: "project_analysis" | "conversation" | "delegation" | "followup" | "project_task" | "governance";
            decision: {
                selected_actions: any;
                dispatch_policy: any;
                reason: any;
            };
            internal_loop: any;
            loop: any;
            user_plan_steps: any[];
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            todo_plan: {
                title: string;
                source: string;
                schema: string;
                display: {
                    max_visible_steps: number;
                    quiet_completed: boolean;
                    show_current_focus: boolean;
                    user_visible: boolean;
                    hide_for_simple_conversation: boolean;
                };
                strategy: string;
                verification_nudge: boolean;
                verification_reminder: any;
                steps: any[];
            };
            verification_reminder: any;
            verificationReminder: any;
            permissions: {
                action_id: string;
                risk: string;
                allowed: boolean;
                permission_mode: string;
                reason: string;
            }[];
            observation: any;
            verify: {
                passed: any;
                blocked_actions: string[];
                conclusion: string;
            };
            reply: {
                kind: any;
                message_id: any;
                preview: string;
            };
            created_at: string;
        };
        unsafeGovernance: {
            version: number;
            trace_id: string;
            group_id: string;
            task_id: string;
            message_id: string;
            coordinator: string;
            mode: "project_analysis" | "conversation" | "delegation" | "followup" | "project_task" | "governance";
            decision: {
                selected_actions: any;
                dispatch_policy: any;
                reason: any;
            };
            internal_loop: any;
            loop: any;
            user_plan_steps: any[];
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                            surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                        surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
                    surface: import("../../agents/workchain-part-01-part-01").MainAgentWorkchainSurface;
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
            todo_plan: {
                title: string;
                source: string;
                schema: string;
                display: {
                    max_visible_steps: number;
                    quiet_completed: boolean;
                    show_current_focus: boolean;
                    user_visible: boolean;
                    hide_for_simple_conversation: boolean;
                };
                strategy: string;
                verification_nudge: boolean;
                verification_reminder: any;
                steps: any[];
            };
            verification_reminder: any;
            verificationReminder: any;
            permissions: {
                action_id: string;
                risk: string;
                allowed: boolean;
                permission_mode: string;
                reason: string;
            }[];
            observation: any;
            verify: {
                passed: any;
                blocked_actions: string[];
                conclusion: string;
            };
            reply: {
                kind: any;
                message_id: any;
                preview: string;
            };
            created_at: string;
        };
    };
};
export declare function getWorkDirState(workDir: string): {
    exists: boolean;
    writable: boolean;
    path: string;
};
export declare function getClaudeLocalGatewayReadiness(probeTarget?: any): {
    ready: boolean;
    mode: string;
    message: string;
    fix_actions: string[];
    gateway: {
        baseUrl: string;
        host: string;
        port: number;
        ok: boolean;
        error: any;
    };
};
export declare function getChildProcessCapability(): any;
export declare function readRunnerJson(file: string): any;
export declare function normalizeAgentProbeTarget(target?: any): {
    groupId: string;
    project: string;
    agentType: string;
};
export declare function getAgentProbeTargetStatusKey(target: any): any;
export declare function getAgentProbeTargetStatusFile(target: any): string;
export declare function readAgentProbeStatusFile(file: string): any;
export declare function doesProbeTargetMatchRequired(probeTarget: any, requiredTarget: any): boolean;
export declare function listAgentProbeTargetStatuses(requiredTarget?: any): any[];
export declare function readAgentProbeStatus(requiredTarget?: any): any;
export declare function getAgentProbeHealth(probe: any): any;
export declare function writeAgentProbeStatus(data: any): void;
export declare function buildRunnerFixHint(error: string, agentType: string): string;
export declare function buildAgentExecutionFixActions(input?: {
    error?: string;
    agentType?: string;
    childProcess?: any;
    externalRunner?: any;
    probe?: any;
}): string[];
export declare function getAgentProbeOutputFailure(output: any): any;
export declare function getAgentExecutionReadiness(probeTarget?: any): any;
export declare function enforceAgentProbeExecutionReadiness(capability?: any): any;
export declare function getAgentProbeExecutionReadiness(probeTarget?: any): any;
export declare function taskRequiresFreshAgentProbe(task: any): boolean;
export declare function getTaskRequiredProbeTarget(task: any): {
    groupId: string;
    project: string;
    agentType: string;
};
export declare function getProbeTargetLabel(probe: any): string;
export declare function doesProbeMatchTaskTarget(probe: any, task: any): boolean;
export declare function taskNeedsGroupWideAgentProbe(task: any): any;
export declare function getExecutableProbeTargetsFromDevGroup(group: any): any;
export declare function summarizeAgentProbeTargets(targets: any[], probeResolver?: any): any;
export declare function getTaskGroupAgentProbeReadiness(task: any): {
    ready: any;
    mode: string;
    message: string;
    summary: any;
    fix_actions: string[];
};
export declare function enforceTaskAgentProbeReadiness(task: any, readiness: any): any;
export {};

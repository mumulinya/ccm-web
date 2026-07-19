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
}): "pending" | "in_progress" | "completed" | "skipped" | "needs_confirmation";
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

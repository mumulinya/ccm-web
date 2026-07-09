export declare function sanitizeMainAgentUserText(value: any, fallback?: string, max?: number): string;
export declare function buildStreamlinedToolUseSummary(input: {
    actionIds?: string[];
    steps?: any[];
    workers?: any[];
    executions?: any[];
    summary?: any;
}): {
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
export declare function buildTechnicalDetailSections(input: {
    traceId?: string;
    actionIds?: string[];
    permissions?: any[];
    observations?: any;
    technical?: any;
    rawEvents?: any[];
}): {
    id: string;
    title: string;
    items: any[];
}[];
export declare function buildMainAgentDisplayStream(input: {
    surface?: "group" | "global";
    mode: string;
    status?: string;
    phase?: string;
    userText?: string;
    goal?: string;
    actionIds?: string[];
    steps?: any[];
    permissions?: any[];
    observations?: any;
    traceId?: string;
    technical?: any;
    workers?: any[];
    executions?: any[];
    summary?: any;
    rawEvents?: any[];
    taskId?: string;
    runId?: string;
    missionId?: string;
    supervisorId?: string;
}): {
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

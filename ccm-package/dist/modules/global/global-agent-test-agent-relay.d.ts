export declare function createGlobalAgentTestAgentRelay(deps: any): {
    compactGlobalTestAgentExecutionPlanRelayEvent: (event?: any, options?: {
        globalRunId?: string;
        traceId?: string;
        status?: string;
        phase?: string;
    }) => {
        type: string;
        source: string;
        run_id: any;
        trace_id: any;
        status: string;
        phase: string;
        agent: any;
        taskId: any;
        task_id: any;
        detail: any;
        testAgentExecutionPlan: any;
        test_agent_execution_plan: any;
        testAgentExecutionPlanSummary: any;
        test_agent_execution_plan_summary: any;
        technical: {
            test_agent_execution_plan: any;
            test_agent_plan_dispatch: any;
            group_task_id: any;
        };
    };
    compactGlobalTestAgentReviewRelayEvent: (event?: any, options?: {
        globalRunId?: string;
        traceId?: string;
        status?: string;
        phase?: string;
    }) => {
        type: string;
        source: string;
        run_id: any;
        trace_id: any;
        status: string;
        phase: string;
        agent: any;
        taskId: any;
        task_id: any;
        detail: any;
        independent_review_summary: {
            schema: string;
            title: string;
            status: any;
            status_label: string;
            headline: any;
            rows: any[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
            test_agent_environment_prep: any;
            testAgentEnvironmentPrep: any;
        };
        independentReviewSummary: {
            schema: string;
            title: string;
            status: any;
            status_label: string;
            headline: any;
            rows: any[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
            test_agent_environment_prep: any;
            testAgentEnvironmentPrep: any;
        };
        test_agent_review_summary: {
            schema: string;
            title: string;
            status: any;
            status_label: string;
            headline: any;
            rows: any[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
            test_agent_environment_prep: any;
            testAgentEnvironmentPrep: any;
        };
        testAgentReviewSummary: {
            schema: string;
            title: string;
            status: any;
            status_label: string;
            headline: any;
            rows: any[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
            test_agent_environment_prep: any;
            testAgentEnvironmentPrep: any;
        };
        independent_review: any[];
        independentReview: any[];
        test_agent_report: any;
        testAgentReport: any;
        test_agent_verdict: any;
        testAgentVerdict: any;
        post_review_spot_check_summary: any;
        postReviewSpotCheckSummary: any;
        receipt: any;
        technical: {
            receipt: any;
            test_agent_report: any;
            test_agent_verdict: any;
            post_review_spot_check: any;
            group_task_id: any;
            independent_review_objects: {
                reviewer: any;
                verdict: any;
                summary: any;
                evidence: any[];
            }[];
            browser_provider_gaps: any;
            failure_step_screenshots: any;
            failure_step_screenshot_rows: any;
            test_agent_environment_prep: any;
        };
    };
    relayGlobalTestAgentEventFromGroup: (event?: any, options?: {
        globalRunId?: string;
        traceId?: string;
        status?: string;
        phase?: string;
        onEvent?: (event: any) => void;
    }) => {
        type: string;
        source: string;
        run_id: any;
        trace_id: any;
        status: string;
        phase: string;
        agent: any;
        taskId: any;
        task_id: any;
        detail: any;
        testAgentExecutionPlan: any;
        test_agent_execution_plan: any;
        testAgentExecutionPlanSummary: any;
        test_agent_execution_plan_summary: any;
        technical: {
            test_agent_execution_plan: any;
            test_agent_plan_dispatch: any;
            group_task_id: any;
        };
    } | {
        type: string;
        source: string;
        run_id: any;
        trace_id: any;
        status: string;
        phase: string;
        agent: any;
        taskId: any;
        task_id: any;
        detail: any;
        independent_review_summary: {
            schema: string;
            title: string;
            status: any;
            status_label: string;
            headline: any;
            rows: any[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
            test_agent_environment_prep: any;
            testAgentEnvironmentPrep: any;
        };
        independentReviewSummary: {
            schema: string;
            title: string;
            status: any;
            status_label: string;
            headline: any;
            rows: any[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
            test_agent_environment_prep: any;
            testAgentEnvironmentPrep: any;
        };
        test_agent_review_summary: {
            schema: string;
            title: string;
            status: any;
            status_label: string;
            headline: any;
            rows: any[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
            test_agent_environment_prep: any;
            testAgentEnvironmentPrep: any;
        };
        testAgentReviewSummary: {
            schema: string;
            title: string;
            status: any;
            status_label: string;
            headline: any;
            rows: any[];
            next_action: string;
            display_policy: {
                user_text_first: boolean;
                technical_default_collapsed: boolean;
                hide_internal_protocols: boolean;
                show_for_ordinary_conversation: boolean;
            };
            test_agent_environment_prep: any;
            testAgentEnvironmentPrep: any;
        };
        independent_review: any[];
        independentReview: any[];
        test_agent_report: any;
        testAgentReport: any;
        test_agent_verdict: any;
        testAgentVerdict: any;
        post_review_spot_check_summary: any;
        postReviewSpotCheckSummary: any;
        receipt: any;
        technical: {
            receipt: any;
            test_agent_report: any;
            test_agent_verdict: any;
            post_review_spot_check: any;
            group_task_id: any;
            independent_review_objects: {
                reviewer: any;
                verdict: any;
                summary: any;
                evidence: any[];
            }[];
            browser_provider_gaps: any;
            failure_step_screenshots: any;
            failure_step_screenshot_rows: any;
            test_agent_environment_prep: any;
        };
    };
};

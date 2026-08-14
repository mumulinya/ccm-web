export type TaskPlanScope = "project" | "group";
export declare function buildTaskPlanDetail(task: any): any;
export declare function buildTaskPlanPatch(task: any, payload: any): {
    revision: any;
    updates: {
        title: any;
        business_goal: any;
        work_items: any;
        acceptance_criteria: any;
        plan_detail_revision: any;
        user_visible_plan_revision: any;
        plan_revision_count: any;
        plan_revisions: any[];
        status_detail: string;
        intake_draft: any;
        workflow_meta: any;
    };
};
export declare function runTaskPlanDetailSelfTest(): {
    success: boolean;
    checks: {
        safeProjection: boolean;
        projectAssignments: boolean;
        structuredRevision: boolean;
        immutableCompletedItem: boolean;
        staleRevisionBlocked: boolean;
        dependencyCycleBlocked: boolean;
    };
};

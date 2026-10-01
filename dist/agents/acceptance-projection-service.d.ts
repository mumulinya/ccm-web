/** A display item references every source receipt; it never copies a review into a new identity. */
export declare function evaluateAcceptanceProjection(task: any, tasks: any[]): {
    canComplete: boolean;
    issues: string[];
    references: any[];
};
export declare function acceptanceProjectionUpdate(task: any, tasks: any[]): {
    status: "blocked";
    acceptance_state: string;
    dependency_blocked: boolean;
    status_detail: string;
    acceptance_projection?: undefined;
    delivery_summary?: undefined;
    global_mission_gate_passed?: undefined;
} | {
    status: "done";
    acceptance_state: string;
    dependency_blocked: boolean;
    acceptance_projection: {
        checksum: string;
        contentStored: boolean;
        schema: string;
        taskId: any;
        references: any[];
    };
    status_detail: string;
    delivery_summary: {
        headline: string;
        source_task_ids: any[];
        contentStored: boolean;
    };
    global_mission_gate_passed: boolean;
};
export declare function validateProjectionTerminal(task: any, updates: any, tasks: any[]): "验收展示项的全部来源终态回执尚未有效，不能完成" | "验收展示项的来源回执绑定缺失或已改变" | "验收展示项只能保存来源引用，不得复制其他任务的回执";
export declare function projectionTerminalDecision(task: any, updates: any, tasks: any[]): {
    checksum: string;
    schema: string;
    task_id: any;
    status: any;
    acceptance_state: string;
    actor: string;
    gate_passed: boolean;
    source_receipts: any[];
    evidence_registry: {
        evidenceIds: any[];
        validCount: number;
        staleCount: number;
        acceptance: {
            satisfied: boolean;
            criteria: any[];
            evidenceIds: any[];
        };
    };
    evidence_checksum: string;
    reason: any;
    decided_at: string;
};

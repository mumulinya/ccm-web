import type { CcmSessionTaskIndexV1 } from "../tasks/session-task-timeline";
export declare function buildTaskAwareSessionProjection(input: {
    messages: any[];
    sessionTaskIndex?: CcmSessionTaskIndexV1 | null;
    currentTaskId?: string;
}): {
    messages: any[];
    currentTaskMessageIds: string[];
    priorTaskMessageIds: string[];
    priorTaskSummaries: {
        taskId: string;
        status: "blocked" | "completed" | "failed" | "cancelled" | "open" | "interrupted";
        startSequence: number;
        endSequence: number;
        checksum: string;
        contentStored: boolean;
    }[];
};

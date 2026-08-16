import type { UserVisibleAgentEvent } from "./user-visible-agent-events";
export declare function projectEventFileDiff(event: UserVisibleAgentEvent, requestedPath: string, projectHint?: string): {
    schema: string;
    file: {
        project: string;
        path: any;
        status: string;
        additions: number;
        deletions: number;
    };
    diff: {
        reason?: string;
        available: boolean;
        raw: string;
        truncated: boolean;
    };
    freshness: any;
    contentStored: boolean;
};

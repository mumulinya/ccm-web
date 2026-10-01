import type { UserVisibleAgentEvent } from "./user-visible-agent-events";
export declare function projectEventFileSource(event: UserVisibleAgentEvent, projectHint?: string): {
    project: string;
    path: string;
    lines: {
        line: number;
        text: string;
    }[];
    offset: number;
    total_lines: number;
    checksum: string;
    freshness: "current" | "drifted";
    sourceFreshness: "active_worktree" | "accepted_delivery" | "current_authority";
    contentStored: false;
};

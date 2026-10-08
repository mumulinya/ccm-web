import type { AgentRun, AgentRunWorkspaceEvidence } from "./agent-run-types";
export interface AgentRunGitEvidence {
    repositoryRoot: string;
    headCommit: string;
    changedFiles: string[];
    diffChecksum: string;
    capturedAt: string;
}
/** Collects a bounded Git summary for Finalize. Diff content is hashed and
 * discarded; only the file list and checksum are persisted as artifacts. */
export declare function captureAgentRunGitEvidence(workspacePath: string): AgentRunGitEvidence | null;
export declare function captureAgentRunWorkspaceEvidence(run: Pick<AgentRun, "runId" | "workspacePath" | "worktreeId">): Promise<AgentRunWorkspaceEvidence>;
export declare function verifyAgentRunWorkspaceEvidence(run: AgentRun, expected: any): Promise<{
    valid: boolean;
    reason: string;
    actual?: AgentRunWorkspaceEvidence;
}>;

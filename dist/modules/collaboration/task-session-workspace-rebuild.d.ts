/** A delivered lane can only be replaced from an authoritative merge record.
 * This never restores a terminal Run or claims Native Session compatibility. */
export declare function verifyTaskSessionWorkspaceRebuild(task: any, session: any, previous: any, workspacePath: string): Promise<{
    mode: string;
    merge_commit: any;
    head_commit: string;
    execution_id: string;
}>;

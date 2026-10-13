/** Bind the developer's actual isolated lane before edits. Multi-project
 * workers may register only their project; never substitute another root. */
export declare function startDispatchAcceptanceAtWorkspace(taskId: string, project: string, workspacePath: string): void;
/** A handoff cannot invent a workspace. Only a matching frozen ledger can
 * grant the actual lane, and that lane must belong to the registered repo. */
export declare function resolveDispatchAcceptanceWorkspace(taskId: string, project: string, registeredRoot: string, groupId?: string): any;

import { type WorkspaceReadContextLedger, type WorkspaceReadRange } from './workspace-read-context';
/** Always validate actual content through the existing bounded reader. Stat
 * timestamps alone cannot detect same-size replacements or restored mtimes. */
export declare function readWorkspaceFileWithContext(input: {
    file: string;
    project: string;
    path: string;
    range: WorkspaceReadRange;
    context?: WorkspaceReadContextLedger;
    read: () => Promise<any>;
    decorate: (result: any) => any;
}): Promise<any>;

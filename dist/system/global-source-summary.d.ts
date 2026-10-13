export interface SourceAccessSummary {
    accessId: string;
    mode: 'direct' | 'delegated';
    status: string;
    runId: string;
    sourceMessageId: string;
    toolCallId: string;
    projectIds: string[];
    evidenceRefs: any[];
    missingEvidenceSummaries: string[];
    availableActions: string[];
    revision: number;
    inquiryId?: string;
    conclusionSummary?: string;
    evidenceRevisions?: any[];
}
export declare function assertSourceRunRead(run: any, principal: any): void;
export declare function buildSourceAccessSummaries(run: any): SourceAccessSummary[];
export declare function handleGlobalSourceAccessApi(pathname: string, req: any, res: any, parsed: any): boolean;

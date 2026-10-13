/** Legacy files are observations only. A current V2 binding must prove the
 * project/session identity before any legacy history is considered. */
export declare function readBoundLegacyProjectSession(project: string, sessionId: string, targets: any[]): any;
export declare function mergeBoundLegacyHistory(current: any[], incoming: any[]): any[];

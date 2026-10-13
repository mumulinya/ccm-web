/** Closed metadata projection: neither legacy nor new callers may persist source bodies. */
export declare function sourceEvidenceMetadata(values: any[]): {
    verified: boolean;
    kind: string;
    truncated: boolean;
    startLine?: any;
    endLine?: any;
    project: string;
    path: string;
    checksum: string;
    evidenceId: string;
}[];
export declare function retainEvidenceRevision(existing: any): any[];

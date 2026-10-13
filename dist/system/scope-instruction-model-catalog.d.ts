/** The model needs the read gate and document revision. Background job status
 * remains in management records and in precise read rejection evidence. */
export declare function renderScopeInstructionModelCatalog(entries: {
    fileName: string;
    documentId: string;
    status: string;
    revision: number;
}[]): string;

export declare function bootstrapGlobalHistoryInBatches(load: () => any, ingest: (input: any) => any): Promise<{
    total: number;
    migrated: number;
    results: any[];
}>;

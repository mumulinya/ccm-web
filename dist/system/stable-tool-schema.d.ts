export type StableToolSchemaProjection = {
    version: string;
    checksum: string;
    tools: any[];
    tokens: number;
    stable: boolean;
    contentStored: false;
};
export declare function buildStableToolSchema(tools?: any[], version?: string): StableToolSchemaProjection;

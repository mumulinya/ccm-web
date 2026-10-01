import type { WorkspaceReadContextLedger } from './workspace-read-context';
export declare const JSON_FIELDS_TOOL: {
    name: string;
    loadPolicy: "search";
    discoveryDescription: string;
    description: string;
    inputSchema: {
        type: string;
        required: string[];
        additionalProperties: boolean;
        properties: {
            project_id: {
                type: string;
            };
            path: {
                type: string;
            };
            pointers: {
                type: string;
                minItems: number;
                maxItems: number;
                items: {
                    type: string;
                    minLength: number;
                };
            };
            expected_checksum: {
                type: string;
            };
        };
    };
};
export declare function jsonFieldPointers(value: any): string[];
export declare function selectJsonFields(document: any, pointers: string[]): ({
    pointer: string;
    found: boolean;
    value?: undefined;
} | {
    pointer: string;
    found: boolean;
    value: any;
})[];
/** file is resolved by the existing workspace safePath / capability boundary. */
export declare function readWorkspaceJsonFields(file: string, project: string, relativePath: string, args: any, context?: WorkspaceReadContextLedger): Promise<{
    status: string;
    fields: ({
        pointer: string;
        found: boolean;
        value?: undefined;
    } | {
        pointer: string;
        found: boolean;
        value: any;
    })[];
    schema: string;
    project: string;
    path: string;
    checksum: string;
    pointers: string[];
    evidenceId: string;
} | {
    status: string;
    type: string;
    schema: string;
    project: string;
    path: string;
    checksum: string;
    pointers: string[];
    evidenceId: string;
}>;

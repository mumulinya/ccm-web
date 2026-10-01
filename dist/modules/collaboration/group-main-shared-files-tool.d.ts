export declare const GROUP_MAIN_SHARED_FILES_TOOL: {
    readonly canonicalName: "read_group_shared_files";
    readonly name: "read_group_shared_files";
    readonly server: "ccm-group-readonly";
    readonly description: "Read the authorized shared-file context for this exact group session. Use only when the user's request needs shared documents; the catalog exists without loading file bodies.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {};
        readonly additionalProperties: false;
    };
    readonly annotations: {
        readonly readOnlyHint: true;
    };
};
export declare function executeGroupMainSharedFilesTool(toolContext: any): {
    name: "read_group_shared_files";
    itemName: "read_group_shared_files";
    toolKind: string;
    source: string;
    scope: string;
    loaded: boolean;
    ok: boolean;
    output: string;
    outputTokens: number;
    resultChecksum: string;
};

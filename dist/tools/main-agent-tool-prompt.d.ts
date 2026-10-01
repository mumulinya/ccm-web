export declare const CCM_TOOL_USAGE_POLICY_VERSION = "ccm-agent-tool-usage-v3";
export declare function renderToolCatalogLine(tool: any, name: string, surface: 'native' | 'prompt'): string;
export type ToolPromptSections = {
    beforeCatalog: string[];
    afterCatalog: string[];
    catalogLabel: string;
};
export type ToolPromptLayout = {
    layoutVersion: 'ccm-prefix-layout-v4';
    stablePolicy: string;
    dynamicCatalog: string;
    runtimeContext: Array<{
        kind: 'scope_instructions' | 'skills' | 'availability';
        content: string;
    }>;
};
export declare function createToolPromptLayout(stable: string[], catalog: string, runtimeContext: ToolPromptLayout['runtimeContext']): ToolPromptLayout;
export declare function toolPromptSystemMessages(input: {
    identityRules: string;
    sessionGuidance?: string;
    toolPromptLayout: ToolPromptLayout;
}): any[];
export declare function refreshToolCatalogMessages(messages: any[], layout?: ToolPromptLayout): any[];
export declare function withoutPromptMetadata(messages: any[]): any[];
export declare function composeToolPolicy(sections: ToolPromptSections, catalog: string): string;

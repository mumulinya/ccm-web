import type { ProviderToolDefinition } from '../system/provider-native-tools';
export declare const DEFERRED_TOOL_SCHEMA_VERSION = "ccm-native-tools-v2";
export declare function deferredToolDefinition(): ProviderToolDefinition;
export declare function deferredToolCallVia(tool: any): "invoke_deferred_tool" | "invoke_mcp";
export declare function validateDeferredToolInput(tool: any, input: any): any;
export declare function resolveDeferredToolCall(name: string, args: any, tools: any[]): {
    name: string;
    arguments: any;
    targetSchemaChecksum?: undefined;
} | {
    name: string;
    arguments: any;
    targetSchemaChecksum: string;
};
export declare function resolveGlobalDeferredToolCall(run: any, name: string, args: any): {
    name: string;
    arguments: any;
    targetSchemaChecksum?: undefined;
} | {
    name: string;
    arguments: any;
    targetSchemaChecksum: string;
};
export declare function recordGlobalDeferredToolSchemas(run: any): void;
export declare function normalizeDeferredToolEvidence(run: any): {
    deferred_tool_binding_identity: string;
    deferred_tool_schema_bindings: {
        [k: string]: string;
    };
};
export declare function validateGlobalDeferredConfirmation(run: any, pending: any): void;

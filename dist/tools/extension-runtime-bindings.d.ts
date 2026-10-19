export declare function registerExtensionRuntimeBinding(snapshot: any, execution?: any): void;
export declare function assertExtensionRuntimeGeneration(context: any): void;
export declare function revokeExtensionRuntimeBindings(members: Array<{
    kind: string;
    name: string;
}>): any[];
export declare function extensionRuntimeRevocationCheck(taskId: string, executionId: string, meta?: any): () => boolean;

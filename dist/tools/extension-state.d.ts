export declare const EXTENSIONS_ROOT: string;
export interface ExtensionMember {
    kind: "mcp" | "skill";
    name: string;
    materialHash?: string;
    owned: boolean;
}
export interface ExtensionInstallationV1 {
    schema: "ccm-extension-installation-v1";
    id: string;
    name: string;
    description: string;
    version: string;
    source: {
        id: string;
        label: string;
        url?: string;
        trust?: string;
    };
    members: ExtensionMember[];
    materialHash: string;
    enabled: boolean;
    state: "preparing" | "active" | "failed" | "recovery_required" | "removed";
    transactionId: string;
    updatedAt: string;
    error?: string;
    previous?: ExtensionInstallationV1;
}
export declare function extensionHash(value: any): string;
export declare function readExtensionState(): {
    version: 1;
    items: ExtensionInstallationV1[];
    disabled: string[];
};
export declare function mutateExtensionState<T>(change: (state: ReturnType<typeof readExtensionState>) => T): T;
export declare function extensionMemberEnabled(kind: "mcp" | "skill", name: string): boolean;
export declare function extensionMemberAllowed(kind: "mcp" | "skill", name: string): boolean;
export declare function assertExtensionMemberEditable(kind: "mcp" | "skill", name: string): void;

export type RuntimeEditCapabilityResolution = {
    nativeWorkspaceEditing: boolean;
    source: "runtime_and_probe" | "runtime_declared" | "probe_denied" | "runtime_unsupported";
    verified: boolean;
    reason: string;
    observedAt: string;
};
export declare function resolveRuntimeEditCapability(input: {
    runtimeDeclared: boolean;
    probe?: any;
    maxProbeAgeMs?: number;
}): RuntimeEditCapabilityResolution;

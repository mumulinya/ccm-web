/** Local, no-provider regression checks for TestAgent hardening primitives. */
export declare function runTestAgentIsolationSelfTest(): Promise<{
    pass: boolean;
    checks: {
        commandReadonly: boolean;
        commandInstallBlocked: boolean;
        externalHostBlocked: boolean;
        browserMutationBlocked: boolean;
        manifestValid: boolean;
        manifestHasReadonlyMcp: boolean;
        isolationReceiptNo正文: boolean;
        policyBlocksInstallInSession: boolean;
    };
    manifest: {
        checksum: string;
        mcpCount: number;
        skillCount: number;
    };
    isolation: {
        status: import("./isolation").TestAgentIsolationStatus;
        mode: "blocked" | "none" | "controlled_worktree" | "disposable_copy" | "readonly_allowlist";
    };
}>;

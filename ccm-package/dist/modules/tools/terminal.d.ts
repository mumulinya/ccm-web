export declare function persistentTerminalCapability(): {
    schema: string;
    available: boolean;
    mode: string;
    reason: string;
    fallback: string;
};
export declare function stopAllTerminalRuns(): void;
export declare function handleTerminalApi(pathname: string, req: any, res: any): boolean;
export declare function runTerminalModuleSelfTest(): {
    success: boolean;
    checks: {
        capsHistory: any;
        capsOutput: any;
        validCwd: boolean;
        availableShells: string[];
        dangerousCommandBlocked: boolean;
    };
};
export declare function runPersistentTerminalSelfTest(): Promise<{
    success: boolean;
    checks: {
        shell: string;
        persistentOutput: boolean;
        dangerousCommandChallenge: boolean;
        resizeAccepted: boolean;
        processPid: number;
    };
}>;

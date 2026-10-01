export declare function persistentTerminalCapability(): {
    schema: string;
    available: boolean;
    mode: string;
    securityMode: string;
    perCommandGuard: string;
    reason: string;
    fallback: string;
};
export declare function authorizeTerminalCommandExecution(commandValue: any, cwdValue: any, challengeValue?: any): {
    allowed: boolean;
    cwd: string;
    confirmed?: undefined;
    challenge?: undefined;
    command?: undefined;
    code?: undefined;
} | {
    allowed: boolean;
    cwd: string;
    confirmed: boolean;
    challenge?: undefined;
    command?: undefined;
    code?: undefined;
} | {
    allowed: boolean;
    cwd: string;
    challenge: `${string}-${string}-${string}-${string}-${string}`;
    command: string;
    code: string;
    confirmed?: undefined;
};
export declare function stopAllTerminalRuns(): Promise<void>;
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

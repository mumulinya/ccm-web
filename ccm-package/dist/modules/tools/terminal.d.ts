export declare function stopAllTerminalRuns(): void;
export declare function handleTerminalApi(pathname: string, req: any, res: any): boolean;
export declare function runTerminalModuleSelfTest(): {
    success: boolean;
    checks: {
        capsHistory: any;
        capsOutput: any;
        validCwd: boolean;
    };
};

export interface TestAgentSelfTestMatrixOptions {
    selfTestModulePath?: string;
    names?: string[];
    pattern?: RegExp | string;
    timeoutMs?: number;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stopOnFailure?: boolean;
}
export interface TestAgentSelfTestMatrixItem {
    name: string;
    pass: boolean;
    durationMs: number;
    exitCode: number | null;
    timedOut: boolean;
    reason?: string | null;
    status?: string | null;
    stdoutTail: string;
    stderrTail: string;
}
export interface TestAgentSelfTestMatrixReport {
    pass: boolean;
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
    modulePath: string;
    timeoutMs: number;
    results: TestAgentSelfTestMatrixItem[];
}
export declare function discoverTestAgentSelfTests(selfTestModulePath?: string, pattern?: RegExp | string): string[];
export declare function runTestAgentSelfTestMatrix(options?: TestAgentSelfTestMatrixOptions): Promise<TestAgentSelfTestMatrixReport>;
export declare function formatTestAgentSelfTestMatrixSummary(report: TestAgentSelfTestMatrixReport): string;

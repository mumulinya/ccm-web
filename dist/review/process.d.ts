export declare function reviewProcess(command: string, args: string[], options: {
    cwd: string;
    timeoutMs: number;
    signal?: AbortSignal;
    env?: NodeJS.ProcessEnv;
    input?: string;
}): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
}>;
export declare function privateReviewEnv(home: string): NodeJS.ProcessEnv;

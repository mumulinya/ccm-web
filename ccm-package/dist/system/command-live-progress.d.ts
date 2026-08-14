type LiveCommandIdentity = {
    commandRunId: string;
    taskId: string;
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId: string;
    generation: number;
    attempt: number;
    anchorMessageId?: string;
    description: string;
};
export declare function sanitizeCommandLiveOutputForSelfTest(input: string, description?: string): {
    lines: string[];
    progress: {
        phase: "testing";
        safeSummary: string;
        completed: number;
        total?: undefined;
    } | {
        phase: "building";
        safeSummary: string;
        completed: number;
        total?: undefined;
    } | {
        phase: "building" | "testing";
        safeSummary: string;
        completed: number;
        total: number;
    } | {
        phase: "running" | "building" | "testing";
        safeSummary: string;
        completed?: undefined;
        total?: undefined;
    };
    contentStored: boolean;
};
export declare function createCommandLiveProgress(identity: LiveCommandIdentity): {
    observe: (chunk: Buffer | string) => void;
    finish: (status: string) => void;
};
export declare function getCommandLiveTail(commandRunId: string): {
    lines: string[];
    text: string;
    updatedAt: string;
    contentStored: boolean;
};
export {};

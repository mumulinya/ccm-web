export declare function createGlobalAgentFeishuActions(deps: any): {
    queueMusicPlayback: (baseUrl: string, keyword: string) => Promise<string>;
    fillCronParams: (params: any, originalText: string, groups?: any[], projects?: string[]) => any;
    executeFeishuManagementAction: (baseUrl: string, action: any, originalText?: string) => Promise<string>;
    executeFeishuAction: (baseUrl: string, action: any, originalText?: string, traceId?: string, options?: {
        globalRunId?: string;
        sessionId?: string;
        source?: string;
        onEvent?: (event: any) => void;
    }) => Promise<string>;
};

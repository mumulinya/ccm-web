export declare function createGlobalAgentFeishuActions(deps: any): {
    queueMusicPlayback: (baseUrl: string, keyword: string) => Promise<string>;
    executePlayMusic: (baseUrl: string, input?: {
        keyword?: string;
        mode?: string;
        source?: string;
        originalText?: string;
    }) => Promise<{
        success: boolean;
        message: string;
        client_effect: any;
        command: any;
        keyword?: undefined;
        mode?: undefined;
    } | {
        success: boolean;
        message: string;
        keyword: any;
        mode: string;
        command: any;
        client_effect: {
            type: string;
            params: {
                keyword: any;
                request_text: string;
                mode: string;
                command_id: any;
            };
        };
    }>;
    executeStopMusic: (baseUrl: string, input?: {
        source?: string;
    }) => Promise<{
        success: boolean;
        message: string;
        command: any;
        client_effect: {
            type: string;
            params: {
                command_id: any;
            };
        };
    }>;
    fillCronParams: (params: any, originalText: string, groups?: any[], projects?: string[]) => any;
    executeFeishuManagementAction: (baseUrl: string, action: any, originalText?: string) => Promise<string>;
    executeFeishuAction: (baseUrl: string, action: any, originalText?: string, traceId?: string, options?: {
        globalRunId?: string;
        sessionId?: string;
        source?: string;
        onEvent?: (event: any) => void;
    }) => Promise<string>;
};

export declare function createGlobalAgentStatusRuntime(deps: any): {
    isGlobalProgressStatusRequest: (message: string) => boolean;
    formatMissionStatus: (input?: {
        missions?: any[];
        tasks?: any[];
        globalRuns?: any[];
    }) => string;
    formatSystemStatus: () => string;
};

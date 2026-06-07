export declare function getLogs(projectName: string, lines?: number): string;
declare function startProject(projectName: string, agentType: string, port: number): {
    success: boolean;
    error: string;
    pid?: undefined;
} | {
    success: boolean;
    pid: number;
    error?: undefined;
};
declare function stopProject(projectName: string): {
    success: boolean;
    error: string;
} | {
    success: boolean;
    error?: undefined;
};
export { startProject, stopProject };
export declare function handleProjectsApi(pathname: string, req: any, res: any, parsed: any, ctx: {
    PORT: number;
    getSessions: Function;
    getAgentState: Function;
}): boolean;

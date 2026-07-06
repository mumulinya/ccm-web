type ProjectAnalysisDeps = {
    compactMemoryText: (value: any, max?: number) => string;
    compactPreserveLines: (value: any, max?: number) => string;
    getProjectExtraConfig: (projectName: string) => any;
    buildProjectMemoryPacket: (projectName: string, input?: any) => string;
};
export declare function buildProjectCodeReadOnlySnapshot(project: string, workDir: string, message: string, deps?: Pick<ProjectAnalysisDeps, "compactMemoryText">): string;
export declare function buildGroupProjectAnalysisContext(group: any, message: string, ctx: any, configs: any[], deps: ProjectAnalysisDeps): string;
export {};

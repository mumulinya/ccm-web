export declare const MCP_DIR: string;
export declare const SKILLS_DIR: string;
export declare const SKILL_PACKAGES_DIR: string;
export declare const AGENTS: {
    type: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
    name: "Claude Code" | "Codex CLI" | "Cursor Agent" | "Gemini CLI" | "OpenCode" | "Qoder CLI";
}[];
export declare function getConfigs(): any[];
export declare function getConfigInfo(configPath: string): any[];
export declare function isRunning(name: string): boolean;
export declare function getPid(name: string): string | null;
export declare function loadMcpTools(): any[];
export declare function saveMcpTool(tool: any): void;
export declare function deleteMcpTool(name: string): void;
export declare function loadSkills(): any[];
export declare function saveSkill(skill: any): void;
export declare function deleteSkill(name: string): void;
export declare function applyMetricToStore(value: any, agent: string, data?: any, now?: Date | string | number): any;
export declare function loadMetrics(): any;
export declare function saveMetrics(metrics: any): void;
export declare function recordMetric(agent: string, data: any): boolean;
export declare function runMetricsAggregationSelfTest(): {
    pass: boolean;
    checks: {
        separatesGroups: boolean;
        keepsMainAgentOutcomesSeparate: boolean;
        separatesRolesInsideGroup: boolean;
        retainsMemberMetricsInsideGroup: boolean;
        storesTraceIdentity: any;
        recordsUsageCoverage: boolean;
        recordsGlobalScope: boolean;
        recordsGlobalTokenUsage: boolean;
        storesGlobalEventScope: any;
    };
};
export declare function loadTasks(): any[];
export declare function saveTasks(tasks: any[]): {
    total: number;
    inserted: number;
    updated: number;
    deleted: number;
};
export declare function getTaskById(id: string): any;
export declare function updateTaskById(id: string, patchOrMutator: any): any;
export declare function listTasksByParentId(parentId: string): any[];
export declare function loadTemplates(): any[];
export declare function saveTemplates(templates: any[]): void;
export declare function loadProjectConfigs(): any;
export declare function saveProjectConfigs(configs: any): void;
export declare function loadMusicConfig(): any;
export declare function saveMusicConfig(cfg: any): void;
export declare function loadFeishuConfig(): any;
export declare function saveFeishuConfig(config: any): void;
export declare function loadCronJobs(): any[];
export declare function saveCronJobs(jobs: any[]): void;
export declare function loadDevReports(): any[];
export declare function saveDevReports(reports: any[]): void;
export declare function loadDevWeeklyReports(): any[];
export declare function saveDevWeeklyReports(reports: any[]): void;
export declare function loadAutoDevNotifyConfig(): any;
export declare function saveAutoDevNotifyConfig(config: any): void;
export declare function loadRagWatchPaths(): string[];
export declare function saveRagWatchPaths(paths: string[]): void;
export declare function loadRagMetadata(): Record<string, {
    tags: string[];
}>;
export declare function saveRagMetadata(metadata: Record<string, {
    tags: string[];
}>): void;

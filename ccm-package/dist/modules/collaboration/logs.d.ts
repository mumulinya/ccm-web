export declare function safeAddGroupLog(groupId: string, level: string, category: string, message: string, details?: any): void;
export declare function loadGroupLogs(): any;
export declare function saveGroupLogs(logs: any): void;
export declare function addGroupLog(groupId: string, level: string, category: string, message: string, details?: any): void;
export declare function addTaskLog(taskId: string, level: string, message: string): void;
export declare function appendTaskTimelineEvent(taskId: string, event?: any): {
    id: any;
    at: any;
    type: any;
    title: string;
    detail: string;
    status: any;
    agent: any;
    phase: any;
    data: any;
};
export declare function getTaskTimeline(task: any, execution?: any): any[];
export declare function getTaskLogs(taskId: string, limit?: number): any;
export declare function clearTaskLogs(taskId: string): void;

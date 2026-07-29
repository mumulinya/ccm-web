export type TaskReplayStatus = "info" | "running" | "passed" | "warning" | "failed" | "blocked" | "cancelled";
export declare function stableId(prefix: string, value: any): string;
export declare function iso(value: any, fallback?: string): string;
export declare function safeText(value: any, max?: number): string;
export declare function publicFile(value: any): string;
export declare function stringList(values: any, max?: number): string[];
export declare function safeTextList(values: any, max?: number, itemMax?: number): string[];
export declare function normalizeStatus(value: any): TaskReplayStatus;

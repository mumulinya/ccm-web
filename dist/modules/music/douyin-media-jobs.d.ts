import { type DouyinMcpToolName } from './douyin-mcp-bridge';
export type DouyinMediaJob = {
    id: string;
    tool: DouyinMcpToolName;
    args: Record<string, any>;
    status: 'waiting_confirmation' | 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
    phase: string;
    attempt: number;
    error?: string;
    result?: any;
};
export declare function listDouyinMediaJobs(): {
    result: any;
    artifacts: {
        name: string;
        url: string;
    }[];
    id: string;
    tool: DouyinMcpToolName;
    args: Record<string, any>;
    status: "waiting_confirmation" | "queued" | "running" | "done" | "failed" | "cancelled";
    createdAt: string;
    updatedAt: string;
    phase: string;
    attempt: number;
    error?: string;
}[];
export declare function resolveDouyinJobArtifact(id: string, index: number): string;
export declare function createDouyinMediaJob(tool: DouyinMcpToolName, input: Record<string, any>, confirmed?: boolean): {
    result: any;
    artifacts: {
        name: string;
        url: string;
    }[];
    id: string;
    tool: DouyinMcpToolName;
    args: Record<string, any>;
    status: "waiting_confirmation" | "queued" | "running" | "done" | "failed" | "cancelled";
    createdAt: string;
    updatedAt: string;
    phase: string;
    attempt: number;
    error?: string;
};
export declare function controlDouyinMediaJob(id: string, action: 'confirm' | 'cancel' | 'retry' | 'remove'): {
    result: any;
    artifacts: {
        name: string;
        url: string;
    }[];
    id: string;
    tool: DouyinMcpToolName;
    args: Record<string, any>;
    status: "waiting_confirmation" | "queued" | "running" | "done" | "failed" | "cancelled";
    createdAt: string;
    updatedAt: string;
    phase: string;
    attempt: number;
    error?: string;
};

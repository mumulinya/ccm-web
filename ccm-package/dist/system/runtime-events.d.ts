import type { IncomingMessage, ServerResponse } from "http";
export type RuntimeEventTopic = "task" | "permission" | "agent" | "feishu" | "project" | "group" | "cron" | "system";
export type RuntimeEvent = {
    id: number;
    topic: RuntimeEventTopic;
    type: string;
    at: string;
    data: Record<string, unknown>;
};
export declare function publishRuntimeEvent(topic: RuntimeEventTopic, type: string, data?: any): RuntimeEvent;
export declare function subscribeRuntimeEventListener(topics: RuntimeEventTopic[] | "*", handler: (event: RuntimeEvent) => void): () => boolean;
export declare function handleRuntimeEventsApi(pathname: string, req: IncomingMessage, res: ServerResponse, parsed: any): boolean;
export declare function runtimeEventBusSnapshot(): {
    clients: number;
    listeners: number;
    sequence: number;
    recent: number;
    maxRecent: number;
};
export declare function resetRuntimeEventBusForTest(): void;

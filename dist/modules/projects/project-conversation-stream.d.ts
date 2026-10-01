import type { ServerResponse } from "http";
export declare function projectConversationStreamKey(project: string, session: string, turn: string, attempt: string): string;
export declare class ProjectConversationStreams {
    private waitMs;
    private maxBytes;
    private streams;
    constructor(waitMs?: number, maxBytes?: number);
    private row;
    observe(key: string, res: ServerResponse, waitForOwner?: boolean): boolean;
    capture(key: string, res: ServerResponse): void;
}
export declare const projectConversationStreams: ProjectConversationStreams;

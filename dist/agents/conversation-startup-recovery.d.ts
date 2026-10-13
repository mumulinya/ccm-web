/** Startup may expose HTTP before recovery. New requests belong to this process. */
export declare function isPreStartupConversationTurn(turn: any, createdBefore?: number): boolean;

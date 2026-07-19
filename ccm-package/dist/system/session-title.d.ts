export type SessionTitleInput = {
    scope: "global" | "group" | "project";
    userMessage: string;
    assistantMessage?: string;
    attachmentNames?: string[];
};
export type SessionTitleResult = {
    title: string;
    source: "model" | "fallback" | "skipped";
    error?: string;
};
export declare function isSessionTitlePlaceholder(title: any, origin?: any): boolean;
export declare function isMeaningfulSessionTitleInput(value: any): boolean;
export declare function fallbackSessionTitle(input: SessionTitleInput): string;
export declare function generateSessionTitleWithModel(input: SessionTitleInput, options?: {
    modelCall?: (request: {
        system: string;
        user: string;
        input: SessionTitleInput;
    }) => Promise<any>;
}): Promise<SessionTitleResult>;

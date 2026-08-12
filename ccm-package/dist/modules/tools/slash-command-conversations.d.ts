export declare function runConversationAside(input: any, options?: {
    onDelta?: (delta: string) => void;
    signal?: AbortSignal;
}): Promise<{
    schema: string;
    answer: string;
    basedOnSnapshotAt: string;
    contentStored: boolean;
}>;
export declare function handleSlashCommandConversationApi(pathname: string, req: any, res: any, parsed: any): boolean;
export declare function runSlashCommandConversationSelfTest(): {
    pass: boolean;
    checks: {
        stripsSecrets: boolean;
        keepsSafeFields: boolean;
        visibleCloneDropsLocalCommands: boolean;
        visibleCloneKeepsConversation: boolean;
    };
};

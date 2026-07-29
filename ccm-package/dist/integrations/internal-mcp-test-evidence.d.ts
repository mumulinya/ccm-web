export declare function readInternalMcpTestEvidenceContent(taskId: string, input?: any, options?: {
    rootDir?: string;
}): {
    content: ({
        type: string;
        text: string;
        data?: undefined;
        mimeType?: undefined;
    } | {
        type: string;
        data: string;
        mimeType: string;
        text?: undefined;
    })[];
};

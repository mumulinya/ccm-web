declare function inferAttachmentType(name: string): string;
declare function safeAttachmentUrl(value: any): string;
export declare function serializeGlobalRequestAttachments(files?: any[]): {
    name: string;
    size: number;
    type: string;
    upload_url: string;
    attachment_owner: string;
}[];
export declare function sanitizeGlobalHistoryAttachments(value: any, role: string): {
    attachment_owner: string;
    upload_url?: string;
    name: string;
    size: number;
    type: string;
}[];
export declare const __globalAgentAttachmentTestHooks: {
    inferAttachmentType: typeof inferAttachmentType;
    safeAttachmentUrl: typeof safeAttachmentUrl;
};
export {};

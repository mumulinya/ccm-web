export declare const FEISHU_SCOPES: string[];
export declare function downloadFeishuMessageResource(input: {
    messageId: string;
    fileKey: string;
    type?: "file" | "image";
    maxBytes?: number;
}): Promise<{
    buffer: Buffer<ArrayBuffer>;
    content_type: string;
    content_disposition: string;
    size: number;
}>;
export type FeishuMessageResourceDescriptor = {
    kind: "image" | "file";
    key: string;
    name: string;
};
/**
 * Reads only the attachment metadata for one exact Feishu message.  The
 * resource body is still fetched through downloadFeishuMessageResource so the
 * same tenant identity, byte limit and timeout are applied in both paths.
 */
export declare function getFeishuMessageResources(messageIdValue: string): Promise<FeishuMessageResourceDescriptor[]>;
export declare function getFeishuUserToken(appId: string, appSecret: string, code: string): Promise<any>;
export declare function getFeishuUserInfo(accessToken: string): Promise<any>;
export declare function getFeishuChatList(accessToken: string): Promise<any[]>;
export declare function getValidFeishuToken(): Promise<any>;
export declare function sendFeishuMessageToUser(userId: string, content: string, msgType?: string): Promise<boolean>;
export declare function sendFeishuMessageToTarget(options: {
    receiveId: string;
    receiveIdType?: "chat_id" | "open_id" | "user_id";
    title?: string;
    markdown?: string;
    text?: string;
    replyToMessageId?: string;
    updateMessageId?: string;
    replyInThread?: boolean;
    actions?: Array<{
        text: string;
        type?: "primary" | "default" | "danger";
        value: Record<string, any>;
    }>;
}): Promise<any>;
export declare function probeFeishuControlBotApi(): Promise<any>;
export declare function buildFeishuReportCard(title: string, markdown: string, actions?: Array<{
    text: string;
    type?: "primary" | "default" | "danger";
    value: Record<string, any>;
}>): any;
export declare function generateFeishuWebhookSignature(timestamp: string | number, secret: string): string;
export declare function sendFeishuWebhookReportMessage(config: any, options: {
    title: string;
    markdown: string;
    timeoutMs?: number;
}): Promise<any>;
export declare function sendFeishuReportMessage(options: {
    title: string;
    markdown: string;
    timeoutMs?: number;
}): Promise<any>;

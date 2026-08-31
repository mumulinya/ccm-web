export declare class FeishuClient {
    private appId;
    private appSecret;
    private tokenCache;
    private baseUrl;
    constructor(appId: string, appSecret: string);
    getAccessToken(): Promise<string>;
    private request;
    listChats(pageSize?: number, pageToken?: string): Promise<any>;
    getChatHistory(chatId: string, startTime?: string, endTime?: string, pageSize?: number, pageToken?: string): Promise<any>;
    getMessageDetail(messageId: string): Promise<any>;
    getChatInfo(chatId: string): Promise<any>;
    getChatMembers(chatId: string): Promise<any>;
}
export declare function parseMessageContent(msgType: string, content: string): string;
export declare function formatTimestamp(ts: string): string;

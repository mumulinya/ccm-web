export declare const FEISHU_SCOPES: string[];
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
}): Promise<any>;
export declare function probeFeishuControlBotApi(): Promise<any>;
export declare function sendFeishuReportMessage(options: {
    title: string;
    markdown: string;
}): Promise<any>;

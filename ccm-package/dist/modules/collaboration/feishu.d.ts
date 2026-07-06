export declare const FEISHU_SCOPES: string[];
export declare function getFeishuUserToken(appId: string, appSecret: string, code: string): Promise<any>;
export declare function getFeishuUserInfo(accessToken: string): Promise<any>;
export declare function getFeishuChatList(accessToken: string): Promise<any[]>;
export declare function getValidFeishuToken(): Promise<any>;
export declare function sendFeishuMessageToUser(userId: string, content: string, msgType?: string): Promise<boolean>;
export declare function sendFeishuReportMessage(options: {
    title: string;
    markdown: string;
}): Promise<any>;

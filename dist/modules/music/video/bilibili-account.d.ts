export declare function biliRead(owner: string, endpoint: string, params?: Record<string, any>, cookie?: string, signal?: AbortSignal): Promise<any>;
export declare function verifyBiliAccount(owner: string, cookie?: string): Promise<{
    id: string;
    name: any;
    avatar: any;
}>;
export declare function biliQrStart(): Promise<any>;
export declare function biliQrPoll(key: string): Promise<any>;
export declare function refreshBiliProfile(owner: string): Promise<{
    id: string;
    name: any;
    avatar: any;
}>;

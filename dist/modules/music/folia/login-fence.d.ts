export declare function cancelFoliaLogin(owner: string, provider: string, input: any): {
    success: boolean;
    skipped: boolean;
} | {
    success: boolean;
    skipped?: undefined;
};
export declare function clearFoliaSession(owner: string, provider: string): void;
export declare function beginFoliaLoginRequest(owner: string, provider: string, endpoint: string, req: any, body?: any): (_data: any) => void;
export declare function noteFoliaProfile(owner: string, provider: string, endpoint: string, data: any): void;

export type VideoProvider = 'bilibili' | 'douyin';
export declare function videoProvider(value: any): VideoProvider;
export declare const videoOwner: () => string;
export declare const videoAccount: (owner: string, provider: VideoProvider) => any;
export declare const writeVideoAccount: (owner: string, provider: VideoProvider, fields: any) => any;
export declare const videoEpoch: (owner: string, provider: VideoProvider) => number;
export declare function videoCookie(owner?: string, provider?: VideoProvider): string;
export declare function videoStorage(owner: string, provider: VideoProvider): any;
export declare function beginVideoAttempt(owner: string, provider: VideoProvider): {
    epoch: number;
    attemptId: `${string}-${string}-${string}-${string}-${string}`;
};
export declare function requireVideoAttempt(owner: string, provider: VideoProvider, attempt: any): void;
export declare function commitVideoSession(owner: string, provider: VideoProvider, attempt: any, cookie: string, profile: any, storage?: any): void;
export declare function clearVideoSession(owner: string, provider: VideoProvider): void;
export declare function publicVideoAccount(owner: string, provider: VideoProvider): {
    provider: VideoProvider;
    status: any;
    loginState: any;
    attemptId: any;
    expiresAt: any;
    profile: any;
    sessionRef: any;
    verifiedAt: any;
    error: string;
};

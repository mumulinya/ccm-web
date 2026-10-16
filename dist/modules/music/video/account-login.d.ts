import { VideoProvider } from './accounts-store';
export declare function startVideoLogin(owner: string, provider: VideoProvider, refresh?: boolean, visible?: boolean): Promise<any>;
export declare function cancelVideoLogin(owner: string, provider: VideoProvider, attemptId?: string): Promise<{
    provider: VideoProvider;
    status: any;
    loginState: any;
    attemptId: any;
    expiresAt: any;
    profile: any;
    sessionRef: any;
    verifiedAt: any;
    error: string;
}>;
export declare function logoutVideo(owner: string, provider: VideoProvider): Promise<{
    provider: VideoProvider;
    status: any;
    loginState: any;
    attemptId: any;
    expiresAt: any;
    profile: any;
    sessionRef: any;
    verifiedAt: any;
    error: string;
}>;
export declare function videoQr(owner: string, provider: VideoProvider, attemptId: string): string;
export declare function verifyVideoAccount(owner: string, provider: VideoProvider): Promise<{
    provider: VideoProvider;
    status: any;
    loginState: any;
    attemptId: any;
    expiresAt: any;
    profile: any;
    sessionRef: any;
    verifiedAt: any;
    error: string;
}>;
export declare function closeVideoAccounts(): Promise<void>;
export declare function videoAccountStatus(owner: string, provider: VideoProvider): {
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

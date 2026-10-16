export declare function foliaProviderStatus(owner: string): {
    success: boolean;
    runtime: {
        [k: string]: {
            status: string;
            error: string;
        };
    };
    providers: {
        provider: string;
        configured: boolean;
        hasSession: boolean;
        profile: any;
        checkedAt: any;
        sessionStatus: string;
        instanceId: any;
        capabilities: {
            search: boolean;
            playback: boolean;
            lyrics: boolean;
            ccmPlaylists: boolean;
            platformPlaylists: boolean;
            platformMutations: boolean;
        };
    }[];
};

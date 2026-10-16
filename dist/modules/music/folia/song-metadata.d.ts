export declare function cleanFoliaSong(song: any, track: any): {
    id: string;
    name: string;
    artists: any;
    album: {
        id: string;
        name: string;
    };
    durationMs: number;
    sourceRef: {
        kind: string;
        mediaId: any;
        providerId?: undefined;
        providerData?: undefined;
    } | {
        kind: string;
        providerId: any;
        mediaId: any;
        providerData: {
            [k: string]: string;
        };
    };
};

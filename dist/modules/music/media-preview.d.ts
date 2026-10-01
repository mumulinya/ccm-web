export declare function stopMusicPreview(id: string): void;
export declare function previewStatus(id: string): {
    id: string;
    status: any;
    mediaKind: any;
    limitSeconds: number;
    bufferedDuration: any;
    error: any;
    errorKind: any;
    manifestUrl: string;
};
export declare function createMusicPreview(body: any): {
    id: string;
    status: any;
    mediaKind: any;
    limitSeconds: number;
    bufferedDuration: any;
    error: any;
    errorKind: any;
    manifestUrl: string;
};
export declare function handlePreviewRead(pathname: string, req: any, res: any): boolean;

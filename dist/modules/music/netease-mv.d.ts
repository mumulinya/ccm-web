export declare function cachedNeteaseMv(songId: string): string;
export declare function rememberNeteaseMv(songId: string, mv: any): void;
export declare function neteaseJson(url: string): Promise<any>;
export declare function resolveNeteaseMv(songId: string): Promise<string>;
export declare function neteaseVideoIdentity(songId: string): string;
export declare function getNeteaseMvInput(identity: string): Promise<{
    input: string;
    headers: {
        Referer: string;
    };
    duration: number;
}>;

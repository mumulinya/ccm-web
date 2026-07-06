export declare const BILI_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
export declare function ensureBuvid3(): Promise<string>;
export declare function ensureWbiKey(): Promise<void>;
export declare function signBiliParams(params: Record<string, string>): string;
export declare function biliSearch(keyword: string): Promise<any[]>;
export declare function getBiliAudioUrl(bvid: string): Promise<string>;
export declare function getBiliCookieHeader(): string;

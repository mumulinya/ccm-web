export declare function foliaLyricProxyRequest(req: any, body: any): {
    maxBytes: number;
    body?: string;
    url: string;
    allowedHosts: string[];
    method: any;
    headers: Record<string, string>;
};
export declare function foliaLyricProxy(req: any, res: any, body: any): Promise<void>;

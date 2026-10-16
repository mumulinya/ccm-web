export declare function douyinQrStart(): Promise<{
    token: string;
    qrcodeUrl: string;
}>;
export declare function douyinQrPoll(token: string): Promise<{
    status: string;
    code: number;
    cookie: string;
    redirectUrl: string;
}>;

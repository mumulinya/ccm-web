export declare function detailIdentity(body: any): {
    source: any;
    sourceId: any;
    title: any;
    artist: any;
    track: any;
} | {
    track: any;
    v: 1;
    source: import("./search-results").MusicSource;
    sourceId: string;
    title: string;
    artist: string;
    exp: number;
};
/** 返回最近一次成功详情，避免瞬态上游空响应让详情抽屉整体失效。 */
export declare function readMusicDetailResilient(body: any): Promise<any>;
/** 显式字段投影：不透传上游原始对象、签名媒体地址或凭据。 */
export declare function readMusicDetail(body: any): Promise<any>;

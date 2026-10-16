export declare function cleanVideoItem(input: any): {
    duration?: number;
    requiresAuth?: boolean;
    title: string;
    author: string;
    bvid: string;
    type: any;
    sourceId: string;
} | {
    duration?: number;
    requiresAuth?: boolean;
    title: string;
    author: string;
    awemeId: string;
    type: any;
    sourceId: string;
};
export declare function cleanVideoState(input: any): {
    current: {
        duration?: number;
        requiresAuth?: boolean;
        title: string;
        author: string;
        bvid: string;
        type: any;
        sourceId: string;
    } | {
        duration?: number;
        requiresAuth?: boolean;
        title: string;
        author: string;
        awemeId: string;
        type: any;
        sourceId: string;
    };
    queue: any;
    position: number;
};

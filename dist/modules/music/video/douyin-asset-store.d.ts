export declare const douyinOwnerDirectory: () => string;
export declare const getDouyinAsset: (id: string, kind: string) => any;
export declare const getDouyinAssetById: (id: string) => any;
export declare const listDouyinAssets: (limit?: number) => any[];
export declare function upsertDouyinAsset(value: any): any;
export declare function upsertDouyinOperation(value: any): any;
export declare function findActiveDouyinOperation(id: string, kind: string): any;

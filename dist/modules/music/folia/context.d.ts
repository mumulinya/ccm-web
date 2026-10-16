export declare const withFoliaRequest: <T>(req: any, operation: () => T) => T;
export declare const bindFoliaRequest: <T extends (...args: any[]) => any>(req: any, operation: T) => T;
export declare const currentFoliaOwner: () => string;

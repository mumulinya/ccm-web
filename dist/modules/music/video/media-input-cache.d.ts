export declare function videoMediaInput(provider: string, id: string, read: (signal: AbortSignal) => Promise<any>, signal?: AbortSignal): Promise<any>;
export declare function clearVideoMediaInputs(owner: string, provider?: string): void;
export declare function invalidateVideoMediaInput(provider: string, id: string): void;

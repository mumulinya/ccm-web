export declare function createDouyinRecommendationReader(owner: string): Promise<{
    alive: () => boolean;
    read(index: number, signal: AbortSignal): Promise<any>;
    close(): Promise<void>;
}>;

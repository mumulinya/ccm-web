import { type VideoProvider } from './accounts-store';
export declare function closeVideoRecommendations(owner?: string, provider?: VideoProvider): void;
export declare function readVideoRecommendations(owner: string, provider: VideoProvider, id: string, cursor: string, refresh: boolean, signal: AbortSignal): Promise<any>;

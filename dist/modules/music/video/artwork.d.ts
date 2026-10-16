import { VideoProvider } from './accounts-store';
export declare function videoCoverTarget(provider: VideoProvider, value: string): string;
export declare function registerVideoArtwork(owner: string, provider: VideoProvider, id: string, url: string): string;
export declare function sendVideoArtwork(owner: string, provider: VideoProvider, id: string, res: any): Promise<void>;

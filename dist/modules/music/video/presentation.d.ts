import { VideoProvider } from './accounts-store';
export declare function presentVideo(owner: string, provider: VideoProvider, row: any): any;
export declare function videoMetadata(owner: string, provider: VideoProvider, id: string): Promise<any>;

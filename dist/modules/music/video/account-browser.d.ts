import { VideoProvider } from './accounts-store';
export declare function launchVideoBrowser(visible?: boolean): Promise<import("playwright-core").Browser>;
export declare function closeVideoBrowsers(): Promise<void>;
export declare function createVideoBrowser(owner: string, provider: VideoProvider, visible?: boolean, useSession?: boolean): Promise<{
    browser: import("playwright-core").Browser;
    context: import("playwright-core").BrowserContext;
    page: import("playwright-core").Page;
}>;
export declare const browserCookie: (context: any, provider: VideoProvider) => Promise<any>;
export declare function fetchDouyinSelfProfile(page: any): Promise<{
    id: any;
    name: any;
    avatar: any;
}>;
export declare function observeDouyinProfile(page: any, onProfile: (profile: any) => void): () => any;
export declare function readDouyinProfile(owner: string): Promise<any>;

import { musicPlatformRequest } from '../platform-http';
type CoverResult = Awaited<ReturnType<typeof musicPlatformRequest>> & {
    coverReader?: string;
};
export declare function neteaseCoverRelayUrl(url: URL): string;
export declare function readFoliaCover(url: URL, relayEnabled?: boolean): Promise<CoverResult>;
export {};

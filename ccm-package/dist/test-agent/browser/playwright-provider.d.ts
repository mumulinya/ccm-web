import { BrowserProvider } from "./provider-types";
type PlaywrightLoader = () => any;
export declare function checkPlaywrightAvailability(loadPlaywright?: PlaywrightLoader): Promise<{
    available: boolean;
    reason: string;
    diagnostics: {
        packageAvailable: boolean;
        launchChecked: boolean;
        browser?: undefined;
        channel?: undefined;
        launchAttempt?: undefined;
        launchFallbackErrors?: undefined;
        launchAttempts?: undefined;
    };
} | {
    available: boolean;
    diagnostics: {
        packageAvailable: boolean;
        launchChecked: boolean;
        browser: string;
        channel: any;
        launchAttempt: string;
        launchFallbackErrors: string[];
        launchAttempts?: undefined;
    };
    reason?: undefined;
} | {
    available: boolean;
    reason: string;
    diagnostics: {
        packageAvailable: boolean;
        launchChecked: boolean;
        browser: string;
        launchAttempts: string[];
        channel?: undefined;
        launchAttempt?: undefined;
        launchFallbackErrors?: undefined;
    };
}>;
export declare const PlaywrightBrowserProvider: BrowserProvider;
export {};

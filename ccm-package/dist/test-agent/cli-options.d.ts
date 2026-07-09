import { TestAgentOptions } from "./types";
export interface TestAgentCliOptions {
    workOrderPath: string;
    handoffPath: string;
    verifyArtifactsPath: string;
    help: boolean;
    validateOnly: boolean;
    planOnly: boolean;
    summary: boolean;
    json: boolean;
    artifactDir?: string;
    browserProvider?: TestAgentOptions["browserProvider"];
    autoDiscoverVerificationCommands?: boolean;
}
export interface TestAgentCliParseResult {
    options: TestAgentCliOptions;
    errors: string[];
}
export declare function testAgentCliUsage(): string;
export declare function parseTestAgentCliArgs(args: string[]): TestAgentCliParseResult;
export declare function cliOverrides(options: TestAgentCliOptions): Partial<TestAgentOptions>;

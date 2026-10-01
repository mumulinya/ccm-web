interface ScreenshotArtifactInput {
    artifactDir: string;
    projectName: string;
    checkName: string;
    index: number;
    captures: any[];
}
export declare function writeMcpScreenshotArtifacts(input: ScreenshotArtifactInput): string[];
export {};

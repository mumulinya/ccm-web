import { BrowserStepResult } from "../types";
export declare function writePlaywrightFailureScreenshot(input: {
    page: any;
    artifactDir: string;
    projectName: string;
    checkName: string;
    index: number;
    failedStep?: BrowserStepResult;
}): Promise<string[]>;

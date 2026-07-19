import { BrowserStepResult } from "../types";
export type BrowserScreenshotRef = {
    stepName: string;
    path: string;
    kind: "failure" | "capture";
};
export declare function writePlaywrightFailureScreenshot(input: {
    page: any;
    artifactDir: string;
    projectName: string;
    checkName: string;
    index: number;
    failedStep?: BrowserStepResult;
}): Promise<BrowserScreenshotRef[]>;

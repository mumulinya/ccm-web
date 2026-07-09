"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureMcpFailureScreenshot = captureMcpFailureScreenshot;
const utils_1 = require("../utils");
const evidence_artifacts_1 = require("./evidence-artifacts");
const screenshot_artifacts_1 = require("./screenshot-artifacts");
async function captureMcpFailureScreenshot(input) {
    const stepName = (0, utils_1.safeSegment)(input.failedStep?.name || "browser-failure") || "browser-failure";
    const failureCheckName = `${input.checkName}-failure-${stepName}`;
    try {
        const captures = await input.adapter.captureScreenshot(failureCheckName);
        const screenshots = (0, screenshot_artifacts_1.writeMcpScreenshotArtifacts)({
            artifactDir: input.artifactDir,
            projectName: input.projectName,
            checkName: failureCheckName,
            index: input.index,
            captures,
        });
        const browserArtifacts = input.collectBrowserArtifacts
            ? (0, evidence_artifacts_1.writeBrowserEvidenceArtifacts)({
                artifactDir: input.artifactDir,
                projectName: input.projectName,
                checkName: failureCheckName,
                index: input.index,
                captures,
                source: `${input.adapter.id}:failureScreenshot`,
            })
            : [];
        return { screenshots, browserArtifacts };
    }
    catch {
        return { screenshots: [], browserArtifacts: [] };
    }
}
//# sourceMappingURL=mcp-failure-screenshots.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTO_BROWSER_SMOKE_PROBE_TYPE = void 0;
exports.autoPageContentAssertion = autoPageContentAssertion;
exports.buildAutoBrowserSmokeCheck = buildAutoBrowserSmokeCheck;
exports.buildBrowserChecksForProject = buildBrowserChecksForProject;
const acceptance_derived_checks_1 = require("./acceptance-derived-checks");
exports.AUTO_BROWSER_SMOKE_PROBE_TYPE = "auto_target_url_smoke";
function autoPageContentAssertion() {
    return {
        type: "jsTruthy",
        expression: "document.body && (((document.body.innerText || document.body.textContent || '').trim().length > 0) || document.body.children.length > 0)",
    };
}
function buildAutoBrowserSmokeCheck(project, acceptanceCriteria = []) {
    if (!project.targetUrl)
        return null;
    const acceptanceAssertions = (0, acceptance_derived_checks_1.buildAcceptanceDerivedBrowserAssertions)(acceptanceCriteria).map(item => item.assertion);
    return {
        name: `Auto browser smoke: ${project.name}`,
        url: project.targetUrl,
        probeType: exports.AUTO_BROWSER_SMOKE_PROBE_TYPE,
        actions: [
            { type: "goto", url: project.targetUrl, waitUntil: "domcontentloaded" },
            { type: "waitForTimeout", value: "250" },
        ],
        assertions: [
            autoPageContentAssertion(),
            ...acceptanceAssertions,
            { type: "consoleNoErrors" },
            { type: "networkNoErrors" },
        ],
        screenshot: true,
    };
}
function buildBrowserChecksForProject(project, acceptanceCriteria = []) {
    const explicit = [...project.browserChecks, ...project.adversarialBrowserChecks];
    if (explicit.length)
        return explicit;
    const auto = buildAutoBrowserSmokeCheck(project, acceptanceCriteria);
    return auto ? [auto] : [];
}

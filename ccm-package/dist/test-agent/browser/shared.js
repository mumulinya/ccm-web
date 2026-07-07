"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wantsBrowser = wantsBrowser;
exports.checksForProject = checksForProject;
const utils_1 = require("../utils");
const auto_checks_1 = require("./auto-checks");
function wantsBrowser(workOrder) {
    if (workOrder.options.browserProvider === "none")
        return false;
    if ((0, utils_1.hasRequiredCheck)(workOrder.requiredChecks, /browser|e2e|screenshot|console/i))
        return true;
    return workOrder.projects.some(project => !!project.targetUrl || project.browserChecks.length > 0 || project.adversarialBrowserChecks.length > 0);
}
function checksForProject(project, acceptanceCriteria = []) {
    return (0, auto_checks_1.buildBrowserChecksForProject)(project, acceptanceCriteria);
}
//# sourceMappingURL=shared.js.map
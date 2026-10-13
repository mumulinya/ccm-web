"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDispatchWorkerScope = validateDispatchWorkerScope;
const dispatch_profile_1 = require("../../agents/dispatch-profile");
function validateDispatchWorkerScope(task, contract, actualFiles, workspacePath) {
    const profile = (0, dispatch_profile_1.resolveDispatchProfileSnapshot)(task).profile;
    const base = (0, dispatch_profile_1.resolveDispatchScope)(task);
    const scope = { ...base, recommendedPaths: [...new Set([...base.recommendedPaths, ...(contract?.files || [])])], forbiddenPaths: [...new Set([...base.forbiddenPaths, ...(contract?.forbiddenPaths || [])])] };
    const decisions = actualFiles.map(file => ({ file, decision: (0, dispatch_profile_1.evaluateDispatchPath)(file, scope, profile, workspacePath) }));
    return { valid: decisions.every(row => row.decision.allowed), issues: decisions.filter(row => !row.decision.allowed).map(row => `文件变化未获授权：${row.file}（${row.decision.reason}）`), advisoryFiles: decisions.filter(row => row.decision.advisory).map(row => row.file), actual: actualFiles };
}
//# sourceMappingURL=dispatch-worker-scope.js.map
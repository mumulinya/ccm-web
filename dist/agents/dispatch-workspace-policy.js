"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDispatchPlanningRun = isDispatchPlanningRun;
exports.dispatchCheckoutWorkspace = dispatchCheckoutWorkspace;
exports.requiresExclusiveDispatchWorkspace = requiresExclusiveDispatchWorkspace;
exports.canonicalDispatchWorkspace = canonicalDispatchWorkspace;
exports.resolveDispatchWorkspaceMode = resolveDispatchWorkspaceMode;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../core/db");
const agent_run_store_1 = require("./agent-run-store");
function isDispatchPlanningRun(input) {
    return input.agentId === "project-main-agent" && input.source === "project-main-agent"
        || input.agentId === "group-main-agent" && input.source === "group-main-agent"
        || input.agentId === "global-agent" && input.source === "global-agent-loop";
}
/** An orchestrator retains its Run lease and logical Task Checkout. The child
 * performing edits owns the physical workspace lane, not its planning parent. */
function dispatchCheckoutWorkspace(input) {
    return isDispatchPlanningRun(input)
        ? { workspacePath: "", worktreeId: "" }
        : { workspacePath: input.workspacePath, worktreeId: input.worktreeId };
}
function requiresExclusiveDispatchWorkspace(input) {
    const task = (0, db_1.loadTasks)().find(row => row.id === input.taskId);
    return !!task?.dispatch_profile_snapshot && input.scope !== "test_agent" && !isDispatchPlanningRun(input);
}
function canonicalDispatchWorkspace(directory) {
    try {
        const real = fs.realpathSync(directory);
        return process.platform === "win32" ? real.toLowerCase() : real;
    }
    catch {
        return path.resolve(directory);
    }
}
/** Plan isolation before launch. The SQLite Checkout still arbitrates races
 * between two starts that both observed a free lane. */
function resolveDispatchWorkspaceMode(baseWorkDir, options, requested) {
    const task = options.taskId && (0, db_1.loadTasks)().find(row => row.id === options.taskId);
    if (!task?.dispatch_profile_snapshot)
        return { mode: requested, failClosed: options.failClosed === true };
    const profile = task.dispatch_profile_snapshot.profile;
    if (profile === "strict")
        return { mode: "worktree", failClosed: true };
    if (profile === "standard" && requested === "shared" && baseWorkDir) {
        const directory = canonicalDispatchWorkspace(baseWorkDir);
        const conflict = (0, agent_run_store_1.listAgentRuns)({ limit: 10000 }).some(run => run.taskId !== task.id && run.workspacePath
            && !["succeeded", "failed", "cancelled"].includes(run.status) && !isDispatchPlanningRun(run)
            && run.scope !== "test_agent" && canonicalDispatchWorkspace(run.workspacePath) === directory);
        if (conflict)
            return { mode: "worktree", failClosed: true };
    }
    return { mode: requested, failClosed: options.failClosed === true || requested === "worktree" };
}
//# sourceMappingURL=dispatch-workspace-policy.js.map
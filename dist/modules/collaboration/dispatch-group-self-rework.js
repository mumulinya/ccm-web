"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGroupDispatchSelfReview = runGroupDispatchSelfReview;
const db_1 = require("../../core/db");
const main_agent_self_verification_1 = require("./main-agent-self-verification");
const dispatch_quick_verification_1 = require("./dispatch-quick-verification");
const dispatch_self_review_1 = require("./dispatch-self-review");
/** Group light/standard repairs share the same persisted quota as project
 * and independent review. Re-read evidence after each real worker dispatch. */
async function runGroupDispatchSelfReview(input) {
    return (0, dispatch_self_review_1.runDispatchSelfReview)({
        taskId: input.taskId, workspacePath: input.projects.length === 1 ? input.projects[0].workDir : "",
        verify: async () => {
            const task = (0, db_1.loadTasks)().find(row => row.id === input.taskId);
            if (!task)
                throw new Error("群聊返工任务不存在");
            const changedFiles = require("./collaboration-runtime-status-helpers").collectTaskActualFileChanges(task, {});
            if (input.light)
                return (0, dispatch_quick_verification_1.runDispatchQuickVerification)({ task, project: input.projects[0].name,
                    workDir: input.projects[0].workDir, changedFiles, verificationCommands: input.projects[0].verificationCommands });
            return (0, main_agent_self_verification_1.runMainAgentSelfVerification)({ task, policy: input.policy,
                acceptanceCriteria: String(task.acceptance_criteria || "").split(/\r?\n|；/).filter(Boolean),
                changedFiles, projects: input.projects, workerOutputs: input.outputs,
                workerReceipts: (task.work_items || []).map((item) => item.lastReceipt).filter(Boolean),
                sourceSnapshotChecksum: String(task.planning_source_evidence?.checksum || "") });
        },
        repair: async (round, gaps) => { input.outputs.push(...await input.repair(round, gaps)); },
    });
}
//# sourceMappingURL=dispatch-group-self-rework.js.map
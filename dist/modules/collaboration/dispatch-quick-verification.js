"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDispatchQuickVerification = runDispatchQuickVerification;
const main_agent_self_verification_1 = require("./main-agent-self-verification");
const dispatch_worker_scope_1 = require("../projects/dispatch-worker-scope");
const collaboration_task_service_1 = require("./collaboration-task-service");
/** Lightweight project delivery uses observed changes and real commands, never
 * an additional model assertion or a fabricated self-verification receipt. */
async function runDispatchQuickVerification(input) {
    const audit = (0, dispatch_worker_scope_1.validateDispatchWorkerScope)(input.task, null, input.changedFiles.map(row => String(row?.path || row?.file || row)), input.workDir);
    const configured = input.task.quick_check_commands || input.task.verification_commands || input.verificationCommands;
    const commands = Array.isArray(configured) && configured.length ? configured : ["git diff --check"];
    const receipt = await (0, main_agent_self_verification_1.runQuickTaskVerification)({ ...input, verificationCommands: commands });
    (0, collaboration_task_service_1.updateTask)(input.task.id, { quick_check_receipt: receipt });
    const canAccept = receipt.canAccept && audit.valid;
    const problems = [...audit.issues, ...receipt.verification_results.filter(row => row.status !== "passed").map(row => row.error || row.command)];
    if (!receipt.changed_files.length)
        problems.push("未捕获本任务的文件变化");
    return {
        mode: "quick_check", canAccept, checksum: receipt.checksum,
        status: canAccept ? "passed" : "failed", quick_check_receipt: receipt,
        deterministic_gate: { pass: canAccept, checks: [{ id: "dispatch_scope", pass: audit.valid }, { id: "verification_passed", pass: receipt.canAccept }] },
        report: { summary: canAccept ? "范围检查和真实快速验证通过" : problems.join("；"),
            verification: receipt.verification_results.map(row => `${row.command}: ${row.status}`), risks: problems },
    };
}
//# sourceMappingURL=dispatch-quick-verification.js.map
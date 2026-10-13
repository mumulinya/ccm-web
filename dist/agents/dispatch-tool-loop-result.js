"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertDispatchToolLoopResult = assertDispatchToolLoopResult;
const db_1 = require("../core/db");
/** Legacy loops can return diagnostic text. A frozen development Task cannot
 * treat an unfinished tool round as a successful Runtime result. */
function assertDispatchToolLoopResult(taskId, result) {
    if (!(0, db_1.loadTasks)().find(task => task.id === taskId)?.dispatch_profile_snapshot)
        return;
    if (["continuation_failed", "max_rounds", "duplicate_call"].includes(result?.termination))
        throw Object.assign(new Error("工具结果续跑未完成，需处理阻塞后继续原任务"), {
            code: "CCM_DISPATCH_CONTINUATION_BLOCKED", termination: result.termination,
        });
}
//# sourceMappingURL=dispatch-tool-loop-result.js.map
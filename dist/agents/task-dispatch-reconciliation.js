"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskDispatchStatus = taskDispatchStatus;
exports.syncTaskDispatchProjection = syncTaskDispatchProjection;
exports.reconcileDispatchCandidates = reconcileDispatchCandidates;
const db_1 = require("../core/db");
const task_query_1 = require("../core/task-query");
const cooperative_batch_1 = require("../system/cooperative-batch");
function taskDispatchStatus(task) {
    const status = String(task?.status || 'pending').toLowerCase();
    return ['done', 'completed', 'success', 'accepted'].includes(status) ? 'completed'
        : ['failed', 'error'].includes(status) ? 'failed'
            : ['cancelled', 'canceled', 'archived'].includes(status) ? 'cancelled'
                : ['in_progress', 'running', 'executing', 'verifying', 'reviewing', 'reworking', 'blocked', 'waiting', 'needs_user'].includes(status) ? 'sending' : 'queued';
}
// A projection with no matching turn or no change has no durable mutation.
// Actual changes still reread under the existing interprocess file lock.
function syncTaskDispatchProjection(task, read, mutate, emit) {
    const taskId = String(task?.id || '').trim();
    if (!taskId)
        return null;
    const nextStatus = taskDispatchStatus(task);
    const find = (store) => store.turns.find((turn) => turn.kind === 'task_dispatch' && turn.task_id === taskId);
    const current = find(read());
    if (!current || current.status === nextStatus || current.metadata?.dismissed_by_user === true)
        return current || null;
    return mutate(store => {
        const turn = find(store);
        if (!turn || turn.status === nextStatus || turn.metadata?.dismissed_by_user === true)
            return turn || null;
        turn.status = nextStatus;
        turn.revision++;
        turn.updated_at = new Date().toISOString();
        turn.checkpoint = `task_${String(task?.status || 'pending').toLowerCase()}`;
        if (['completed', 'failed', 'cancelled'].includes(nextStatus)) {
            turn.settled_at = turn.updated_at;
            turn.lease_id = '';
            turn.lease_expires_at = '';
        }
        emit(turn, 'task_sync');
        return turn;
    });
}
let running = null;
let rerunRequested = false;
function reconcileDispatchCandidates(existing, admit, sync) {
    if (running) {
        rerunRequested = true;
        return running;
    }
    running = (async () => {
        let admitted = 0;
        do {
            rerunRequested = false;
            const candidates = new Map();
            // Successful history cannot create a dispatch turn. Existing terminal
            // turns are explicitly added below so their projection is still repaired.
            for (const task of (0, task_query_1.queryHydratedTasks)("t.archived=0 AND t.status NOT IN ('done','completed','success','accepted','failed','error','cancelled','canceled','archived')"))
                candidates.set(task.id, task);
            for (const turn of existing()) {
                if (turn.kind !== 'task_dispatch' || !turn.task_id || candidates.has(turn.task_id))
                    continue;
                const task = (0, db_1.getTaskById)(turn.task_id);
                if (task)
                    candidates.set(task.id, task);
            }
            await (0, cooperative_batch_1.forEachCooperatively)(candidates.values(), task => {
                try {
                    if (admit(task))
                        admitted++;
                    sync(task);
                }
                catch { /* Preserve per-task recovery isolation. */ }
            });
        } while (rerunRequested);
        return { admitted };
    })().finally(() => { running = null; });
    return running;
}
//# sourceMappingURL=task-dispatch-reconciliation.js.map
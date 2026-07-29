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
exports.canonicalWorkspaceMutationLane = canonicalWorkspaceMutationLane;
exports.withUnifiedWorkspaceMutationLane = withUnifiedWorkspaceMutationLane;
exports.scheduleUnifiedTaskOperation = scheduleUnifiedTaskOperation;
exports.getUnifiedTaskSchedulerStatus = getUnifiedTaskSchedulerStatus;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const priorityWeight = { high: 3, normal: 2, low: 1 };
const laneQueues = new Map();
const runningLanes = new Set();
const activeTaskIds = new Set();
const workspaceTails = new Map();
let sequence = 0;
function safeKey(value, fallback) {
    const normalized = String(value || "").trim().replace(/[^a-zA-Z0-9_.:-]+/g, "_").slice(0, 240);
    return normalized || fallback;
}
function canonicalWorkspaceMutationLane(workDir, fallback = "workspace:unknown") {
    const requested = String(workDir || "").trim();
    if (!requested)
        return fallback;
    let resolved = path.resolve(requested);
    try {
        resolved = fs.realpathSync.native(resolved);
    }
    catch { }
    const identity = process.platform === "win32" ? resolved.toLowerCase() : resolved;
    return `workspace:${crypto.createHash("sha256").update(identity).digest("hex").slice(0, 24)}`;
}
function stateFor(entry, state, position = 0, extra = {}) {
    return {
        schema: "ccm-unified-task-scheduler-state-v2",
        task_id: entry.taskId,
        queue_key: entry.queueKey,
        workspace_lane: entry.workspaceLane,
        state,
        position,
        queued_at: entry.queuedAt,
        ...extra,
    };
}
function notifyQueuePositions(queueKey) {
    const queue = laneQueues.get(queueKey) || [];
    queue.forEach((entry, index) => {
        try {
            entry.onState?.(stateFor(entry, "queued", index + 1));
        }
        catch { }
    });
}
async function withUnifiedWorkspaceMutationLane(workspaceLane, operation) {
    const key = safeKey(workspaceLane, "workspace:unknown");
    const previous = workspaceTails.get(key) || Promise.resolve();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const tail = previous.catch(() => undefined).then(() => gate);
    workspaceTails.set(key, tail);
    await previous.catch(() => undefined);
    try {
        return await operation();
    }
    finally {
        release();
        if (workspaceTails.get(key) === tail)
            workspaceTails.delete(key);
    }
}
async function pumpLane(queueKey) {
    if (runningLanes.has(queueKey))
        return;
    const queue = laneQueues.get(queueKey);
    if (!queue?.length)
        return;
    runningLanes.add(queueKey);
    try {
        while (queue.length) {
            const entry = queue.shift();
            activeTaskIds.add(entry.taskId);
            notifyQueuePositions(queueKey);
            const startedAt = new Date().toISOString();
            try {
                entry.onState?.(stateFor(entry, "running", 0, { started_at: startedAt }));
            }
            catch { }
            try {
                const value = await withUnifiedWorkspaceMutationLane(entry.workspaceLane, entry.operation);
                try {
                    entry.onState?.(stateFor(entry, "completed", 0, { started_at: startedAt, settled_at: new Date().toISOString() }));
                }
                catch { }
                entry.resolve(value);
            }
            catch (error) {
                try {
                    entry.onState?.(stateFor(entry, "failed", 0, {
                        started_at: startedAt,
                        settled_at: new Date().toISOString(),
                        error: String(error?.message || error || "任务执行失败").slice(0, 500),
                    }));
                }
                catch { }
                entry.reject(error);
            }
            finally {
                activeTaskIds.delete(entry.taskId);
            }
        }
    }
    finally {
        runningLanes.delete(queueKey);
        if (queue.length === 0)
            laneQueues.delete(queueKey);
        else
            void pumpLane(queueKey);
    }
}
function scheduleUnifiedTaskOperation(input) {
    const taskId = safeKey(input.taskId, "task:unknown");
    const queueKey = safeKey(input.queueKey, `task:${taskId}`);
    const workspaceLane = safeKey(input.workspaceLane, `workspace:${taskId}`);
    return new Promise((resolve, reject) => {
        const queue = laneQueues.get(queueKey) || [];
        if (activeTaskIds.has(taskId) || queue.some(entry => entry.taskId === taskId)) {
            reject(new Error("任务已在统一调度队列中"));
            return;
        }
        const entry = {
            taskId,
            queueKey,
            workspaceLane,
            priority: input.priority || "normal",
            sequence: ++sequence,
            queuedAt: new Date().toISOString(),
            operation: input.operation,
            onState: input.onState,
            resolve,
            reject,
        };
        queue.push(entry);
        queue.sort((left, right) => {
            const weight = (priorityWeight[String(right.priority)] || 2) - (priorityWeight[String(left.priority)] || 2);
            return weight || left.sequence - right.sequence;
        });
        laneQueues.set(queueKey, queue);
        notifyQueuePositions(queueKey);
        void pumpLane(queueKey);
    });
}
function getUnifiedTaskSchedulerStatus() {
    return {
        schema: "ccm-unified-task-scheduler-status-v2",
        queued: [...laneQueues.values()].reduce((sum, queue) => sum + queue.length, 0),
        running_lanes: [...runningLanes],
        running_task_ids: [...activeTaskIds],
        workspace_lanes: [...workspaceTails.keys()],
        queues: [...laneQueues.entries()].map(([queueKey, queue]) => ({
            queue_key: queueKey,
            task_ids: queue.map(entry => entry.taskId),
        })),
    };
}
//# sourceMappingURL=unified-task-scheduler.js.map
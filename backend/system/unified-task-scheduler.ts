import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

type QueuePriority = "high" | "normal" | "low" | string;

export type UnifiedTaskSchedulerState = {
  schema: "ccm-unified-task-scheduler-state-v2";
  task_id: string;
  queue_key: string;
  workspace_lane: string;
  state: "queued" | "running" | "completed" | "failed";
  position: number;
  queued_at: string;
  started_at?: string;
  settled_at?: string;
  error?: string;
};

type ScheduledEntry<T> = {
  taskId: string;
  queueKey: string;
  workspaceLane: string;
  priority: QueuePriority;
  sequence: number;
  queuedAt: string;
  operation: () => Promise<T>;
  onState?: (state: UnifiedTaskSchedulerState) => void;
  resolve: (value: T) => void;
  reject: (error: any) => void;
};

const priorityWeight: Record<string, number> = { high: 3, normal: 2, low: 1 };
const laneQueues = new Map<string, ScheduledEntry<any>[]>();
const runningLanes = new Set<string>();
const activeTaskIds = new Set<string>();
const workspaceTails = new Map<string, Promise<void>>();
let sequence = 0;

function safeKey(value: any, fallback: string) {
  const normalized = String(value || "").trim().replace(/[^a-zA-Z0-9_.:-]+/g, "_").slice(0, 240);
  return normalized || fallback;
}

export function canonicalWorkspaceMutationLane(workDir: any, fallback = "workspace:unknown") {
  const requested = String(workDir || "").trim();
  if (!requested) return fallback;
  let resolved = path.resolve(requested);
  try { resolved = fs.realpathSync.native(resolved); } catch {}
  const identity = process.platform === "win32" ? resolved.toLowerCase() : resolved;
  return `workspace:${crypto.createHash("sha256").update(identity).digest("hex").slice(0, 24)}`;
}

function stateFor(entry: ScheduledEntry<any>, state: UnifiedTaskSchedulerState["state"], position = 0, extra: Partial<UnifiedTaskSchedulerState> = {}) {
  return {
    schema: "ccm-unified-task-scheduler-state-v2" as const,
    task_id: entry.taskId,
    queue_key: entry.queueKey,
    workspace_lane: entry.workspaceLane,
    state,
    position,
    queued_at: entry.queuedAt,
    ...extra,
  };
}

function notifyQueuePositions(queueKey: string) {
  const queue = laneQueues.get(queueKey) || [];
  queue.forEach((entry, index) => {
    try { entry.onState?.(stateFor(entry, "queued", index + 1)); } catch {}
  });
}

export async function withUnifiedWorkspaceMutationLane<T>(workspaceLane: string, operation: () => Promise<T>): Promise<T> {
  const key = safeKey(workspaceLane, "workspace:unknown");
  const previous = workspaceTails.get(key) || Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const tail = previous.catch(() => undefined).then(() => gate);
  workspaceTails.set(key, tail);
  await previous.catch(() => undefined);
  try {
    return await operation();
  } finally {
    release();
    if (workspaceTails.get(key) === tail) workspaceTails.delete(key);
  }
}

async function pumpLane(queueKey: string) {
  if (runningLanes.has(queueKey)) return;
  const queue = laneQueues.get(queueKey);
  if (!queue?.length) return;
  runningLanes.add(queueKey);
  try {
    while (queue.length) {
      const entry = queue.shift()!;
      activeTaskIds.add(entry.taskId);
      notifyQueuePositions(queueKey);
      const startedAt = new Date().toISOString();
      try { entry.onState?.(stateFor(entry, "running", 0, { started_at: startedAt })); } catch {}
      try {
        const value = await withUnifiedWorkspaceMutationLane(entry.workspaceLane, entry.operation);
        try { entry.onState?.(stateFor(entry, "completed", 0, { started_at: startedAt, settled_at: new Date().toISOString() })); } catch {}
        entry.resolve(value);
      } catch (error: any) {
        try {
          entry.onState?.(stateFor(entry, "failed", 0, {
            started_at: startedAt,
            settled_at: new Date().toISOString(),
            error: String(error?.message || error || "任务执行失败").slice(0, 500),
          }));
        } catch {}
        entry.reject(error);
      } finally {
        activeTaskIds.delete(entry.taskId);
      }
    }
  } finally {
    runningLanes.delete(queueKey);
    if (queue.length === 0) laneQueues.delete(queueKey);
    else void pumpLane(queueKey);
  }
}

export function scheduleUnifiedTaskOperation<T>(input: {
  taskId: string;
  queueKey: string;
  workspaceLane: string;
  priority?: QueuePriority;
  operation: () => Promise<T>;
  onState?: (state: UnifiedTaskSchedulerState) => void;
}): Promise<T> {
  const taskId = safeKey(input.taskId, "task:unknown");
  const queueKey = safeKey(input.queueKey, `task:${taskId}`);
  const workspaceLane = safeKey(input.workspaceLane, `workspace:${taskId}`);
  return new Promise<T>((resolve, reject) => {
    const queue = laneQueues.get(queueKey) || [];
    if (activeTaskIds.has(taskId) || queue.some(entry => entry.taskId === taskId)) {
      reject(new Error("任务已在统一调度队列中"));
      return;
    }
    const entry: ScheduledEntry<T> = {
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

export function getUnifiedTaskSchedulerStatus() {
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

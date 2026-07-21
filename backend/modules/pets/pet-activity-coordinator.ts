export type PetActivityState =
  | "idle"
  | "thinking"
  | "planning"
  | "working"
  | "building"
  | "debugging"
  | "reviewing"
  | "waiting"
  | "happy"
  | "attention"
  | "notification"
  | "error"
  | "carrying"
  | "sweeping"
  | "juggling"
  | "yawning"
  | "dozing"
  | "collapsing"
  | "sleeping"
  | "waking"
  | "drag";

export type PetActorKind = "global" | "group-main" | "project" | "third-party" | "test-agent" | "scheduled";

export interface PetActivityUpdate {
  actor: string;
  displayName?: string;
  actorKind?: PetActorKind;
  runtime?: string;
  state: string;
  detail?: string;
  source?: string;
  workspaceTarget?: any;
  timestamp?: number;
  durationMs?: number;
}

export interface CoordinatedPetActivity {
  actor: string;
  displayName: string;
  actorKind: PetActorKind;
  runtime: string;
  state: PetActivityState;
  detail: string;
  source: string;
  workspaceTarget: any;
  timestamp: number;
  expiresAt: number;
  priority: number;
}

const ALLOWED_STATES = new Set<PetActivityState>([
  "idle", "thinking", "planning", "working", "building", "debugging", "reviewing", "waiting",
  "happy", "attention", "notification", "error", "carrying", "sweeping", "juggling", "yawning",
  "dozing", "collapsing", "sleeping", "waking", "drag",
]);

const STATE_PRIORITIES: Record<PetActivityState, number> = {
  error: 110,
  debugging: 100,
  waiting: 95,
  reviewing: 90,
  building: 80,
  working: 75,
  planning: 70,
  thinking: 65,
  carrying: 60,
  sweeping: 60,
  juggling: 60,
  notification: 45,
  attention: 40,
  happy: 35,
  drag: 30,
  waking: 20,
  yawning: 10,
  dozing: 9,
  collapsing: 8,
  sleeping: 7,
  idle: 0,
};

const KIND_BONUS: Record<PetActorKind, number> = {
  "test-agent": 8,
  "group-main": 5,
  global: 4,
  scheduled: 3,
  "third-party": 2,
  project: 1,
};

export function normalizeCoordinatedPetState(state: string): PetActivityState {
  const value = String(state || "idle") as PetActivityState;
  return ALLOWED_STATES.has(value) ? value : "idle";
}

export function inferPetActorKind(update: Partial<PetActivityUpdate>): PetActorKind {
  const actor = String(update.actor || "").toLowerCase();
  const source = String(update.source || "").toLowerCase();
  const runtime = String(update.runtime || "").toLowerCase();
  const tab = String(update.workspaceTarget?.tab || "").toLowerCase();
  if (actor === "global-agent") return "global";
  if (/test[-_ ]?agent/.test(actor) || /test[-_ ]?agent/.test(source)) return "test-agent";
  if (/cron|scheduled|schedule/.test(source) || /cron|scheduled/.test(actor)) return "scheduled";
  if (["codex", "cursor", "claudecode", "claude-code", "gemini", "opencode", "qoder"].some(item => runtime.includes(item) || actor.includes(item))) return "third-party";
  if (tab === "groups" && /coordinator|main-agent|主\s*agent/.test(actor)) return "group-main";
  return "project";
}

function friendlyActorName(update: PetActivityUpdate, kind: PetActorKind) {
  const explicit = String(update.displayName || "").trim();
  if (explicit) return explicit.slice(0, 48);
  if (kind === "test-agent") return "TestAgent";
  if (kind === "group-main") return "群聊主 Agent";
  if (kind === "scheduled") return "定时任务 Agent";
  if (kind === "global") return "全局 Agent";
  return String(update.actor || "项目 Agent").slice(0, 48);
}

function coordinatedDetail(update: PetActivityUpdate, displayName: string, kind: PetActorKind) {
  const detail = String(update.detail || "").trim();
  if (kind === "global") return detail || "全局 Agent 正在处理";
  return detail ? `${displayName}：${detail}` : `${displayName} 正在工作`;
}

export class GlobalPetActivityCoordinator {
  private activities = new Map<string, CoordinatedPetActivity>();

  update(update: PetActivityUpdate): CoordinatedPetActivity | null {
    const actor = String(update.actor || "").trim();
    if (!actor) return this.resolve(update.timestamp);
    const now = Number(update.timestamp || Date.now());
    const state = normalizeCoordinatedPetState(update.state);
    if (state === "idle") {
      this.activities.delete(actor);
      return this.resolve(now);
    }
    const actorKind = update.actorKind || inferPetActorKind(update);
    const displayName = friendlyActorName(update, actorKind);
    const durationMs = Math.max(1000, Number(update.durationMs || 60000));
    const activity: CoordinatedPetActivity = {
      actor,
      displayName,
      actorKind,
      runtime: String(update.runtime || ""),
      state,
      detail: coordinatedDetail(update, displayName, actorKind),
      source: String(update.source || actorKind),
      workspaceTarget: update.workspaceTarget || null,
      timestamp: now,
      expiresAt: now + durationMs,
      priority: STATE_PRIORITIES[state] + KIND_BONUS[actorKind],
    };
    this.activities.set(actor, activity);
    return this.resolve(now);
  }

  resolve(at = Date.now()): CoordinatedPetActivity | null {
    const now = Number(at || Date.now());
    for (const [actor, activity] of this.activities) {
      if (activity.expiresAt <= now) this.activities.delete(actor);
    }
    return [...this.activities.values()].sort((left, right) =>
      right.priority - left.priority || right.timestamp - left.timestamp
    )[0] || null;
  }

  snapshot(at = Date.now()) {
    this.resolve(at);
    return [...this.activities.values()].sort((left, right) => right.priority - left.priority || right.timestamp - left.timestamp);
  }
}

export function runPetActivityCoordinatorSelfTest() {
  const coordinator = new GlobalPetActivityCoordinator();
  const now = 1_000_000;
  coordinator.update({ actor: "global-agent", state: "planning", detail: "正在拆解任务", timestamp: now, durationMs: 60_000 });
  coordinator.update({ actor: "Codex", runtime: "codex", state: "building", detail: "正在修改前端", timestamp: now + 10, durationMs: 60_000 });
  const workerWins = coordinator.resolve(now + 20);
  coordinator.update({ actor: "TestAgent", state: "reviewing", detail: "正在浏览器验证", timestamp: now + 30, durationMs: 60_000 });
  const reviewerWins = coordinator.resolve(now + 40);
  coordinator.update({ actor: "TestAgent", state: "idle", timestamp: now + 50 });
  const workerResumes = coordinator.resolve(now + 60);
  coordinator.update({ actor: "Codex", state: "happy", detail: "实现已返回", timestamp: now + 70, durationMs: 10_000 });
  const planningNotPrematurelyCompleted = coordinator.resolve(now + 80);
  const expired = coordinator.resolve(now + 70_001);
  const checks = {
    worker_beats_planning: workerWins?.actor === "Codex" && workerWins.state === "building",
    test_agent_beats_worker: reviewerWins?.actorKind === "test-agent" && reviewerWins.state === "reviewing",
    worker_resumes_after_review: workerResumes?.actor === "Codex",
    success_does_not_override_active_planning: planningNotPrematurelyCompleted?.state === "planning",
    expired_returns_idle: expired === null,
    actor_is_visible_in_detail: /Codex/.test(workerWins?.detail || ""),
  };
  return { schema: "ccm-global-pet-activity-coordinator-selftest-v1", pass: Object.values(checks).every(Boolean), checks };
}

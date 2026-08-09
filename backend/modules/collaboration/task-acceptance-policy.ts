import * as crypto from "crypto";
import { loadTestAgentSettings } from "../system/test-agent-settings";
import {
  buildTestAgentHardeningPolicy,
  type TestAgentHardeningPolicyV1,
  validateTestAgentHardeningPolicy,
} from "../../test-agent/hardening-policy";

export type TaskAcceptanceMode = "test_agent" | "main_agent_self_verification";

export type TaskAcceptancePolicySnapshotV1 = {
  schema: "ccm-task-acceptance-policy-snapshot-v1";
  version: 1;
  task_id: string;
  scope: "group" | "project";
  scope_id: string;
  exact_session_id: string;
  mode: TaskAcceptanceMode;
  test_agent_enabled: boolean;
  max_review_rounds: number;
  settings_revision: string;
  captured_at: string;
  checksum: string;
};

export type TaskAcceptancePolicySnapshotV2 = {
  schema: "ccm-task-acceptance-policy-snapshot-v2";
  version: 2;
  task_id: string;
  scope: "group" | "project";
  scope_id: string;
  exact_session_id: string;
  generation: number;
  mode: TaskAcceptanceMode;
  test_agent_enabled: boolean;
  max_review_rounds: number;
  settings_revision: string;
  hardening: TestAgentHardeningPolicyV1;
  captured_at: string;
  checksum: string;
};

export type TaskAcceptancePolicySnapshot = TaskAcceptancePolicySnapshotV1 | TaskAcceptancePolicySnapshotV2;

const SNAPSHOT_WORKFLOWS = new Set(["daily_dev", "project_main_agent", "requirement_epic"]);

function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}

function checksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function explicitMode(task: any): TaskAcceptanceMode | null {
  const mode = String(task?.acceptance_mode || task?.acceptanceMode || task?.acceptance_policy_snapshot?.mode || "").trim();
  if (mode === "test_agent" || mode === "main_agent_self_verification") return mode;
  if (task?.test_agent_enabled === false || task?.testAgentEnabled === false) return "main_agent_self_verification";
  if (task?.test_agent_enabled === true || task?.testAgentEnabled === true) return "test_agent";
  return null;
}

export function taskNeedsAcceptancePolicy(task: any) {
  const workflow = String(task?.workflow_type || task?.workflowType || "").trim().toLowerCase();
  const assignType = String(task?.assign_type || task?.assignType || "").trim().toLowerCase();
  return SNAPSHOT_WORKFLOWS.has(workflow)
    || ["group", "project"].includes(assignType)
    || task?.requires_code_changes === true
    || task?.requiresCodeChanges === true
    || task?.requires_verification === true
    || task?.requiresVerification === true
    || task?.requires_independent_review === true
    || task?.requiresIndependentReview === true;
}

export function buildTaskAcceptancePolicySnapshot(task: any, options: { capturedAt?: string } = {}): TaskAcceptancePolicySnapshotV2 | null {
  if (!taskNeedsAcceptancePolicy(task)) return null;
  const settings = loadTestAgentSettings();
  const mode = explicitMode(task) || (settings.enabled ? "test_agent" : "main_agent_self_verification");
  const scope = String(task?.orchestration_scope || task?.orchestrationScope || "") === "project_session"
    || !!(task?.project_session_id || task?.projectSessionId)
    ? "project" as const
    : "group" as const;
  const scopeId = scope === "project"
    ? String(task?.target_project || task?.targetProject || "").trim()
    : String(task?.group_id || task?.groupId || "").trim();
  const exactSessionId = scope === "project"
    ? String(task?.project_session_id || task?.projectSessionId || task?.exact_session_id || task?.exactSessionId || "").trim()
    : String(task?.group_session_id || task?.groupSessionId || task?.exact_session_id || task?.exactSessionId || "").trim();
  const capturedAt = options.capturedAt || new Date().toISOString();
  const hardening = buildTestAgentHardeningPolicy({
    task,
    reviewPolicy: task?.test_agent_review_policy
      || task?.workflow_meta?.project_main_plan?.verificationProfile
      || task?.workflow_meta?.project_main_plan?.verification_profile
      || null,
  });
  const core = {
    schema: "ccm-task-acceptance-policy-snapshot-v2" as const,
    version: 2 as const,
    task_id: String(task?.id || "").trim(),
    scope,
    scope_id: scopeId,
    exact_session_id: exactSessionId,
    generation: Math.max(0, Math.floor(Number(task?.generation || task?.collaboration_generation || task?.workflow_meta?.generation || 0))),
    mode,
    test_agent_enabled: mode === "test_agent",
    max_review_rounds: mode === "test_agent" ? 3 : 1,
    settings_revision: checksum({ enabled: settings.enabled, updated_at: settings.updated_at || "default", hardening: hardening.checksum }),
    hardening,
    captured_at: capturedAt,
  };
  return { ...core, checksum: checksum(core) };
}

export function validateTaskAcceptancePolicySnapshot(task: any, snapshot: any = task?.acceptance_policy_snapshot) {
  const legacyV1 = snapshot?.schema === "ccm-task-acceptance-policy-snapshot-v1" && snapshot?.version === 1;
  const currentV2 = snapshot?.schema === "ccm-task-acceptance-policy-snapshot-v2" && snapshot?.version === 2;
  if (!snapshot || (!legacyV1 && !currentV2)) {
    return { valid: false, reason: "acceptance_policy_snapshot_missing", snapshot: null as TaskAcceptancePolicySnapshot | null };
  }
  const { checksum: supplied, ...core } = snapshot;
  if (!supplied || checksum(core) !== supplied) return { valid: false, reason: "acceptance_policy_snapshot_checksum_mismatch", snapshot: null };
  if (String(snapshot.task_id || "") !== String(task?.id || "")) return { valid: false, reason: "acceptance_policy_task_mismatch", snapshot: null };
  if (currentV2 && !validateTestAgentHardeningPolicy(snapshot.hardening).valid) {
    return { valid: false, reason: "acceptance_policy_hardening_invalid", snapshot: null };
  }
  const rebuiltIdentity = buildTaskAcceptancePolicySnapshot({
    ...task,
    acceptance_mode: snapshot.mode,
    test_agent_enabled: snapshot.test_agent_enabled,
  }, { capturedAt: snapshot.captured_at });
  if (!rebuiltIdentity || rebuiltIdentity.scope !== snapshot.scope || rebuiltIdentity.scope_id !== snapshot.scope_id || rebuiltIdentity.exact_session_id !== snapshot.exact_session_id) {
    return { valid: false, reason: "acceptance_policy_scope_mismatch", snapshot: null };
  }
  return { valid: true, reason: legacyV1 ? "legacy_v1" : "ok", snapshot: snapshot as TaskAcceptancePolicySnapshot };
}

export function resolveTaskAcceptancePolicy(task: any, options: { allowLegacyCapture?: boolean } = {}) {
  const validated = validateTaskAcceptancePolicySnapshot(task);
  if (validated.valid) return { ...validated, legacyCaptured: false };
  if (options.allowLegacyCapture !== true) return { ...validated, legacyCaptured: false };
  const legacyMode = explicitMode(task);
  if (!legacyMode && (task?.main_agent_self_verification || task?.test_agent_review)) {
    return { valid: false, reason: "legacy_acceptance_mode_ambiguous", snapshot: null, legacyCaptured: false };
  }
  const snapshot = buildTaskAcceptancePolicySnapshot({
    ...task,
    ...(legacyMode ? { acceptance_mode: legacyMode, test_agent_enabled: legacyMode === "test_agent" } : {}),
  });
  return snapshot
    ? { valid: true, reason: legacyMode ? "legacy_policy_captured" : "policy_captured", snapshot, legacyCaptured: true }
    : { valid: false, reason: "acceptance_policy_not_required", snapshot: null, legacyCaptured: false };
}

export function acceptanceModeForTask(task: any): TaskAcceptanceMode | null {
  return resolveTaskAcceptancePolicy(task).snapshot?.mode || explicitMode(task);
}

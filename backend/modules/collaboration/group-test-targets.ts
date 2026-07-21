import * as crypto from "crypto";
import * as path from "path";
import { deleteCredential, isCredentialReference, protectCredential, resolveCredential } from "../../core/credential-store";
import { getCoordinatorMember } from "./group-orchestrator";
import { loadGroups, saveGroups } from "./storage";

export type GroupTestTargetKind = "web" | "h5" | "api" | "hybrid_app" | "native_app" | "other";
export type GroupTestTargetAuthMode = "none" | "credentials" | "storage_state" | "existing_session";

export type StoredGroupTestTarget = {
  id: string;
  project: string;
  name: string;
  kind: GroupTestTargetKind;
  environment: string;
  enabled: boolean;
  required: boolean;
  baseUrl: string;
  startupCommand: string;
  verificationCommands: string[];
  notes: string;
  auth: {
    mode: GroupTestTargetAuthMode;
    loginPath: string;
    submitLabel: string;
    successText: string;
    successUrlIncludes: string;
    storageStatePath: string;
    existingSessionProvider: "auto" | "claude-in-chrome" | "chrome-devtools";
    fields: Array<{
      id: string;
      label: string;
      envName: string;
      inputLabel: string;
      valueRef: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
};

export type ResolvedGroupTestTarget = StoredGroupTestTarget & {
  checksum: string;
  env: Record<string, string>;
};

const TARGET_KINDS = new Set<GroupTestTargetKind>(["web", "h5", "api", "hybrid_app", "native_app", "other"]);
const AUTH_MODES = new Set<GroupTestTargetAuthMode>(["none", "credentials", "storage_state", "existing_session"]);
const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;
const MAX_TARGETS = 24;
const MAX_AUTH_FIELDS = 12;

function cleanText(value: any, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function cleanId(value: any, prefix: string) {
  const id = cleanText(value, 120).replace(/[^a-zA-Z0-9._-]+/g, "-");
  return id || `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
}

function uniqueCommands(value: any) {
  return [...new Set((Array.isArray(value) ? value : [])
    .map(item => cleanText(item, 300))
    .filter(Boolean))].slice(0, 30);
}

function normalizeUrl(value: any) {
  const url = cleanText(value, 600).replace(/\/+$/, "");
  if (url && !/^https?:\/\//i.test(url)) throw new Error("测试目标地址必须以 http:// 或 https:// 开头");
  return url;
}

function targetChecksum(target: StoredGroupTestTarget) {
  return crypto.createHash("sha256").update(JSON.stringify(target)).digest("hex");
}

function publicTarget(target: StoredGroupTestTarget, availableProjects: Set<string>) {
  return {
    ...target,
    projectAvailable: availableProjects.has(target.project),
    checksum: targetChecksum(target),
    auth: {
      ...target.auth,
      fields: target.auth.fields.map(({ valueRef, ...field }) => ({
        ...field,
        hasValue: !!valueRef,
        credentialProtected: !!valueRef && isCredentialReference(valueRef),
      })),
    },
  };
}

function groupProjectNames(group: any): Set<string> {
  const coordinator = getCoordinatorMember(group)?.project;
  return new Set<string>((group?.members || [])
    .filter((member: any) => member?.project && member.project !== coordinator && member.role !== "coordinator")
    .map((member: any) => String(member.project)));
}

function normalizeStoredTarget(raw: any): StoredGroupTestTarget {
  const now = new Date().toISOString();
  const kind = TARGET_KINDS.has(raw?.kind) ? raw.kind : "web";
  const mode = AUTH_MODES.has(raw?.auth?.mode) ? raw.auth.mode : "none";
  const fields = (Array.isArray(raw?.auth?.fields) ? raw.auth.fields : []).slice(0, MAX_AUTH_FIELDS).map((field: any) => ({
    id: cleanId(field?.id, "gtaf"),
    label: cleanText(field?.label, 80),
    envName: cleanText(field?.envName, 80).toUpperCase(),
    inputLabel: cleanText(field?.inputLabel, 120),
    valueRef: cleanText(field?.valueRef, 300),
  })).filter((field: any) => field.envName && ENV_NAME.test(field.envName));
  return {
    id: cleanId(raw?.id, "gtt"),
    project: cleanText(raw?.project, 160),
    name: cleanText(raw?.name, 120),
    kind,
    environment: cleanText(raw?.environment, 80),
    enabled: raw?.enabled !== false,
    required: raw?.required === true,
    baseUrl: cleanText(raw?.baseUrl, 600).replace(/\/+$/, ""),
    startupCommand: cleanText(raw?.startupCommand, 500),
    verificationCommands: uniqueCommands(raw?.verificationCommands),
    notes: cleanText(raw?.notes, 800),
    auth: {
      mode,
      loginPath: cleanText(raw?.auth?.loginPath, 300),
      submitLabel: cleanText(raw?.auth?.submitLabel, 120) || "登录",
      successText: cleanText(raw?.auth?.successText, 200),
      successUrlIncludes: cleanText(raw?.auth?.successUrlIncludes, 300),
      storageStatePath: cleanText(raw?.auth?.storageStatePath, 500),
      existingSessionProvider: ["claude-in-chrome", "chrome-devtools"].includes(raw?.auth?.existingSessionProvider)
        ? raw.auth.existingSessionProvider
        : "auto",
      fields,
    },
    createdAt: cleanText(raw?.createdAt, 50) || now,
    updatedAt: cleanText(raw?.updatedAt, 50) || now,
  };
}

function findGroup(groupId: string) {
  const groups = loadGroups();
  const group = groups.find((item: any) => item.id === groupId);
  if (!group) throw new Error("群聊不存在");
  return { groups, group };
}

export function listGroupTestTargets(groupId: string) {
  const { groups, group } = findGroup(groupId);
  const before = JSON.stringify(group.test_targets || []);
  const targets = (Array.isArray(group.test_targets) ? group.test_targets : []).slice(0, MAX_TARGETS).map(normalizeStoredTarget);
  group.test_targets = targets;
  if (JSON.stringify(targets) !== before) saveGroups(groups);
  const projects = groupProjectNames(group);
  return {
    schema: "ccm-group-test-targets-v1",
    groupId,
    projects: [...projects],
    targets: targets.map(target => publicTarget(target, projects)),
  };
}

export function publicGroupWithoutTestTargetSecrets(group: any) {
  if (!group || typeof group !== "object") return group;
  const { test_targets: testTargets, ...safeGroup } = group;
  return {
    ...safeGroup,
    test_target_count: Array.isArray(testTargets) ? testTargets.length : 0,
  };
}

export function saveGroupTestTarget(groupId: string, input: any) {
  const { groups, group } = findGroup(groupId);
  const projects = groupProjectNames(group);
  const project = cleanText(input?.project, 160);
  if (!projects.has(project)) throw new Error("测试目标只能绑定当前群聊中的项目");
  const name = cleanText(input?.name, 120);
  if (!name) throw new Error("测试目标名称不能为空");
  const stored = (Array.isArray(group.test_targets) ? group.test_targets : []).map(normalizeStoredTarget);
  const requestedId = cleanText(input?.id, 120);
  const index = requestedId ? stored.findIndex(target => target.id === requestedId) : -1;
  if (requestedId && index < 0) throw new Error("测试目标不存在或不属于当前群聊");
  if (index < 0 && stored.length >= MAX_TARGETS) throw new Error(`每个群聊最多配置 ${MAX_TARGETS} 个测试目标`);
  const previous = index >= 0 ? stored[index] : null;
  const now = new Date().toISOString();
  const authMode = AUTH_MODES.has(input?.auth?.mode) ? input.auth.mode : "none";
  const rawFields = (Array.isArray(input?.auth?.fields) ? input.auth.fields : []).slice(0, MAX_AUTH_FIELDS);
  const previousFields = new Map<string, StoredGroupTestTarget["auth"]["fields"][number]>((previous?.auth.fields || []).map(field => [field.id, field]));
  const fields = rawFields.map((field: any, fieldIndex: number) => {
    const id = cleanId(field?.id, "gtaf");
    const envName = cleanText(field?.envName, 80).toUpperCase();
    if (!ENV_NAME.test(envName)) throw new Error(`登录字段 ${fieldIndex + 1} 的环境变量名无效`);
    const old = previousFields.get(id);
    let valueRef = field?.clearValue === true ? "" : cleanText(old?.valueRef, 300);
    const value = cleanText(field?.value, 4000);
    if (value) valueRef = protectCredential(`group-test-target:${groupId}:${requestedId || "new"}`, `${id}:${envName}`, value);
    return {
      id,
      label: cleanText(field?.label, 80) || envName,
      envName,
      inputLabel: cleanText(field?.inputLabel, 120),
      valueRef,
    };
  });
  if (new Set(fields.map(field => field.envName)).size !== fields.length) throw new Error("同一测试目标不能重复配置环境变量名");
  if (authMode === "credentials" && (!fields.length || fields.some(field => !field.valueRef))) {
    throw new Error("账号登录模式需要为每个登录字段填写凭据");
  }
  if (authMode === "credentials" && !cleanText(input?.auth?.successText, 200) && !cleanText(input?.auth?.successUrlIncludes, 300)) {
    throw new Error("账号登录模式需要配置登录成功文本或登录后 URL 特征");
  }
  const storageStatePath = cleanText(input?.auth?.storageStatePath, 500);
  if (authMode === "storage_state" && !storageStatePath) throw new Error("Storage State 模式需要填写状态文件路径");
  const kind = TARGET_KINDS.has(input?.kind) ? input.kind : "web";
  const target = normalizeStoredTarget({
    id: previous?.id || cleanId("", "gtt"),
    project,
    name,
    kind,
    environment: input?.environment,
    enabled: input?.enabled,
    required: input?.required,
    baseUrl: normalizeUrl(input?.baseUrl),
    startupCommand: input?.startupCommand,
    verificationCommands: input?.verificationCommands,
    notes: input?.notes,
    auth: {
      mode: authMode,
      loginPath: input?.auth?.loginPath,
      submitLabel: input?.auth?.submitLabel,
      successText: input?.auth?.successText,
      successUrlIncludes: input?.auth?.successUrlIncludes,
      storageStatePath,
      existingSessionProvider: input?.auth?.existingSessionProvider,
      fields,
    },
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  });
  if (index >= 0) stored[index] = target;
  else stored.push(target);
  group.test_targets = stored;
  saveGroups(groups);
  const retainedRefs = new Set(fields.map(field => field.valueRef).filter(Boolean));
  for (const field of previous?.auth.fields || []) {
    if (field.valueRef && !retainedRefs.has(field.valueRef)) deleteCredential(field.valueRef);
  }
  return publicTarget(target, projects);
}

export function deleteGroupTestTarget(groupId: string, targetId: string) {
  const { groups, group } = findGroup(groupId);
  const before = Array.isArray(group.test_targets) ? group.test_targets : [];
  const removed = before.find((target: any) => String(target?.id || "") === targetId);
  const next = before.filter((target: any) => String(target?.id || "") !== targetId);
  if (next.length === before.length) throw new Error("测试目标不存在或不属于当前群聊");
  group.test_targets = next;
  saveGroups(groups);
  for (const field of normalizeStoredTarget(removed).auth.fields) deleteCredential(field.valueRef);
  return { success: true, deletedId: targetId };
}

export function resolveGroupTestTargets(groupId: string, projectNames: string[] = [], targetIds: string[] = []): ResolvedGroupTestTarget[] {
  const { group } = findGroup(groupId);
  const projects = new Set(projectNames.map(String).filter(Boolean));
  const requestedIds = new Set(targetIds.map(String).filter(Boolean));
  const targets = (Array.isArray(group.test_targets) ? group.test_targets : []).map(normalizeStoredTarget);
  if (requestedIds.size && [...requestedIds].some(id => !targets.some(target => target.id === id))) {
    throw new Error("请求包含不属于当前群聊的测试目标");
  }
  return targets
    .filter(target => target.enabled && (!projects.size || projects.has(target.project)) && (!requestedIds.size || requestedIds.has(target.id) || target.required))
    .map((target): ResolvedGroupTestTarget => ({
      ...target,
      checksum: targetChecksum(target),
      env: target.auth.mode === "credentials"
        ? Object.fromEntries(target.auth.fields.map(field => [field.envName, resolveCredential(field.valueRef)]))
        : {},
    }));
}

export function resolveTargetStorageStatePath(workDir: string, configuredPath: string) {
  const root = path.resolve(workDir);
  const resolved = path.resolve(root, configuredPath);
  const within = process.platform === "win32"
    ? resolved.toLowerCase().startsWith(`${root.toLowerCase()}${path.sep}`) || resolved.toLowerCase() === root.toLowerCase()
    : resolved.startsWith(`${root}${path.sep}`) || resolved === root;
  if (!within) throw new Error("Storage State 文件必须位于目标项目工作目录内");
  return resolved;
}

import * as crypto from "crypto";
import * as path from "path";
import {
  deleteCredential,
  isCredentialReference,
} from "../../core/credential-store";
import { getConfigs, loadProjectConfigs, saveProjectConfigs } from "../../core/db";
import { validateProjectName, validateWorkDirectory } from "./project-validation";
import { getProjectTestAuthProfile, resolveProjectTestAuthProfile } from "./project-test-auth";

export type ProjectTestTargetKind = "web" | "h5" | "api" | "hybrid_app" | "native_app" | "other";
export type ProjectTestTargetAuthMode = "none" | "credentials" | "storage_state" | "existing_session";

export type StoredProjectTestTarget = {
  id: string;
  project: string;
  name: string;
  kind: ProjectTestTargetKind;
  environment: string;
  enabled: boolean;
  required: boolean;
  baseUrl: string;
  startupCommand: string;
  verificationCommands: string[];
  notes: string;
  auth: {
    mode: ProjectTestTargetAuthMode;
    loginPath: string;
    submitLabel: string;
    successText: string;
    successUrlIncludes: string;
    storageStatePath: string;
    existingSessionProvider: "auto" | "claude-in-chrome" | "chrome-devtools";
    fields: Array<{ id: string; label: string; envName: string; inputLabel: string; valueRef: string }>;
  };
  createdAt: string;
  updatedAt: string;
};

export type ResolvedProjectTestTarget = StoredProjectTestTarget & {
  checksum: string;
  env: Record<string, string>;
};

const TARGET_KINDS = new Set<ProjectTestTargetKind>(["web", "h5", "api", "hybrid_app", "native_app", "other"]);
const AUTH_MODES = new Set<ProjectTestTargetAuthMode>(["none", "credentials", "storage_state", "existing_session"]);
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

function assertProject(project: string) {
  const name = validateProjectName(project);
  if (!getConfigs().some(config => config.name === name)) throw new Error("项目不存在");
  return name;
}

function targetChecksum(target: StoredProjectTestTarget, projectAuthChecksum = "") {
  return crypto.createHash("sha256").update(JSON.stringify({ target, projectAuthChecksum })).digest("hex");
}

function normalizeStoredTarget(raw: any, project: string): StoredProjectTestTarget {
  const now = new Date().toISOString();
  const kind = TARGET_KINDS.has(raw?.kind) ? raw.kind : "web";
  const mode = AUTH_MODES.has(raw?.auth?.mode) ? raw.auth.mode : "none";
  const fields = (Array.isArray(raw?.auth?.fields) ? raw.auth.fields : []).slice(0, MAX_AUTH_FIELDS).map((field: any) => ({
    id: cleanId(field?.id, "ptaf"),
    label: cleanText(field?.label, 80),
    envName: cleanText(field?.envName, 80).toUpperCase(),
    inputLabel: cleanText(field?.inputLabel, 120),
    valueRef: cleanText(field?.valueRef, 300),
  })).filter((field: any) => field.envName && ENV_NAME.test(field.envName));
  return {
    id: cleanId(raw?.id, "ptt"),
    project,
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

function publicTarget(target: StoredProjectTestTarget) {
  return {
    ...target,
    checksum: targetChecksum(target),
    projectAvailable: true,
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

function loadStored(project: string) {
  const configs = loadProjectConfigs();
  const rows = Array.isArray(configs[project]?.test_targets) ? configs[project].test_targets : [];
  return { configs, targets: rows.slice(0, MAX_TARGETS).map((row: any) => normalizeStoredTarget(row, project)) };
}

export function listProjectTestTargets(projectInput: string) {
  const project = assertProject(projectInput);
  const projectAuth = getProjectTestAuthProfile(project);
  const { configs, targets } = loadStored(project);
  const before = JSON.stringify(configs[project]?.test_targets || []);
  if (!configs[project]) configs[project] = {};
  configs[project].test_targets = targets;
  if (JSON.stringify(targets) !== before) saveProjectConfigs(configs);
  return {
    schema: "ccm-project-test-targets-v1",
    project,
    projects: [project],
    projectAuth,
    targets: targets.map(target => ({ ...publicTarget(target), projectAuthConfigured: projectAuth.enabled, projectAuthMode: projectAuth.mode })),
  };
}

export function saveProjectTestTarget(projectInput: string, input: any) {
  const project = assertProject(projectInput);
  const { configs, targets } = loadStored(project);
  const name = cleanText(input?.name, 120);
  if (!name) throw new Error("测试目标名称不能为空");
  const requestedId = cleanText(input?.id, 120);
  const index = requestedId ? targets.findIndex(target => target.id === requestedId) : -1;
  if (requestedId && index < 0) throw new Error("测试目标不存在或不属于当前项目");
  if (index < 0 && targets.length >= MAX_TARGETS) throw new Error(`每个项目最多配置 ${MAX_TARGETS} 个测试目标`);
  const previous = index >= 0 ? targets[index] : null;
  const authMode = AUTH_MODES.has(input?.auth?.mode) ? input.auth.mode : "none";
  const projectAuth = getProjectTestAuthProfile(project);
  if (authMode !== "none" && (!projectAuth.enabled || projectAuth.mode !== authMode)) {
    throw new Error("请先在项目配置中启用对应的 TestAgent 登录方式");
  }
  const fields: StoredProjectTestTarget["auth"]["fields"] = [];
  const now = new Date().toISOString();
  const target = normalizeStoredTarget({
    id: previous?.id || cleanId("", "ptt"),
    name,
    kind: TARGET_KINDS.has(input?.kind) ? input.kind : "web",
    environment: input?.environment,
    enabled: input?.enabled,
    required: input?.required,
    baseUrl: normalizeUrl(input?.baseUrl),
    startupCommand: input?.startupCommand,
    verificationCommands: input?.verificationCommands,
    notes: input?.notes,
    auth: { mode: authMode, fields },
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  }, project);
  if (index >= 0) targets[index] = target;
  else targets.push(target);
  if (!configs[project]) configs[project] = {};
  configs[project].test_targets = targets;
  saveProjectConfigs(configs);
  const retainedRefs = new Set(fields.map(field => field.valueRef).filter(Boolean));
  for (const field of previous?.auth.fields || []) if (field.valueRef && !retainedRefs.has(field.valueRef)) deleteCredential(field.valueRef);
  return publicTarget(target);
}

export function deleteProjectTestTarget(projectInput: string, targetIdInput: string) {
  const project = assertProject(projectInput);
  const targetId = cleanText(targetIdInput, 120);
  const { configs, targets } = loadStored(project);
  const removed = targets.find(target => target.id === targetId);
  if (!removed) throw new Error("测试目标不存在或不属于当前项目");
  configs[project].test_targets = targets.filter(target => target.id !== targetId);
  saveProjectConfigs(configs);
  for (const field of removed.auth.fields) if (field.valueRef) deleteCredential(field.valueRef);
  return { success: true, deletedId: targetId };
}

export function resolveProjectTestTargets(projectInput: string, targetIds: string[] = []): ResolvedProjectTestTarget[] {
  const project = assertProject(projectInput);
  const requestedIds = new Set(targetIds.map(String).filter(Boolean));
  const { targets } = loadStored(project);
  if (requestedIds.size && [...requestedIds].some(id => !targets.some(target => target.id === id))) {
    throw new Error("请求包含不属于当前项目的测试目标");
  }
  return targets
    .filter(target => target.enabled && (!requestedIds.size || requestedIds.has(target.id) || target.required))
    .map(target => {
      if (target.auth.mode === "none") return { ...target, checksum: targetChecksum(target), env: {} };
      const profile = resolveProjectTestAuthProfile(project);
      if (!profile.enabled || profile.mode !== target.auth.mode) throw new Error(`测试目标“${target.name}”引用的项目登录配置不可用`);
      return {
        ...target,
        baseUrl: target.baseUrl || profile.baseUrl,
        auth: {
          mode: profile.mode,
          loginPath: profile.loginPath,
          submitLabel: profile.submitLabel,
          successText: profile.successText,
          successUrlIncludes: profile.successUrlIncludes,
          storageStatePath: profile.storageStatePath,
          existingSessionProvider: profile.existingSessionProvider,
          fields: profile.fields,
        },
        checksum: targetChecksum(target, profile.checksum),
        env: profile.env,
      } as ResolvedProjectTestTarget;
    });
}

export function resolveProjectTargetStorageStatePath(workDir: string, configuredPath: string) {
  const root = path.resolve(validateWorkDirectory(workDir));
  const resolved = path.resolve(root, configuredPath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Storage State 文件必须位于目标项目工作目录内");
  return resolved;
}

export function runProjectTestTargetsSelfTest() {
  const normalized = normalizeStoredTarget({ name: "Web", kind: "web", baseUrl: "http://127.0.0.1:3000/" }, "demo");
  return {
    success: normalized.project === "demo" && normalized.baseUrl === "http://127.0.0.1:3000" && normalized.auth.mode === "none",
    checks: { exactProject: normalized.project === "demo", normalizedUrl: normalized.baseUrl === "http://127.0.0.1:3000" },
  };
}

import * as crypto from "crypto";
import * as path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import { withFileLock, readJsonWithBackup, writeJsonAtomic } from "../../core/atomic-json-file";
import { CCM_DIR, sendJson } from "../../core/utils";
import { publishRuntimeEvent } from "../../system/runtime-events";
import { requestAccessPrincipal } from "./api-access-control";

const STORE_FILE = path.join(CCM_DIR, "navigation-config-v3.json");
const MAX_BODY_BYTES = 512 * 1024;

type RevisionedConfig = {
  revision: number;
  updatedAt: string;
  updatedBy: string;
  checksum: string;
  configuration?: any;
  overrides?: any;
  migrationChecksum?: string;
};

type NavigationStoreV3 = {
  schema: "ccm-navigation-store-v3";
  workspaceDefault: RevisionedConfig | null;
  users: Record<string, RevisionedConfig>;
  updatedAt: string;
};

function now() {
  return new Date().toISOString();
}

function checksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function emptyStore(): NavigationStoreV3 {
  return { schema: "ccm-navigation-store-v3", workspaceDefault: null, users: {}, updatedAt: now() };
}

function readStore(): NavigationStoreV3 {
  const raw: any = readJsonWithBackup<any>(STORE_FILE, emptyStore());
  return {
    schema: "ccm-navigation-store-v3",
    workspaceDefault: raw?.workspaceDefault && typeof raw.workspaceDefault === "object" ? raw.workspaceDefault : null,
    users: raw?.users && typeof raw.users === "object" && !Array.isArray(raw.users) ? raw.users : {},
    updatedAt: String(raw?.updatedAt || now()),
  };
}

function cleanText(value: any, max = 80) {
  return String(value || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, max);
}

function cleanId(value: any) {
  const id = cleanText(value, 80);
  return /^[A-Za-z0-9_-]{1,80}$/.test(id) ? id : "";
}

function cleanIcon(value: any, fallback = "") {
  const icon = String(value || "").trim();
  if (!icon) return fallback;
  if (/^[A-Za-z][A-Za-z0-9-]{0,47}$/.test(icon)) return icon;
  if (/[<>&"'`/\\]/.test(icon)) throw new Error("菜单图标不能包含HTML、URL或脚本内容");
  if (icon.length > 12) return fallback;
  const segments = [...new Intl.Segmenter("zh-CN", { granularity: "grapheme" }).segment(icon)];
  return segments.length === 1 ? icon : fallback;
}

function cleanUrl(value: any) {
  const parsed = new URL(String(value || "").trim());
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("外部链接只允许HTTP或HTTPS");
  if (parsed.username || parsed.password) throw new Error("外部链接不能包含账号或密码");
  return parsed.toString();
}

function sanitizeGroups(value: any) {
  const seen = new Set<string>();
  return (Array.isArray(value) ? value : []).slice(0, 30).flatMap((row: any) => {
    const id = cleanId(row?.id);
    if (!id || id === "ungrouped" || seen.has(id)) return [];
    seen.add(id);
    return [{ id, label: cleanText(row?.label, 48) || "未命名分组", icon: cleanIcon(row?.icon, "Folder") }];
  });
}

function sanitizeItems(value: any) {
  const output: Record<string, any> = {};
  const entries = value && typeof value === "object" && !Array.isArray(value) ? Object.entries(value).slice(0, 160) : [];
  for (const [rawId, raw] of entries as Array<[string, any]>) {
    const id = cleanId(rawId);
    if (!id) continue;
    const item: any = {};
    if (raw?.groupId !== undefined) item.groupId = cleanId(raw.groupId) || "ungrouped";
    if (raw?.order !== undefined && Number.isFinite(Number(raw.order))) item.order = Math.max(-10000, Math.min(10000, Number(raw.order)));
    for (const key of ["hidden", "pinned", "mobilePrimary"]) {
      if (typeof raw?.[key] === "boolean") item[key] = raw[key];
    }
    if (raw?.icon !== undefined) item.icon = cleanIcon(raw.icon);
    output[id] = item;
  }
  return output;
}

function sanitizeLinks(value: any) {
  const seen = new Set<string>();
  return (Array.isArray(value) ? value : []).slice(0, 50).flatMap((row: any) => {
    const id = cleanId(row?.id);
    if (!id.startsWith("l_")) throw new Error("外部链接ID无效");
    if (seen.has(id)) throw new Error("外部链接ID重复");
    seen.add(id);
    return [{
      id,
      label: cleanText(row?.label, 48) || "外部链接",
      icon: cleanIcon(row?.icon, "ExternalLink"),
      url: cleanUrl(row?.url),
      isExternal: true,
      openMode: "new_tab",
    }];
  });
}

function sanitizeConfiguration(value: any) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    schema: "ccm-navigation-config-v3",
    version: 3,
    groups: sanitizeGroups(source.groups),
    items: sanitizeItems(source.items),
    customLinks: sanitizeLinks(source.customLinks),
  };
}

function sanitizeOverrides(value: any) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    groups: source.groups === null || source.groups === undefined ? null : sanitizeGroups(source.groups),
    items: sanitizeItems(source.items),
    customLinks: sanitizeLinks(source.customLinks),
  };
}

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    let rejected = false;
    req.on("data", chunk => {
      if (rejected) return;
      body += chunk;
      if (Buffer.byteLength(body, "utf-8") > MAX_BODY_BYTES) {
        rejected = true;
        reject(new Error("导航配置不能超过512KB"));
      }
    });
    req.on("end", () => {
      if (rejected) return;
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("导航配置JSON无效")); }
    });
    req.on("error", reject);
  });
}

function principal(req: IncomingMessage) {
  const auth = requestAccessPrincipal(req);
  if (!auth || auth.kind !== "browser") throw new Error("导航配置仅支持已登录用户");
  return auth;
}

function publicEntry(entry: RevisionedConfig | null | undefined) {
  if (!entry) return null;
  return {
    revision: Number(entry.revision || 0),
    updated_at: entry.updatedAt,
    checksum: entry.checksum,
    configuration: entry.configuration || null,
    overrides: entry.overrides || null,
    migration_checksum: entry.migrationChecksum || "",
  };
}

function savePersonal(userId: string, actorId: string, payload: any) {
  return withFileLock(STORE_FILE, () => {
    const store = readStore();
    const current = store.users[userId] || null;
    const expected = Number(payload.expected_revision ?? 0);
    const actual = Number(current?.revision || 0);
    if (expected !== actual) {
      const error: any = new Error("导航配置已在其他页面或设备修改，请重新加载");
      error.code = "state_drift";
      error.current = publicEntry(current);
      throw error;
    }
    const migrationChecksum = cleanText(payload.migration_checksum, 80);
    if (migrationChecksum && current?.migrationChecksum === migrationChecksum) return current;
    const overrides = sanitizeOverrides(payload.overrides);
    const next: RevisionedConfig = {
      revision: actual + 1,
      updatedAt: now(),
      updatedBy: actorId,
      checksum: checksum(overrides),
      overrides,
      migrationChecksum: migrationChecksum || current?.migrationChecksum || "",
    };
    store.users[userId] = next;
    store.updatedAt = next.updatedAt;
    writeJsonAtomic(STORE_FILE, store);
    return next;
  });
}

function saveWorkspaceDefault(actorId: string, payload: any) {
  return withFileLock(STORE_FILE, () => {
    const store = readStore();
    const current = store.workspaceDefault;
    const expected = Number(payload.expected_revision ?? 0);
    const actual = Number(current?.revision || 0);
    if (expected !== actual) {
      const error: any = new Error("工作区默认导航已被其他管理员修改，请重新加载");
      error.code = "state_drift";
      error.current = publicEntry(current);
      throw error;
    }
    const configuration = sanitizeConfiguration(payload.configuration);
    const next: RevisionedConfig = {
      revision: actual + 1,
      updatedAt: now(),
      updatedBy: actorId,
      checksum: checksum(configuration),
      configuration,
    };
    store.workspaceDefault = next;
    store.updatedAt = next.updatedAt;
    writeJsonAtomic(STORE_FILE, store);
    return next;
  });
}

export function handleNavigationConfigApi(pathname: string, req: IncomingMessage, res: ServerResponse) {
  if (pathname === "/api/navigation/config" && req.method === "GET") {
    try {
      const auth = principal(req);
      const store = readStore();
      sendJson(res, {
        success: true,
        schema: "ccm-navigation-config-response-v3",
        workspace_default: publicEntry(store.workspaceDefault),
        personal: publicEntry(store.users[auth.userId]),
        can_manage_workspace_default: auth.role === "admin",
      });
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || "读取导航配置失败" }, 400);
    }
    return true;
  }

  if (pathname === "/api/navigation/config" && req.method === "PATCH") {
    void readJsonBody(req).then(payload => {
      const auth = principal(req);
      const saved = savePersonal(auth.userId, auth.userId, payload);
      publishRuntimeEvent("system", "navigation.personal.changed", { userId: auth.userId, revision: saved.revision });
      sendJson(res, { success: true, personal: publicEntry(saved) });
    }).catch((error: any) => {
      sendJson(res, { success: false, error: error?.message || "保存导航配置失败", code: error?.code || "", current: error?.current || null }, error?.code === "state_drift" ? 409 : 400);
    });
    return true;
  }

  if (pathname === "/api/navigation/config/reset" && req.method === "POST") {
    void readJsonBody(req).then(payload => {
      const auth = principal(req);
      const saved = savePersonal(auth.userId, auth.userId, {
        expected_revision: Number(payload.expected_revision ?? 0),
        overrides: { groups: null, items: {}, customLinks: [] },
      });
      publishRuntimeEvent("system", "navigation.personal.changed", { userId: auth.userId, revision: saved.revision });
      sendJson(res, { success: true, personal: publicEntry(saved) });
    }).catch((error: any) => {
      sendJson(res, { success: false, error: error?.message || "重置导航配置失败", code: error?.code || "", current: error?.current || null }, error?.code === "state_drift" ? 409 : 400);
    });
    return true;
  }

  if (pathname === "/api/navigation/default" && req.method === "GET") {
    try {
      const auth = principal(req);
      if (auth.role !== "admin") return sendJson(res, { success: false, error: "只有Admin可以管理工作区默认导航" }, 403);
      sendJson(res, { success: true, workspace_default: publicEntry(readStore().workspaceDefault) });
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || "读取工作区导航失败" }, 400);
    }
    return true;
  }

  if (pathname === "/api/navigation/default" && req.method === "PATCH") {
    void readJsonBody(req).then(payload => {
      const auth = principal(req);
      if (auth.role !== "admin") return sendJson(res, { success: false, error: "只有Admin可以管理工作区默认导航" }, 403);
      const saved = saveWorkspaceDefault(auth.userId, payload);
      publishRuntimeEvent("system", "navigation.workspace_default.changed", { revision: saved.revision });
      sendJson(res, { success: true, workspace_default: publicEntry(saved) });
    }).catch((error: any) => {
      sendJson(res, { success: false, error: error?.message || "保存工作区导航失败", code: error?.code || "", current: error?.current || null }, error?.code === "state_drift" ? 409 : 400);
    });
    return true;
  }

  return false;
}

import * as fs from "fs";
import * as path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import { credentialStoreStatus } from "../../core/credential-store";
import { sendJson } from "../../core/utils";
import {
  getAgentProviderStatuses,
  getAgentProviderModels,
  loadAgentProviderSettings,
  logoutAgentProvider,
  publicAgentProviderSettings,
  saveAgentProviderSettings,
  startAgentProviderInstall,
  startAgentProviderLogin,
} from "./agent-provider-settings";
import { publicDevelopmentAgentCatalog } from "../../agents/catalog";

const startedAt = new Date().toISOString();

function readAppVersion() {
  const candidates = [
    path.resolve(process.cwd(), "package.json"),
    path.resolve(__dirname, "../../../../package.json"),
    path.resolve(__dirname, "../../../package.json"),
  ];
  for (const file of candidates) {
    try {
      const version = String(JSON.parse(fs.readFileSync(file, "utf-8"))?.version || "").trim();
      if (version) return version;
    } catch {}
  }
  return "unknown";
}

export function handleSystemSettingsApi(pathname: string, req: IncomingMessage, res: ServerResponse) {
  if (pathname === "/api/system/settings-status" && req.method === "GET") {
    const credentials = credentialStoreStatus();
    sendJson(res, {
      success: true,
      version: readAppVersion(),
      service: {
        status: "online",
        pid: process.pid,
        startedAt,
        uptimeSeconds: Math.floor(process.uptime()),
      },
      credentials: {
        protected: credentials.protected === true,
        backend: credentials.backend,
        entries: credentials.entries,
      },
    });
    return true;
  }

  if (pathname === "/api/system/agent-providers" && req.method === "GET") {
    sendJson(res, {
      success: true,
      config: publicAgentProviderSettings(loadAgentProviderSettings()),
      statuses: getAgentProviderStatuses(),
      providers: publicDevelopmentAgentCatalog().filter(item => item.settingsManaged),
    });
    return true;
  }

  if (pathname === "/api/system/agent-providers/status" && req.method === "GET") {
    sendJson(res, { success: true, statuses: getAgentProviderStatuses(true) });
    return true;
  }

  const modelsMatch = pathname.match(/^\/api\/system\/agent-providers\/(codex|cursor|gemini|opencode|claudecode)\/models$/);
  if (modelsMatch && req.method === "GET") {
    try {
      sendJson(res, { success: true, ...getAgentProviderModels(modelsMatch[1]) });
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || "读取 Agent 模型失败" }, 400);
    }
    return true;
  }

  if (pathname === "/api/system/agent-providers" && req.method === "POST") {
    readJsonBody(req).then(payload => {
      const config = saveAgentProviderSettings(payload);
      sendJson(res, { success: true, config: publicAgentProviderSettings(config), statuses: getAgentProviderStatuses(true) });
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message || "保存开发 Agent 配置失败" }, 400));
    return true;
  }

  const actionMatch = pathname.match(/^\/api\/system\/agent-providers\/(codex|cursor|gemini|opencode|claudecode)\/(login|logout)$/);
  if (actionMatch && req.method === "POST") {
    try {
      const result = actionMatch[2] === "login"
        ? startAgentProviderLogin(actionMatch[1])
        : logoutAgentProvider(actionMatch[1]);
      sendJson(res, { success: true, ...result });
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || "Agent 认证操作失败" }, 400);
    }
    return true;
  }

  const installMatch = pathname.match(/^\/api\/system\/agent-providers\/(codex|cursor|gemini|opencode|claudecode)\/install$/);
  if (installMatch && req.method === "POST") {
    try {
      sendJson(res, { success: true, ...startAgentProviderInstall(installMatch[1]) });
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || "Agent 安装操作失败" }, 400);
    }
    return true;
  }

  return false;
}

function readJsonBody(req: IncomingMessage, maxBytes = 256 * 1024): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (Buffer.byteLength(body, "utf-8") > maxBytes) reject(new Error("请求内容过大"));
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("请求 JSON 无效")); }
    });
    req.on("error", reject);
  });
}

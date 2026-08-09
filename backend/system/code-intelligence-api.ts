import type { IncomingMessage, ServerResponse } from "http";
import { collectRequestBuffer, sendJson } from "../core/utils";
import {
  configureLanguageServer,
  getCodeIntelligenceProjectStatus,
  listCodeIntelligenceProjects,
  listLanguageServers,
  previewLanguageServerInstall,
  startCodeIntelligenceProject,
} from "./code-intelligence";

function adminOnly(req: IncomingMessage, res: ServerResponse) {
  const auth = (req as any).ccmAuth;
  if (auth?.kind === "browser" && auth?.role !== "admin") {
    sendJson(res, { success: false, error: "仅管理员可以管理代码索引和语言服务" }, 403);
    return false;
  }
  return true;
}

async function body(req: IncomingMessage) {
  const buffer = await collectRequestBuffer(req);
  if (!buffer.length) return {};
  const value = JSON.parse(buffer.toString("utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("请求体必须是JSON对象");
  return value;
}

export function handleCodeIntelligenceApi(pathname: string, req: IncomingMessage, res: ServerResponse) {
  if (pathname === "/api/code-intelligence/projects" && req.method === "GET") {
    try { sendJson(res, { success: true, projects: listCodeIntelligenceProjects(), contentStored: false }); }
    catch (error: any) { sendJson(res, { success: false, error: String(error?.message || error) }, 500); }
    return true;
  }
  if (pathname === "/api/code-intelligence/language-servers" && req.method === "GET") {
    sendJson(res, { success: true, languageServers: listLanguageServers(), contentStored: false });
    return true;
  }
  const projectMatch = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)$/);
  if (projectMatch && req.method === "GET") {
    try { sendJson(res, { success: true, project: getCodeIntelligenceProjectStatus(decodeURIComponent(projectMatch[1])), contentStored: false }); }
    catch (error: any) { sendJson(res, { success: false, error: String(error?.message || error) }, 404); }
    return true;
  }
  const projectAction = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)\/(start|reindex)$/);
  if (projectAction && req.method === "POST") {
    if (!adminOnly(req, res)) return true;
    body(req).then(input => {
      try {
        const result = startCodeIntelligenceProject(decodeURIComponent(projectAction[1]), projectAction[2] === "reindex");
        sendJson(res, { success: true, project: result, reason: String(input?.reason || "").slice(0, 500), contentStored: false });
      } catch (error: any) { sendJson(res, { success: false, error: String(error?.message || error) }, 400); }
    }).catch((error: any) => sendJson(res, { success: false, error: String(error?.message || error) }, 400));
    return true;
  }
  const serverAction = pathname.match(/^\/api\/code-intelligence\/language-servers\/([^/]+)\/(install|configure|stop)$/);
  if (serverAction && req.method === "POST") {
    if (!adminOnly(req, res)) return true;
    body(req).then(input => {
      try {
        const id = decodeURIComponent(serverAction[1]);
        if (serverAction[2] === "install") {
          const preview = previewLanguageServerInstall(id);
          const confirmed = input?.confirmed === true && String(input?.manifestChecksum || "") === String((preview as any).manifestChecksum || "");
          if ((preview as any).installRequired && confirmed) throw new Error("受管安装执行器尚未配置固定包镜像；未进行下载。请先在凭据/包源中心配置受信来源。");
          sendJson(res, { success: true, preview, requiresConfirmation: (preview as any).installRequired, contentStored: false });
        } else {
          const descriptor = configureLanguageServer(id, { ...input, action: serverAction[2] });
          sendJson(res, { success: true, languageServer: descriptor, contentStored: false });
        }
      } catch (error: any) { sendJson(res, { success: false, error: String(error?.message || error) }, 400); }
    }).catch((error: any) => sendJson(res, { success: false, error: String(error?.message || error) }, 400));
    return true;
  }
  return false;
}


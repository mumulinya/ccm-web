import type { IncomingMessage, ServerResponse } from "http";
import { collectRequestBuffer, sendJson } from "../core/utils";
import {
  configureLanguageServer,
  executeCodeIntelligenceTool,
  getCodeIntelligenceIndexRun,
  getCodeIntelligenceProjectStatus,
  listCodeIntelligenceProjects,
  listCodeIntelligenceFiles,
  listCodeIntelligenceIndexRuns,
  listLanguageServers,
  previewLanguageServerInstall,
  readCodeIntelligenceSource,
  startCodeIntelligenceIndexRun,
  type CodeIntelligenceToolName,
} from "./code-intelligence";
import { listEvidence, recordEvidence } from "./unified-evidence-registry";
import { listOperationRecords } from "./operation-registry";

const QUERY_OPERATIONS = new Set<CodeIntelligenceToolName>(["workspace_symbols", "document_symbols", "find_definition", "find_references", "find_implementations", "find_type_definition", "find_incoming_calls", "find_outgoing_calls", "read_code_diagnostics"]);

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
  if (pathname === "/api/code-intelligence/query" && req.method === "POST") {
    body(req).then(async input => {
      try {
        const project = String(input?.project || "").trim();
        const operation = String(input?.operation || "") as CodeIntelligenceToolName;
        if (!project || !QUERY_OPERATIONS.has(operation)) throw new Error("缺少项目或代码智能操作无效");
        const limit = Math.max(1, Math.min(500, Number(input?.limit || 100)));
        const result: any = await executeCodeIntelligenceTool(project, operation, { ...input, limit });
        const evidence = recordEvidence({
          evidenceType: operation === "read_code_diagnostics" ? "test" : "source",
          taskId: `code-intelligence:${project}`,
          workItemId: String(result.resultChecksum || "").slice(0, 32),
          scope: "project",
          scopeId: project,
          repoStateIdentity: result.repoStateIdentity,
          producerAgentId: "ccm-code-intelligence-workbench",
          status: "valid",
          subject: operation,
          references: (result.locations || []).map((item: any) => `${item.path}:${item.range?.startLine || 1}`),
          summary: `${Number(result.total ?? result.locations?.length ?? 0)} semantic locations at index generation ${Number(result.indexGeneration || 0)}`,
          sourceChecksum: result.resultChecksum,
        });
        result.evidenceId = evidence.evidenceId;
        if (operation === "read_code_diagnostics") {
          const operations = listOperationRecords({ target: project, operationTypes: ["build", "test", "lint", "typecheck", "diagnostic"] });
          const evidenceById = new Map(listEvidence().map(item => [item.evidenceId, item]));
          result.verificationDiagnostics = operations.slice(-100).map(item => ({ operationId: item.operationId, operationType: item.operationType, status: item.status, updatedAt: item.updatedAt, evidence: item.evidenceIds.map(id => evidenceById.get(id)).filter(Boolean).map(item => ({ evidenceId: item!.evidenceId, status: item!.status, subject: item!.subject, summary: item!.summary, references: item!.references, contentStored: false })), contentStored: false }));
        }
        sendJson(res, { success: true, result, contentStored: false });
      } catch (error: any) {
        const message = String(error?.message || error);
        sendJson(res, { success: false, error: message, state: /capability_unavailable/i.test(message) ? "capability_unavailable" : "query_failed" }, /capability_unavailable/i.test(message) ? 409 : 400);
      }
    }).catch((error: any) => sendJson(res, { success: false, error: String(error?.message || error) }, 400));
    return true;
  }
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
  const sourceMatch = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)\/source$/);
  if (sourceMatch && req.method === "GET") {
    try {
      const parsed = new URL(req.url || pathname, "http://localhost");
      const preview = readCodeIntelligenceSource(decodeURIComponent(sourceMatch[1]), String(parsed.searchParams.get("path") || ""), Number(parsed.searchParams.get("line") || 1), Number(parsed.searchParams.get("context") || 40));
      res.setHeader("Cache-Control", "no-store");
      sendJson(res, { success: true, source: preview, contentStored: false });
    } catch (error: any) { sendJson(res, { success: false, error: String(error?.message || error) }, 400); }
    return true;
  }
  const runListMatch = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)\/index-runs$/);
  if (runListMatch && req.method === "GET") {
    try {
      const parsed = new URL(req.url || pathname, "http://localhost");
      sendJson(res, { success: true, runs: listCodeIntelligenceIndexRuns(decodeURIComponent(runListMatch[1]), Number(parsed.searchParams.get("limit") || 20)), contentStored: false });
    } catch (error: any) { sendJson(res, { success: false, error: String(error?.message || error) }, 400); }
    return true;
  }
  const filesMatch = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)\/files$/);
  if (filesMatch && req.method === "GET") {
    try {
      const parsed = new URL(req.url || pathname, "http://localhost");
      const files = listCodeIntelligenceFiles(decodeURIComponent(filesMatch[1]), { cursor: parsed.searchParams.get("cursor") || "", limit: Number(parsed.searchParams.get("limit") || 200), language: parsed.searchParams.get("language") || "", query: parsed.searchParams.get("query") || "" });
      sendJson(res, { success: true, ...files });
    } catch (error: any) { sendJson(res, { success: false, error: String(error?.message || error) }, 400); }
    return true;
  }
  const runMatch = pathname.match(/^\/api\/code-intelligence\/index-runs\/([^/]+)$/);
  if (runMatch && req.method === "GET") {
    const run = getCodeIntelligenceIndexRun(decodeURIComponent(runMatch[1]));
    sendJson(res, run ? { success: true, run, contentStored: false } : { success: false, error: "索引任务不存在" }, run ? 200 : 404);
    return true;
  }
  const projectAction = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)\/(start|reindex)$/);
  if (projectAction && req.method === "POST") {
    if (!adminOnly(req, res)) return true;
    body(req).then(input => {
      try {
        const result = startCodeIntelligenceIndexRun(decodeURIComponent(projectAction[1]), projectAction[2] as "start" | "reindex", String(input?.reason || ""));
        sendJson(res, { success: true, accepted: true, run: result, contentStored: false }, 202);
      } catch (error: any) { sendJson(res, { success: false, error: String(error?.message || error) }, 400); }
    }).catch((error: any) => sendJson(res, { success: false, error: String(error?.message || error) }, 400));
    return true;
  }
  const repairMatch = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)\/repair$/);
  if (repairMatch && req.method === "POST") {
    if (!adminOnly(req, res)) return true;
    body(req).then(input => {
      try { sendJson(res, { success: true, accepted: true, run: startCodeIntelligenceIndexRun(decodeURIComponent(repairMatch[1]), "repair", String(input?.reason || "管理员修复代码智能索引")), contentStored: false }, 202); }
      catch (error: any) { sendJson(res, { success: false, error: String(error?.message || error) }, 400); }
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

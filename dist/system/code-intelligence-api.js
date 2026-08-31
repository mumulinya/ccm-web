"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCodeIntelligenceApi = handleCodeIntelligenceApi;
const utils_1 = require("../core/utils");
const code_intelligence_1 = require("./code-intelligence");
const code_intelligence_worker_client_1 = require("./code-intelligence-worker-client");
const unified_evidence_registry_1 = require("./unified-evidence-registry");
const operation_registry_1 = require("./operation-registry");
const QUERY_OPERATIONS = new Set(["workspace_symbols", "document_symbols", "find_definition", "find_references", "find_implementations", "find_type_definition", "find_incoming_calls", "find_outgoing_calls", "read_code_diagnostics"]);
function adminOnly(req, res) {
    const auth = req.ccmAuth;
    if (auth?.kind === "browser" && auth?.role !== "admin") {
        (0, utils_1.sendJson)(res, { success: false, error: "仅管理员可以管理代码索引和语言服务" }, 403);
        return false;
    }
    return true;
}
async function body(req) {
    const buffer = await (0, utils_1.collectRequestBuffer)(req);
    if (!buffer.length)
        return {};
    const value = JSON.parse(buffer.toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("请求体必须是JSON对象");
    return value;
}
function handleCodeIntelligenceApi(pathname, req, res) {
    if (pathname === "/api/code-intelligence/query" && req.method === "POST") {
        body(req).then(async (input) => {
            try {
                const project = String(input?.project || "").trim();
                const operation = String(input?.operation || "");
                if (!project || !QUERY_OPERATIONS.has(operation))
                    throw new Error("缺少项目或代码智能操作无效");
                const limit = Math.max(1, Math.min(500, Number(input?.limit || 100)));
                const result = await (0, code_intelligence_1.executeCodeIntelligenceTool)(project, operation, { ...input, limit });
                const evidence = (0, unified_evidence_registry_1.recordEvidence)({
                    evidenceType: operation === "read_code_diagnostics" ? "test" : "source",
                    taskId: `code-intelligence:${project}`,
                    workItemId: String(result.resultChecksum || "").slice(0, 32),
                    scope: "project",
                    scopeId: project,
                    repoStateIdentity: result.repoStateIdentity,
                    producerAgentId: "ccm-code-intelligence-workbench",
                    status: "valid",
                    subject: operation,
                    references: (result.locations || []).map((item) => `${item.path}:${item.range?.startLine || 1}`),
                    summary: `${Number(result.total ?? result.locations?.length ?? 0)} semantic locations at index generation ${Number(result.indexGeneration || 0)}`,
                    sourceChecksum: result.resultChecksum,
                });
                result.evidenceId = evidence.evidenceId;
                if (operation === "read_code_diagnostics") {
                    const operations = (0, operation_registry_1.listOperationRecords)({ target: project, operationTypes: ["build", "test", "lint", "typecheck", "diagnostic"] });
                    const evidenceById = new Map((0, unified_evidence_registry_1.listEvidence)().map(item => [item.evidenceId, item]));
                    result.verificationDiagnostics = operations.slice(-100).map(item => ({ operationId: item.operationId, operationType: item.operationType, status: item.status, updatedAt: item.updatedAt, evidence: item.evidenceIds.map(id => evidenceById.get(id)).filter(Boolean).map(item => ({ evidenceId: item.evidenceId, status: item.status, subject: item.subject, summary: item.summary, references: item.references, contentStored: false })), contentStored: false }));
                }
                (0, utils_1.sendJson)(res, { success: true, result, contentStored: false });
            }
            catch (error) {
                const message = String(error?.message || error);
                (0, utils_1.sendJson)(res, { success: false, error: message, state: /capability_unavailable/i.test(message) ? "capability_unavailable" : "query_failed" }, /capability_unavailable/i.test(message) ? 409 : 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400));
        return true;
    }
    if (pathname === "/api/code-intelligence/projects" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, { success: true, projects: (0, code_intelligence_1.listCodeIntelligenceProjects)(), worker: (0, code_intelligence_worker_client_1.getCodeIntelligenceWorkerStatus)(), contentStored: false });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 500);
        }
        return true;
    }
    if (pathname === "/api/code-intelligence/language-servers" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, languageServers: (0, code_intelligence_1.listLanguageServers)(), contentStored: false });
        return true;
    }
    const projectMatch = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)$/);
    if (projectMatch && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, { success: true, project: (0, code_intelligence_1.getCodeIntelligenceProjectStatus)(decodeURIComponent(projectMatch[1])), contentStored: false });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 404);
        }
        return true;
    }
    const sourceMatch = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)\/source$/);
    if (sourceMatch && req.method === "GET") {
        try {
            const parsed = new URL(req.url || pathname, "http://localhost");
            const preview = (0, code_intelligence_1.readCodeIntelligenceSource)(decodeURIComponent(sourceMatch[1]), String(parsed.searchParams.get("path") || ""), Number(parsed.searchParams.get("line") || 1), Number(parsed.searchParams.get("context") || 40));
            res.setHeader("Cache-Control", "no-store");
            (0, utils_1.sendJson)(res, { success: true, source: preview, contentStored: false });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
        }
        return true;
    }
    const runListMatch = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)\/index-runs$/);
    if (runListMatch && req.method === "GET") {
        try {
            const parsed = new URL(req.url || pathname, "http://localhost");
            (0, utils_1.sendJson)(res, { success: true, runs: (0, code_intelligence_1.listCodeIntelligenceIndexRuns)(decodeURIComponent(runListMatch[1]), Number(parsed.searchParams.get("limit") || 20)), contentStored: false });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
        }
        return true;
    }
    const filesMatch = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)\/files$/);
    if (filesMatch && req.method === "GET") {
        try {
            const parsed = new URL(req.url || pathname, "http://localhost");
            const files = (0, code_intelligence_1.listCodeIntelligenceFiles)(decodeURIComponent(filesMatch[1]), { cursor: parsed.searchParams.get("cursor") || "", limit: Number(parsed.searchParams.get("limit") || 200), language: parsed.searchParams.get("language") || "", query: parsed.searchParams.get("query") || "" });
            (0, utils_1.sendJson)(res, { success: true, ...files });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
        }
        return true;
    }
    const runMatch = pathname.match(/^\/api\/code-intelligence\/index-runs\/([^/]+)$/);
    if (runMatch && req.method === "GET") {
        const run = (0, code_intelligence_1.getCodeIntelligenceIndexRun)(decodeURIComponent(runMatch[1]));
        (0, utils_1.sendJson)(res, run ? { success: true, run, contentStored: false } : { success: false, error: "索引任务不存在" }, run ? 200 : 404);
        return true;
    }
    const projectAction = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)\/(start|reindex)$/);
    if (projectAction && req.method === "POST") {
        if (!adminOnly(req, res))
            return true;
        body(req).then(async (input) => {
            try {
                const result = await (0, code_intelligence_worker_client_1.startCodeIntelligenceIndexRunInWorker)(decodeURIComponent(projectAction[1]), projectAction[2], String(input?.reason || ""));
                (0, utils_1.sendJson)(res, { success: true, accepted: true, run: result, contentStored: false }, 202);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400));
        return true;
    }
    const repairMatch = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)\/repair$/);
    if (repairMatch && req.method === "POST") {
        if (!adminOnly(req, res))
            return true;
        body(req).then(async (input) => {
            try {
                (0, utils_1.sendJson)(res, { success: true, accepted: true, run: await (0, code_intelligence_worker_client_1.startCodeIntelligenceIndexRunInWorker)(decodeURIComponent(repairMatch[1]), "repair", String(input?.reason || "管理员修复代码智能索引")), contentStored: false }, 202);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400));
        return true;
    }
    const previewInstallMatch = pathname.match(/^\/api\/code-intelligence\/language-servers\/([^/]+)\/install-preview$/);
    if (previewInstallMatch && req.method === "POST") {
        if (!adminOnly(req, res))
            return true;
        body(req).then(async (input) => {
            try {
                const id = decodeURIComponent(previewInstallMatch[1]);
                const preview = await (0, code_intelligence_1.previewLanguageServerInstall)(id);
                (0, utils_1.sendJson)(res, { success: true, preview, requiresConfirmation: Boolean(preview.requiresConfirmation ?? preview.manifest?.installSupported), contentStored: false });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400));
        return true;
    }
    const installMatch = pathname.match(/^\/api\/code-intelligence\/language-servers\/([^/]+)\/install$/);
    if (installMatch && req.method === "POST") {
        if (!adminOnly(req, res))
            return true;
        body(req).then(input => {
            try {
                const id = decodeURIComponent(installMatch[1]);
                if (input?.confirmed !== true)
                    throw new Error("安装语言服务前必须明确确认预览");
                const installation = (0, code_intelligence_1.installLanguageServer)(id, { manifestChecksum: String(input?.manifestChecksum || ""), revision: Number(input?.revision || 0) });
                (0, utils_1.sendJson)(res, { success: true, accepted: true, installation, contentStored: false }, 202);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400));
        return true;
    }
    const serverAction = pathname.match(/^\/api\/code-intelligence\/language-servers\/([^/]+)\/(configure|stop)$/);
    if (serverAction && req.method === "POST") {
        if (!adminOnly(req, res))
            return true;
        body(req).then(input => {
            try {
                const id = decodeURIComponent(serverAction[1]);
                const descriptor = (0, code_intelligence_1.configureLanguageServer)(id, { ...input, action: serverAction[2] });
                (0, utils_1.sendJson)(res, { success: true, languageServer: descriptor, contentStored: false });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400));
        return true;
    }
    return false;
}
//# sourceMappingURL=code-intelligence-api.js.map
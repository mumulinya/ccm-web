"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCodeIntelligenceApi = handleCodeIntelligenceApi;
const utils_1 = require("../core/utils");
const code_intelligence_1 = require("./code-intelligence");
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
    if (pathname === "/api/code-intelligence/projects" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, { success: true, projects: (0, code_intelligence_1.listCodeIntelligenceProjects)(), contentStored: false });
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
    const projectAction = pathname.match(/^\/api\/code-intelligence\/projects\/([^/]+)\/(start|reindex)$/);
    if (projectAction && req.method === "POST") {
        if (!adminOnly(req, res))
            return true;
        body(req).then(input => {
            try {
                const result = (0, code_intelligence_1.startCodeIntelligenceProject)(decodeURIComponent(projectAction[1]), projectAction[2] === "reindex");
                (0, utils_1.sendJson)(res, { success: true, project: result, reason: String(input?.reason || "").slice(0, 500), contentStored: false });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400));
        return true;
    }
    const serverAction = pathname.match(/^\/api\/code-intelligence\/language-servers\/([^/]+)\/(install|configure|stop)$/);
    if (serverAction && req.method === "POST") {
        if (!adminOnly(req, res))
            return true;
        body(req).then(input => {
            try {
                const id = decodeURIComponent(serverAction[1]);
                if (serverAction[2] === "install") {
                    const preview = (0, code_intelligence_1.previewLanguageServerInstall)(id);
                    const confirmed = input?.confirmed === true && String(input?.manifestChecksum || "") === String(preview.manifestChecksum || "");
                    if (preview.installRequired && confirmed)
                        throw new Error("受管安装执行器尚未配置固定包镜像；未进行下载。请先在凭据/包源中心配置受信来源。");
                    (0, utils_1.sendJson)(res, { success: true, preview, requiresConfirmation: preview.installRequired, contentStored: false });
                }
                else {
                    const descriptor = (0, code_intelligence_1.configureLanguageServer)(id, { ...input, action: serverAction[2] });
                    (0, utils_1.sendJson)(res, { success: true, languageServer: descriptor, contentStored: false });
                }
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
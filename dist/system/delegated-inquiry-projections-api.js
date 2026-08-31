"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDelegatedInquiryProjectionsApi = handleDelegatedInquiryProjectionsApi;
const utils_1 = require("../core/utils");
const access_policy_1 = require("../modules/system/access-policy");
const api_access_control_1 = require("../modules/system/api-access-control");
const delegated_inquiry_projections_1 = require("./delegated-inquiry-projections");
const delegated_inquiry_actions_1 = require("./delegated-inquiry-actions");
function readJsonBody(req, max = 64 * 1024) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => {
            body += String(chunk);
            if (body.length > max)
                reject(Object.assign(new Error("请求内容过大"), { code: "REQUEST_TOO_LARGE" }));
        });
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch {
                reject(Object.assign(new Error("JSON格式无效"), { code: "INVALID_JSON" }));
            }
        });
        req.on("error", reject);
    });
}
function handleDelegatedInquiryProjectionsApi(pathname, req, res, parsed) {
    if (pathname === "/api/delegated-inquiries/action" && req.method === "POST") {
        void readJsonBody(req).then(async (payload) => {
            const inquiryId = String(payload?.inquiryId || payload?.inquiry_id || "").trim();
            const projection = (0, delegated_inquiry_projections_1.getDelegatedInquiryProjection)(inquiryId);
            if (!projection)
                return (0, utils_1.sendJson)(res, { success: false, error: "协作记录不存在", code: "DELEGATED_INQUIRY_NOT_FOUND" }, 404);
            const principal = (0, api_access_control_1.requestAccessPrincipal)(req);
            if (principal?.kind === "browser" && !(0, access_policy_1.hasResourceAccess)(String(principal.userId || ""), principal.role, projection.targetScope, projection.targetId, "use")) {
                return (0, utils_1.sendJson)(res, { success: false, error: "当前账户没有目标资源的访问权限", code: "RESOURCE_ACCESS_DENIED" }, 403);
            }
            try {
                const result = await (0, delegated_inquiry_actions_1.performDelegatedInquiryAction)({
                    inquiryId,
                    revision: Number(payload?.revision || 0),
                    action: String(payload?.action || ""),
                    clarification: String(payload?.clarification || ""),
                });
                res.setHeader("Cache-Control", "no-store");
                (0, utils_1.sendJson)(res, { success: true, ...result });
            }
            catch (error) {
                const code = String(error?.code || "DELEGATED_INQUIRY_ACTION_FAILED");
                const status = code === "DELEGATED_INQUIRY_REVISION_CONFLICT" ? 409
                    : code === "DELEGATED_INQUIRY_NOT_FOUND" ? 404
                        : code === "DELEGATED_INQUIRY_ACTION_NOT_ALLOWED" || code === "DELEGATED_INQUIRY_CLARIFICATION_REQUIRED" ? 400 : 500;
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "协作记录操作失败", code }, status);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "请求解析失败", code: error?.code || "INVALID_REQUEST" }, 400));
        return true;
    }
    if (pathname !== "/api/delegated-inquiries" || req.method !== "GET")
        return false;
    const targetScope = String(parsed?.query?.target_scope || parsed?.query?.targetScope || "");
    const targetId = String(parsed?.query?.target_id || parsed?.query?.targetId || "");
    if (!targetId || !["project", "group"].includes(targetScope)) {
        (0, utils_1.sendJson)(res, { success: false, error: "协作记录缺少有效目标" }, 400);
        return true;
    }
    const principal = (0, api_access_control_1.requestAccessPrincipal)(req);
    if (principal?.kind === "browser" && !(0, access_policy_1.hasResourceAccess)(String(principal.userId || ""), principal.role, targetScope, targetId, "use")) {
        (0, utils_1.sendJson)(res, { success: false, error: "当前账户没有目标资源的访问权限", code: "RESOURCE_ACCESS_DENIED" }, 403);
        return true;
    }
    res.setHeader("Cache-Control", "no-store");
    (0, utils_1.sendJson)(res, {
        success: true,
        inquiries: (0, delegated_inquiry_projections_1.listDelegatedInquiryProjections)({ targetScope, targetId, limit: parsed?.query?.limit }),
    });
    return true;
}
//# sourceMappingURL=delegated-inquiry-projections-api.js.map
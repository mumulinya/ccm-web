"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.beginFeishuReactionFeedback = beginFeishuReactionFeedback;
exports.finishFeishuReactionFeedback = finishFeishuReactionFeedback;
exports.getFeishuReactionFeedbackState = getFeishuReactionFeedbackState;
exports.handleFeishuReactionFeedbackApi = handleFeishuReactionFeedbackApi;
exports.runFeishuReactionFeedbackSelfTest = runFeishuReactionFeedbackSelfTest;
const fs = __importStar(require("fs"));
const db_1 = require("../core/db");
const credential_store_1 = require("../core/credential-store");
const utils_1 = require("../core/utils");
const FEISHU_API = "https://open.feishu.cn/open-apis";
const DEFAULT_TIMEOUT_MS = 2_000;
const MAX_REACTION_LIFETIME_MS = 15 * 60 * 1000;
const activeReactionJobs = new Map();
const tenantTokenCache = new Map();
function normalizeScope(value) {
    return String(value || "").trim().toLowerCase() === "project" ? "project" : "global";
}
function normalizeProject(value) {
    return String(value || "").trim();
}
function normalizeMessageId(value) {
    const messageId = String(value || "").trim();
    if (!/^om_[a-z0-9_-]{8,200}$/i.test(messageId))
        throw new Error("飞书消息 ID 无效");
    return messageId;
}
function parseProjectFeishuCredentials(project) {
    const config = (0, db_1.getConfigs)().find(item => String(item.name || "") === project);
    if (!config?.path || !fs.existsSync(config.path))
        throw new Error("项目飞书配置不存在");
    const content = fs.readFileSync(config.path, "utf-8");
    const blocks = content.split(/(?=^\s*\[\[projects\]\]\s*$)/gmi);
    const projectBlock = blocks.find(block => {
        const name = block.match(/^\s*name\s*=\s*"([^"]+)"\s*$/mi)?.[1] || "";
        return name === project;
    }) || content;
    const platformBlocks = projectBlock.split(/(?=^\s*\[\[projects\.platforms\]\]\s*$)/gmi);
    const feishuBlock = platformBlocks.find(block => /^\s*type\s*=\s*"(?:feishu|lark)"\s*$/mi.test(block));
    if (!feishuBlock)
        throw new Error("项目没有配置飞书机器人");
    const appId = String(feishuBlock.match(/^\s*app_id\s*=\s*"([^"]+)"\s*$/mi)?.[1] || "").trim();
    const appSecretValue = String(feishuBlock.match(/^\s*app_secret\s*=\s*"([^"]+)"\s*$/mi)?.[1] || "").trim();
    const appSecret = appSecretValue ? (0, credential_store_1.resolveCredential)(appSecretValue) : "";
    if (!appId || !appSecret)
        throw new Error("项目飞书机器人凭据不完整");
    return { appId, appSecret };
}
function resolveReactionCredentials(scope, project) {
    if (scope === "project")
        return parseProjectFeishuCredentials(project);
    const config = (0, db_1.loadFeishuConfig)();
    const appId = String(config.control_bot_app_id || config.app_id || "").trim();
    const appSecret = String(config.control_bot_app_secret || config.app_secret || "").trim();
    if (!appId || !appSecret)
        throw new Error("全局飞书机器人凭据不完整");
    return { appId, appSecret };
}
async function readFeishuJson(response, action) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || Number(data?.code || 0) !== 0) {
        throw new Error(`${action}失败 (${response.status}/${data?.code ?? "unknown"}): ${String(data?.msg || "unknown").slice(0, 160)}`);
    }
    return data;
}
async function getTenantToken(credentials, deps) {
    const cached = tenantTokenCache.get(credentials.appId);
    if (cached && Date.now() < cached.expiresAt)
        return cached.token;
    const fetchImpl = deps.fetchImpl || fetch;
    const timeoutMs = Math.max(250, Math.min(10_000, Number(deps.timeoutMs || DEFAULT_TIMEOUT_MS)));
    const response = await fetchImpl(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: credentials.appId, app_secret: credentials.appSecret }),
        signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await readFeishuJson(response, "获取飞书机器人 Token");
    const token = String(data.tenant_access_token || "").trim();
    if (!token)
        throw new Error("飞书机器人 Token 为空");
    tenantTokenCache.set(credentials.appId, {
        token,
        expiresAt: Date.now() + Math.max(60, Number(data.expire || 7200) - 300) * 1000,
    });
    return token;
}
async function callReactionApi(credentials, messageId, input, deps) {
    const fetchImpl = deps.fetchImpl || fetch;
    const timeoutMs = Math.max(250, Math.min(10_000, Number(deps.timeoutMs || DEFAULT_TIMEOUT_MS)));
    const token = await getTenantToken(credentials, deps);
    const encodedMessageId = encodeURIComponent(messageId);
    const adding = input.action === "add";
    const endpoint = adding
        ? `${FEISHU_API}/im/v1/messages/${encodedMessageId}/reactions`
        : `${FEISHU_API}/im/v1/messages/${encodedMessageId}/reactions/${encodeURIComponent(input.reactionId)}`;
    const response = await fetchImpl(endpoint, {
        method: adding ? "POST" : "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        ...(adding ? { body: JSON.stringify({ reaction_type: { emoji_type: input.emoji } }) } : {}),
        signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await readFeishuJson(response, adding ? "添加飞书状态表情" : "移除飞书状态表情");
    return adding ? String(data?.data?.reaction_id || "") : "";
}
function reactionJobKey(scope, project, messageId) {
    return `${scope}:${project}:${messageId}`;
}
function logReactionFailure(job, phase, error) {
    console.warn(`[飞书状态表情] ${phase}失败 scope=${job.scope} project=${job.project || "-"} reason=${String(error?.message || error).slice(0, 180)}`);
}
function beginFeishuReactionFeedback(input, deps = {}) {
    const scope = normalizeScope(input.scope);
    const project = normalizeProject(input.project);
    if (scope === "project" && !project)
        throw new Error("项目状态表情缺少项目 ID");
    const messageId = normalizeMessageId(input.messageId);
    const key = reactionJobKey(scope, project, messageId);
    const existing = activeReactionJobs.get(key);
    if (existing)
        return { accepted: true, duplicate: true, key };
    const resolveCredentials = deps.resolveCredentials || resolveReactionCredentials;
    const credentials = resolveCredentials(scope, project);
    const startPromise = callReactionApi(credentials, messageId, { action: "add", emoji: "OnIt" }, deps)
        .catch(error => {
        logReactionFailure({ scope, project }, "添加处理中表情", error);
        return "";
    });
    const timer = setTimeout(() => {
        void finishFeishuReactionFeedback({ scope, project, messageId, status: "cancelled" }, deps);
    }, MAX_REACTION_LIFETIME_MS);
    timer.unref?.();
    activeReactionJobs.set(key, {
        key,
        scope,
        project,
        messageId,
        reactionId: "",
        startPromise,
        finalizing: false,
        timer,
    });
    return { accepted: true, duplicate: false, key };
}
function finishFeishuReactionFeedback(input, deps = {}) {
    const scope = normalizeScope(input.scope);
    const project = normalizeProject(input.project);
    const messageId = normalizeMessageId(input.messageId);
    const status = ["failed", "cancelled"].includes(String(input.status || ""))
        ? String(input.status)
        : "completed";
    const key = reactionJobKey(scope, project, messageId);
    const job = activeReactionJobs.get(key);
    if (!job || job.finalizing)
        return { accepted: false, missing: !job, key };
    job.finalizing = true;
    clearTimeout(job.timer);
    const resolveCredentials = deps.resolveCredentials || resolveReactionCredentials;
    let credentials;
    try {
        credentials = resolveCredentials(scope, project);
    }
    catch (error) {
        activeReactionJobs.delete(key);
        logReactionFailure(job, "读取结束阶段凭据", error);
        return { accepted: false, missing: false, key, status, error: "credentials_unavailable" };
    }
    void job.startPromise.then(async (reactionId) => {
        job.reactionId = reactionId;
        if (reactionId) {
            await callReactionApi(credentials, messageId, { action: "delete", reactionId }, deps)
                .catch(error => logReactionFailure(job, "移除处理中表情", error));
        }
        if (status === "completed") {
            await callReactionApi(credentials, messageId, { action: "add", emoji: "Done" }, deps)
                .catch(error => logReactionFailure(job, "添加完成表情", error));
        }
    }).finally(() => activeReactionJobs.delete(key));
    return { accepted: true, missing: false, key, status };
}
function getFeishuReactionFeedbackState() {
    return [...activeReactionJobs.values()].map(job => ({
        key: job.key,
        scope: job.scope,
        project: job.project,
        finalizing: job.finalizing,
    }));
}
function isLoopbackAddress(value) {
    const address = String(value || "").trim().toLowerCase();
    return address === "127.0.0.1"
        || address === "::1"
        || address === "::ffff:127.0.0.1";
}
function readBoundedJson(req, maxBytes = 64 * 1024) {
    return new Promise((resolve, reject) => {
        let body = "";
        let bytes = 0;
        let settled = false;
        req.on("data", (chunk) => {
            if (settled)
                return;
            bytes += Buffer.byteLength(chunk);
            if (bytes > maxBytes) {
                settled = true;
                reject(new Error("请求体过大"));
                return;
            }
            body += chunk;
        });
        req.on("end", () => {
            if (settled)
                return;
            settled = true;
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch {
                reject(new Error("请求体不是有效 JSON"));
            }
        });
        req.on("error", (error) => {
            if (settled)
                return;
            settled = true;
            reject(error);
        });
    });
}
function handleFeishuReactionFeedbackApi(pathname, req, res) {
    const action = pathname === "/api/internal/feishu-reaction/start"
        ? "start"
        : pathname === "/api/internal/feishu-reaction/finish"
            ? "finish"
            : "";
    if (!action)
        return false;
    if (req.method !== "POST")
        return (0, utils_1.sendJson)(res, { success: false, error: "Method Not Allowed" }, 405);
    if (String(req.headers["x-ccm-acp"] || "") !== "1" || !isLoopbackAddress(req.socket?.remoteAddress)) {
        return (0, utils_1.sendJson)(res, { success: false, error: "仅允许本机 ACP 调用" }, 403);
    }
    void readBoundedJson(req).then(payload => {
        const rawScope = String(payload.scope || "").trim();
        if (rawScope !== "global" && rawScope !== "project")
            throw new Error("无效的飞书状态作用域");
        const common = {
            scope: rawScope,
            project: payload.project,
            messageId: payload.message_id || payload.messageId,
        };
        const result = action === "start"
            ? beginFeishuReactionFeedback(common)
            : finishFeishuReactionFeedback({ ...common, status: payload.status });
        (0, utils_1.sendJson)(res, { success: true, ...result }, 202);
    }).catch((error) => {
        if (!res.headersSent)
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
    });
    return true;
}
async function runFeishuReactionFeedbackSelfTest() {
    tenantTokenCache.clear();
    const calls = [];
    let reactionSequence = 0;
    const fetchImpl = (async (url, init = {}) => {
        const text = String(url);
        const body = init.body ? JSON.parse(String(init.body)) : null;
        calls.push({ url: text, method: String(init.method || "GET"), body });
        if (text.includes("/auth/v3/tenant_access_token/internal")) {
            return new Response(JSON.stringify({ code: 0, tenant_access_token: "test-token", expire: 7200 }), { status: 200 });
        }
        if (init.method === "POST") {
            reactionSequence += 1;
            return new Response(JSON.stringify({ code: 0, data: { reaction_id: `reaction-${reactionSequence}` } }), { status: 200 });
        }
        return new Response(JSON.stringify({ code: 0, data: {} }), { status: 200 });
    });
    const deps = {
        fetchImpl,
        resolveCredentials: () => ({ appId: "test-app", appSecret: "test-secret" }),
        timeoutMs: 500,
    };
    const messageId = `om_feedback_${Date.now().toString(36)}`;
    const started = beginFeishuReactionFeedback({ scope: "global", messageId }, deps);
    const duplicate = beginFeishuReactionFeedback({ scope: "global", messageId }, deps);
    const finished = finishFeishuReactionFeedback({ scope: "global", messageId, status: "completed" }, deps);
    for (let attempt = 0; attempt < 50 && activeReactionJobs.size; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    const failedMessageId = `om_feedback_failed_${Date.now().toString(36)}`;
    beginFeishuReactionFeedback({ scope: "global", messageId: failedMessageId }, deps);
    finishFeishuReactionFeedback({ scope: "global", messageId: failedMessageId, status: "failed" }, deps);
    for (let attempt = 0; attempt < 50 && activeReactionJobs.size; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    const reactionCalls = calls.filter(call => call.url.includes(`/messages/${messageId}/reactions`));
    const failedReactionCalls = calls.filter(call => call.url.includes(`/messages/${failedMessageId}/reactions`));
    const checks = {
        startAccepted: started.accepted === true && started.duplicate === false,
        duplicateSuppressed: duplicate.duplicate === true,
        finishAccepted: finished.accepted === true,
        processingAddedFirst: reactionCalls[0]?.method === "POST" && reactionCalls[0]?.body?.reaction_type?.emoji_type === "OnIt",
        processingRemoved: reactionCalls[1]?.method === "DELETE",
        doneAddedLast: reactionCalls[2]?.method === "POST" && reactionCalls[2]?.body?.reaction_type?.emoji_type === "Done",
        failedTurnAddedProcessing: failedReactionCalls[0]?.method === "POST"
            && failedReactionCalls[0]?.body?.reaction_type?.emoji_type === "OnIt",
        failedTurnRemovedProcessing: failedReactionCalls[1]?.method === "DELETE",
        failedTurnDidNotClaimDone: failedReactionCalls.length === 2,
        stateReleased: activeReactionJobs.size === 0,
    };
    return { pass: Object.values(checks).every(Boolean), checks, callCount: calls.length };
}
//# sourceMappingURL=feishu-reaction-feedback.js.map
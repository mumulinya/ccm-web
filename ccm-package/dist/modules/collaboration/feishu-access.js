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
exports.extractFeishuInboundIdentity = extractFeishuInboundIdentity;
exports.resolveFeishuUserAccess = resolveFeishuUserAccess;
exports.signFeishuCardAction = signFeishuCardAction;
exports.verifyFeishuCardAction = verifyFeishuCardAction;
exports.publicFeishuUserMapping = publicFeishuUserMapping;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
function text(value, max = 160) {
    return String(value || "").trim().slice(0, max);
}
function extractFeishuInboundIdentity(payload = {}) {
    const sender = payload?.event?.sender || payload?.sender || payload?.operator || payload?.action?.operator || {};
    const senderId = sender?.sender_id || sender?.operator_id || sender || {};
    return {
        open_id: text(senderId.open_id || sender.open_id || payload?.open_id || payload?.openId),
        user_id: text(senderId.user_id || sender.user_id || payload?.user_id || payload?.userId),
        union_id: text(senderId.union_id || sender.union_id || payload?.union_id || payload?.unionId),
        name: text(sender.name || sender.display_name || payload?.user_name || payload?.userName, 80),
    };
}
function normalizedRole(value) {
    const role = String(value || "").trim().toLowerCase();
    return role === "admin" || role === "operator" ? role : "viewer";
}
function resolveFeishuUserAccess(payload = {}, config = (0, db_1.loadFeishuConfig)()) {
    const identity = extractFeishuInboundIdentity(payload);
    const users = Array.isArray(config.control_bot_users) ? config.control_bot_users : [];
    const mode = config.control_bot_access_mode === "mapped" ? "mapped" : "open";
    const authorizedOpenId = text(config.authorized_user?.open_id);
    const mapping = users.find((item) => {
        if (item?.enabled === false)
            return false;
        return (identity.open_id && text(item.open_id) === identity.open_id)
            || (identity.user_id && text(item.user_id) === identity.user_id)
            || (identity.union_id && text(item.union_id) === identity.union_id);
    });
    const ownerFallback = !mapping && authorizedOpenId && identity.open_id === authorizedOpenId
        ? { role: "admin", enabled: true }
        : null;
    const matched = mapping || ownerFallback;
    const role = matched ? normalizedRole(matched.role) : mode === "open" ? "operator" : "viewer";
    const hasIdentity = !!(identity.open_id || identity.user_id || identity.union_id);
    const allowed = mode === "open" ? hasIdentity : !!matched;
    return {
        ...identity,
        allowed,
        role,
        mode,
        reason: allowed ? "" : hasIdentity ? "当前飞书用户不在 CCM 允许名单中" : "无法识别飞书用户身份",
        canOperate: allowed && ["operator", "admin"].includes(role),
        canApprove: allowed && role === "admin",
    };
}
function cardActionSecret(config = (0, db_1.loadFeishuConfig)()) {
    return text(config.control_bot_card_action_secret
        || config.control_bot_hook_token
        || config.control_bot_app_secret
        || config.app_secret, 500);
}
function actionPayload(value) {
    const base = [
        text(value?.ccm_action, 80),
        text(value?.request_id, 120),
        text(value?.decision, 24),
        text(value?.binding_id, 120),
        text(value?.expires_at, 80),
    ];
    if (String(value?.ccm_action || "") === "global_target_selection") {
        base.push(text(value?.scope, 32), text(value?.scope_id, 160), text(value?.conversation_id, 180));
    }
    return base.join("\n");
}
function signFeishuCardAction(value, config = (0, db_1.loadFeishuConfig)()) {
    const secret = cardActionSecret(config);
    if (!secret)
        throw new Error("飞书卡片审批缺少签名密钥");
    return crypto.createHmac("sha256", secret).update(actionPayload(value)).digest("hex");
}
function verifyFeishuCardAction(value, config = (0, db_1.loadFeishuConfig)()) {
    const signature = text(value?.signature, 128);
    if (!signature || !/^[a-f0-9]{64}$/i.test(signature))
        return false;
    let expected = "";
    try {
        expected = signFeishuCardAction(value, config);
    }
    catch {
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}
function publicFeishuUserMapping(item) {
    return {
        open_id: text(item?.open_id),
        user_id: text(item?.user_id),
        union_id: text(item?.union_id),
        name: text(item?.name, 80),
        role: normalizedRole(item?.role),
        enabled: item?.enabled !== false,
    };
}
//# sourceMappingURL=feishu-access.js.map
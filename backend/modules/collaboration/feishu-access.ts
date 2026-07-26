import * as crypto from "crypto";
import { loadFeishuConfig } from "../../core/db";

export type FeishuUserRole = "viewer" | "operator" | "admin";

export type FeishuInboundIdentity = {
  open_id: string;
  user_id: string;
  union_id: string;
  name: string;
};

export type FeishuAccessDecision = FeishuInboundIdentity & {
  allowed: boolean;
  role: FeishuUserRole;
  mode: "open" | "mapped";
  reason: string;
  canOperate: boolean;
  canApprove: boolean;
};

function text(value: any, max = 160) {
  return String(value || "").trim().slice(0, max);
}

export function extractFeishuInboundIdentity(payload: any = {}): FeishuInboundIdentity {
  const sender = payload?.event?.sender || payload?.sender || payload?.operator || payload?.action?.operator || {};
  const senderId = sender?.sender_id || sender?.operator_id || sender || {};
  return {
    open_id: text(senderId.open_id || sender.open_id || payload?.open_id || payload?.openId),
    user_id: text(senderId.user_id || sender.user_id || payload?.user_id || payload?.userId),
    union_id: text(senderId.union_id || sender.union_id || payload?.union_id || payload?.unionId),
    name: text(sender.name || sender.display_name || payload?.user_name || payload?.userName, 80),
  };
}

function normalizedRole(value: any): FeishuUserRole {
  const role = String(value || "").trim().toLowerCase();
  return role === "admin" || role === "operator" ? role : "viewer";
}

export function resolveFeishuUserAccess(payload: any = {}, config = loadFeishuConfig()): FeishuAccessDecision {
  const identity = extractFeishuInboundIdentity(payload);
  const users = Array.isArray(config.control_bot_users) ? config.control_bot_users : [];
  const mode: "open" | "mapped" = config.control_bot_access_mode === "mapped" ? "mapped" : "open";
  const authorizedOpenId = text(config.authorized_user?.open_id);
  const mapping = users.find((item: any) => {
    if (item?.enabled === false) return false;
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

function cardActionSecret(config = loadFeishuConfig()) {
  return text(
    config.control_bot_card_action_secret
      || config.control_bot_hook_token
      || config.control_bot_app_secret
      || config.app_secret,
    500,
  );
}

function actionPayload(value: any) {
  return [
    text(value?.ccm_action, 80),
    text(value?.request_id, 120),
    text(value?.decision, 24),
    text(value?.binding_id, 120),
    text(value?.expires_at, 80),
  ].join("\n");
}

export function signFeishuCardAction(value: any, config = loadFeishuConfig()) {
  const secret = cardActionSecret(config);
  if (!secret) throw new Error("飞书卡片审批缺少签名密钥");
  return crypto.createHmac("sha256", secret).update(actionPayload(value)).digest("hex");
}

export function verifyFeishuCardAction(value: any, config = loadFeishuConfig()) {
  const signature = text(value?.signature, 128);
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  let expected = "";
  try { expected = signFeishuCardAction(value, config); } catch { return false; }
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

export function publicFeishuUserMapping(item: any) {
  return {
    open_id: text(item?.open_id),
    user_id: text(item?.user_id),
    union_id: text(item?.union_id),
    name: text(item?.name, 80),
    role: normalizedRole(item?.role),
    enabled: item?.enabled !== false,
  };
}

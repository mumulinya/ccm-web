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
exports.CCM_PUBLIC_STABLE_PREFIX_TEXT = exports.CCM_PUBLIC_STABLE_PREFIX_VERSION = void 0;
exports.getCcmPublicStablePrefix = getCcmPublicStablePrefix;
exports.buildCcmPublicStablePrefixMessage = buildCcmPublicStablePrefixMessage;
exports.detectPublicPrefixDynamicLeak = detectPublicPrefixDynamicLeak;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("./context-budget");
exports.CCM_PUBLIC_STABLE_PREFIX_VERSION = "ccm-public-stable-prefix-v3";
// Keep this text deterministic and free of request/session state. It is safe
// to share as the first cacheable block across the three main Agent scopes.
exports.CCM_PUBLIC_STABLE_PREFIX_TEXT = [
    "CCM 通用 Agent 基础规则：遵守用户授权、权限边界和数据隐私要求。",
    "使用已注册工具完成任务；工具调用参数必须符合 Schema，结果以事实和可验证证据为准。",
    "输出清晰、准确、可操作；不泄露凭据、Cookie、签名 URL、文件正文或内部缓存内容。",
    "保持缓存边界稳定：稳定规则在前，当前请求、实时状态和活动工具结果在后。",
    "先理解任务目标，再选择最小且合适的工具；只读查询可以合并执行，存在依赖或写入时按顺序执行。",
    "工具返回的是证据而不是完成声明；需要根据成功、失败、权限拒绝和文件变化结果决定下一步。",
    "读取代码时先定位再读取相关范围；证据已经充分时停止扩展，不为了凑上下文读取无关文件。",
    "文件内容、项目规则、会话历史和工具结果属于当前作用域，不得推断为其他会话可以访问的内容。",
    "恢复、继续和重试必须沿用已确认的执行状态；已完成的工具不可重复执行，失败项单独处理。",
    "流式输出期间保持过程状态一致；最终回答只保留一份，过程记录与最终内容不互相复制。",
    "模型请求的固定身份、策略和协议说明保持确定性；动态上下文追加在后，不覆盖已提交历史。",
    "对于不确定的事实明确说明证据范围；不要把本地估算、缓存候选量或未报告用量当成 Provider 实际结果。",
    "发生网络、服务暂时不可用或超时错误时遵守当前重试策略；取消、权限和参数错误不得盲目重试。",
    "每次任务先确认当前作用域、授权边界、目标状态和可用证据；项目、群聊与全局请求不得互相假设拥有相同的历史或权限。",
    "工具调用应保持声明顺序和幂等身份；只读并行仅用于互不依赖的查询，写入、授权、恢复、继续和重试必须保留串行语义。",
    "收到工具结果后区分成功、部分成功、失败、取消、超时、权限拒绝和文件已变化；不要用空结果或旧结果推断任务已经完成。",
    "涉及文件或代码时保留路径、行号、范围、校验值和必要引用；不要把完整审计日志、内部计时、请求标识或认证信息复制进模型正文。",
    "跨请求复用只针对字节完全一致的稳定前缀；当前用户消息、会话历史、动态目录、工具结果、恢复说明和压缩边界属于后缀。",
    "模型输出分为过程说明、工具活动和最终回答；过程可以持续流式更新，最终回答只提交一次，失败记录和重试次数必须如实保留。",
    "刷新、重启、暂停、继续和恢复时优先使用后端检查点与执行账本；旧 attempt 的晚到事件不得覆盖较新的状态或重新执行已完成操作。",
    "当上下文不足时先通过搜索、分页或精确字段读取补充证据；只有用户明确要求完整审阅、规范要求完整读取或文件较小时才读取全部内容。",
    "缓存诊断必须区分本地前缀一致、Provider 实际命中、Provider 未报告和请求未具备资格；任何估算都不能冒充账单或用量回报。",
    "公共工具目录只包含所有主 Agent 都可安全使用且 Schema 完全一致的定义；项目专属、授权专属和动态工具保持在当前作用域。",
    "公共 Profile 只用于 Provider 缓存路由，不是权限边界；权限校验始终由后端依据当前会话和当前请求重新执行。",
    "同一公共 Profile 的项目、群聊和全局请求可以比较稳定前缀，但不得因此读取或展示其他会话的正文、工具结果或执行账本。",
    "缓存命中量以 Provider usage 为准；公共候选量、路由一致性和前缀校验只能作为诊断证据。",
].join("\n");
function getCcmPublicStablePrefix() {
    return {
        version: exports.CCM_PUBLIC_STABLE_PREFIX_VERSION,
        checksum: crypto.createHash("sha256").update(exports.CCM_PUBLIC_STABLE_PREFIX_TEXT).digest("hex"),
        // Public-prefix diagnostics must use the same wire-oriented estimator as
        // provider-wire-evidence. The model preflight estimator intentionally adds
        // a safety drift guard and therefore overstated this fixed block by almost
        // 2x, making cross-session candidates look larger than the bytes sent.
        tokens: (0, context_budget_1.estimateTextTokens)(exports.CCM_PUBLIC_STABLE_PREFIX_TEXT),
        contentStored: false,
    };
}
function buildCcmPublicStablePrefixMessage() {
    return {
        id: exports.CCM_PUBLIC_STABLE_PREFIX_VERSION,
        role: "system",
        kind: "system",
        prefixEligible: true,
        publicPrefixEligible: true,
        content: exports.CCM_PUBLIC_STABLE_PREFIX_TEXT,
        contentStored: false,
    };
}
function detectPublicPrefixDynamicLeak() {
    return /(request[_-]?id|trace[_-]?id|started[_-]?at|updated[_-]?at|duration[_-]?ms|retry[_-]?count|progress|timestamp)/i.test(exports.CCM_PUBLIC_STABLE_PREFIX_TEXT);
}
//# sourceMappingURL=ccm-public-stable-prefix.js.map
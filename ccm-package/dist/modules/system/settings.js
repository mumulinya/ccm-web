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
exports.handleSystemSettingsApi = handleSystemSettingsApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const credential_store_1 = require("../../core/credential-store");
const utils_1 = require("../../core/utils");
const agent_provider_settings_1 = require("./agent-provider-settings");
const catalog_1 = require("../../agents/catalog");
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
            if (version)
                return version;
        }
        catch { }
    }
    return "unknown";
}
function handleSystemSettingsApi(pathname, req, res) {
    if (pathname === "/api/system/settings-status" && req.method === "GET") {
        const credentials = (0, credential_store_1.credentialStoreStatus)();
        (0, utils_1.sendJson)(res, {
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
        (0, utils_1.sendJson)(res, {
            success: true,
            config: (0, agent_provider_settings_1.publicAgentProviderSettings)((0, agent_provider_settings_1.loadAgentProviderSettings)()),
            statuses: (0, agent_provider_settings_1.getAgentProviderStatuses)(),
            providers: (0, catalog_1.publicDevelopmentAgentCatalog)().filter(item => item.settingsManaged),
        });
        return true;
    }
    if (pathname === "/api/system/agent-providers/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, statuses: (0, agent_provider_settings_1.getAgentProviderStatuses)(true) });
        return true;
    }
    const modelsMatch = pathname.match(/^\/api\/system\/agent-providers\/(codex|cursor|gemini|opencode|claudecode)\/models$/);
    if (modelsMatch && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, { success: true, ...(0, agent_provider_settings_1.getAgentProviderModels)(modelsMatch[1]) });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取 Agent 模型失败" }, 400);
        }
        return true;
    }
    if (pathname === "/api/system/agent-providers" && req.method === "POST") {
        readJsonBody(req).then(payload => {
            const config = (0, agent_provider_settings_1.saveAgentProviderSettings)(payload);
            (0, utils_1.sendJson)(res, { success: true, config: (0, agent_provider_settings_1.publicAgentProviderSettings)(config), statuses: (0, agent_provider_settings_1.getAgentProviderStatuses)(true) });
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "保存开发 Agent 配置失败" }, 400));
        return true;
    }
    const actionMatch = pathname.match(/^\/api\/system\/agent-providers\/(codex|cursor|gemini|opencode|claudecode)\/(login|logout)$/);
    if (actionMatch && req.method === "POST") {
        try {
            const result = actionMatch[2] === "login"
                ? (0, agent_provider_settings_1.startAgentProviderLogin)(actionMatch[1])
                : (0, agent_provider_settings_1.logoutAgentProvider)(actionMatch[1]);
            (0, utils_1.sendJson)(res, { success: true, ...result });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "Agent 认证操作失败" }, 400);
        }
        return true;
    }
    const installMatch = pathname.match(/^\/api\/system\/agent-providers\/(codex|cursor|gemini|opencode|claudecode)\/install$/);
    if (installMatch && req.method === "POST") {
        try {
            (0, utils_1.sendJson)(res, { success: true, ...(0, agent_provider_settings_1.startAgentProviderInstall)(installMatch[1]) });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "Agent 安装操作失败" }, 400);
        }
        return true;
    }
    return false;
}
function readJsonBody(req, maxBytes = 256 * 1024) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => {
            body += chunk;
            if (Buffer.byteLength(body, "utf-8") > maxBytes)
                reject(new Error("请求内容过大"));
        });
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch {
                reject(new Error("请求 JSON 无效"));
            }
        });
        req.on("error", reject);
    });
}
//# sourceMappingURL=settings.js.map
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCcSwitchClaudeProvider = loadCcSwitchClaudeProvider;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
function readJson(file) {
    try {
        const value = JSON.parse(fs.readFileSync(file, "utf-8"));
        return value && typeof value === "object" ? value : null;
    }
    catch {
        return null;
    }
}
function text(value) {
    return String(value || "").trim();
}
function currentCcSwitchClaudeRow() {
    const root = path.join(os.homedir(), ".cc-switch");
    const settings = readJson(path.join(root, "settings.json"));
    const providerId = text(settings?.currentProviderClaude);
    const dbFile = path.join(root, "cc-switch.db");
    if (!fs.existsSync(dbFile))
        return null;
    let db = null;
    try {
        db = new better_sqlite3_1.default(dbFile, { readonly: true, fileMustExist: true });
        const row = providerId
            ? db.prepare("SELECT id, name, settings_config FROM providers WHERE id = ? AND app_type = 'claude' LIMIT 1").get(providerId)
            : db.prepare("SELECT id, name, settings_config FROM providers WHERE app_type = 'claude' AND is_current = 1 LIMIT 1").get();
        return row && typeof row === "object" ? row : null;
    }
    catch {
        return null;
    }
    finally {
        try {
            db?.close();
        }
        catch { }
    }
}
function fromEnvironment(env, source, providerId, providerName) {
    if (!env || typeof env !== "object")
        return null;
    const apiUrl = text(env.ANTHROPIC_BASE_URL).replace(/\/+$/, "");
    const authToken = text(env.ANTHROPIC_AUTH_TOKEN);
    const apiKey = text(env.ANTHROPIC_API_KEY) || authToken;
    const model = text(env.ANTHROPIC_MODEL
        || env.ANTHROPIC_DEFAULT_SONNET_MODEL
        || env.ANTHROPIC_DEFAULT_OPUS_MODEL
        || env.ANTHROPIC_DEFAULT_HAIKU_MODEL);
    if (!apiUrl || !apiKey || !model || !/^https?:\/\//i.test(apiUrl))
        return null;
    return {
        source,
        providerId,
        providerName,
        apiUrl,
        apiKey,
        model,
        credentialType: authToken ? "auth_token" : "api_key",
    };
}
function loadCcSwitchClaudeProvider() {
    const row = currentCcSwitchClaudeRow();
    if (row) {
        try {
            const parsed = JSON.parse(text(row.settings_config) || "{}");
            const provider = fromEnvironment(parsed?.env, "cc-switch", text(row.id), text(row.name) || "CC-Switch Claude Provider");
            if (provider)
                return provider;
        }
        catch { }
    }
    const settings = readJson(path.join(os.homedir(), ".claude", "settings.json"));
    return fromEnvironment(settings?.env, "external-file", "external-claude", "外部 Claude 配置");
}
//# sourceMappingURL=cc-switch-provider.js.map
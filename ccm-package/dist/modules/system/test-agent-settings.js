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
exports.loadTestAgentSettings = loadTestAgentSettings;
exports.saveTestAgentSettings = saveTestAgentSettings;
exports.isTestAgentEnabled = isTestAgentEnabled;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const SETTINGS_FILE = String(process.env.CCM_TEST_AGENT_SETTINGS_FILE || "").trim()
    || path.join(utils_1.CCM_DIR, "configs", "test-agent-settings.json");
function defaults() {
    return { version: 1, enabled: true, updated_at: "" };
}
function loadTestAgentSettings() {
    try {
        const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
        return {
            version: 1,
            enabled: parsed?.enabled !== false,
            updated_at: String(parsed?.updated_at || ""),
        };
    }
    catch {
        return defaults();
    }
}
function saveTestAgentSettings(input) {
    const next = {
        version: 1,
        enabled: input?.enabled !== false,
        updated_at: new Date().toISOString(),
    };
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    const temporary = `${SETTINGS_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(next, null, 2), "utf-8");
    fs.renameSync(temporary, SETTINGS_FILE);
    return next;
}
function isTestAgentEnabled() {
    return loadTestAgentSettings().enabled;
}
//# sourceMappingURL=test-agent-settings.js.map
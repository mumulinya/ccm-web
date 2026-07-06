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
exports.MUSIC_REMOTE_COMMAND_FILE = void 0;
exports.saveMusicRemoteCommand = saveMusicRemoteCommand;
exports.loadMusicRemoteCommand = loadMusicRemoteCommand;
exports.loadMusicAgentConfig = loadMusicAgentConfig;
exports.publicMusicAgentConfig = publicMusicAgentConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("../collaboration/group-orchestrator");
exports.MUSIC_REMOTE_COMMAND_FILE = path.join(utils_1.CCM_DIR, "music-remote-command.json");
function saveMusicRemoteCommand(command) {
    const payload = {
        id: `music_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
        created_at: new Date().toISOString(),
        consumed: false,
        ...command,
    };
    fs.writeFileSync(exports.MUSIC_REMOTE_COMMAND_FILE, JSON.stringify(payload, null, 2), "utf-8");
    return payload;
}
function loadMusicRemoteCommand() {
    try {
        if (!fs.existsSync(exports.MUSIC_REMOTE_COMMAND_FILE))
            return null;
        return JSON.parse(fs.readFileSync(exports.MUSIC_REMOTE_COMMAND_FILE, "utf-8"));
    }
    catch {
        return null;
    }
}
function loadMusicAgentConfig() {
    const llm = (0, group_orchestrator_1.loadOrchestratorConfig)();
    const music = (0, db_1.loadMusicConfig)();
    return {
        ...llm,
        proxy: music.proxy || "",
    };
}
function publicMusicAgentConfig() {
    const config = loadMusicAgentConfig();
    return {
        ...(0, group_orchestrator_1.publicOrchestratorConfig)(config),
        source: "orchestrator",
        sourceLabel: "系统设置 / 统一大模型配置",
    };
}
//# sourceMappingURL=state.js.map
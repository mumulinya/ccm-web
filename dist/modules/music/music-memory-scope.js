"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.musicMemoryFile = exports.musicMemorySessionId = exports.musicOwnerKey = void 0;
exports.musicMemoryFileForSession = musicMemoryFileForSession;
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const utils_1 = require("../../core/utils");
const context_1 = require("./folia/context");
const musicOwnerKey = () => crypto_1.default.createHash('sha256').update((0, context_1.currentFoliaOwner)()).digest('hex');
exports.musicOwnerKey = musicOwnerKey;
const musicMemorySessionId = () => (0, context_1.currentFoliaOwner)() === 'workspace' ? 'music-agent' : 'music-agent:' + (0, exports.musicOwnerKey)();
exports.musicMemorySessionId = musicMemorySessionId;
// 旧全局资料保持原样；只供原 workspace 使用，不自动归属任意已登录账号。
function musicMemoryFileForSession(sessionId) {
    if (sessionId === 'music-agent' || sessionId === 'music-singleton')
        return path_1.default.join(utils_1.CCM_DIR, 'music-agent-memory.json');
    if (!/^music-agent:[a-f0-9]{64}$/.test(sessionId))
        throw Error('音乐记忆会话无效');
    return path_1.default.join(utils_1.CCM_DIR, 'music-agent-users', sessionId.slice('music-agent:'.length), 'memory.json');
}
const musicMemoryFile = () => musicMemoryFileForSession((0, exports.musicMemorySessionId)());
exports.musicMemoryFile = musicMemoryFile;
//# sourceMappingURL=music-memory-scope.js.map
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
exports.preserveWorkspaceExecutionAudit = preserveWorkspaceExecutionAudit;
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const session_execution_ledger_1 = require("../system/session-execution-ledger");
/** Raw execution evidence belongs to local audit storage, never model messages. */
function preserveWorkspaceExecutionAudit(identity, toolCallId, toolName, body) {
    if (!identity?.exactSessionId || !toolCallId)
        return undefined;
    const value = (0, session_execution_ledger_1.sanitizeSessionExecutionValue)(body);
    const checksum = crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
    const scope = { scope: identity.scope, scopeId: identity.scopeId, exactSessionId: identity.exactSessionId };
    const scopeHash = crypto.createHash('sha256').update(JSON.stringify(scope)).digest('hex');
    const callHash = crypto.createHash('sha256').update(toolCallId).digest('hex');
    const file = path.join(utils_1.CCM_DIR, 'workspace-execution-audit', scopeHash, `${callHash}-${checksum}.json`);
    (0, atomic_json_file_1.writeJsonAtomic)(file, { schema: 'ccm-workspace-execution-audit-v1', ...scope, toolCallId, toolName, checksum, body: value });
    return { schema: 'ccm-workspace-execution-audit-reference-v1', path: file, checksum };
}
//# sourceMappingURL=workspace-execution-audit.js.map
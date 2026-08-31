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
exports.GROUP_MAIN_SHARED_FILES_TOOL = void 0;
exports.executeGroupMainSharedFilesTool = executeGroupMainSharedFilesTool;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../../system/context-budget");
exports.GROUP_MAIN_SHARED_FILES_TOOL = {
    canonicalName: "read_group_shared_files",
    name: "read_group_shared_files",
    server: "ccm-group-readonly",
    description: "Read the authorized shared-file context for this exact group session. Use only when the user's request needs shared documents; the catalog exists without loading file bodies.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
};
function executeGroupMainSharedFilesTool(toolContext) {
    const context = String(toolContext?.sharedFilesContext || "").trim();
    if (!context)
        throw new Error("当前群聊没有可读取的共享文件内容");
    const output = JSON.stringify({
        schema: "ccm-group-shared-files-read-result-v1",
        groupId: String(toolContext?.group?.id || ""),
        exactSessionId: String(toolContext?.groupSessionId || ""),
        context,
        checksum: crypto.createHash("sha256").update(context).digest("hex"),
    });
    return {
        name: exports.GROUP_MAIN_SHARED_FILES_TOOL.name,
        itemName: exports.GROUP_MAIN_SHARED_FILES_TOOL.name,
        toolKind: "internal_mcp",
        source: "ccm__group_shared_files",
        scope: "group",
        loaded: true,
        ok: true,
        output,
        outputTokens: (0, context_budget_1.estimateTextTokens)(output),
        resultChecksum: crypto.createHash("sha256").update(output).digest("hex"),
    };
}
//# sourceMappingURL=group-main-shared-files-tool.js.map
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
exports.JSON_FIELDS_TOOL = void 0;
exports.jsonFieldPointers = jsonFieldPointers;
exports.selectJsonFields = selectJsonFields;
exports.readWorkspaceJsonFields = readWorkspaceJsonFields;
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../system/context-budget");
const cc_tool_result_limits_1 = require("./cc-tool-result-limits");
exports.JSON_FIELDS_TOOL = {
    name: 'read_json_fields', loadPolicy: 'search',
    discoveryDescription: 'Read JSON Pointers without unrelated script maps; useful for large or minified manifests. Load with tool_search.',
    description: 'Read selected JSON fields using JSON Pointers in an authorized project. For manifests select /name, /description, /engines and needed dependency fields instead of unrelated scripts. Missing fields differ from null. Discover this tool before invoking it.',
    inputSchema: { type: 'object', required: ['path', 'pointers'], additionalProperties: false,
        properties: { project_id: { type: 'string' }, path: { type: 'string' },
            pointers: { type: 'array', minItems: 1, maxItems: 32, items: { type: 'string', minLength: 1 } },
            expected_checksum: { type: 'string' } } },
};
function fail(code, message, detail = {}) {
    const error = new Error(message);
    error.code = code;
    error.workspaceResult = { status: 'error', code, ...detail };
    throw error;
}
function jsonFieldPointers(value) {
    if (!Array.isArray(value) || !value.length || value.length > 32
        || value.some(pointer => typeof pointer !== 'string' || !pointer.startsWith('/') || /~(?![01])/.test(pointer))) {
        fail('INVALID_JSON_POINTER', 'pointers 必须包含 1 到 32 个非空 JSON Pointer；完整文件请用 read_file。');
    }
    return [...new Set(value)];
}
function selectJsonFields(document, pointers) {
    return pointers.map(pointer => {
        let value = document;
        for (const key of pointer.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'))) {
            if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)
                || (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/.test(key)))
                return { pointer, found: false };
            value = value[key];
        }
        return { pointer, found: true, value };
    });
}
/** file is resolved by the existing workspace safePath / capability boundary. */
async function readWorkspaceJsonFields(file, project, relativePath, args, context) {
    const pointers = jsonFieldPointers(args?.pointers);
    const stat = await fs.promises.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024)
        fail('JSON_FILE_SIZE', '仅允许读取 4MB 以内的普通 JSON 文件。');
    const text = await fs.promises.readFile(file, 'utf8');
    if (Buffer.byteLength(text, 'utf8') > 4 * 1024 * 1024)
        fail('JSON_FILE_SIZE', 'JSON 文件超过 4MB 读取限制。');
    const checksum = crypto.createHash('sha256').update(text).digest('hex');
    if (args.expected_checksum && args.expected_checksum !== checksum)
        fail('FILE_CHANGED', '文件已变化，请读取当前版本。', { path: relativePath, expectedChecksum: args.expected_checksum, currentChecksum: checksum });
    let document;
    try {
        document = JSON.parse(text.replace(/^\uFEFF/, ''));
    }
    catch {
        fail('INVALID_JSON', '文件不是有效 JSON，请用 read_file 检查所需行范围。', { path: relativePath });
    }
    const range = { jsonPointers: pointers };
    const cached = context?.lookup(project, relativePath, range, stat);
    const evidenceId = `pev_${crypto.createHash('sha256').update(JSON.stringify({ project, path: relativePath, checksum, pointers })).digest('hex').slice(0, 24)}`;
    const base = { schema: 'ccm-workspace-json-fields-result-v1', project, path: relativePath, checksum, pointers, evidenceId };
    if (cached?.checksum === checksum && context?.hasJsonEvidence(evidenceId))
        return { ...base, status: 'unchanged', type: 'file_unchanged' };
    const result = { ...base, status: 'read', fields: selectJsonFields(document, pointers) };
    if ((0, context_budget_1.estimateTextTokens)(JSON.stringify(result)) > cc_tool_result_limits_1.CC_ALIGNED_FILE_READ_MAX_TOKENS)
        fail('JSON_FIELDS_TOO_LARGE', '所选字段超过读取预算；请选择更具体的 Pointer，或用 read_file 读取行范围。', { path: relativePath, checksum });
    context?.record({ project, path: relativePath, range, checksum, mtimeMs: stat.mtimeMs, size: stat.size });
    return result;
}
//# sourceMappingURL=workspace-json-fields.js.map
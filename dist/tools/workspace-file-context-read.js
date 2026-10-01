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
exports.readWorkspaceFileWithContext = readWorkspaceFileWithContext;
const fs = __importStar(require("fs"));
const workspace_read_context_1 = require("./workspace-read-context");
/** Always validate actual content through the existing bounded reader. Stat
 * timestamps alone cannot detect same-size replacements or restored mtimes. */
async function readWorkspaceFileWithContext(input) {
    const { file, project, path, range, context } = input;
    // Share I/O only; returning a body to one caller does not prove it has been
    // submitted to the model. Protocol deduplication handles identical bodies.
    let reading = context?.inFlightFor(project, path, range);
    if (!reading) {
        reading = input.read();
        context?.setInFlight(project, path, range, reading);
    }
    const result = input.decorate(await reading);
    const stat = await fs.promises.lstat(file);
    context?.record({
        project, path, range, checksum: String(result?.checksum || result?.safeReceipt?.checksum || ''),
        mtimeMs: stat.mtimeMs, size: stat.size,
        totalLines: Number(result?.total_lines || result?.total_cells || result?.total_pages || 0),
        from: Number(result?.lines?.[0]?.line || result?.offset || 0),
        to: Number(result?.lines?.at(-1)?.line || result?.offset || 0),
        nextOffset: Number(result?.next_cursor || 0) || undefined,
    });
    if (!context?.hasTextEvidence((0, workspace_read_context_1.workspaceTextEvidenceKey)(result, project)))
        return result;
    // Multimodal results never take this text-only shortcut. Preserve range,
    // checksum and pagination metadata; only omit a proven existing text body.
    const { lines, content, output_tokens, result_checksum, ...metadata } = result;
    return {
        ...metadata, type: 'file_unchanged', status: 'unchanged',
        safeReceipt: { ...result.safeReceipt, kind: 'unchanged', lineCount: 0 },
    };
}
//# sourceMappingURL=workspace-file-context-read.js.map
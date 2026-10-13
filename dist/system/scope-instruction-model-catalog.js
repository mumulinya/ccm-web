"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderScopeInstructionModelCatalog = renderScopeInstructionModelCatalog;
/** The model needs the read gate and document revision. Background job status
 * remains in management records and in precise read rejection evidence. */
function renderScopeInstructionModelCatalog(entries) {
    if (!entries.length)
        return '';
    return [
        '[作用域认知文档目录；正文未加载]',
        ...entries.map(row => `- 文档：${row.fileName}; documentId=${row.documentId}; 可读取：${row.status === 'ready' ? '是' : '否'}; 版本：${row.revision}; 读取方式：read_scope_instruction`),
        '仅在当前问题需要时调用 read_scope_instruction。目录出现不代表正文已进入上下文。',
    ].join('\n');
}
//# sourceMappingURL=scope-instruction-model-catalog.js.map
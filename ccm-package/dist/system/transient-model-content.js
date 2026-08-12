"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CCM_TRANSIENT_MODEL_BLOCKS = void 0;
exports.attachTransientModelBlocks = attachTransientModelBlocks;
exports.transientModelBlocks = transientModelBlocks;
exports.collectTransientModelBlocks = collectTransientModelBlocks;
exports.CCM_TRANSIENT_MODEL_BLOCKS = Symbol.for("ccm.transient-model-blocks");
function attachTransientModelBlocks(value, blocks) {
    if (!blocks.length)
        return value;
    Object.defineProperty(value, exports.CCM_TRANSIENT_MODEL_BLOCKS, {
        value: blocks,
        enumerable: false,
        configurable: false,
        writable: false,
    });
    return value;
}
function transientModelBlocks(value) {
    return Array.isArray(value?.[exports.CCM_TRANSIENT_MODEL_BLOCKS]) ? value[exports.CCM_TRANSIENT_MODEL_BLOCKS] : [];
}
function collectTransientModelBlocks(values) {
    return (Array.isArray(values) ? values : []).flatMap(value => transientModelBlocks(value));
}
//# sourceMappingURL=transient-model-content.js.map
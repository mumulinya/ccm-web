"use strict";
/**
 * Leaf module for auto-compact hook registration state.
 * Kept free of collaboration/memory imports to break shared ↔ context circular init.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupMemoryAutoCompactHookRegistered = void 0;
exports.markGroupMemoryAutoCompactHookRegistered = markGroupMemoryAutoCompactHookRegistered;
exports.isGroupMemoryAutoCompactHookRegistered = isGroupMemoryAutoCompactHookRegistered;
exports.groupMemoryAutoCompactHookRegistered = false;
function markGroupMemoryAutoCompactHookRegistered() {
    exports.groupMemoryAutoCompactHookRegistered = true;
}
function isGroupMemoryAutoCompactHookRegistered() {
    return exports.groupMemoryAutoCompactHookRegistered === true;
}
//# sourceMappingURL=group-memory-auto-compact-hook-state.js.map
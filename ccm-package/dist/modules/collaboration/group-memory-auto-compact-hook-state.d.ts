/**
 * Leaf module for auto-compact hook registration state.
 * Kept free of collaboration/memory imports to break shared ↔ context circular init.
 */
export declare let groupMemoryAutoCompactHookRegistered: boolean;
export declare function markGroupMemoryAutoCompactHookRegistered(): void;
export declare function isGroupMemoryAutoCompactHookRegistered(): boolean;

/**
 * Leaf module for auto-compact hook registration state.
 * Kept free of collaboration/memory imports to break shared ↔ context circular init.
 */

export let groupMemoryAutoCompactHookRegistered = false;

export function markGroupMemoryAutoCompactHookRegistered() {
  groupMemoryAutoCompactHookRegistered = true;
}

export function isGroupMemoryAutoCompactHookRegistered() {
  return groupMemoryAutoCompactHookRegistered === true;
}

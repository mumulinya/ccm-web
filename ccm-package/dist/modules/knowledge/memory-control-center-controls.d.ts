import { MemoryScope, MemoryAction } from "./memory-control-center-types";
export declare function getMemoryItemId(itemType: string, item: any, index?: number): string;
export declare function editableField(itemType: string, item: any): "text" | "summary" | "reason" | "decision" | "value" | "question" | "action";
export declare function itemText(itemType: string, item: any): string;
export declare function scopeControls(scope: MemoryScope, scopeId: string): any;
export declare function applyListControls(scope: MemoryScope, scopeId: string, itemType: string, source: any[]): any[];
export declare function applyMemoryControls(scope: MemoryScope, scopeId: string, source: any): any;
export declare function updateMemoryControl(input: {
    scope: MemoryScope;
    scopeId: string;
    itemType: string;
    itemId: string;
    action: MemoryAction;
    text?: string;
    reason?: string;
    actor?: string;
}): {
    control: any;
    audit: any;
};

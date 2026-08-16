import { MemoryScope, MemoryAction } from "./memory-control-center-types";
export declare function getMemoryItemId(itemType: string, item: any, index?: number): string;
export declare function editableField(itemType: string, item: any): "reason" | "text" | "summary" | "content" | "decision" | "action" | "question" | "value";
export declare function itemText(itemType: string, item: any): string;
export declare function scopeControls(scope: MemoryScope, scopeId: string): any;
export declare function applyListControls(scope: MemoryScope, scopeId: string, itemType: string, source: any[]): any[];
export declare function applyMemoryControls(scope: MemoryScope, scopeId: string, source: any): any;
/**
 * 回收孤儿控制项：itemId 匹配不上任何现存记忆条目、且超过保留期的控制项。
 * 调用方负责给出「本轮确实扫描过的 scope → 存活 itemId 集合」，未扫描到的 scope
 * 一律跳过，避免因为某个 scope 读取失败就误删用户的置顶/屏蔽设置。
 */
export declare function pruneMemoryControls(liveIdsByScope: Map<string, Set<string>>, options?: any): {
    pruned: number;
    orphans: any[];
};
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

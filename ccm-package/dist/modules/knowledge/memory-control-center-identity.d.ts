export declare const MEMORY_ITEM_IDENTITY_VERSION = 2;
/**
 * 稳定 id：优先显式 id → 稳定锚点 → (分组 + 创建时间) → 正文哈希兜底。
 */
export declare function memoryItemStableId(itemType: string, item: any, index?: number): string;
/**
 * 旧式 id（v1）：archiveId/taskId/groupId/time/正文 混合哈希。
 * 仅用于把历史控制项迁移到稳定 id，不再用于新写入。
 */
export declare function memoryItemLegacyId(itemType: string, item: any, index?: number): string;
/** 一个条目当前可被匹配到的全部 id（稳定 id 优先，旧式 id 作为别名）。 */
export declare function memoryItemIdAliases(itemType: string, item: any, index?: number): string[];
/** 按稳定 id 与别名解析控制项，返回命中的控制项及其是否为旧式命中。 */
export declare function resolveMemoryItemControl(controls: any[], itemType: string, item: any, index?: number): {
    control: any;
    itemId: string;
    matchedBy: string;
};
/**
 * 孤儿控制项：既匹配不上任何现存条目，且已超过保留期。
 * 保留期存在的意义是——记忆可能只是暂时不在召回窗口内，不能一看不见就删。
 */
export declare function collectOrphanMemoryControls(controls: any[], liveIdsByScope: Map<string, Set<string>>, options?: any): any[];

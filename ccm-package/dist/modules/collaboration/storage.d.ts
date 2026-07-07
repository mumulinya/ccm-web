export declare function loadGroups(): any[];
export declare function saveGroups(groups: any[]): void;
type GroupMessageAppendHook = (groupId: string, message: any, messages: any[]) => void;
export declare function registerGroupMessageAppendHook(hook: GroupMessageAppendHook): () => boolean;
export declare function getGroupMessages(groupId: string): any[];
export declare function appendGroupMessage(groupId: string, msg: any): any;
export declare function saveGroupMessages(groupId: string, messages: any[]): void;
export {};

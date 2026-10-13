/** Persisted task attachments are the authority. A chat-supplied URL or local
 * path never grants access to another uploaded file. */
export declare function taskSourceAttachmentReferences(taskId: string, sources: any[]): any[];
export declare function retainTaskSessionSourceAttachments(taskId: string): Promise<void>;
export declare function scheduleTaskSourceAttachmentRetention(taskId: string): void;

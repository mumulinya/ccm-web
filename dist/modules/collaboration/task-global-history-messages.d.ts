/** A task notification cannot erase the identity, attachments or unrelated
 * messages of the source conversation. UI/model windows are separate reads. */
export declare function normalizeTaskGlobalHistoryMessages(messages?: any[]): any[];
/** A late result may update an existing source, but must not recreate a
 * source conversation the user deleted. Old records retain their policy. */
export declare function resolveTaskGlobalNotificationSession(task: any, sessions: any[], sessionId: string): any;

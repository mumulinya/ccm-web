/** Display titles may repeat; a newly created conversation must never reuse a deleted identity. */
export declare function createConversationSessionId(scope: 'project' | 'group' | 'global'): string;

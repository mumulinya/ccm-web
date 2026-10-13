import type { ConversationEvent } from './conversation-event-journal';
export declare function iterateConversationEvents(file: string, turnId: string, attemptId: string, after: number): AsyncGenerator<ConversationEvent>;
export declare function readConversationTailSequence(file: string, turnId: string, attemptId: string): number;

import type { ConversationTurnRecord } from './conversation-turn-control';
/** Called once, before a newly admitted HTTP turn becomes runnable. */
export declare function persistProjectConversationIntake(turn: ConversationTurnRecord, editing?: boolean): void;

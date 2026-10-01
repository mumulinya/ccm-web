import type { CcmNativeModelCallLifecycle } from './model-activity';
export declare const ANSWER_PHASE_POLICY = "CCM output-phase protocol v1: At the very start of each native assistant text, emit [[CCM_PROCESS]] followed by a newline for narration before further tools, or [[CCM_FINAL]] followed by a newline when you have enough evidence and are answering the user with no further tool calls. These exact prefixes are transport metadata, not part of the user-visible answer. Do not quote them or repeat them in the body. Continue using authorized tools until evidence is sufficient; this protocol does not alter authorization, planning, or dispatch requirements. For the JSON fallback envelope instead use answerPhase as the first field (\"process\" or \"final\"), then reply as the second field, then the remaining fields; do not put a prefix inside reply.";
type Phase = 'process' | 'final';
/** Parse only a leading protocol declaration, never classify ordinary prose. */
export declare function createDeclaredAnswerStream(emit: (text: string) => void, declare: (phase: Phase) => void, json?: boolean): {
    push: (chunk: string) => void;
    finish(): void;
};
export declare function stripAnswerPhasePrefix(text: string): string;
/** One stream per actual model call; downstream receives only display content. */
export declare function callWithDeclaredAnswerPhase<T>(call: (config: any, options: any) => Promise<T>, config: any, options: any, lifecycle?: CcmNativeModelCallLifecycle, json?: boolean): Promise<T>;
export {};

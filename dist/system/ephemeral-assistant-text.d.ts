import type { UserVisibleAgentEvent } from "./user-visible-agent-events";
/** 只为实时正文保留排版；紧凑摘要和持久化账本仍使用原来的安全投影。 */
export declare function preserveEphemeralAssistantText(event: UserVisibleAgentEvent, input: any): UserVisibleAgentEvent;

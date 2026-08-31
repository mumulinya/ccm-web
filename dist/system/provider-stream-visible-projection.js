"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProviderStreamVisibleProjection = createProviderStreamVisibleProjection;
const assistant_progress_1 = require("./assistant-progress");
const user_visible_agent_events_1 = require("./user-visible-agent-events");
function laneKey(activity) {
    return `${Math.max(0, Number(activity.modelCallIndex || 0))}:${Math.max(0, Number(activity.round || 0))}`;
}
/**
 * Projects only Provider-declared safe summaries. Raw thinking, encrypted
 * reasoning and signatures never enter this adapter.
 */
function createProviderStreamVisibleProjection(input) {
    const lanes = new Map();
    const laneFor = (activity) => {
        const key = laneKey(activity);
        let lane = lanes.get(key);
        if (!lane) {
            lane = {
                text: "",
                eventId: `provider-summary:${input.turnId}:${activity.modelCallIndex}:${activity.round}`.slice(0, 240),
                modelCallIndex: Math.max(0, Number(activity.modelCallIndex || 0)),
                round: Math.max(0, Number(activity.round || 0)),
                persisted: false,
                lastPublishedText: "",
            };
            lanes.set(key, lane);
        }
        return lane;
    };
    const safeLaneText = (lane) => (0, assistant_progress_1.sanitizeAssistantProgressText)(lane.text, 240);
    const publish = (lane) => {
        const text = safeLaneText(lane);
        if (!text || text === lane.lastPublishedText)
            return null;
        lane.lastPublishedText = text;
        const relatedToolCallIds = [];
        const batchId = (0, assistant_progress_1.assistantProgressBatchId)({
            turnId: input.turnId,
            generation: input.generation,
            modelCallIndex: lane.modelCallIndex,
            kind: "before_tools",
            relatedToolCallIds,
        });
        const event = (0, user_visible_agent_events_1.publishEphemeralUserVisibleAgentEvent)({
            eventId: lane.eventId,
            scope: input.scope,
            scopeId: input.scopeId,
            exactSessionId: input.exactSessionId,
            turnId: input.turnId,
            generation: input.generation,
            attempt: input.attempt,
            ...(input.anchorMessageId ? { anchorMessageId: input.anchorMessageId } : {}),
            ...(input.taskId ? { taskId: input.taskId } : {}),
            eventType: "assistant_progress",
            display: { title: input.title, summary: text, status: "running" },
            detail: {
                progress: {
                    kind: "before_tools",
                    text,
                    modelCallIndex: lane.modelCallIndex,
                    relatedToolCallIds,
                    batchId,
                    milestoneChecksum: (0, assistant_progress_1.assistantProgressMilestoneChecksum)({
                        kind: "before_tools",
                        text,
                        modelCallIndex: lane.modelCallIndex,
                        relatedToolCallIds,
                        batchId,
                    }),
                    source: "agent_reported",
                    confidence: "declared",
                },
                keyProgress: {
                    schema: "ccm-agent-key-progress-v1",
                    eventId: lane.eventId,
                    kind: "model_preamble",
                    source: "model_stream",
                    status: "running",
                    attempt: input.attempt,
                    round: lane.round,
                    text,
                    modelCallIndex: lane.modelCallIndex,
                    toolCallIds: relatedToolCallIds,
                    relatedEventIds: [],
                    contentStored: false,
                },
            },
        });
        input.markVisible?.();
        input.onProjectedEvent?.(event);
        return event;
    };
    const persist = (lane) => {
        if (lane.persisted)
            return null;
        const text = safeLaneText(lane);
        if (!text)
            return null;
        lane.persisted = true;
        const event = input.keyProgress.modelPreamble(text, lane.modelCallIndex, lane.round, [], lane.eventId);
        if (event)
            input.onProjectedEvent?.(event);
        input.markVisible?.();
        return event;
    };
    return {
        handle(activity) {
            if (activity.kind !== "reasoning_summary_delta") {
                if (activity.kind === "tool_call_declared")
                    input.markVisible?.();
                return null;
            }
            const lane = laneFor(activity);
            const chunk = String(activity.text || "");
            if (chunk && Array.from(lane.text).length < 4_000) {
                lane.text = Array.from(`${lane.text}${chunk}`).slice(0, 4_000).join("");
            }
            publish(lane);
            return activity.done ? persist(lane) : null;
        },
        flush() {
            for (const lane of lanes.values())
                persist(lane);
        },
    };
}
//# sourceMappingURL=provider-stream-visible-projection.js.map
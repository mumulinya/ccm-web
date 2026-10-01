"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANSWER_PHASE_POLICY = void 0;
exports.createDeclaredAnswerStream = createDeclaredAnswerStream;
exports.stripAnswerPhasePrefix = stripAnswerPhasePrefix;
exports.callWithDeclaredAnswerPhase = callWithDeclaredAnswerPhase;
exports.ANSWER_PHASE_POLICY = 'CCM output-phase protocol v1: At the very start of each native assistant text, emit [[CCM_PROCESS]] followed by a newline for narration before further tools, or [[CCM_FINAL]] followed by a newline when you have enough evidence and are answering the user with no further tool calls. These exact prefixes are transport metadata, not part of the user-visible answer. Do not quote them or repeat them in the body. Continue using authorized tools until evidence is sufficient; this protocol does not alter authorization, planning, or dispatch requirements. For the JSON fallback envelope instead use answerPhase as the first field ("process" or "final"), then reply as the second field, then the remaining fields; do not put a prefix inside reply.';
const prefixes = [['[[CCM_PROCESS]]\n', 'process'], ['[[CCM_FINAL]]\n', 'final']];
/** Parse only a leading protocol declaration, never classify ordinary prose. */
function createDeclaredAnswerStream(emit, declare, json = false) {
    let pending = '';
    let mode = 'header';
    let escape = '';
    let highSurrogate = '';
    const push = (chunk) => {
        if (!chunk || mode === 'done')
            return;
        if (mode === 'text') {
            emit(chunk);
            return;
        }
        if (mode === 'header') {
            pending += chunk;
            if (json) {
                const match = /^\s*\{\s*"answerPhase"\s*:\s*"(final|process)"\s*,\s*"reply"\s*:\s*"/.exec(pending);
                if (match) {
                    declare(match[1]);
                    mode = 'json_reply';
                    const tail = pending.slice(match[0].length);
                    pending = '';
                    push(tail);
                    return;
                }
                // A bounded header wait; unsupported/legacy envelopes retain their old path.
                if (pending.length <= 128 && /^\s*\{/.test(pending))
                    return;
            }
            else {
                const normalized = pending.replace(/^((?:\[\[CCM_FINAL\]\]|\[\[CCM_PROCESS\]\]))\r\n/, '$1\n');
                const matched = prefixes.find(([prefix]) => normalized.startsWith(prefix));
                if (matched) {
                    declare(matched[1]);
                    mode = 'text';
                    pending = '';
                    emit(normalized.slice(matched[0].length));
                    return;
                }
                if (prefixes.some(([prefix]) => prefix.startsWith(pending.replace(/\r$/, ''))))
                    return;
            }
            mode = 'text';
            const text = pending;
            pending = '';
            emit(text);
            return;
        }
        // Decode the leading JSON reply string incrementally, including split escapes.
        let visible = '';
        for (const char of chunk) {
            if (!escape && char === '"') {
                visible += highSurrogate;
                highSurrogate = '';
                mode = 'done';
                break;
            }
            let decoded = char;
            if (escape) {
                escape += char;
                if (escape === '\\u' || (escape.startsWith('\\u') && escape.length < 6))
                    continue;
                try {
                    decoded = JSON.parse('"' + escape + '"');
                }
                catch {
                    decoded = escape;
                }
                escape = '';
            }
            else if (char === '\\') {
                escape = char;
                continue;
            }
            const text = highSurrogate + decoded;
            highSurrogate = /[\uD800-\uDBFF]$/.test(text) ? text.slice(-1) : '';
            visible += highSurrogate ? text.slice(0, -1) : text;
        }
        if (visible)
            emit(visible);
    };
    return {
        push,
        finish() {
            if (mode === 'header' && pending) {
                emit(pending);
                pending = '';
            }
            mode = 'done';
        },
    };
}
function stripAnswerPhasePrefix(text) {
    return String(text || '').replace(/^\[\[CCM_(?:FINAL|PROCESS)\]\]\r?\n/, '');
}
/** One stream per actual model call; downstream receives only display content. */
async function callWithDeclaredAnswerPhase(call, config, options, lifecycle, json = false) {
    let emitted = '';
    let declared = false;
    let hasTool = false;
    let received = false;
    const create = () => createDeclaredAnswerStream(text => {
        if (text) {
            emitted += text;
            options.onDelta?.(text);
        }
    }, phase => {
        declared = true;
        if (!hasTool)
            lifecycle?.onAnswerPhase?.(phase);
    }, json);
    let stream = create();
    const result = await call(config, {
        ...options,
        onDelta: (text) => { received = true; stream.push(text); },
        onRetry: (notice) => {
            if (!emitted) {
                stream = create();
                received = false;
                declared = false;
            }
            options.onRetry?.(notice);
        },
        onProviderStreamActivity: (activity) => {
            if (activity.kind === 'tool_call_declared')
                hasTool = true;
            // Keep timing/diagnostic activity; only the text callback is gated by the
            // declaration parser, so the UI receives no duplicate raw delta.
            options.onProviderStreamActivity?.(activity);
        },
        onNativeToolCallReady: (tool) => {
            hasTool = true;
            lifecycle?.onToolDeclared?.(tool.name);
            options.onNativeToolCallReady?.(tool);
        },
    });
    // Non-streaming compatible relays also use the same declaration parser.
    const raw = json ? JSON.stringify(result) : String(result?.text || '');
    if (!received)
        stream.push(raw);
    stream.finish();
    const calls = json ? result?.toolRequests || result?.tool_requests || [] : result?.toolCalls || [];
    if (calls.length)
        lifecycle?.onToolDeclared?.(String(calls[0].name || '工具'));
    if (json)
        return result;
    return { ...result, text: stripAnswerPhasePrefix(result?.text) };
}
//# sourceMappingURL=declared-answer-stream.js.map
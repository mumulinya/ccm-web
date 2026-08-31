"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDER_SSE_JSON_INVALID_AFTER_BYTES = void 0;
exports.parseSseJsonDocuments = parseSseJsonDocuments;
exports.consumeSseJsonTextChunks = consumeSseJsonTextChunks;
exports.runSseJsonParserSelfTest = runSseJsonParserSelfTest;
exports.PROVIDER_SSE_JSON_INVALID_AFTER_BYTES = "CCM_PROVIDER_SSE_JSON_INVALID_AFTER_BYTES";
function invalidProviderJsonError(receivedBytes) {
    const error = new Error(`Provider 返回了无法解析的流式 JSON（已接收 ${Math.max(0, receivedBytes)} bytes）`);
    error.code = exports.PROVIDER_SSE_JSON_INVALID_AFTER_BYTES;
    error.receivedBytes = Math.max(0, receivedBytes);
    error.contentStored = false;
    return error;
}
/**
 * Parse either one SSE multiline JSON value or the non-standard relay form where
 * multiple complete JSON documents are emitted as adjacent `data:` lines without
 * the blank event separator required by the SSE specification.
 */
function parseSseJsonDocuments(lines, receivedBytes = 0) {
    const values = (Array.isArray(lines) ? lines : [])
        .map(value => String(value ?? "").trim())
        .filter(Boolean);
    if (!values.length)
        return { payloads: [], done: false };
    const joined = values.join("\n").trim();
    if (joined === "[DONE]")
        return { payloads: [], done: true };
    try {
        return { payloads: [JSON.parse(joined)], done: false };
    }
    catch {
        // Compatibility path for relays that omit the blank line between SSE events.
        // It is only accepted if every line is independently valid JSON or [DONE].
        const payloads = [];
        let done = false;
        try {
            const independentValues = values.flatMap(value => value.split(/\r?\n/).map(part => part.trim()).filter(Boolean));
            for (const value of independentValues) {
                if (value === "[DONE]") {
                    done = true;
                    break;
                }
                payloads.push(JSON.parse(value));
            }
            return { payloads, done };
        }
        catch {
            throw invalidProviderJsonError(receivedBytes);
        }
    }
}
async function consumeSseJsonTextChunks(chunks, onPayload) {
    let lineBuffer = "";
    let dataLines = [];
    let rawText = "";
    let payloadCount = 0;
    let receivedBytes = 0;
    let sawDataLine = false;
    let done = false;
    const flush = () => {
        if (!dataLines.length)
            return;
        const parsed = parseSseJsonDocuments(dataLines, receivedBytes);
        dataLines = [];
        for (const payload of parsed.payloads) {
            onPayload(payload);
            payloadCount += 1;
        }
        done = parsed.done;
    };
    const currentDataIsComplete = () => {
        const value = dataLines.join("\n").trim();
        if (!value)
            return false;
        if (value === "[DONE]")
            return true;
        try {
            JSON.parse(value);
            return true;
        }
        catch {
            return false;
        }
    };
    for await (const value of chunks) {
        const chunk = String(value ?? "");
        receivedBytes += Buffer.byteLength(chunk, "utf8");
        if (!sawDataLine)
            rawText += chunk;
        lineBuffer += chunk;
        while (!done) {
            const newline = lineBuffer.indexOf("\n");
            if (newline < 0)
                break;
            const line = lineBuffer.slice(0, newline).replace(/\r$/, "");
            lineBuffer = lineBuffer.slice(newline + 1);
            if (!line) {
                flush();
            }
            else if (line.startsWith("event:")) {
                // Some relays omit the blank separator but retain the next event field.
                if (dataLines.length)
                    flush();
            }
            else if (line.startsWith("data:")) {
                // Other relays emit adjacent complete JSON data lines with neither a
                // blank separator nor an event field. Preserve true multiline JSON,
                // but emit a data value as soon as it is already complete.
                if (dataLines.length && currentDataIsComplete())
                    flush();
                if (done)
                    break;
                sawDataLine = true;
                dataLines.push(line.slice(5).trimStart());
            }
        }
        if (done)
            break;
    }
    if (!done) {
        const finalLine = lineBuffer.replace(/\r$/, "");
        if (finalLine.startsWith("data:")) {
            sawDataLine = true;
            dataLines.push(finalLine.slice(5).trimStart());
        }
        flush();
    }
    if (!sawDataLine && payloadCount === 0 && rawText.trim()) {
        const parsed = parseSseJsonDocuments([rawText], receivedBytes);
        for (const payload of parsed.payloads) {
            onPayload(payload);
            payloadCount += 1;
        }
        done = parsed.done;
    }
    return { payloadCount, receivedBytes, done };
}
async function runSseJsonParserSelfTest() {
    async function* chunks(values) {
        for (const value of values)
            yield value;
    }
    const standard = [];
    await consumeSseJsonTextChunks(chunks(['data: {"type":"one"}\n\n', 'data: [DONE]\n\n']), value => standard.push(value));
    const adjacent = [];
    await consumeSseJsonTextChunks(chunks(['data: {"type":"one"}\ndata: {"type":"two"}\ndata: [DONE]\n']), value => adjacent.push(value));
    const rawNdjson = [];
    await consumeSseJsonTextChunks(chunks(['{"type":"one"}\n{"type":"two"}']), value => rawNdjson.push(value));
    let invalidCode = "";
    try {
        await consumeSseJsonTextChunks(chunks(['data: {not-json}\n']), () => { });
    }
    catch (error) {
        invalidCode = String(error?.code || "");
    }
    const checks = {
        standardSse: standard.length === 1 && standard[0]?.type === "one",
        adjacentRelayEvents: adjacent.length === 2 && adjacent[1]?.type === "two",
        rawNdjsonFallback: rawNdjson.length === 2 && rawNdjson[1]?.type === "two",
        invalidBytesAreClassified: invalidCode === exports.PROVIDER_SSE_JSON_INVALID_AFTER_BYTES,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=sse-json-parser.js.map
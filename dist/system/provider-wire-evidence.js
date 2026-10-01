"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.snapshotProviderWire = snapshotProviderWire;
exports.compareProviderWire = compareProviderWire;
exports.publicProviderWireParts = publicProviderWireParts;
exports.comparePublicProviderWire = comparePublicProviderWire;
const crypto_1 = require("crypto");
const context_budget_1 = require("./context-budget");
const ccm_public_stable_prefix_1 = require("./ccm-public-stable-prefix");
const provider_prefix_layers_1 = require("./provider-prefix-layers");
const digest = (text) => (0, crypto_1.createHash)('sha256').update(text).digest('hex');
/** Inspect the final encoded body, without storing its content or modifying it. */
function snapshotProviderWire(body, protocol, layoutVersion = 'legacy', sourceMessages = []) {
    const parts = [];
    const add = (kind, value) => {
        if (value === undefined)
            return;
        const text = JSON.stringify(value);
        parts.push({ kind, checksum: digest(text), bytes: Buffer.byteLength(text), estimatedTokens: (0, context_budget_1.estimateTextTokens)(text) });
    };
    // Explicit input fields; headers, credentials and arbitrary client metadata
    // are never persisted. Remaining generation parameters are compared by hash.
    const sequence = body.messages ?? body.input ?? body.contents;
    const { messages, input, contents, tools, system, instructions, systemInstruction, metadata, ...parameters } = body;
    add('parameters', parameters);
    add('tools', tools);
    add('system', system ?? instructions ?? systemInstruction);
    if (Array.isArray(sequence))
        sequence.forEach((row, index) => add(`message:${index}:${row.role || row.type || 'content'}`, row));
    else
        add('input', sequence);
    const taggedSourceMessages = Array.isArray(sourceMessages) && sourceMessages.length ? sourceMessages : (Array.isArray(sequence) ? sequence : []);
    const cachePrefixParts = parts.filter(part => part.kind !== 'parameters');
    return { version: 2, protocol, layoutVersion, requestBytes: Buffer.byteLength(JSON.stringify(body)), parts, cachePrefixParts,
        prefixLayers: (0, provider_prefix_layers_1.summarizeProviderPrefixLayers)(taggedSourceMessages), contentStored: false };
}
function compareProviderWire(previous, current) {
    const previousPrefix = Array.isArray(previous?.cachePrefixParts) ? previous.cachePrefixParts : (previous?.parts || []).filter(part => part.kind !== 'parameters');
    const currentPrefix = Array.isArray(current.cachePrefixParts) ? current.cachePrefixParts : (current.parts || []).filter(part => part.kind !== 'parameters');
    let count = 0;
    if (previous?.protocol === current.protocol) {
        while (count < previousPrefix.length && count < currentPrefix.length
            && previousPrefix[count].kind === currentPrefix[count].kind
            && previousPrefix[count].checksum === currentPrefix[count].checksum)
            count++;
    }
    const common = currentPrefix.slice(0, count);
    const first = currentPrefix[count] || previousPrefix[count];
    const comparison = !previous ? 'no_comparison'
        : previous.layoutVersion !== current.layoutVersion ? 'prefix_layout_changed'
            : previous.protocol !== current.protocol ? 'protocol_changed'
                : count === previousPrefix.length ? count === currentPrefix.length ? 'unchanged' : 'append_only'
                    : ['parameters', 'tools'].includes(first?.kind) ? 'tools_or_parameters_changed' : 'existing_content_changed';
    const inputParts = current.parts.filter(part => part.kind !== 'parameters');
    const confirmed = common.filter(part => part.kind !== 'parameters');
    const sum = (parts, field) => parts.reduce((total, part) => total + part[field], 0);
    const appendVerified = comparison === 'unchanged' || comparison === 'append_only';
    const totalBytes = sum(inputParts, 'bytes'), totalEstimate = sum(inputParts, 'estimatedTokens');
    const confirmedBytes = sum(confirmed, 'bytes'), confirmedEstimate = sum(confirmed, 'estimatedTokens');
    return { comparison, matchedParts: count, firstDifferencePart: comparison === 'unchanged' ? null : first?.kind || null,
        matchingPrefixBytesLowerBound: common.reduce((sum, row) => sum + row.bytes, 0),
        matchingPrefixTokensEstimate: common.filter(row => row.kind !== 'parameters').reduce((sum, row) => sum + row.estimatedTokens, 0),
        requestBytes: current.requestBytes,
        inputBreakdown: {
            // Encoded input fragments include tool definitions, not generation parameters or envelope delimiters.
            totalFragmentBytes: totalBytes, totalTokensEstimate: totalEstimate,
            confirmedPrefixBytes: confirmedBytes, confirmedPrefixTokensEstimate: confirmedEstimate,
            appendedBytes: appendVerified ? totalBytes - confirmedBytes : null,
            appendedTokensEstimate: appendVerified ? totalEstimate - confirmedEstimate : null,
            changedOrUnverifiedBytes: appendVerified ? 0 : totalBytes - confirmedBytes,
            changedOrUnverifiedTokensEstimate: appendVerified ? 0 : totalEstimate - confirmedEstimate,
            estimationOnly: true, contentStored: false,
        },
        prefixLayers: current.prefixLayers ? {
            ...current.prefixLayers,
            firstChangedSegment: previous?.prefixLayers?.workspacePublicChecksum !== current.prefixLayers.workspacePublicChecksum ? 'workspace_public'
                : previous?.prefixLayers?.scopePrivateChecksum !== current.prefixLayers.scopePrivateChecksum ? 'scope_private' : null,
            reuseClassification: !previous?.prefixLayers ? 'no_comparable_request'
                : previous.prefixLayers.workspacePublicChecksum !== current.prefixLayers.workspacePublicChecksum ? 'stable_prefix_changed'
                    : previous.prefixLayers.scopePrivateChecksum !== current.prefixLayers.scopePrivateChecksum ? 'tool_schema_changed' : 'public_prefix_same',
        } : undefined,
        firstChangedSegment: first?.kind || null,
        firstDivergenceKind: comparison,
        estimationOnly: true, providerReuseReason: 'unconfirmed', contentStored: false };
}
/** Only explicitly tagged public blocks that still match the encoded request qualify. */
function publicProviderWireParts(body, sourceMessages = []) {
    const header = { role: 'system', promptPart: 'public_header', content: ccm_public_stable_prefix_1.CCM_PUBLIC_STABLE_PREFIX_TEXT };
    const source = [];
    const sequence = body.messages || body.input;
    const textOf = (content) => typeof content === 'string' ? content
        : Array.isArray(content) && content.every(part => typeof part?.text === 'string' && (!part.type || ['text', 'input_text'].includes(part.type)))
            ? content.map(part => part.text).join('\n\n') : undefined;
    const instructionText = textOf(body.instructions);
    const parts = (rows) => rows.map(row => {
        const value = JSON.stringify(row.content);
        return { kind: row.promptPart, checksum: digest(value), bytes: Buffer.byteLength(value), estimatedTokens: (0, context_budget_1.estimateTextTokens)(value) };
    });
    if (instructionText === header.content && Array.isArray(sequence)) {
        // Responses places the public header in `instructions`, while the next
        // stable system blocks remain at the start of `input`. Verify both against
        // the final encoded body; a plan checksum alone is not wire evidence.
        const first = sourceMessages[0];
        const taggedHeader = first?.role === 'system'
            && [ccm_public_stable_prefix_1.CCM_PUBLIC_STABLE_PREFIX_VERSION, `system:${ccm_public_stable_prefix_1.CCM_PUBLIC_STABLE_PREFIX_VERSION}`].includes(String(first.id || ''))
            && first.content === header.content;
        if (!taggedHeader)
            return [];
        const verified = [header];
        let inputIndex = 0;
        for (const row of sourceMessages.slice(1)) {
            if (row.role !== 'system' || row.prefixEligible !== true || row.publicPrefixEligible !== true
                || !['protocol', 'identity', 'stable_policy'].includes(String(row.promptPart || '')))
                break;
            const encoded = sequence[inputIndex++];
            if (!encoded || !['system', 'developer'].includes(String(encoded.role || ''))
                || textOf(encoded.content) !== row.content)
                break;
            verified.push(row);
        }
        return parts(verified);
    }
    for (const row of sourceMessages) {
        if (row.role !== 'system')
            break;
        if (!source.length
            && [ccm_public_stable_prefix_1.CCM_PUBLIC_STABLE_PREFIX_VERSION, `system:${ccm_public_stable_prefix_1.CCM_PUBLIC_STABLE_PREFIX_VERSION}`].includes(String(row.id || ''))
            && row.content === header.content)
            source.push(header);
        else if (row.prefixEligible === true && row.publicPrefixEligible === true
            && ['protocol', 'identity', 'stable_policy'].includes(row.promptPart))
            source.push(row);
        else
            break;
    }
    if (!source.length && instructionText !== undefined
        && (instructionText === header.content || instructionText.startsWith(header.content + '\n\n')))
        source.push(header);
    if (!source.length)
        return [];
    let values;
    if (instructionText && source.length && source[0].promptPart !== 'public_header'
        && (instructionText === header.content || instructionText.startsWith(header.content + '\n\n'))) {
        source.unshift(header);
    }
    if (instructionText !== undefined && instructionText !== '' && source.length) {
        const expected = source.map(row => row.content).join('\n\n');
        // A continuation may still send the full system instruction string. The
        // public prefix remains valid when the dynamic tail follows it; only the
        // explicitly tagged leading blocks are reported as reusable.
        if (instructionText !== expected && !instructionText.startsWith(expected + '\n\n'))
            return [];
        values = source.map(row => row.content);
    }
    else if (Array.isArray(sequence) && ['system', 'developer'].includes(sequence[0]?.role)) {
        // Cache preparation inserts exactly this versioned CCM header after the
        // caller supplies sourceMessages. Never infer public content from keywords.
        if (source[0].promptPart !== 'public_header' && textOf(sequence[0].content) === header.content)
            source.unshift(header);
        const encodedPrefix = sequence.slice(0, source.length);
        if (encodedPrefix.length !== source.length || encodedPrefix.some((row, index) => !['system', 'developer'].includes(row.role)
            || textOf(row.content) !== source[index].content))
            return [];
        // Hash the explicitly tagged source blocks rather than the encoded
        // wrapper. Responses transports may represent the same system text as a
        // string or an input_text array (and relays may add harmless envelope
        // fields); using the wrapper made an identical public prefix look changed
        // across two sessions and polluted the cache diagnosis.
        values = source.map(row => row.content);
    }
    else {
        const system = textOf(body.system ?? body.instructions ?? body.systemInstruction?.parts);
        if (system === undefined)
            return [];
        if (source[0].promptPart !== 'public_header' && (system === header.content || system.startsWith(header.content + '\n\n')))
            source.unshift(header);
        const expected = source.map(row => row.content).join('\n\n');
        if (system !== expected && !system.startsWith(expected + '\n\n'))
            return [];
        values = source.map(row => row.content);
    }
    return parts(values.map((value, index) => ({ promptPart: source[index].promptPart, content: value })));
}
function comparePublicProviderWire(previous, current) {
    const a = previous?.publicParts || [], b = current.publicParts || [];
    const comparable = a.length > 0 && b.length > 0 && previous?.layoutVersion === current.layoutVersion;
    let count = 0;
    while (comparable && count < a.length && count < b.length && a[count].kind === b[count].kind && a[count].checksum === b[count].checksum)
        count++;
    return { comparison: !comparable ? 'no_comparison' : count === a.length && count === b.length ? 'unchanged' : 'existing_content_changed',
        firstChangedSegment: comparable && count < b.length ? b[count]?.kind || null : null,
        firstDivergenceKind: !comparable ? 'no_comparison' : count === a.length && count === b.length ? null : 'public_prefix_changed',
        matchedParts: count, matchingPrefixBytesLowerBound: b.slice(0, count).reduce((sum, part) => sum + part.bytes, 0),
        matchingPrefixTokensEstimate: b.slice(0, count).reduce((sum, part) => sum + part.estimatedTokens, 0), estimationOnly: true, contentStored: false };
}
//# sourceMappingURL=provider-wire-evidence.js.map
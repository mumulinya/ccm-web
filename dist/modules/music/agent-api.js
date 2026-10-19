"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMusicAgentApi = handleMusicAgentApi;
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const memory_1 = require("./memory");
const agent_1 = require("./agent");
const state_1 = require("./state");
const playback_decision_1 = require("./playback-decision");
const candidates_1 = require("./folia/candidates");
const context_1 = require("./folia/context");
const music_memory_scope_1 = require("./music-memory-scope");
const assistant_context_1 = require("./assistant-context");
const douyin_music_agent_1 = require("./douyin-music-agent");
const recommendation_engine_1 = require("./recommendation-engine");
const agent_turn_lifecycle_1 = require("./agent-turn-lifecycle");
const local_auth_1 = require("../system/local-auth");
function handleMusicAgentApi(pathname, req, res, dependencies) {
    if (!['/api/music/agent', '/api/music/agent/cancel'].includes(pathname) || req.method !== 'POST')
        return false;
    let raw = '';
    req.on('data', (value) => { raw += value.toString(); if (Buffer.byteLength(raw) > 32768)
        req.destroy(); });
    req.on('end', (0, context_1.bindFoliaRequest)(req, async () => {
        let turn, success = false;
        try {
            const body = JSON.parse(raw || '{}');
            if (pathname.endsWith('/cancel'))
                return (0, utils_1.sendJson)(res, { success: true, cancelled: (0, agent_turn_lifecycle_1.cancelMusicAgentTurn)(String(body.requestId || ''), String(body.clientId || 'legacy')) });
            const message = String(body.message || '').trim();
            if (!message || message.length > 4000)
                throw Error('请输入不超过 4000 字的需求');
            const cfg = (0, state_1.loadMusicAgentConfig)();
            if (!cfg.enabled || !cfg.apiKey || !cfg.model)
                return (0, utils_1.sendJson)(res, { success: false, error: '请先在系统设置中完成统一大模型配置' }, 422);
            turn = (0, agent_turn_lifecycle_1.beginMusicAgentTurn)({ ...body, message });
            res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
            if (turn.replay) {
                for (const event of turn.replay)
                    (0, agent_1.writeSse)(res, event);
                res.end();
                return;
            }
            res.on('close', () => { if (!res.writableEnded)
                turn.abort(); });
            const current = () => turn.current() && !res.destroyed && (req.ccmAuth?.kind !== 'browser' || (0, local_auth_1.resolveLocalAuthSession)(req)?.session.id === req.ccmAuth.sessionId);
            const send = (event) => { if (current()) {
                turn.capture(event);
                (0, agent_1.writeSse)(res, event);
            } };
            const progress = (stage, text) => send({ type: 'recommendation_progress', stage, text });
            const check = () => { if (!current())
                throw new DOMException('已停止本次回复', 'AbortError'); };
            progress('understanding', '正在理解你的需求');
            const memory = await (0, memory_1.prepareMusicAgentTurn)(message, 'auto');
            check();
            const followup = (0, recommendation_engine_1.recommendationFollowup)(body.recommendationContext);
            const preferences = (0, memory_1.getPublicMusicAgentMemory)().longTermMemory;
            const action = (0, recommendation_engine_1.applyRecommendationControl)(await (0, agent_1.classifyMusicAgentAction)(cfg, message, 'auto', (memory.messages || []).slice(0, -1), body.uiContext, followup.model, preferences, { signal: turn.signal, requestId: turn.requestId }), followup);
            check();
            send({ type: 'music_action', action, intent: action.type, keyword: action.keyword });
            send({ type: 'turn', turn_id: turn.requestId });
            if (action.error)
                throw Error('音乐意图识别失败：' + action.error);
            if (action.intentDecision?.douyinRequest) {
                turn.capture({ type: 'text', text: '该请求已处理，请查看原对话回复。' });
                await (0, douyin_music_agent_1.runMusicDouyinTurn)(cfg, message, memory.messages || [], res, turn.requestId);
                success = true;
                return;
            }
            if (action.intentDecision?.recommendation && action.intentDecision.mediaMode !== 'video' || ['play_music', 'search_music'].includes(action.type)) {
                const decision = await (0, playback_decision_1.resolveMusicPlaybackDecisionV2)({ intent: action.intentDecision, requestId: turn.requestId, aiRecommendationEnabled: (0, db_1.loadMusicConfig)()?.aiRecommendationEnabled !== false, aiAutoSelectEnabled: (0, db_1.loadMusicConfig)()?.aiAutoSelectEnabled !== false, modelConfig: cfg,
                    recommendationBatch: followup.batch, recommendationIndex: body.recommendationContext?.index, preferences, signal: turn.signal, current, onProgress: progress });
                check();
                send({ type: 'decision', turn_id: turn.requestId, decision: (0, playback_decision_1.publicMusicPlaybackDecision)(decision) });
                if (decision.recommendation)
                    send({ type: 'recommendation', recommendation: decision.recommendation });
                const results = decision.candidates.map(candidates_1.publicMusicCandidate);
                send({ type: 'candidate_results', results });
                send({ type: 'music_results', mode: decision.sourceMode, results });
                let command = null;
                if (action.type === 'play_music' && decision.status === 'resolved' && decision.selectedCandidate) {
                    check();
                    command = (0, state_1.enqueueMusicRemoteCommand)({ type: 'play', keyword: decision.searchQuery, request_text: message, mode: decision.sourceMode, source: 'music-agent', decision, idempotencyKey: turn.requestId, origin: { source: 'music-agent', owner: (0, context_1.currentFoliaOwner)(), sessionId: (0, music_memory_scope_1.musicMemorySessionId)(), messageId: turn.requestId } });
                    send({ type: 'playback_status', status: 'ready', command: dependencies.publicPlaybackCommand(command) });
                }
                send({ type: 'text', text: decision.reply });
                send({ type: 'terminal', turn_id: turn.requestId, status: command ? 'queued' : decision.status });
            }
            else {
                const system = `你是 CCM 音乐助手，简短、友好地回应。不要声称已搜索、播放或完成服务端未确认的操作；情绪表达默认先推荐，不自动播放。${(0, assistant_context_1.musicAssistantConversationContext)(body.uiContext)}\n${memory.continuityText}`;
                const messages = (0, agent_1.normalizeMusicAgentMessages)(memory.messages || [], '', Math.max(20, memory.messages?.length || 0));
                if (action.type === 'convert_music') {
                    check();
                    const converted = await dependencies.startMusicConvertJob(message, action.keyword);
                    send({ type: 'music_convert', success: converted.ok, reply: converted.reply, job: converted.job || null });
                    messages.at(-1).content += `\n工具结果：${converted.reply}`;
                }
                check();
                await (0, agent_1.callClaudeAgent)(cfg, system, messages, res, 'auto', { allowTools: false, signal: turn.signal, onEvent: turn.capture });
            }
            check();
            send({ type: 'done' });
            success = true;
            if (!res.writableEnded)
                res.end();
        }
        catch (error) {
            if (error.name !== 'AbortError') {
                if (res.headersSent) {
                    (0, agent_1.writeSse)(res, { type: 'error', text: error.message || '助手处理失败' });
                    (0, agent_1.writeSse)(res, { type: 'terminal', status: 'failed' });
                }
                else
                    (0, utils_1.sendJson)(res, { success: false, error: error.message || '助手处理失败' }, error.statusCode || 400);
            }
            if (res.headersSent && !res.writableEnded)
                res.end();
        }
        finally {
            try {
                turn?.finish?.(success);
            }
            catch {
                console.error('[music-agent] 请求状态持久化失败');
            }
        }
    }));
    return true;
}
//# sourceMappingURL=agent-api.js.map
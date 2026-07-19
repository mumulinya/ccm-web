"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPetActivityRuntime = createPetActivityRuntime;
// Mechanically extracted from server.ts; preserves pet activity state and callbacks.
function createPetActivityRuntime(deps) {
    const { CCM_DIR, GlobalPetActivityCoordinator, PETS_FILE, PID_DIR, bindProjectSessionAgentExecution, fs, getConfigs, getPort, getTaskAgentSessionOptions, loadProjectChatRuns, openTaskAgentSession, path, projectChatRuns, saveProjectChatRuns, url } = deps;
    const petStatusClients = new Set();
    const petWorkspaceClients = new Set();
    const stateCache = new Map();
    const agentActivity = new Map();
    const petWorkspaceTargets = new Map();
    const globalPetActivityCoordinator = new GlobalPetActivityCoordinator();
    const MUSIC_PET_AGENT_NAME = "music-agent";
    const GLOBAL_PET_AGENT_NAME = "global-agent";
    const MUSIC_PET_AGENT_DEFAULT_LABEL = "乖乖";
    const AGENT_RUNNER_DIR = path.join(CCM_DIR, "agent-runner");
    const AGENT_RUNNER_REQUESTS_DIR = path.join(AGENT_RUNNER_DIR, "requests");
    const AGENT_RUNNER_RESULTS_DIR = path.join(AGENT_RUNNER_DIR, "results");
    let musicPetState = {
        state: "idle",
        detail: "等待音乐指令",
        track: null,
        timestamp: Date.now(),
    };
    function getMusicPetAgentLabel() {
        try {
            if (!fs.existsSync(PETS_FILE))
                return MUSIC_PET_AGENT_DEFAULT_LABEL;
            const data = JSON.parse(fs.readFileSync(PETS_FILE, "utf-8"));
            const config = data?.configs?.[MUSIC_PET_AGENT_NAME] || {};
            const label = String(config.label || config.petLabel || config.displayName || "").trim();
            return label ? label.slice(0, 24) : MUSIC_PET_AGENT_DEFAULT_LABEL;
        }
        catch {
            return MUSIC_PET_AGENT_DEFAULT_LABEL;
        }
    }
    // === 辅助广播及状态跟踪函数 ===
    function writeSse(res, data) {
        if (!res || res.writableEnded || res.destroyed)
            return;
        try {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
        catch { }
    }
    loadProjectChatRuns();
    function bindProjectRunAgentSession(projectRun, projectName, agentType) {
        const projectSessionId = String(projectRun?.project_session_id || "").trim();
        if (projectSessionId) {
            const bound = bindProjectSessionAgentExecution({ project: projectName, projectSessionId, agentType });
            projectRun.task_session_scope_id = bound.binding.scope_id;
            projectRun.task_agent_session_id = bound.session.id;
            projectRun.native_session_id = bound.session.nativeSessionId || "";
            projectRun.resume_mode = bound.session.resumeMode || "";
            projectRun.project_session_generation = bound.binding.generation;
            saveProjectChatRuns();
            return bound;
        }
        const parentRun = projectRun?.parent_run_id ? projectChatRuns.get(projectRun.parent_run_id) : null;
        const taskSessionScopeId = String(parentRun?.task_session_scope_id || parentRun?.parent_run_id || projectRun?.parent_run_id || projectRun?.id || "");
        const session = openTaskAgentSession({
            scopeId: taskSessionScopeId,
            taskId: taskSessionScopeId,
            groupId: "project-chat",
            project: projectName,
            agentType,
        });
        projectRun.task_session_scope_id = taskSessionScopeId;
        projectRun.task_agent_session_id = session.id;
        projectRun.native_session_id = session.nativeSessionId || "";
        projectRun.resume_mode = session.resumeMode || "";
        saveProjectChatRuns();
        return { session, options: getTaskAgentSessionOptions(session) };
    }
    function broadcastPetSpeech(agent, payload = {}) {
        const text = payload.text == null ? "" : String(payload.text);
        if (!agent || (!text.trim() && !payload.final))
            return;
        const source = payload.source || "project";
        const isMusic = agent === MUSIC_PET_AGENT_NAME;
        const isGlobal = agent === GLOBAL_PET_AGENT_NAME;
        const resolved = !isMusic && !isGlobal ? globalPetActivityCoordinator.resolve() : null;
        const actorDisplayName = isMusic ? getMusicPetAgentLabel() : isGlobal ? getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent") : (resolved?.displayName || agent);
        const visibleText = isMusic || isGlobal || !text.trim() || text.trim().startsWith(`${actorDisplayName}：`)
            ? text
            : `${actorDisplayName}：${text}`;
        const event = {
            type: "speech",
            agent: isMusic ? MUSIC_PET_AGENT_NAME : GLOBAL_PET_AGENT_NAME,
            actor: isMusic || isGlobal ? agent : (resolved?.actor || agent),
            actorKind: isMusic ? "music" : isGlobal ? "global" : (resolved?.actorKind || "project"),
            displayName: actorDisplayName,
            role: payload.role || "assistant",
            text: visibleText,
            mode: payload.mode || "replace",
            final: !!payload.final,
            source,
            timestamp: new Date().toISOString(),
        };
        for (const client of petStatusClients)
            writeSse(client, event);
    }
    function broadcastPetConfigChanged() {
        const event = {
            type: "config",
            timestamp: new Date().toISOString(),
        };
        for (const client of petStatusClients)
            writeSse(client, event);
    }
    function sanitizePetNavigationTarget(target = {}) {
        const tab = String(target.tab || "").trim();
        if (tab === "music")
            return { tab: "music" };
        if (tab === "global-agent")
            return { tab: "global-agent" };
        if (tab === "groups") {
            return {
                tab: "groups",
                groupId: target.groupId ? String(target.groupId) : "",
                keyword: target.keyword ? String(target.keyword) : "",
            };
        }
        if (tab === "projects") {
            return {
                tab: "projects",
                project: target.project ? String(target.project) : "",
                sessionId: target.sessionId ? String(target.sessionId) : "",
                keyword: target.keyword ? String(target.keyword) : "",
            };
        }
        return { tab: "projects", project: target.project ? String(target.project) : "" };
    }
    function setAgentWorkspaceTarget(name, target = null) {
        if (!name || !target)
            return;
        petWorkspaceTargets.set(name, {
            ...sanitizePetNavigationTarget(target),
            updatedAt: Date.now(),
        });
    }
    function getPetNavigationTarget(agent) {
        const name = String(agent || "").trim();
        if (name === MUSIC_PET_AGENT_NAME)
            return { tab: "music" };
        if (name === GLOBAL_PET_AGENT_NAME)
            return { tab: "global-agent" };
        const existing = petWorkspaceTargets.get(name);
        if (existing?.tab) {
            const { updatedAt, ...target } = existing;
            return target;
        }
        const project = getConfigs().find(c => c.name === name);
        if (project)
            return { tab: "projects", project: name };
        return { tab: "projects" };
    }
    function buildPetNavigationUrl(target) {
        const params = new URLSearchParams();
        params.set("tab", target?.tab || "projects");
        if (target?.project)
            params.set("project", String(target.project));
        if (target?.sessionId)
            params.set("sessionId", String(target.sessionId));
        if (target?.groupId)
            params.set("groupId", String(target.groupId));
        if (target?.keyword)
            params.set("keyword", String(target.keyword));
        return `http://localhost:${getPort()}/?${params.toString()}`;
    }
    function broadcastPetNavigation(agent, target) {
        const event = {
            type: "navigate",
            agent,
            target,
            url: buildPetNavigationUrl(target),
            timestamp: new Date().toISOString(),
        };
        for (const client of petStatusClients)
            writeSse(client, event);
        return event;
    }
    const PROJECT_IDLE_ACTION_STRATEGY = [
        { state: "idle", seconds: 20, detail: "空闲，等待指令" },
        { state: "idle", seconds: 20, detail: "待机小动作随机播放" },
        { state: "yawning", seconds: 8, detail: "长时间无任务时轻微放松" },
        { state: "idle", seconds: 12, detail: "回到安静待机" },
    ];
    const PROJECT_IDLE_ACTION_CYCLE_MS = PROJECT_IDLE_ACTION_STRATEGY.reduce((sum, item) => sum + item.seconds * 1000, 0);
    const PROJECT_ACTIVE_ACTION_STRATEGY = [
        { state: "working", seconds: 90, detail: "Agent 调用中", trigger: "用户向项目 Agent 提问、群聊协作、定时任务执行" },
        { state: "planning", seconds: 15, detail: "正在规划下一步", trigger: "全局 Agent 形成决策、拆任务或选择工具" },
        { state: "building", seconds: 90, detail: "正在实现/执行", trigger: "全局 Agent 或子 Agent 开始执行开发任务" },
        { state: "debugging", seconds: 60, detail: "正在排查失败", trigger: "工具失败、测试失败、执行器恢复或返工" },
        { state: "reviewing", seconds: 45, detail: "正在验收/复盘", trigger: "工具完成、代码审查、最终验收" },
        { state: "waiting", seconds: 300, detail: "等待用户确认", trigger: "需要用户确认、澄清或继续授权" },
        { state: "happy", seconds: 12, detail: "任务完成", trigger: "项目 Agent 成功完成回复或协作任务" },
        { state: "error", seconds: 45, detail: "错误", trigger: "项目 Agent 调用失败或任务执行报错" },
        { state: "attention", seconds: 12, detail: "正在展示回复", trigger: "项目 Agent 输出消息气泡时" },
    ];
    function getProjectPetActionStrategy() {
        return {
            idleCycleSeconds: Math.round(PROJECT_IDLE_ACTION_CYCLE_MS / 1000),
            idle: PROJECT_IDLE_ACTION_STRATEGY.map((item, index) => ({ order: index + 1, ...item })),
            active: PROJECT_ACTIVE_ACTION_STRATEGY.map((item, index) => ({ order: index + 1, ...item })),
        };
    }
    function getActivityDurationMs(state) {
        const normalized = normalizePetState(state);
        const durations = {
            idle: 10000,
            thinking: 10000,
            planning: 15000,
            working: 90000,
            building: 90000,
            debugging: 60000,
            reviewing: 45000,
            waiting: 300000,
            happy: 10000,
            attention: 10000,
            notification: 10000,
            error: 45000,
            carrying: 10000,
            sweeping: 10000,
            juggling: 10000,
            yawning: 10000,
            dozing: 10000,
            collapsing: 10000,
            sleeping: 10000,
            waking: 10000,
        };
        return durations[normalized] || 60000;
    }
    function getAgentRunActivityDuration(timeoutMs) {
        return Math.max((timeoutMs || 300000) + 30000, getActivityDurationMs("working"));
    }
    function hashString(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
        }
        return Math.abs(hash);
    }
    function getProjectAmbientPetState(name, now = Date.now()) {
        const offset = hashString(name) % PROJECT_IDLE_ACTION_CYCLE_MS;
        let cursor = (now + offset) % PROJECT_IDLE_ACTION_CYCLE_MS;
        for (const item of PROJECT_IDLE_ACTION_STRATEGY) {
            const span = item.seconds * 1000;
            if (cursor < span)
                return item;
            cursor -= span;
        }
        return PROJECT_IDLE_ACTION_STRATEGY[0];
    }
    function broadcastAgentActivityState(name, state, detail = "", timestamp = Date.now()) {
        const event = {
            type: "state",
            agent: name,
            displayName: name,
            state,
            lastActivity: new Date(timestamp).toISOString(),
            detail,
        };
        if (name === MUSIC_PET_AGENT_NAME) {
            for (const client of petStatusClients)
                writeSse(client, event);
            return;
        }
        const resolved = globalPetActivityCoordinator.resolve(timestamp);
        const coordinated = resolved ? {
            ...event,
            agent: GLOBAL_PET_AGENT_NAME,
            actor: resolved.actor,
            actorKind: resolved.actorKind,
            runtime: resolved.runtime,
            displayName: getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent"),
            state: resolved.state,
            detail: resolved.detail,
            lastActivity: new Date(resolved.timestamp).toISOString(),
            source: resolved.source,
        } : {
            ...event,
            agent: GLOBAL_PET_AGENT_NAME,
            actor: GLOBAL_PET_AGENT_NAME,
            actorKind: "global",
            displayName: getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent"),
            state: "idle",
            detail: "等待全局指令",
        };
        for (const client of petStatusClients)
            writeSse(client, coordinated);
    }
    function shouldKeepGlobalPetPrimaryActivity(now = Date.now()) {
        const activity = agentActivity.get(GLOBAL_PET_AGENT_NAME);
        if (!activity)
            return false;
        const active = activity.expiresAt ? now < activity.expiresAt : now - activity.timestamp < 60000;
        if (!active)
            return false;
        return new Set([
            "thinking",
            "planning",
            "building",
            "debugging",
            "reviewing",
            "waiting",
        ]).has(normalizePetState(activity.state));
    }
    function setAgentActivity(name, state, detail = "", workspaceTarget = null, durationMs, metadata = null) {
        if (workspaceTarget)
            setAgentWorkspaceTarget(name, workspaceTarget);
        const timestamp = Date.now();
        const normalizedState = normalizePetState(state);
        agentActivity.set(name, {
            state: normalizedState,
            timestamp,
            detail,
            expiresAt: timestamp + (durationMs || getActivityDurationMs(normalizedState)),
        });
        if (name !== MUSIC_PET_AGENT_NAME) {
            const coordinated = globalPetActivityCoordinator.update({
                actor: name,
                displayName: metadata?.displayName || (name === GLOBAL_PET_AGENT_NAME ? getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent") : name),
                actorKind: metadata?.actorKind,
                runtime: metadata?.runtime,
                state: normalizedState,
                detail,
                workspaceTarget,
                source: metadata?.source || (workspaceTarget?.tab === "groups" ? "group" : workspaceTarget?.tab === "projects" ? "project" : "global"),
                timestamp,
                durationMs: durationMs || getActivityDurationMs(normalizedState),
            });
            if (coordinated) {
                agentActivity.set(GLOBAL_PET_AGENT_NAME, {
                    state: coordinated.state,
                    timestamp: coordinated.timestamp,
                    detail: coordinated.detail,
                    expiresAt: coordinated.expiresAt,
                });
                if (coordinated.workspaceTarget)
                    setAgentWorkspaceTarget(GLOBAL_PET_AGENT_NAME, coordinated.workspaceTarget);
            }
            else {
                agentActivity.delete(GLOBAL_PET_AGENT_NAME);
            }
        }
        stateCache.delete(name);
        broadcastAgentActivityState(name, normalizedState, detail, timestamp);
    }
    function getSystemPetActivity(name, fallbackDetail = "") {
        const now = Date.now();
        const activity = agentActivity.get(name);
        if (activity && (activity.expiresAt ? now < activity.expiresAt : now - activity.timestamp < 60000)) {
            return {
                state: normalizePetState(activity.state),
                lastActivity: new Date(activity.timestamp).toISOString(),
                detail: activity.detail || fallbackDetail,
            };
        }
        return {
            state: "idle",
            lastActivity: new Date().toISOString(),
            detail: fallbackDetail,
        };
    }
    function normalizePetState(state) {
        const value = String(state || "idle");
        const allowed = new Set([
            "idle", "working", "thinking", "error", "happy", "attention",
            "notification", "carrying", "sweeping", "juggling", "yawning",
            "dozing", "collapsing", "sleeping", "waking", "planning",
            "building", "debugging", "reviewing", "waiting", "drag",
        ]);
        return allowed.has(value) ? value : "idle";
    }
    function setMusicPetState(state, detail = "", track = null) {
        setAgentWorkspaceTarget(MUSIC_PET_AGENT_NAME, { tab: "music" });
        const displayName = getMusicPetAgentLabel();
        musicPetState = {
            state: normalizePetState(state),
            detail: detail || "等待音乐指令",
            track: track || null,
            timestamp: Date.now(),
        };
        const event = {
            type: "state",
            agent: MUSIC_PET_AGENT_NAME,
            displayName,
            state: musicPetState.state,
            lastActivity: new Date(musicPetState.timestamp).toISOString(),
            detail: musicPetState.detail,
            track: musicPetState.track,
        };
        for (const client of petStatusClients)
            writeSse(client, event);
    }
    function getMusicPetAgent() {
        const displayName = getMusicPetAgentLabel();
        return {
            name: MUSIC_PET_AGENT_NAME,
            displayName,
            petLabel: displayName,
            virtual: true,
            type: "music",
            agent: "music",
            running: true,
            state: musicPetState.state,
            lastActivity: new Date(musicPetState.timestamp).toISOString(),
            stateDetail: musicPetState.detail,
            track: musicPetState.track,
        };
    }
    function getPetConfigLabel(agentName, fallback) {
        try {
            if (!fs.existsSync(PETS_FILE))
                return fallback;
            const data = JSON.parse(fs.readFileSync(PETS_FILE, "utf-8"));
            const label = String(data?.configs?.[agentName]?.label || "").trim();
            return label || fallback;
        }
        catch {
            return fallback;
        }
    }
    function getGlobalPetAgent() {
        const displayName = getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent");
        const coordinated = globalPetActivityCoordinator.resolve();
        const current = coordinated ? {
            state: coordinated.state,
            lastActivity: new Date(coordinated.timestamp).toISOString(),
            detail: coordinated.detail,
        } : getSystemPetActivity(GLOBAL_PET_AGENT_NAME, "等待全局指令");
        return {
            name: GLOBAL_PET_AGENT_NAME,
            displayName,
            petLabel: displayName,
            virtual: true,
            type: "global",
            agent: "global",
            running: true,
            state: current.state,
            lastActivity: current.lastActivity,
            stateDetail: current.detail,
            actor: coordinated?.actor || GLOBAL_PET_AGENT_NAME,
            actorKind: coordinated?.actorKind || "global",
            runtime: coordinated?.runtime || "",
        };
    }
    function getPetAgents() {
        return [getGlobalPetAgent(), getMusicPetAgent()];
    }
    function getAgentState(name) {
        const now = Date.now();
        const activity = agentActivity.get(name);
        if (activity && (activity.expiresAt ? now < activity.expiresAt : now - activity.timestamp < 60000)) {
            return {
                state: normalizePetState(activity.state),
                lastActivity: new Date(activity.timestamp).toISOString(),
                detail: activity.detail,
                processRunning: true,
                cachedAt: now
            };
        }
        const cached = stateCache.get(name);
        if (cached && now - cached.cachedAt < 2000)
            return cached;
        const pidFile = path.join(PID_DIR, `${name}.pid`);
        let state = "sleeping";
        let lastActivity = null;
        let detail = "";
        let processRunning = false;
        try {
            if (!fs.existsSync(pidFile)) {
                const result = { state: "idle", lastActivity: new Date(now).toISOString(), detail: "待命中", processRunning: false, cachedAt: now };
                stateCache.set(name, result);
                return result;
            }
            const pid = fs.readFileSync(pidFile, "utf-8").trim();
            try {
                process.kill(parseInt(pid), 0);
                processRunning = true;
                const ambient = getProjectAmbientPetState(name, now);
                state = ambient.state;
                detail = ambient.detail;
                lastActivity = new Date(now).toISOString();
            }
            catch {
                try {
                    fs.unlinkSync(pidFile);
                }
                catch { }
                state = "idle";
                detail = "待命中";
            }
        }
        catch {
            state = "idle";
            detail = "状态未知";
        }
        const result = {
            state: normalizePetState(state),
            lastActivity,
            detail,
            processRunning,
            cachedAt: now
        };
        stateCache.set(name, result);
        return result;
    }
    return {
        AGENT_RUNNER_DIR,
        AGENT_RUNNER_REQUESTS_DIR,
        AGENT_RUNNER_RESULTS_DIR,
        MUSIC_PET_AGENT_NAME,
        bindProjectRunAgentSession,
        broadcastPetConfigChanged,
        broadcastPetNavigation,
        broadcastPetSpeech,
        getAgentRunActivityDuration,
        getAgentState,
        getMusicPetAgent,
        getPetAgents,
        getPetNavigationTarget,
        getProjectPetActionStrategy,
        petStatusClients,
        petWorkspaceClients,
        setAgentActivity,
        setMusicPetState,
        writeSse
    };
}
//# sourceMappingURL=server-pet-activity.js.map
export declare const MUSIC_REMOTE_COMMAND_FILE: string;
export declare const MUSIC_REMOTE_COMMANDS_FILE: string;
/** The browser renews a short lease while preparing/downloading/playing. */
export type MusicPlaybackCommandStatusV2 = "pending" | "resolving" | "ready" | "claimed" | "playing" | "needs_user_gesture" | "completed" | "failed" | "superseded" | "cancelled";
export type MusicRemoteCommand = {
    schema?: "ccm-music-playback-command-v2" | "ccm-music-playback-command-v3";
    version?: 2 | 3;
    id: string;
    type: string;
    keyword: string;
    request_text?: string;
    mode?: string;
    source?: string;
    created_at: string;
    status: MusicPlaybackCommandStatusV2;
    generation?: number;
    decision?: any;
    origin?: any;
    claimed_at?: string;
    lease_expires_at?: string;
    attempts?: number;
    last_error?: string;
    terminal_at?: string;
    result?: any;
    lease_id?: string;
    fencing_token?: number;
    consumed?: boolean;
    consumed_at?: string;
};
/** @deprecated Prefer enqueueMusicRemoteCommand; kept for import compatibility. */
export declare function saveMusicRemoteCommand(command: any): MusicRemoteCommand;
export declare const STOP_MUSIC_KEYWORD = "__stop__";
export declare function enqueueMusicRemoteCommand(command: any): MusicRemoteCommand;
export declare function peekMusicRemoteCommand(): MusicRemoteCommand | null;
export declare function claimMusicRemoteCommand(commandId?: string, generation?: number): MusicRemoteCommand;
/**
 * Web client_effect path: remove a pending command so the App poller will not also play it.
 * Returns null if missing or already claimed by the poller (do not steal / double-play).
 */
export declare function takeMusicRemoteCommand(id: string): MusicRemoteCommand;
export declare function heartbeatMusicRemoteCommand(input: {
    id: string;
    generation?: number;
    lease_id?: string;
    fencing_token?: number;
    status?: "claimed" | "playing" | "needs_user_gesture";
}): {
    success: boolean;
    error: string;
    command?: undefined;
} | {
    success: boolean;
    command: {
        schema: string;
        version: number;
        id: string;
        type: string;
        keyword: string;
        request_text: string;
        mode: string;
        source: string;
        status: string;
        generation: number;
        attempts: number;
        decision: any;
        origin: any;
        lease_id: string;
        fencing_token: number;
        claimed_at: any;
        lease_expires_at: any;
        result: any;
        last_error: string;
        created_at: string;
        terminal_at: any;
        updated_at: string;
    };
    error?: undefined;
};
export declare function completeMusicRemoteCommand(input: {
    id: string;
    generation?: number;
    lease_id?: string;
    fencing_token?: number;
    status: "completed" | "failed" | "superseded" | "cancelled" | "needs_user_gesture";
    error?: string;
    result?: any;
}): {
    success: boolean;
    error: string;
    duplicate?: undefined;
    command?: undefined;
} | {
    success: boolean;
    duplicate: boolean;
    command: {
        schema: string;
        version: number;
        id: string;
        type: string;
        keyword: string;
        request_text: string;
        mode: string;
        source: string;
        status: string;
        generation: number;
        attempts: number;
        decision: any;
        origin: any;
        lease_id: string;
        fencing_token: number;
        claimed_at: any;
        lease_expires_at: any;
        result: any;
        last_error: string;
        created_at: string;
        terminal_at: any;
        updated_at: string;
    };
    error?: undefined;
} | {
    success: boolean;
    command: {
        schema: string;
        version: number;
        id: string;
        type: string;
        keyword: string;
        request_text: string;
        mode: string;
        source: string;
        status: string;
        generation: number;
        attempts: number;
        decision: any;
        origin: any;
        lease_id: string;
        fencing_token: number;
        claimed_at: any;
        lease_expires_at: any;
        result: any;
        last_error: string;
        created_at: string;
        terminal_at: any;
        updated_at: string;
    };
    error?: undefined;
    duplicate?: undefined;
};
export declare function ackMusicRemoteCommand(input: {
    id: string;
    status: "success" | "failed";
    error?: string;
}): {
    success: boolean;
    error: string;
} | {
    removed: boolean;
    success: boolean;
    error: string;
    duplicate?: undefined;
    command?: undefined;
} | {
    removed: boolean;
    success: boolean;
    duplicate: boolean;
    command: {
        schema: string;
        version: number;
        id: string;
        type: string;
        keyword: string;
        request_text: string;
        mode: string;
        source: string;
        status: string;
        generation: number;
        attempts: number;
        decision: any;
        origin: any;
        lease_id: string;
        fencing_token: number;
        claimed_at: any;
        lease_expires_at: any;
        result: any;
        last_error: string;
        created_at: string;
        terminal_at: any;
        updated_at: string;
    };
    error?: undefined;
} | {
    removed: boolean;
    success: boolean;
    command: {
        schema: string;
        version: number;
        id: string;
        type: string;
        keyword: string;
        request_text: string;
        mode: string;
        source: string;
        status: string;
        generation: number;
        attempts: number;
        decision: any;
        origin: any;
        lease_id: string;
        fencing_token: number;
        claimed_at: any;
        lease_expires_at: any;
        result: any;
        last_error: string;
        created_at: string;
        terminal_at: any;
        updated_at: string;
    };
    error?: undefined;
    duplicate?: undefined;
};
/** Legacy single-command reader used by old GET path; returns claimed/pending head. */
export declare function loadMusicRemoteCommand(): MusicRemoteCommand;
export declare function listMusicRemoteCommands(): MusicRemoteCommand[];
export declare function runMusicRemoteCommandQueueSelfTest(): {
    success: boolean;
    checks: {
        peekDoesNotClaim: boolean;
        claimFirst: boolean;
        requestTextPreserved: boolean;
        latestSupersedesClaimed: boolean;
        secondStillPending: boolean;
        latestCanClaimImmediately: boolean;
        heartbeatRenewsLease: boolean;
        terminalReceiptPersisted: boolean;
        failRequeues: boolean;
    };
};
export declare function loadMusicAgentConfig(): any;
export declare function publicMusicAgentConfig(): any;

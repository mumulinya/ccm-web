export declare const MUSIC_REMOTE_COMMAND_FILE: string;
export declare const MUSIC_REMOTE_COMMANDS_FILE: string;
type MusicRemoteCommand = {
    id: string;
    type: string;
    keyword: string;
    request_text?: string;
    mode?: string;
    source?: string;
    created_at: string;
    status: "pending" | "claimed" | "failed" | "stale";
    claimed_at?: string;
    attempts?: number;
    last_error?: string;
    consumed?: boolean;
    consumed_at?: string;
};
/** @deprecated Prefer enqueueMusicRemoteCommand; kept for import compatibility. */
export declare function saveMusicRemoteCommand(command: any): MusicRemoteCommand;
export declare const STOP_MUSIC_KEYWORD = "__stop__";
export declare function enqueueMusicRemoteCommand(command: any): MusicRemoteCommand;
export declare function claimMusicRemoteCommand(): MusicRemoteCommand;
/**
 * Web client_effect path: remove a pending command so the App poller will not also play it.
 * Returns null if missing or already claimed by the poller (do not steal / double-play).
 */
export declare function takeMusicRemoteCommand(id: string): MusicRemoteCommand;
export declare function ackMusicRemoteCommand(input: {
    id: string;
    status: "success" | "failed";
    error?: string;
}): {
    success: boolean;
    error: string;
    removed?: undefined;
    command?: undefined;
} | {
    success: boolean;
    removed: boolean;
    command: MusicRemoteCommand;
    error?: undefined;
};
/** Legacy single-command reader used by old GET path; returns claimed/pending head. */
export declare function loadMusicRemoteCommand(): MusicRemoteCommand;
export declare function listMusicRemoteCommands(): MusicRemoteCommand[];
export declare function runMusicRemoteCommandQueueSelfTest(): {
    success: boolean;
    checks: {
        claimFirst: boolean;
        requestTextPreserved: boolean;
        claimNotRedelivered: boolean;
        takeDoesNotStealClaimed: boolean;
        secondStillPending: boolean;
        ackRemoves: boolean;
        takePendingOnly: boolean;
        failRequeues: boolean;
    };
};
export declare function loadMusicAgentConfig(): any;
export declare function publicMusicAgentConfig(): any;
export {};

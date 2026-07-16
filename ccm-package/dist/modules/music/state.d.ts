export declare const MUSIC_REMOTE_COMMAND_FILE: string;
export declare const MUSIC_REMOTE_COMMANDS_FILE: string;
type MusicRemoteCommand = {
    id: string;
    type: string;
    keyword: string;
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
export declare function enqueueMusicRemoteCommand(command: any): MusicRemoteCommand;
export declare function claimMusicRemoteCommand(): MusicRemoteCommand;
/** Remove a command from the queue so the App poller will not also play it (Web client_effect path). */
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
        claimIdempotent: boolean;
        secondStillPending: boolean;
        ackRemoves: boolean;
        failRequeues: boolean;
    };
};
export declare function loadMusicAgentConfig(): any;
export declare function publicMusicAgentConfig(): any;
export {};

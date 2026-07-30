export type ServiceInstanceIdentityV2 = {
    schema: "ccm-service-instance-v2";
    instance_id: string;
    boot_id: string;
    token: string;
    pid: number;
    process_fingerprint: string;
    entry_checksum: string;
    entry_path: string;
    port: number;
    listen_host: string;
    public_origin: string;
    launch_mode: "foreground" | "background" | "unknown";
    package_version: string;
    hostname: string;
    acquired_at: string;
    data_directory: string;
};
export type ServerInstanceLock = {
    bypassed?: boolean;
    file: string;
    token: string;
    pid: number;
    port: number;
    listenHost: string;
    identity: ServiceInstanceIdentityV2;
};
export declare function getProcessIdentityFingerprint(pid?: number): string;
export declare function acquireCcmServerInstanceLock(port: number, listenHost?: string, options?: {
    publicOrigin?: string;
    launchMode?: "foreground" | "background" | "unknown";
    packageVersion?: string;
    bootId?: string;
}): ServerInstanceLock;
export declare function releaseCcmServerInstanceLock(lock: ServerInstanceLock | null | undefined): boolean;
export declare function inspectCcmServerInstanceLock(): {
    file: string;
    present: boolean;
    owner: any;
    active: boolean;
    process_alive: boolean;
    identity_verified: boolean;
    ownership_state: string;
};

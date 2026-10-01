/**
 * Deterministically discovers existing verification scripts without executing
 * package lifecycle hooks or inventing commands. Explicit project configuration
 * remains authoritative; this is only the safe fallback when it is absent.
 */
export declare function discoverProjectVerificationCommands(workDir?: string, maxCommands?: number): string[];

/** Adapter owns command construction; the execution kernel owns process spawn.
 * A returned handle is a launch description, never evidence of a running process. */
export declare function buildRuntimeLaunchCommand(runtimeId: string, messageFile: string, options?: any, binding?: any): Promise<string>;

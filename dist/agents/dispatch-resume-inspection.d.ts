/** Frozen dispatches require captured Provider evidence, not an arbitrary
 * nonempty Session string. Legacy runtime inspection remains compatible. */
export declare function inspectDispatchResume(run: any): Promise<import("./agent-run-types").ResumeInspection>;

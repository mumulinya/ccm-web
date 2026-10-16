/** A committed Task change invalidates read projections, including writes from
 * other SQLite connections. Unrelated metrics/auth writes do not change it. */
export declare function taskWorkbenchReadVersion(db: any): string;

/** 占用跟随后台执行结束，不能绑定 HTTP close/finish（页面断开后任务仍可能运行）。 */
export declare function runProjectSessionDispatch<T>(lease: {
    scopeId: string;
    leaseId?: string;
}, onReleased: () => void, execute: (release: () => void) => Promise<T>): Promise<T>;

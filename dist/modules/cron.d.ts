import { type CollabCtx } from "./collaboration";
export declare function startCronScheduler(ctx: CollabCtx): void;
export declare function stopCronScheduler(): void;
export declare function handleCronApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;

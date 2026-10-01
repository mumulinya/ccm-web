import { CollabCtx } from "./collaboration";
export declare function configureCollaborationRouteExecutors(ctx: CollabCtx): void;
export declare function handleCollaborationApiReplayAndExecutionRoutes(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
export declare function handleCollaborationApiIntakeRoutes(pathname: string, req: any, res: any, parsed: any, ctx: any): boolean;
export declare function handleCollaborationApiIntakeRoutesPartA(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
export declare function handleCollaborationApiIntakeRoutesPartB(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
export declare function handleCollaborationApiTaskLifecycleRoutes(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
export declare function handleCollaborationApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;

import type { IncomingMessage, ServerResponse } from 'http';
/** Read execution state without claiming, editing, retrying or settling a turn. */
export declare function handleConversationTurnObservationApi(pathname: string, req: IncomingMessage, res: ServerResponse, parsed: any, deps: {
    get: (id: string) => any;
    authorize: (req: IncomingMessage, res: ServerResponse, payload: any) => boolean;
    project: (turn: any, viewerUserId: string, viewerRole: string) => any;
}): boolean;

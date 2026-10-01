export declare function planAvailableActions(status: string): {
    id: string;
    kind: string;
    label: string;
    tone: string;
}[];
export declare function missionNavigationActions(links: any[]): {
    id: string;
    kind: string;
    label: string;
    tone: string;
    task_id: any;
    link: any;
}[];
export declare function globalRunAvailableActions(run: any): {
    id: string;
    kind: string;
    label: string;
    tone: string;
}[];
export declare function globalMissionAvailableActions(mission: any): {
    id: string;
    kind: string;
    label: string;
    tone: string;
}[];

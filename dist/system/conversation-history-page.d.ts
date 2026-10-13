export declare function conversationHistoryPage(messages: any[], scope: string, query?: any): {
    items: any[];
    pagination: {
        limit: number;
        total: number;
        start: number;
        end: number;
        has_more: boolean;
        next_before: string;
    };
};
export declare function projectGlobalHistoryPage(store: any, query?: any): any;

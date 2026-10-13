/** The exact final message ID proves provenance; never attach to the nearest answer. */
export declare function globalSourceHistoryBinding(message: any): {
    source_access_run_id?: undefined;
    source_access_count?: undefined;
} | {
    source_access_run_id: string;
    source_access_count: number;
};

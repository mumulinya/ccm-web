import * as fs from 'fs';
export interface CompressedStaticSlice {
    file: string;
    offset: number;
    size: number;
    etag: string;
}
/** Build-time compressed bytes, streamed from a single npm artifact. Original
 * content is verified once per file version so stale packs never serve an old
 * build. Failure falls back to normal static delivery. */
export declare function resolveCompressedStaticSlice(file: string, coding: string, original: fs.Stats): Promise<CompressedStaticSlice | null>;

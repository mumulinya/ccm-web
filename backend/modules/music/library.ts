import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";

export const MUSIC_DIR = path.join(CCM_DIR, "music");

if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });

export function parseMusicFilename(filename: string) {
  const name = filename.replace(/\.[^.]+$/, "");
  const bvidMatch = name.match(/(BV[\w]+)/i);
  const bvid = bvidMatch ? bvidMatch[1] : undefined;
  const cleaned = name.replace(/\[BV[\w]+\]/gi, "").replace(/BV[\w]+/gi, "").trim();
  const parts = cleaned.split(" - ");
  let artist = "未知艺术家", title = cleaned;
  if (parts.length >= 2) {
    artist = parts[0].trim();
    title = parts.slice(1).join(" - ").trim();
  }
  if (!title) title = name;
  return { artist, title, bvid };
}

export function getMp3Cover(filePath: string): { mimeType: string, data: Buffer } | null {
  try {
    const fd = fs.openSync(filePath, "r");
    const tagSizeHeader = Buffer.alloc(10);
    fs.readSync(fd, tagSizeHeader, 0, 10, 0);

    if (tagSizeHeader.toString("ascii", 0, 3) !== "ID3") {
      fs.closeSync(fd);
      return null;
    }

    const version = tagSizeHeader[3];
    const tagSize = (tagSizeHeader[6] << 21) | (tagSizeHeader[7] << 14) | (tagSizeHeader[8] << 7) | tagSizeHeader[9];
    const tagBuffer = Buffer.alloc(tagSize);
    fs.readSync(fd, tagBuffer, 0, tagSize, 10);
    fs.closeSync(fd);

    let offset = 0;
    while (offset < tagSize - 10) {
      let frameId = "";
      if (version === 2) {
        frameId = tagBuffer.toString("ascii", offset, offset + 3);
      } else {
        frameId = tagBuffer.toString("ascii", offset, offset + 4);
      }

      if (!frameId || frameId[0] === "\0" || /[^A-Z0-9]/.test(frameId)) {
        break;
      }

      let frameSize = 0;
      let headerSize = 0;
      if (version === 2) {
        frameSize = (tagBuffer[offset + 3] << 16) | (tagBuffer[offset + 4] << 8) | tagBuffer[offset + 5];
        headerSize = 6;
      } else if (version === 3) {
        frameSize = tagBuffer.readUInt32BE(offset + 4);
        headerSize = 10;
      } else if (version === 4) {
        const b0 = tagBuffer[offset + 4];
        const b1 = tagBuffer[offset + 5];
        const b2 = tagBuffer[offset + 6];
        const b3 = tagBuffer[offset + 7];
        frameSize = (b0 << 21) | (b1 << 14) | (b2 << 7) | b3;
        headerSize = 10;
      }

      if (frameSize <= 0 || offset + headerSize + frameSize > tagSize) {
        break;
      }

      const isAPIC = frameId === "APIC" || frameId === "PIC";
      if (isAPIC) {
        const frameContent = tagBuffer.subarray(offset + headerSize, offset + headerSize + frameSize);
        let mimeType = "";
        let pictureDataOffset = 0;

        if (frameId === "APIC") {
          const encoding = frameContent[0];
          let mimeEnd = 1;
          while (mimeEnd < frameContent.length && frameContent[mimeEnd] !== 0) {
            mimeEnd++;
          }
          mimeType = frameContent.toString("ascii", 1, mimeEnd);

          let descStart = mimeEnd + 2;
          let descEnd = descStart;
          if (encoding === 1 || encoding === 2) {
            while (descEnd < frameContent.length - 1 && !(frameContent[descEnd] === 0 && frameContent[descEnd + 1] === 0)) {
              descEnd += 2;
            }
            pictureDataOffset = descEnd + 2;
          } else {
            while (descEnd < frameContent.length && frameContent[descEnd] !== 0) {
              descEnd++;
            }
            pictureDataOffset = descEnd + 1;
          }
        } else {
          const encoding = frameContent[0];
          const imageFormat = frameContent.toString("ascii", 1, 4);
          mimeType = imageFormat === "PNG" ? "image/png" : "image/jpeg";

          let descStart = 5;
          let descEnd = descStart;
          if (encoding === 1) {
            while (descEnd < frameContent.length - 1 && !(frameContent[descEnd] === 0 && frameContent[descEnd + 1] === 0)) {
              descEnd += 2;
            }
            pictureDataOffset = descEnd + 2;
          } else {
            while (descEnd < frameContent.length && frameContent[descEnd] !== 0) {
              descEnd++;
            }
            pictureDataOffset = descEnd + 1;
          }
        }

        const pictureData = frameContent.subarray(pictureDataOffset);
        return { mimeType, data: pictureData };
      }

      offset += headerSize + frameSize;
    }
  } catch (e) {
    console.error("[GetMp3Cover] error:", e);
  }
  return null;
}

export function searchLocalMusic(keyword: string) {
  const q = keyword.toLowerCase();
  return fs.readdirSync(MUSIC_DIR)
    .filter(f => /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f))
    .filter(f => f.toLowerCase().includes(q))
    .map((f, i) => {
      const stat = fs.statSync(path.join(MUSIC_DIR, f));
      const { artist, title, bvid } = parseMusicFilename(f);
      return { id: i, filename: f, title, artist, bvid, pic: `/api/music/cover?file=${encodeURIComponent(f)}`, size: stat.size };
    });
}

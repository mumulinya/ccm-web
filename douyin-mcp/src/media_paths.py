"""Managed media paths: titles are metadata, never the identity of a download."""
import errno
import os
import re
import uuid
from pathlib import Path
from .errors import DouyinMCPError


def safe_filename(name: str, fallback: str = "media") -> str:
    value = re.sub(r'[\x00-\x1f\x7f\\/:*?"<>|]', " ", str(name or ""))
    value = re.sub(r"\s+", " ", value).strip(" .")[:64].rstrip(" .")
    if not value or re.match(r"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)", value, re.I):
        value = "media_" + re.sub(r"[^\w-]", "_", fallback)[:32]
    return value


class MediaStorageError(DouyinMCPError):
    def __init__(self, error: OSError, stage: str):
        self.stage = stage
        self.system_code = getattr(error, "winerror", None) or error.errno
        self.category = "disk_error" if error.errno in (errno.ENOSPC, errno.EACCES, errno.EROFS) else "path_error"
        super().__init__(f"媒体文件保存失败（{stage}，系统错误 {self.system_code}）", "检查 CCM 缓存目录和磁盘权限后重试，无需重新登录。")


async def download_managed_video(url: str, root: Path, aweme_id: str, cookies: str = "") -> Path:
    from .video.audio import download_to_path
    if not re.fullmatch(r"\d{10,24}", aweme_id):
        raise ValueError("视频 ID 无效")
    stage = "create_directory"
    partial = None
    try:
        # Do not resolve before checking ancestors: resolving would hide symlinks.
        root = Path(os.path.abspath(root))
        for parent in (root, *root.parents):
            if parent.is_symlink() or (hasattr(parent, "is_junction") and parent.is_junction()):
                raise ValueError("媒体目录不可使用符号链接或联接")
        root.mkdir(parents=True, exist_ok=True)
        target = root / f"{aweme_id}.mp4"
        partial = root / f"{aweme_id}.{uuid.uuid4().hex}.part"
        stage = "download_file"
        await download_to_path(url, str(partial), cookies=cookies)
        stage = "atomic_move"
        os.replace(partial, target)
        return target
    except OSError as error:
        raise MediaStorageError(error, stage) from error
    finally:
        if partial is not None:
            try:
                partial.unlink(missing_ok=True)
            except OSError:
                pass

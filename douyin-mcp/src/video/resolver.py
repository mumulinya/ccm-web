"""分享链接解析模块。

支持三种输入格式：
1. 分享短链: https://v.douyin.com/xxx → 302重定向后提取aweme_id
2. 视频长链: https://www.douyin.com/video/7613614740174081320 → 直接正则提取
3. 纯数字ID: 7613614740174081320 → 直接返回
"""

import logging
import re
from urllib.parse import urlparse, urljoin

import httpx

from ..token_manager import DOUYIN_FIXED_USER_AGENT

logger = logging.getLogger("douyinmcp.video.resolver")

# aweme_id 提取正则：/video/数字、/note/数字、aweme_id=数字
_AWEME_ID_PATTERN = re.compile(r"(?:/video/|/note/|aweme_id=)(\d+)")
_PURE_NUMBER_PATTERN = re.compile(r"^\d{15,25}$")  # 15~25位纯数字
_EMBEDDED_ID_PATTERN = re.compile(r"(?<!\d)(\d{15,25})(?!\d)")
# Douyin's share action copies a whole paragraph, not just the URL.  The
# copied text commonly contains Chinese punctuation, a Markdown link, or a
# trailing `)` from the Markdown wrapper.  Extract only an allow-listed
# Douyin host before URL validation so those decorations do not make
# urlparse() reject an otherwise valid short link.
_SHARE_URL_PATTERN = re.compile(
    r"(?i)(?:(?:https?://)?(?:v|www|m|iesdouyin)\.douyin\.com/[^\s<>\]\[\"']+)"
)
_TRAILING_SHARE_PUNCTUATION = "\u3002\uff0c\uff01\uff1f\uff1b\uff1a\u3001,.!?;:)\u3011\u3010}>》〉"


def _extract_aweme_id(url_or_id: str) -> str | None:
    """从URL或字符串中提取 aweme_id。"""
    # 纯数字直接返回
    if _PURE_NUMBER_PATTERN.match(url_or_id.strip()):
        return url_or_id.strip()

    match = _AWEME_ID_PATTERN.search(url_or_id)
    return match.group(1) if match else None


def _extract_share_input(value: str) -> tuple[str, str]:
    """Return (original_text, normalized_url_or_id) from a pasted share.

    The UI/API accepts the exact text copied from Douyin's ``保存链接`` action,
    e.g. ``4.10 ... https://v.douyin.com/xxx/ 复制此链接...``.  Keep the
    original for diagnostics while passing only the URL to redirect handling.
    """
    original = str(value or "").strip()
    if not original:
        return original, ""
    direct = original.strip().strip("<>[]()")
    if _PURE_NUMBER_PATTERN.match(direct):
        return original, direct
    match = _SHARE_URL_PATTERN.search(original)
    if not match:
        # A bare aweme id embedded in a copied paragraph is also unambiguous.
        embedded_id = _EMBEDDED_ID_PATTERN.search(original)
        return original, embedded_id.group(1) if embedded_id else direct
    candidate = match.group(0).rstrip(_TRAILING_SHARE_PUNCTUATION)
    if not candidate.lower().startswith(("http://", "https://")):
        candidate = "https://" + candidate
    return original, candidate


async def resolve_share_url(share_url: str) -> str:
    """解析分享链接，提取 aweme_id。

    Args:
        share_url: 抖音链接（短链/长链/纯ID均可）

    Returns:
        aweme_id 字符串

    Raises:
        ValueError: 无法从URL中解析出aweme_id
    """
    original_input, share_url = _extract_share_input(share_url)
    if not share_url:
        raise ValueError("未找到抖音分享链接。请粘贴抖音‘保存链接’复制的完整文本或链接。")

    # 1. 先尝试从原始输入直接提取（长链接或纯ID）
    direct_id = _extract_aweme_id(share_url)
    if direct_id:
        logger.info(f"直接提取: aweme_id={direct_id}")
        return direct_id

    # 2. 短链接：跟踪302重定向
    headers = {"User-Agent": DOUYIN_FIXED_USER_AGENT}

    async with httpx.AsyncClient(
        follow_redirects=False,
        timeout=15,
    ) as client:
        final_url = share_url
        for _ in range(6):
            parsed = urlparse(final_url)
            if parsed.scheme != "https" or parsed.hostname not in {"v.douyin.com", "www.douyin.com", "douyin.com", "m.douyin.com", "www.iesdouyin.com"} or parsed.port not in {None, 443} or parsed.username or parsed.password:
                raise ValueError("分享链接重定向到不允许的地址")
            response = await client.get(final_url, headers=headers)
            if not response.is_redirect:
                response.raise_for_status()
                break
            final_url = urljoin(final_url, response.headers.get("location", ""))
        else:
            raise ValueError("分享链接重定向次数过多")

    logger.info(f"分享链接重定向: {share_url} → {final_url[:80]}...")

    # 3. 从最终URL提取
    redirected_id = _extract_aweme_id(final_url)
    if redirected_id:
        logger.info(f"重定向后提取: aweme_id={redirected_id}")
        return redirected_id

    # 4. 无法提取 — 判断是否为过期链接
    if final_url.rstrip("/") in ("https://www.douyin.com", "https://m.douyin.com"):
        raise ValueError(
            "分享链接可能已过期（被重定向到首页）。"
            "请获取新的分享链接或直接提供视频ID。"
        )

    raise ValueError(
        f"无法从URL中解析aweme_id。\n"
            f"原始链接: {original_input}\n"
        f"最终URL: {final_url}\n"
        f"支持的格式: https://v.douyin.com/xxx, "
        f"https://www.douyin.com/video/数字, 或纯数字ID"
    )

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from datetime import datetime
from typing import Any, Dict, Optional, Tuple
from urllib.parse import quote

import httpx

from ..config import settings

logger = logging.getLogger(__name__)

# Refresh margin: refresh the token before it actually expires to avoid
# edge-of-window 401s. Aliyun NLS tokens issued by CreateToken are valid for
# 72 hours; a 5-minute margin is plenty for long-running services.
_TOKEN_REFRESH_MARGIN_SECONDS = 300

# Aliyun NLS endpoints are public internet services. We disable
# httpx's trust_env so it does NOT route Aliyun calls through a local
# system proxy (e.g. macOS HTTPProxy/HTTPSProxy picked up via
# urllib.getproxies()), which can hang and cause intermittent
# ConnectTimeouts. Connect directly instead.
_ALIYUN_CLIENT_KWARGS = {"timeout": 30, "trust_env": False}

_token_cache: Dict[str, Any] = {"token": None, "expire_time": 0}
_token_lock: Optional[asyncio.Lock] = None


def _get_token_lock() -> asyncio.Lock:
    """Return a process-wide asyncio.Lock, creating it lazily.

    Created lazily because asyncio.Lock() must be instantiated inside a
    running event loop on some Python/asyncio versions.
    """
    global _token_lock
    if _token_lock is None:
        _token_lock = asyncio.Lock()
    return _token_lock


def _percent_encode(value: str) -> str:
    return quote(str(value), safe="~")


def _sign_aliyun_params(params: Dict[str, str], access_key_secret: str) -> str:
    sorted_items = sorted(params.items(), key=lambda item: item[0])
    canonicalized = "&".join(
        f"{_percent_encode(k)}={_percent_encode(v)}" for k, v in sorted_items
    )
    string_to_sign = f"GET&{_percent_encode('/')}&{_percent_encode(canonicalized)}"
    key = f"{access_key_secret}&"
    signature = hmac.new(
        key.encode("utf-8"),
        string_to_sign.encode("utf-8"),
        hashlib.sha1,
    ).digest()
    return base64.b64encode(signature).decode("utf-8")


async def _fetch_token_from_access_key() -> Tuple[str, int]:
    """Fetch a fresh Aliyun NLS Access Token via the CreateToken RPC API.

    Implements the official long-term usage pattern: sign a CreateToken request
    with the AccessKey pair (HMAC-SHA1 RPC signature), call the NLS Meta
    endpoint, and return ``(token, expire_time)``.

    Reference: https://help.aliyun.com/zh/isi/getting-started/obtain-an-access-token
    """
    if not settings.ALIYUN_ACCESS_KEY_ID or not settings.ALIYUN_ACCESS_KEY_SECRET:
        raise RuntimeError(
            "Aliyun AccessKey 未配置：需要 ALIYUN_ACCESS_KEY_ID + "
            "ALIYUN_ACCESS_KEY_SECRET 才能动态签发 NLS Access Token"
        )

    region = settings.ALIYUN_NLS_REGION or "cn-shanghai"
    params = {
        "Action": "CreateToken",
        "Version": "2019-02-28",
        "Format": "JSON",
        "RegionId": region,
        "AccessKeyId": settings.ALIYUN_ACCESS_KEY_ID,
        "SignatureMethod": "HMAC-SHA1",
        "SignatureVersion": "1.0",
        "SignatureNonce": str(uuid.uuid4()),
        "Timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    params["Signature"] = _sign_aliyun_params(
        params, settings.ALIYUN_ACCESS_KEY_SECRET
    )
    token_url = f"https://nls-meta.{region}.aliyuncs.com/"
    async with httpx.AsyncClient(timeout=10, trust_env=False) as client:
        resp = await client.get(token_url, params=params)
        resp.raise_for_status()
        data = resp.json()
    token = data.get("Token", {}).get("Id")
    expire_time = int(data.get("Token", {}).get("ExpireTime", 0))
    if not token:
        raise RuntimeError(f"获取 Aliyun Token 失败：{data!r}")
    return token, expire_time


def _is_token_valid(now: int) -> bool:
    cached = _token_cache.get("token")
    if not cached:
        return False
    return _token_cache.get("expire_time", 0) - _TOKEN_REFRESH_MARGIN_SECONDS > now


async def _get_aliyun_token(force_refresh: bool = False) -> str:
    """Return a valid Aliyun NLS Access Token, refreshing it when needed.

    Long-term usage follows the Aliyun ISI recommendation: the Access Token is
    obtained and refreshed dynamically from the AccessKey via CreateToken,
    cached in-memory, and refreshed before its expiry window closes. A static
    ``ALIYUN_NLS_TOKEN`` is only used as a manual fallback when no AccessKey
    is configured; in that mode the caller is responsible for rotating it.

    Args:
        force_refresh: bypass the cache and fetch a fresh token. Used when the
            ASR endpoint reports the cached token is invalid (ACCESS_DENIED),
            so the next request retries with a brand-new token.
    """
    now = int(time.time())

    # Manual fallback mode: no AccessKey configured. Use the static token as-is
    # but never trust it blindly on a forced refresh — there is nothing to
    # refresh from, so we just re-return it (the caller will surface the 401).
    if not settings.ALIYUN_ACCESS_KEY_ID or not settings.ALIYUN_ACCESS_KEY_SECRET:
        if not settings.ALIYUN_NLS_TOKEN:
            raise RuntimeError(
                "Aliyun NLS 未配置：请配置 AccessKey（推荐，支持自动刷新）或 "
                "手动配置 ALIYUN_NLS_TOKEN（不自动刷新）"
            )
        if force_refresh:
            logger.warning(
                "ALIYUN_NLS_TOKEN 为静态手动配置，无法自动刷新；"
                "ASR 报告 token 无效时将原样重试，建议改用 AccessKey 动态签发。"
            )
        return settings.ALIYUN_NLS_TOKEN

    # Fast path: cached token is still within the safe window.
    if not force_refresh and _is_token_valid(now):
        return _token_cache["token"]

    # Slow path: fetch (or refresh) under a lock to avoid thundering herd when
    # many requests hit the expiry boundary at the same time.
    async with _get_token_lock():
        now = int(time.time())
        if not force_refresh and _is_token_valid(now):
            return _token_cache["token"]
        token, expire_time = await _fetch_token_from_access_key()
        _token_cache["token"] = token
        _token_cache["expire_time"] = expire_time or (now + 3600)
        ttl = _token_cache["expire_time"] - now
        logger.info(
            "Aliyun NLS Access Token 已刷新，有效期约 %ds（到期前 %ds 自动刷新）",
            ttl, _TOKEN_REFRESH_MARGIN_SECONDS,
        )
        return token


def _is_access_denied_message(message: str) -> bool:
    if not message:
        return False
    msg = str(message).lower()
    return "access_denied" in msg or "token" in msg and "invalid" in msg

def _guess_format(filename: Optional[str], content_type: Optional[str]) -> str:
    if filename:
        ext = os.path.splitext(filename)[1].lstrip(".").lower()
        if ext in {"wav", "pcm", "mp3", "ogg"}:
            return ext
    if content_type:
        if "wav" in content_type:
            return "wav"
        if "pcm" in content_type:
            return "pcm"
        if "mpeg" in content_type or "mp3" in content_type:
            return "mp3"
        if "ogg" in content_type or "opus" in content_type:
            return "ogg"
    return "ogg"


def _default_sample_rate(fmt: str) -> int:
    if fmt == "ogg":
        return 48000
    if fmt in {"wav", "pcm"}:
        return 16000
    return settings.ALIYUN_NLS_SAMPLE_RATE or 16000


async def _call_aliyun_asr(
    client: httpx.AsyncClient, url: str, params: Dict[str, str], token: str,
    audio_bytes: bytes,
) -> httpx.Response:
    headers = {"X-NLS-Token": token, "Content-Type": "application/octet-stream"}
    return await client.post(
        url, params=params, content=audio_bytes, headers=headers
    )


async def transcribe_aliyun(
    audio_bytes: bytes, filename: Optional[str], content_type: Optional[str]
) -> str:
    if not settings.ALIYUN_NLS_APPKEY:
        raise RuntimeError("Aliyun NLS AppKey 未配置")
    token = await _get_aliyun_token()
    fmt = _guess_format(filename, content_type)
    sample_rate = settings.ALIYUN_NLS_SAMPLE_RATE or _default_sample_rate(fmt)
    endpoint = settings.ALIYUN_NLS_ENDPOINT.rstrip("/")
    url = f"{endpoint}/stream/v1/asr"
    params = {
        "appkey": settings.ALIYUN_NLS_APPKEY,
        "format": fmt,
        "sample_rate": str(sample_rate),
        "enable_punctuation_prediction": "true",
        "enable_inverse_text_normalization": "true",
    }
    async with httpx.AsyncClient(timeout=30, trust_env=False) as client:
        resp = await _call_aliyun_asr(client, url, params, token, audio_bytes)
        # Aliyun returns HTTP 400 with an ACCESS_DENIED body when the token is
        # expired/invalid. Force-refresh once and retry before surfacing the
        # error, so long-running services self-heal after a token rotation.
        if resp.status_code == 400:
            try:
                body = resp.json()
            except Exception:
                body = {}
            if _is_access_denied_message(body.get("message")):
                logger.warning(
                    "Aliyun ASR 报告 token 无效，强制刷新后重试一次: %s",
                    body.get("message"),
                )
                token = await _get_aliyun_token(force_refresh=True)
                resp = await _call_aliyun_asr(client, url, params, token, audio_bytes)
        resp.raise_for_status()
        data = resp.json()
    if data.get("status") != 20000000:
        raise RuntimeError(data.get("message", "语音识别失败"))
    return data.get("result", "").strip()


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(value)
        return dt.replace(tzinfo=None)
    except ValueError:
        return None


def _extract_json_block(text: str) -> Dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return {}
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return {}


async def extract_task_with_glm(transcript: str) -> Dict[str, Any]:
    if not settings.GLM_API_KEY:
        raise RuntimeError("GLM API Key 未配置")
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    system_prompt = (
        "你是任务解析助手。请将用户语音解析成 JSON。"
        "只输出 JSON，不要输出其他内容。"
        "必须包含 action 字段："
        "create | update_status | complete | cancel | start。"
        "当用户说完成/已完成/搞定/结束时，选择 complete。"
        "当用户说取消/不做/作废时，选择 cancel。"
        "当用户说开始/进行中时，选择 start。"
        "当用户说修改状态为待办/进行中/已完成/已取消时，选择 update_status。"
        "否则使用 create。"
        "若 action 不是 create，必须提供 target_title（任务标题关键词）或 target_id。"
        "若 action 是 create，请提供以下字段："
        "title(必填，简短), description(可选), start_date(ISO8601或null), "
        "due_date(ISO8601或null), priority(high|medium|low), "
        "status(todo|in_progress|done|cancelled), "
        "is_recurring(true|false), recurring_rule(daily|weekly|monthly|null), "
        "remind_before(分钟整数或null)。"
        f"当前时间：{now}。如果语音里没有日期时间，请返回 null。"
    )
    payload = {
        "model": settings.GLM_MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": transcript},
        ],
    }
    api_base = settings.GLM_API_BASE.rstrip("/")
    url = f"{api_base}/chat/completions"
    headers = {"Authorization": f"Bearer {settings.GLM_API_KEY}"}
    # Bypass local system proxy (same rationale as Aliyun clients).
    async with httpx.AsyncClient(timeout=30, trust_env=False) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
    content = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )
    result = _extract_json_block(content)
    title = result.get("title") or transcript.strip()
    result["title"] = title
    return result


def normalize_task_payload(raw: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
    allowed_priorities = {"low", "medium", "high"}
    allowed_status = {"todo", "in_progress", "done", "cancelled"}
    payload = {
        "title": raw.get("title", "").strip() or "未命名任务",
        "description": raw.get("description"),
        "start_date": _parse_iso_datetime(raw.get("start_date")),
        "due_date": _parse_iso_datetime(raw.get("due_date")),
        "priority": raw.get("priority", "medium"),
        "status": raw.get("status", "todo"),
        "is_recurring": bool(raw.get("is_recurring", False)),
        "recurring_rule": raw.get("recurring_rule"),
        "remind_before": raw.get("remind_before"),
        "category_id": raw.get("category_id"),
        "role_id": raw.get("role_id"),
    }
    if payload["priority"] not in allowed_priorities:
        payload["priority"] = "medium"
    if payload["status"] not in allowed_status:
        payload["status"] = "todo"
    if payload["recurring_rule"] not in {"daily", "weekly", "monthly"}:
        payload["recurring_rule"] = None
    return payload, payload["title"]

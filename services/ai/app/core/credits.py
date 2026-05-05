# app/core/credits.py — atomic AI credit metering via Redis INCR
import redis.asyncio as aioredis
from app.core.config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def consume_credits(workspace_id: str, cost: int) -> bool:
    """
    Atomically increments the used-credit counter.
    Returns False if the workspace has exceeded its quota (caller should return 402).
    Quota enforcement is a soft check via Redis; PostgreSQL is the source of truth.
    """
    r = await get_redis()
    key = f"ai_credits:{workspace_id}:used"

    # Lua script: increment only if result <= quota
    lua = """
    local quota = tonumber(redis.call('GET', KEYS[2]) or '100')
    local current = tonumber(redis.call('GET', KEYS[1]) or '0')
    if current + tonumber(ARGV[1]) > quota then
        return 0
    end
    redis.call('INCRBY', KEYS[1], ARGV[1])
    return 1
    """
    quota_key = f"ai_credits:{workspace_id}:quota"
    result = await r.eval(lua, 2, key, quota_key, cost)
    return bool(result)


async def rollback_credits(workspace_id: str, cost: int) -> None:
    """Roll back credits if the AI provider call failed."""
    r = await get_redis()
    key = f"ai_credits:{workspace_id}:used"
    await r.decrby(key, cost)

"""
Unit tests for Redis-backed credit metering.

Covers:
- Credit key format and per-month isolation
- INCRBY mechanics via fakeredis
- Lua script: quota enforcement (returns -1 when exceeded)
- Rollback (decrby) on server error
- CREDIT_COSTS dictionary values in CreditMeterMiddleware
- consume_credits() / rollback_credits() in app.core.credits
- CreditMeterMiddleware._get_cost() path matching
"""
import pytest
import fakeredis.aioredis
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def fake_redis():
    """In-memory Redis replacement — no real Redis required."""
    return fakeredis.aioredis.FakeRedis(decode_responses=True)


# ---------------------------------------------------------------------------
# Low-level Redis mechanics
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_credit_deduction_increments(fake_redis):
    """INCRBY accumulates correctly across two calls."""
    key = "ai_credits:ws-123:2026-05"
    await fake_redis.set(key, 0)

    assert await fake_redis.incrby(key, 5) == 5
    assert await fake_redis.incrby(key, 3) == 8


@pytest.mark.asyncio
async def test_credit_deduction_starts_from_zero(fake_redis):
    """Key starts at 0 when not pre-set; INCRBY creates it."""
    key = "ai_credits:ws-new:2026-05"
    result = await fake_redis.incrby(key, 10)
    assert result == 10


@pytest.mark.asyncio
async def test_credit_monthly_reset_key_format(fake_redis):
    """Credit key embeds workspace_id and YYYY-MM month."""
    month = date.today().strftime("%Y-%m")
    key = f"ai_credits:ws-789:{month}"

    await fake_redis.set(key, 500)
    value = await fake_redis.get(key)
    assert int(value) == 500


@pytest.mark.asyncio
async def test_credit_keys_are_per_workspace(fake_redis):
    """Different workspace IDs use independent keys."""
    await fake_redis.set("ai_credits:ws-A:2026-05", 100)
    await fake_redis.set("ai_credits:ws-B:2026-05", 200)

    assert int(await fake_redis.get("ai_credits:ws-A:2026-05")) == 100
    assert int(await fake_redis.get("ai_credits:ws-B:2026-05")) == 200


@pytest.mark.asyncio
async def test_credit_keys_are_per_month(fake_redis):
    """Different months use independent keys for the same workspace."""
    await fake_redis.set("ai_credits:ws-X:2026-04", 300)
    await fake_redis.set("ai_credits:ws-X:2026-05", 50)

    assert int(await fake_redis.get("ai_credits:ws-X:2026-04")) == 300
    assert int(await fake_redis.get("ai_credits:ws-X:2026-05")) == 50


# ---------------------------------------------------------------------------
# Lua script: atomic check-and-increment (mirrors credit_meter.py)
# ---------------------------------------------------------------------------

_LUA_DECREMENT = """
local key   = KEYS[1]
local limit = tonumber(ARGV[1])
local cost  = tonumber(ARGV[2])
local used  = tonumber(redis.call('GET', key) or '0')
if used + cost > limit then
    return -1
end
return redis.call('INCRBY', key, cost)
"""


@pytest.mark.asyncio
async def test_lua_allows_usage_within_limit(fake_redis):
    key = "ai_credits:ws-lua:2026-05"
    await fake_redis.set(key, 0)

    result = await fake_redis.eval(_LUA_DECREMENT, 1, key, 1000, 5)
    assert result == 5


@pytest.mark.asyncio
async def test_lua_rejects_when_limit_exceeded(fake_redis):
    """Lua must return -1 when cost would breach the limit."""
    key = "ai_credits:ws-limit:2026-05"
    await fake_redis.set(key, 998)

    result = await fake_redis.eval(_LUA_DECREMENT, 1, key, 1000, 5)
    assert result == -1


@pytest.mark.asyncio
async def test_lua_allows_exact_limit_boundary(fake_redis):
    """A cost that exactly reaches the limit should succeed."""
    key = "ai_credits:ws-boundary:2026-05"
    await fake_redis.set(key, 995)

    result = await fake_redis.eval(_LUA_DECREMENT, 1, key, 1000, 5)
    assert result == 1000


@pytest.mark.asyncio
async def test_lua_one_over_boundary_is_rejected(fake_redis):
    """used=996, cost=5 → 1001 > 1000 → return -1."""
    key = "ai_credits:ws-over:2026-05"
    await fake_redis.set(key, 996)

    result = await fake_redis.eval(_LUA_DECREMENT, 1, key, 1000, 5)
    assert result == -1


@pytest.mark.asyncio
async def test_lua_missing_key_treated_as_zero(fake_redis):
    """When key doesn't exist the Lua script must treat it as 0."""
    key = "ai_credits:ws-missing:2026-05"
    # Key intentionally not set
    result = await fake_redis.eval(_LUA_DECREMENT, 1, key, 1000, 3)
    assert result == 3


# ---------------------------------------------------------------------------
# Rollback on server error
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_rollback_decrements_key(fake_redis):
    key = "ai_credits:ws-rollback:2026-05"
    await fake_redis.set(key, 10)

    await fake_redis.decrby(key, 5)
    assert int(await fake_redis.get(key)) == 5


# ---------------------------------------------------------------------------
# CREDIT_COSTS constants
# ---------------------------------------------------------------------------

def test_credit_costs_defined():
    from app.middleware.credit_meter import CREDIT_COSTS
    assert CREDIT_COSTS["/ai/chat"] == 5
    assert CREDIT_COSTS["/ai/summarize"] == 3
    assert CREDIT_COSTS["/ai/score-deal"] == 10
    assert CREDIT_COSTS["/ai/task/generate"] == 3
    assert CREDIT_COSTS["/ai/document/generate"] == 5
    assert CREDIT_COSTS["/ai/automation/generate"] == 3


def test_credit_costs_all_positive():
    from app.middleware.credit_meter import CREDIT_COSTS
    for path, cost in CREDIT_COSTS.items():
        assert cost > 0, f"Cost for {path} must be positive"


def test_credit_costs_are_integers():
    from app.middleware.credit_meter import CREDIT_COSTS
    for path, cost in CREDIT_COSTS.items():
        assert isinstance(cost, int), f"Cost for {path} must be an int"


# ---------------------------------------------------------------------------
# CreditMeterMiddleware._get_cost() path prefix matching
# ---------------------------------------------------------------------------

def test_get_cost_exact_match():
    from app.middleware.credit_meter import CreditMeterMiddleware
    mw = CreditMeterMiddleware.__new__(CreditMeterMiddleware)
    assert mw._get_cost("/ai/chat") == 5


def test_get_cost_path_with_subpath():
    from app.middleware.credit_meter import CreditMeterMiddleware
    mw = CreditMeterMiddleware.__new__(CreditMeterMiddleware)
    assert mw._get_cost("/ai/task/generate-description") == 3


def test_get_cost_unknown_path_returns_zero():
    from app.middleware.credit_meter import CreditMeterMiddleware
    mw = CreditMeterMiddleware.__new__(CreditMeterMiddleware)
    assert mw._get_cost("/health") == 0


def test_get_cost_root_path_returns_zero():
    from app.middleware.credit_meter import CreditMeterMiddleware
    mw = CreditMeterMiddleware.__new__(CreditMeterMiddleware)
    assert mw._get_cost("/") == 0


def test_get_cost_metrics_returns_zero():
    from app.middleware.credit_meter import CreditMeterMiddleware
    mw = CreditMeterMiddleware.__new__(CreditMeterMiddleware)
    assert mw._get_cost("/metrics") == 0


# ---------------------------------------------------------------------------
# app.core.credits — consume_credits / rollback_credits
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_consume_credits_returns_true_within_quota(fake_redis):
    """consume_credits returns True when quota is not exceeded."""
    from app.core import credits as credits_module

    # Set current usage and quota
    await fake_redis.set("ai_credits:ws-consume:used", 0)
    await fake_redis.set("ai_credits:ws-consume:quota", 100)

    with patch.object(credits_module, "get_redis", return_value=fake_redis):
        result = await credits_module.consume_credits("ws-consume", 5)

    assert result is True


@pytest.mark.asyncio
async def test_consume_credits_returns_false_over_quota(fake_redis):
    """consume_credits returns False when usage would exceed quota."""
    from app.core import credits as credits_module

    await fake_redis.set("ai_credits:ws-over:used", 99)
    await fake_redis.set("ai_credits:ws-over:quota", 100)

    with patch.object(credits_module, "get_redis", return_value=fake_redis):
        result = await credits_module.consume_credits("ws-over", 5)

    assert result is False


@pytest.mark.asyncio
async def test_rollback_credits_decrements(fake_redis):
    """rollback_credits correctly decrements the used counter."""
    from app.core import credits as credits_module

    await fake_redis.set("ai_credits:ws-rb:used", 20)

    with patch.object(credits_module, "get_redis", return_value=fake_redis):
        await credits_module.rollback_credits("ws-rb", 5)

    value = int(await fake_redis.get("ai_credits:ws-rb:used"))
    assert value == 15

"""
AI credit metering FastAPI middleware.
Each AI endpoint costs a configurable number of credits.
Uses Redis Lua script for atomic check-and-decrement.
"""
from datetime import date
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import redis.asyncio as aioredis

# Credit costs per endpoint path prefix
CREDIT_COSTS: dict[str, int] = {
    '/ai/chat':               5,
    '/ai/summarize':          3,
    '/ai/score-deal':        10,
    '/ai/task/generate':      3,
    '/ai/document/generate':  5,
    '/ai/automation/generate': 3,
}

MONTHLY_LIMIT_DEFAULT = 1000

# Lua: atomic check + decrement
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


class CreditMeterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_client: aioredis.Redis | None = None):
        super().__init__(app)
        self.redis = redis_client

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if self.redis is None:
            return await call_next(request)

        path = request.url.path
        cost = self._get_cost(path)

        if cost == 0:
            return await call_next(request)

        workspace_id = getattr(request.state, 'workspace_id', None)
        if not workspace_id:
            return await call_next(request)

        # Monthly key (resets each month)
        month = date.today().strftime('%Y-%m')
        key = f'ai_credits:{workspace_id}:{month}'

        # Get workspace limit (default 1000 — override per plan in workspace metadata)
        limit = MONTHLY_LIMIT_DEFAULT

        result = await self.redis.eval(_LUA_DECREMENT, 1, key, limit, cost)

        if result == -1:
            return JSONResponse(
                status_code=429,
                content={'error': {'code': 'AI_QUOTA_EXCEEDED', 'message': 'Monthly AI credit limit reached.'}},
            )

        # Set TTL to end of month (approx 32 days)
        await self.redis.expire(key, 32 * 86400)

        response = await call_next(request)

        # Rollback credits on server error
        if response.status_code >= 500:
            await self.redis.decrby(key, cost)

        return response

    def _get_cost(self, path: str) -> int:
        for prefix, cost in CREDIT_COSTS.items():
            if path.startswith(prefix):
                return cost
        return 0

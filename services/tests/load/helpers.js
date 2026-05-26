import http from 'k6/http';
import { check, fail } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export function login(email, password) {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email, password,
  }), { headers: { 'Content-Type': 'application/json' } });

  check(res, {
    'login status 200': (r) => r.status === 200,
    'login has token':  (r) => r.json('data.token') !== undefined,
  });

  if (res.status !== 200) {
    fail(`Login failed: ${res.status} ${res.body}`);
  }

  return {
    token: res.json('data.token'),
    workspaceId: res.json('data.workspace.id'),
  };
}

export function authedHeaders(token) {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export function workspaceId(token) {
  const res = http.get(`${BASE_URL}/api/workspaces`, {
    headers: authedHeaders(token),
  });

  if (res.status === 405) {
    fail('/api/workspaces does not support GET — use workspaceId from login response instead');
  }

  check(res, { 'workspaces status 200': (r) => r.status === 200 });

  if (res.status !== 200 || !res.json('data')?.[0]?.id) {
    fail(`Could not resolve workspace ID: ${res.status} ${res.body}`);
  }

  return res.json('data')[0].id;
}

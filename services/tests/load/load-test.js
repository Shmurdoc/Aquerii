import http from 'k6/http';
import { check, sleep } from 'k6';
import { authedHeaders } from './helpers.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Pre-supplied auth (CI sets AUTH_TOKEN/WS_ID via env). Each VU gets its own
// runtime in k6, so module-level let doesn't share state across VUs — and
// per-VU login would exceed the production throttle:5,1 on /api/auth/login.
const token = __ENV.AUTH_TOKEN;
const wsId  = __ENV.WS_ID;
if (!token || !wsId) {
  throw new Error('load-test.js requires AUTH_TOKEN and WS_ID env vars');
}
const headers = authedHeaders(token);

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 10 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed:   ['rate<0.01'],
  },
};

export default function () {

  // Browse boards
  let res = http.get(`${BASE_URL}/api/workspaces/${wsId}/boards`, { headers });
  check(res, { 'boards list': (r) => r.status === 200 });

  const boards = res.json('data');
  if (boards?.length > 0) {
    const boardId = boards[0].id;
    res = http.get(`${BASE_URL}/api/workspaces/${wsId}/boards/${boardId}`, { headers });
    check(res, { 'board detail': (r) => r.status === 200 });
  }

  // Browse documents
  res = http.get(`${BASE_URL}/api/workspaces/${wsId}/documents`, { headers });
  check(res, { 'documents list': (r) => r.status === 200 });

  const docs = res.json('data');
  if (docs?.length > 0) {
    res = http.get(`${BASE_URL}/api/workspaces/${wsId}/documents/${docs[0].id}`, { headers });
    check(res, { 'document detail': (r) => r.status === 200 });
  }

  // Browse CRM
  res = http.get(`${BASE_URL}/api/workspaces/${wsId}/crm/deals`, { headers });
  check(res, { 'crm deals': (r) => r.status === 200 });

  sleep(1);
}

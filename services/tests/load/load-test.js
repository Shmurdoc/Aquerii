import http from 'k6/http';
import { check, sleep } from 'k6';
import { login, authedHeaders, workspaceId } from './helpers.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Login once per VU and reuse the token. With ramping-vus going up to 10,
// per-iteration logins would flood /api/auth/login and trip 429s well before
// the test could measure actual API throughput.
let sharedAuth = null;

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
  if (!sharedAuth) {
    const auth = login('test@example.com', 'password123');
    sharedAuth = {
      token: auth.token,
      wsId: workspaceId(auth.token),
    };
  }
  const token = sharedAuth.token;
  const wsId = sharedAuth.wsId;
  const headers = authedHeaders(token);

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

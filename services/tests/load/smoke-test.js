import http from 'k6/http';
import { check, sleep } from 'k6';
import { login, authedHeaders, workspaceId } from './helpers.js';

export const options = {
  vus:       1,
  duration:  '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed:   ['rate<0.01'],
  },
};

export default function () {
  // Login once per VU and reuse the token. Per-iteration login would exceed
  // the production throttle:5,1 on /api/auth/login and trip 429s.
  if (!__ENV.__TOKEN__) {
    const auth = login('test@example.com', 'password123');
    __ENV.__TOKEN = auth.token;
    __ENV.__WS_ID = workspaceId(auth.token);
  }
  const token = __ENV.__TOKEN;
  const wsId = __ENV.__WS_ID;
  const headers = authedHeaders(token);

  // List boards
  let res = http.get(
    `${__ENV.BASE_URL || 'http://localhost:8000'}/api/workspaces/${wsId}/boards`,
    { headers },
  );
  check(res, { 'boards list status 200': (r) => r.status === 200 });

  // List documents
  res = http.get(
    `${__ENV.BASE_URL || 'http://localhost:8000'}/api/workspaces/${wsId}/documents`,
    { headers },
  );
  check(res, { 'documents list status 200': (r) => r.status === 200 });

  // List CRM deals
  res = http.get(
    `${__ENV.BASE_URL || 'http://localhost:8000'}/api/workspaces/${wsId}/crm/deals`,
    { headers },
  );
  check(res, { 'crm deals list status 200': (r) => r.status === 200 });

  // Health check
  res = http.get(`${__ENV.BASE_URL || 'http://localhost:8000'}/api/healthz`, { headers });
  check(res, { 'health status 200': (r) => r.status === 200 });

  sleep(1);
}

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
  const auth = login('test@example.com', 'password123');
  const { token, workspaceId: wsId } = auth;
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

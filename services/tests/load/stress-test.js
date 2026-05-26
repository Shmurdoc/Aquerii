import http from 'k6/http';
import { check, sleep } from 'k6';
import { login, authedHeaders, workspaceId } from './helpers.js';

export const options = {
  stages: [
    { duration: '2m', target: 20 },
    { duration: '5m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(90)<5000', 'p(99)<10000'],
    http_req_failed:   ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  const auth = login('test@example.com', 'password123');
  const { token, workspaceId: wsId } = auth;
  const headers = authedHeaders(token);

  http.get(`${BASE_URL}/api/workspaces/${wsId}/boards`, { headers });
  http.get(`${BASE_URL}/api/workspaces/${wsId}/documents`, { headers });
  http.get(`${BASE_URL}/api/workspaces/${wsId}/crm/deals`, { headers });

  sleep(1);
}

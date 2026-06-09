<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Client Portal - {{ $workspaceName }}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f3f4f6; color: #111827; line-height: 1.5; }
        .header { background: #1e40af; color: #fff; padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { font-size: 1.25rem; font-weight: 600; }
        .header .meta { font-size: 0.8rem; opacity: 0.8; }
        .container { max-width: 1200px; margin: 0 auto; padding: 1.5rem 2rem; }
        .card { background: #fff; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 1.5rem; }
        .card h2 { font-size: 1rem; font-weight: 600; color: #374151; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.75rem 0.5rem; border-bottom: 2px solid #e5e7eb; }
        td { padding: 0.75rem 0.5rem; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; }
        tr:hover td { background: #f9fafb; }
        .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
        .badge-compliant { background: #d1fae5; color: #065f46; }
        .badge-expiring { background: #fef3c7; color: #92400e; }
        .badge-noncompliant { background: #fee2e2; color: #991b1b; }
        .rate-bar { display: flex; align-items: center; gap: 0.5rem; }
        .rate-bar .bar { flex: 1; height: 0.5rem; background: #e5e7eb; border-radius: 9999px; overflow: hidden; }
        .rate-bar .bar .fill { height: 100%; border-radius: 9999px; transition: width 0.3s; }
        .fill-green { background: #10b981; }
        .fill-yellow { background: #f59e0b; }
        .fill-red { background: #ef4444; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .stat { text-align: center; padding: 1rem; }
        .stat .value { font-size: 2rem; font-weight: 700; }
        .stat .label { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.25rem; }
        .nav-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
        .nav-tabs button { padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 0.375rem; background: #fff; font-size: 0.875rem; cursor: pointer; color: #374151; }
        .nav-tabs button.active { background: #1e40af; color: #fff; border-color: #1e40af; }
        .nav-tabs button:hover:not(.active) { background: #f3f4f6; }
        .hidden { display: none; }
        .loading { text-align: center; padding: 3rem; color: #6b7280; }
        .error { background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 0.375rem; margin-bottom: 1rem; }
        @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } .header { flex-direction: column; align-items: flex-start; gap: 0.5rem; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>Client Portal</h1>
            <div class="meta">{{ $workspaceName }} &middot; Expires {{ $expiresAt }}</div>
        </div>
        <button onclick="window.print()" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:0.5rem 1rem;border-radius:0.375rem;cursor:pointer;font-size:0.875rem;">Export PDF</button>
    </div>

    <div class="container">
        <div class="nav-tabs">
            <button class="active" data-tab="contractors">Contractors</button>
            <button data-tab="heatmap" id="heatmap-tab-btn">Certificate Heatmap</button>
        </div>

        <div id="error-container" class="hidden"></div>

        <div id="loading-container" class="loading">Loading...</div>

        <div id="tab-contractors" class="tab-content">
            <div class="card">
                <h2>Contractor Compliance Summary</h2>
                <div id="contractor-summary-stats" class="grid-2" style="margin-bottom:1rem;"></div>
                <table>
                    <thead>
                        <tr>
                            <th>Company</th>
                            <th>Workers</th>
                            <th>Compliant</th>
                            <th>Compliance Rate</th>
                            <th>Equipment</th>
                            <th>Equip. Compliance</th>
                            <th>Expiring Certs</th>
                        </tr>
                    </thead>
                    <tbody id="contractor-table-body">
                        <tr><td colspan="7" class="loading">Loading...</td></tr>
                    </tbody>
                </table>
            </div>

            <div id="worker-drilldown" class="card hidden">
                <h2 id="worker-drilldown-title">Workers</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Badge ID</th>
                            <th>Status</th>
                            <th>Expiring Certs</th>
                        </tr>
                    </thead>
                    <tbody id="worker-table-body"></tbody>
                </table>
            </div>
        </div>

        <div id="tab-heatmap" class="tab-content hidden">
            <div class="card">
                <h2>Certificate Expiry Heatmap</h2>
                <div id="heatmap-container"></div>
            </div>
        </div>
    </div>

    <script>
        const TOKEN = @json($token);
        const BASE = '/api/workspaces';

        let workspaceId = null;

        function showError(msg) {
            const el = document.getElementById('error-container');
            el.textContent = msg;
            el.classList.remove('hidden');
        }

        async function api(path) {
            const url = BASE + path + '?token=' + encodeURIComponent(TOKEN);
            const res = await fetch(url);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Request failed');
            }
            return res.json();
        }

        async function findWorkspaceId() {
            const hash = 'sha256' in crypto ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(TOKEN)).then(b => Array.from(new Uint8Array(b)).map(b => b.toString(16).padStart(2,'0')).join('')) : '';
            const res = await fetch('/api/healthz');
            return null;
        }

        async function loadContractors() {
            try {
                const data = await api('/portal/contractors');
                const contractors = data.data || [];
                renderContractors(contractors);
            } catch (e) {
                showError('Failed to load contractors: ' + e.message);
            }
        }

        function renderContractors(contractors) {
            const tbody = document.getElementById('contractor-table-body');
            if (contractors.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#6b7280;">No contractors found</td></tr>';
                return;
            }

            const totalWorkers = contractors.reduce((s, c) => s + c.worker_count, 0);
            const totalCompliant = contractors.reduce((s, c) => s + c.compliant_count, 0);
            const overallRate = totalWorkers > 0 ? ((totalCompliant / totalWorkers) * 100).toFixed(1) : '0.0';
            const rateColor = overallRate >= 80 ? 'green' : overallRate >= 50 ? 'yellow' : 'red';

            document.getElementById('contractor-summary-stats').innerHTML = `
                <div class="stat"><div class="value">${contractors.length}</div><div class="label">Contractors</div></div>
                <div class="stat"><div class="value">${overallRate}%</div><div class="label">Overall Compliance</div></div>
            `;

            tbody.innerHTML = contractors.map(c => {
                const rateColor = c.compliance_rate >= 80 ? 'green' : c.compliance_rate >= 50 ? 'yellow' : 'red';
                const equipRateColor = c.equipment_compliance_rate >= 80 ? 'green' : c.equipment_compliance_rate >= 50 ? 'yellow' : 'red';
                return `<tr style="cursor:pointer;" onclick="loadWorkers('${c.company_id}','${c.company_name}')">
                    <td><strong>${c.company_name}</strong></td>
                    <td>${c.worker_count}</td>
                    <td>${c.compliant_count}</td>
                    <td class="rate-bar">
                        <div class="bar"><div class="fill fill-${rateColor}" style="width:${c.compliance_rate}%"></div></div>
                        ${c.compliance_rate}%
                    </td>
                    <td>${c.equipment_count}</td>
                    <td class="rate-bar">
                        <div class="bar"><div class="fill fill-${equipRateColor}" style="width:${c.equipment_compliance_rate}%"></div></div>
                        ${c.equipment_compliance_rate}%
                    </td>
                    <td>${c.expiring_certs_count > 0 ? `<span class="badge badge-expiring">${c.expiring_certs_count}</span>` : '0'}</td>
                </tr>`;
            }).join('');
        }

        async function loadWorkers(companyId, companyName) {
            const drilldown = document.getElementById('worker-drilldown');
            const tbody = document.getElementById('worker-table-body');
            document.getElementById('worker-drilldown-title').textContent = `Workers - ${companyName}`;
            tbody.innerHTML = '<tr><td colspan="4" class="loading">Loading...</td></tr>';
            drilldown.classList.remove('hidden');

            try {
                const data = await api(`/portal/contractors/${companyId}/workers`);
                const workers = data.data || [];
                if (workers.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#6b7280;">No workers found</td></tr>';
                    return;
                }
                tbody.innerHTML = workers.map(w => {
                    const badgeClass = w.compliance_status === 'compliant' ? 'badge-compliant' :
                        w.compliance_status === 'expiring_soon' ? 'badge-expiring' : 'badge-noncompliant';
                    const certs = (w.expiring_certs || []).map(c => `${c.name} (${c.expires_at})`).join('<br>') || 'None';
                    return `<tr>
                        <td>${w.name}</td>
                        <td>${w.badge_id || '—'}</td>
                        <td><span class="badge ${badgeClass}">${w.compliance_status}</span></td>
                        <td style="font-size:0.8rem;">${certs}</td>
                    </tr>`;
                }).join('');
            } catch (e) {
                tbody.innerHTML = `<tr><td colspan="4" style="color:#991b1b;">Error: ${e.message}</td></tr>`;
            }
        }

        async function loadHeatmap() {
            const container = document.getElementById('heatmap-container');
            try {
                const data = await api('/portal/heatmap');
                const contractors = data.data?.contractors || [];
                if (contractors.length === 0) {
                    container.innerHTML = '<p style="color:#6b7280;">No data available</p>';
                    return;
                }
                let html = '';
                contractors.forEach(c => {
                    html += `<div style="margin-bottom:1.5rem;">
                        <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem;">${c.company_name}</h3>
                        <table>
                            <thead><tr><th>Cert Type</th><th>Expiring 30d</th><th>Expiring 7d</th><th>Expired</th></tr></thead>
                            <tbody>
                                ${(c.cert_types || []).map(t => `
                                    <tr>
                                        <td>${t.type_name}</td>
                                        <td>${t.expiring_30d > 0 ? `<span class="badge badge-expiring">${t.expiring_30d}</span>` : t.expiring_30d}</td>
                                        <td>${t.expiring_7d > 0 ? `<span class="badge badge-expiring">${t.expiring_7d}</span>` : t.expiring_7d}</td>
                                        <td>${t.expired > 0 ? `<span class="badge badge-noncompliant">${t.expired}</span>` : t.expired}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4" style="color:#6b7280;">No cert types</td></tr>'}
                            </tbody>
                        </table>
                    </div>`;
                });
                container.innerHTML = html;
            } catch (e) {
                container.innerHTML = `<p style="color:#991b1b;">Error: ${e.message}</p>`;
            }
        }

        document.addEventListener('DOMContentLoaded', async () => {
            try {
                await loadContractors();
                document.getElementById('loading-container').classList.add('hidden');
            } catch (e) {
                document.getElementById('loading-container').classList.add('hidden');
                showError('Failed to load portal data. The link may be invalid or expired.');
            }

            document.querySelectorAll('.nav-tabs button').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.nav-tabs button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
                    document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
                    if (btn.dataset.tab === 'heatmap') loadHeatmap();
                });
            });
        });
    </script>
</body>
</html>

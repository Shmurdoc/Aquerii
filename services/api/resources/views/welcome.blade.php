<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ config('app.name') }}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { text-align: center; }
    h1 { font-size: 2.5rem; font-weight: 700; margin: 0 0 .5rem; background: linear-gradient(135deg, #818cf8, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    p { color: #94a3b8; font-size: 1.1rem; }
    .status { display: inline-block; margin-top: 2rem; padding: .5rem 1.5rem; border-radius: 999px; background: rgba(34,197,94,.15); color: #4ade80; font-size: .875rem; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <h1>{{ config('app.name') }}</h1>
    <p>FlowOS — Intelligent Workflow Platform</p>
    <div class="status">API Service &mdash; Operational</div>
  </div>
</body>
</html>
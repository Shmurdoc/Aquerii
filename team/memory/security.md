# Security Memory — Auth/CORS/JWT

## Patterns
- JWT for API authentication
- Refresh tokens with short expiry
- CORS whitelist specific origins
- Rate limit all endpoints

## Gotchas
- Never store JWT in localStorage — use httpOnly cookies
- Validate JWT signature AND expiry
- CORS preflight requests must return 200
- CSRF tokens required for form submissions

## Vulnerabilities to Watch
- SQL injection: always use parameterized queries
- XSS: sanitize all user input, use CSP headers
- SSRF: validate and whitelist URLs
- Path traversal: never use user input in file paths

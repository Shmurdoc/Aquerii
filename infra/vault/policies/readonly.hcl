# Read-only policy for services that only need secrets
path "secret/data/aquerii/*" {
  capabilities = ["read", "list"]
}

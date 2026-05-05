# Policy for the Laravel API service
path "secret/data/aquerii/*" {
  capabilities = ["read", "list"]
}

path "secret/data/aquerii/api/*" {
  capabilities = ["read", "list", "create", "update"]
}

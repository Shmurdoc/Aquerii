-- 00_roles.sql
-- Creates the two PostgreSQL roles used by the application.
-- aquerii_app   : all tenant queries — subject to RLS
-- aquerii_superadmin : super admin panel — bypasses RLS

CREATE ROLE aquerii_app WITH LOGIN PASSWORD 'secret_app_password';
CREATE ROLE aquerii_superadmin WITH LOGIN PASSWORD 'secret_superadmin_password';

-- Allow app role to use the public schema
GRANT USAGE ON SCHEMA public TO aquerii_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aquerii_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aquerii_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aquerii_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO aquerii_app;

-- Superadmin bypasses RLS — owns the superadmin schema
CREATE SCHEMA IF NOT EXISTS superadmin;
GRANT ALL ON SCHEMA superadmin TO aquerii_superadmin;
GRANT ALL ON SCHEMA public TO aquerii_superadmin;
ALTER ROLE aquerii_superadmin BYPASSRLS;

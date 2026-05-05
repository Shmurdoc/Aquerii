-- 02_triggers.sql
-- updated_at auto-stamp trigger applied to all tables that have the column.
-- Also: workspace storage quota maintenance trigger.

-- ════════════════════════════════════════════════════════════════
-- GENERIC updated_at trigger function
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply to every table that has updated_at
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'workspaces','users','workspace_members',
        'boards','board_columns','board_groups',
        'items','comments','documents','document_folders',
        'crm_contacts','crm_companies','crm_deals',
        'automations'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_set_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            tbl
        );
    END LOOP;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- WORKSPACE STORAGE QUOTA — update on file insert / delete
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_workspace_storage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE workspaces
        SET storage_used_bytes = storage_used_bytes + NEW.size_bytes
        WHERE id = NEW.workspace_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE workspaces
        SET storage_used_bytes = GREATEST(0, storage_used_bytes - OLD.size_bytes)
        WHERE id = OLD.workspace_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_storage_insert
AFTER INSERT ON files
FOR EACH ROW EXECUTE FUNCTION update_workspace_storage();

CREATE TRIGGER trg_storage_delete
AFTER DELETE ON files
FOR EACH ROW EXECUTE FUNCTION update_workspace_storage();

-- ════════════════════════════════════════════════════════════════
-- ITEMS version bump — auto-increment version on every update
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION bump_item_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_item_version
BEFORE UPDATE ON items
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION bump_item_version();

-- ════════════════════════════════════════════════════════════════
-- REALTIME EVENT sequence — monotonic per room
-- ════════════════════════════════════════════════════════════════
CREATE SEQUENCE IF NOT EXISTS realtime_event_seq START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION assign_realtime_sequence()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.sequence = nextval('realtime_event_seq');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_realtime_sequence
BEFORE INSERT ON realtime_events
FOR EACH ROW EXECUTE FUNCTION assign_realtime_sequence();

-- ════════════════════════════════════════════════════════════════
-- WORKSPACE MEMBER COUNT — keep seat_count in sync
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION sync_seat_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE workspaces
    SET seat_count = (
        SELECT COUNT(*) FROM workspace_members
        WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id)
          AND status = 'active'
    )
    WHERE id = COALESCE(NEW.workspace_id, OLD.workspace_id);
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_seat_count_change
AFTER INSERT OR UPDATE OR DELETE ON workspace_members
FOR EACH ROW EXECUTE FUNCTION sync_seat_count();

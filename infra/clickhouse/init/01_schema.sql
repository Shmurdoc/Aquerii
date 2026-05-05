-- ClickHouse schema for Aquerii analytics
CREATE DATABASE IF NOT EXISTS aquerii_analytics;

USE aquerii_analytics;

-- Main events table (time-series, partitioned by month)
CREATE TABLE IF NOT EXISTS events (
    workspace_id  UUID,
    event_type    LowCardinality(String),
    user_id       UUID,
    item_id       Nullable(UUID),
    board_id      Nullable(UUID),
    document_id   Nullable(UUID),
    deal_id       Nullable(UUID),
    status        Nullable(String),
    priority      Nullable(String),
    metadata      String DEFAULT '{}',
    occurred_at   DateTime64(3, 'UTC')
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (workspace_id, occurred_at, event_type)
SETTINGS index_granularity = 8192;

-- Board activity aggregation (materialized view)
CREATE TABLE IF NOT EXISTS board_activity_daily (
    workspace_id UUID,
    board_id     UUID,
    event_date   Date,
    event_type   LowCardinality(String),
    event_count  UInt64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (workspace_id, board_id, event_date, event_type);

CREATE MATERIALIZED VIEW IF NOT EXISTS board_activity_daily_mv
TO board_activity_daily
AS SELECT
    workspace_id,
    board_id,
    toDate(occurred_at) AS event_date,
    event_type,
    count()             AS event_count
FROM events
WHERE board_id IS NOT NULL
GROUP BY workspace_id, board_id, event_date, event_type;

-- Workspace usage summary
CREATE TABLE IF NOT EXISTS workspace_usage_monthly (
    workspace_id  UUID,
    year_month    UInt32,  -- YYYYMM
    total_events  UInt64,
    unique_users  UInt64,
    items_created UInt64,
    ai_calls      UInt64
) ENGINE = SummingMergeTree()
ORDER BY (workspace_id, year_month);

CREATE MATERIALIZED VIEW IF NOT EXISTS workspace_usage_monthly_mv
TO workspace_usage_monthly
AS SELECT
    workspace_id,
    toYYYYMM(occurred_at) AS year_month,
    count()               AS total_events,
    uniq(user_id)         AS unique_users,
    countIf(event_type = 'item.created') AS items_created,
    countIf(event_type LIKE 'ai.%')      AS ai_calls
FROM events
GROUP BY workspace_id, year_month;

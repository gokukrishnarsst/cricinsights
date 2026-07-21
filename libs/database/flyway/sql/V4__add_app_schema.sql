-- Application schema: query cache and chat session persistence.

CREATE SCHEMA IF NOT EXISTS app;

-- ---------------------------------------------------------------------------
-- query_cache: Fast Path / API response cache
-- ---------------------------------------------------------------------------
CREATE TABLE app.query_cache (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    query_hash TEXT NOT NULL,
    query_text TEXT NOT NULL,
    route_path TEXT,
    intent TEXT,
    result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    hit_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT uq_query_cache_hash UNIQUE (query_hash)
);

CREATE INDEX idx_query_cache_expires_at
    ON app.query_cache (expires_at)
    WHERE expires_at IS NOT NULL;

CREATE INDEX idx_query_cache_route_path
    ON app.query_cache (route_path)
    WHERE route_path IS NOT NULL;

CREATE INDEX idx_query_cache_intent
    ON app.query_cache (intent)
    WHERE intent IS NOT NULL;

CREATE INDEX idx_query_cache_created_at
    ON app.query_cache (created_at DESC);

CREATE INDEX idx_query_cache_result_json_gin
    ON app.query_cache USING gin (result_json);

-- ---------------------------------------------------------------------------
-- chat_sessions: conversational session metadata
-- ---------------------------------------------------------------------------
CREATE TABLE app.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    message_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_chat_sessions_user_id
    ON app.chat_sessions (user_id);

CREATE INDEX idx_chat_sessions_last_message_at
    ON app.chat_sessions (last_message_at DESC);

CREATE INDEX idx_chat_sessions_user_last_message
    ON app.chat_sessions (user_id, last_message_at DESC);

CREATE INDEX idx_chat_sessions_metadata_gin
    ON app.chat_sessions USING gin (metadata);

-- ---------------------------------------------------------------------------
-- chat_messages: individual messages within a session
-- ---------------------------------------------------------------------------
CREATE TABLE app.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    ui_manifest JSONB,
    route_path TEXT,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_chat_messages_session
        FOREIGN KEY (session_id) REFERENCES app.chat_sessions (id)
        ON DELETE CASCADE,
    CONSTRAINT chk_chat_messages_role
        CHECK (role IN ('user', 'assistant', 'system', 'tool'))
);

CREATE INDEX idx_chat_messages_session_id
    ON app.chat_messages (session_id);

CREATE INDEX idx_chat_messages_session_created_at
    ON app.chat_messages (session_id, created_at);

CREATE INDEX idx_chat_messages_created_at
    ON app.chat_messages (created_at DESC);

CREATE INDEX idx_chat_messages_role
    ON app.chat_messages (role);

CREATE INDEX idx_chat_messages_ui_manifest_gin
    ON app.chat_messages USING gin (ui_manifest)
    WHERE ui_manifest IS NOT NULL;

-- Sanity checks (read-only)
SELECT current_database() AS database, session_user AS db_user, version() AS engine;
SELECT now() AS introspected_at;

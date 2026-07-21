SELECT schemaname, relname, n_live_tup AS approx_row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

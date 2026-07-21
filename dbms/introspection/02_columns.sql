SELECT table_schema,
       table_name,
       column_name,
       ordinal_position,
       data_type,
       udt_name,
       character_maximum_length,
       is_nullable,
       column_default
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name, ordinal_position;

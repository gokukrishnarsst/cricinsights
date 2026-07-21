SELECT n.nspname AS schema,
       c.relname AS table_name,
       con.conname AS constraint_name,
       CASE con.contype
         WHEN 'p' THEN 'PRIMARY KEY'
         WHEN 'f' THEN 'FOREIGN KEY'
         WHEN 'u' THEN 'UNIQUE'
         WHEN 'c' THEN 'CHECK'
       END AS constraint_type,
       a.attname AS column_name
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN LATERAL unnest(con.conkey) AS colnum(attnum) ON con.contype IN ('p', 'u', 'f')
LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = colnum.attnum
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND con.contype IN ('p', 'f', 'u', 'c')
ORDER BY 1, 2, 3;

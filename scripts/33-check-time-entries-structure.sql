-- Check the current structure of time_entries table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'time_entries' 
ORDER BY ordinal_position;

-- Check current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- Check if we have 'name' or 'task_name' column
DO $$
DECLARE
    has_name_column boolean := false;
    has_task_name_column boolean := false;
BEGIN
    -- Check for 'name' column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'name'
    ) INTO has_name_column;
    
    -- Check for 'task_name' column  
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'task_name'
    ) INTO has_task_name_column;
    
    RAISE NOTICE 'Table structure check:';
    RAISE NOTICE 'Has name column: %', has_name_column;
    RAISE NOTICE 'Has task_name column: %', has_task_name_column;
    
    -- Fix the column structure based on what exists
    IF has_name_column AND NOT has_task_name_column THEN
        RAISE NOTICE 'Renaming name column to task_name...';
        ALTER TABLE tasks RENAME COLUMN name TO task_name;
    ELSIF has_name_column AND has_task_name_column THEN
        RAISE NOTICE 'Both columns exist, dropping name column...';
        -- Copy data from name to task_name if task_name is empty
        UPDATE tasks SET task_name = name WHERE task_name IS NULL OR task_name = '';
        ALTER TABLE tasks DROP COLUMN name;
    ELSIF NOT has_name_column AND NOT has_task_name_column THEN
        RAISE NOTICE 'Adding task_name column...';
        ALTER TABLE tasks ADD COLUMN task_name VARCHAR(255) NOT NULL DEFAULT 'Untitled Task';
    END IF;
    
    -- Ensure we have task_description column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'task_description'
    ) THEN
        RAISE NOTICE 'Adding task_description column...';
        ALTER TABLE tasks ADD COLUMN task_description TEXT;
        -- Copy from description if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name = 'description'
        ) THEN
            UPDATE tasks SET task_description = description;
        END IF;
    END IF;
END $$;

-- Show final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

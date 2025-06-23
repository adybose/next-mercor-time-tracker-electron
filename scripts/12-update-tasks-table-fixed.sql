-- Update tasks table to include new fields
DO $$
DECLARE
    has_name_column boolean := false;
    has_description_column boolean := false;
    has_task_name_column boolean := false;
    has_task_description_column boolean := false;
BEGIN
    -- Check what columns currently exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'name'
    ) INTO has_name_column;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'description'
    ) INTO has_description_column;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'task_name'
    ) INTO has_task_name_column;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'task_description'
    ) INTO has_task_description_column;
    
    RAISE NOTICE 'Current columns - name: %, description: %, task_name: %, task_description: %', 
        has_name_column, has_description_column, has_task_name_column, has_task_description_column;
    
    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'employee_id') THEN
        ALTER TABLE tasks ADD COLUMN employee_id UUID REFERENCES employees(id);
        RAISE NOTICE 'Added employee_id column';
    END IF;
    
    IF NOT has_task_name_column THEN
        ALTER TABLE tasks ADD COLUMN task_name TEXT;
        RAISE NOTICE 'Added task_name column';
    END IF;
    
    IF NOT has_task_description_column THEN
        ALTER TABLE tasks ADD COLUMN task_description TEXT;
        RAISE NOTICE 'Added task_description column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'status') THEN
        ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'In Progress', 'Completed'));
        RAISE NOTICE 'Added status column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'time_spent') THEN
        ALTER TABLE tasks ADD COLUMN time_spent INTEGER DEFAULT 0;
        RAISE NOTICE 'Added time_spent column';
    END IF;
    
    -- Copy data from old columns to new columns if they exist
    IF has_name_column AND has_task_name_column THEN
        UPDATE tasks SET task_name = name WHERE task_name IS NULL AND name IS NOT NULL;
        RAISE NOTICE 'Copied data from name to task_name';
    END IF;
    
    IF has_description_column AND has_task_description_column THEN
        UPDATE tasks SET task_description = description WHERE task_description IS NULL AND description IS NOT NULL;
        RAISE NOTICE 'Copied data from description to task_description';
    END IF;
    
    -- Set default values for empty task_name fields
    UPDATE tasks SET task_name = 'Untitled Task' WHERE task_name IS NULL OR task_name = '';
    
    -- Make task_name NOT NULL after setting defaults
    IF has_task_name_column OR NOT has_name_column THEN
        ALTER TABLE tasks ALTER COLUMN task_name SET NOT NULL;
        RAISE NOTICE 'Set task_name as NOT NULL';
    END IF;
    
END $$;

-- Create indexes for better performance (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tasks_employee_id') THEN
        CREATE INDEX idx_tasks_employee_id ON tasks(employee_id);
        RAISE NOTICE 'Created index on employee_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tasks_status') THEN
        CREATE INDEX idx_tasks_status ON tasks(status);
        RAISE NOTICE 'Created index on status';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tasks_project_id') THEN
        CREATE INDEX idx_tasks_project_id ON tasks(project_id);
        RAISE NOTICE 'Created index on project_id';
    END IF;
END $$;

-- Show final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- Ultra-safe task constraint fix - NO insertions, only fixes existing data
DO $$ 
BEGIN
    RAISE NOTICE 'Starting ultra-safe task constraint fix...';
    
    -- Step 1: Drop all existing constraints safely
    BEGIN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
        RAISE NOTICE 'Dropped tasks_status_check constraint';
    EXCEPTION
        WHEN OTHERS THEN 
            RAISE NOTICE 'Could not drop tasks_status_check: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_task_status_logic;
        RAISE NOTICE 'Dropped check_task_status_logic constraint';
    EXCEPTION
        WHEN OTHERS THEN 
            RAISE NOTICE 'Could not drop check_task_status_logic: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_task_status_employee_logic;
        RAISE NOTICE 'Dropped check_task_status_employee_logic constraint';
    EXCEPTION
        WHEN OTHERS THEN 
            RAISE NOTICE 'Could not drop check_task_status_employee_logic: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_employee_constraint_v2;
        RAISE NOTICE 'Dropped tasks_status_employee_constraint_v2 constraint';
    EXCEPTION
        WHEN OTHERS THEN 
            RAISE NOTICE 'Could not drop tasks_status_employee_constraint_v2: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_employee_constraint_v3;
        RAISE NOTICE 'Dropped tasks_status_employee_constraint_v3 constraint';
    EXCEPTION
        WHEN OTHERS THEN 
            RAISE NOTICE 'Could not drop tasks_status_employee_constraint_v3: %', SQLERRM;
    END;
END $$;

-- Step 2: Fix existing data issues
DO $$
DECLARE
    null_name_count INTEGER;
    invalid_status_count INTEGER;
    inconsistent_open_count INTEGER;
    inconsistent_assigned_count INTEGER;
BEGIN
    -- Check for NULL names
    SELECT COUNT(*) INTO null_name_count FROM tasks WHERE name IS NULL;
    RAISE NOTICE 'Found % tasks with NULL names', null_name_count;
    
    -- Fix NULL names in the 'name' column
    UPDATE tasks 
    SET name = 'Unnamed Task - ' || id::text
    WHERE name IS NULL;
    
    -- Check for NULL task_name
    SELECT COUNT(*) INTO null_name_count FROM tasks WHERE task_name IS NULL;
    RAISE NOTICE 'Found % tasks with NULL task_name', null_name_count;
    
    -- Fix NULL task_name
    UPDATE tasks 
    SET task_name = COALESCE(name, 'Unnamed Task - ' || id::text)
    WHERE task_name IS NULL;
    
    -- Fix invalid status values
    SELECT COUNT(*) INTO invalid_status_count 
    FROM tasks 
    WHERE status NOT IN ('Open', 'Assigned', 'In Progress', 'Completed');
    
    RAISE NOTICE 'Found % tasks with invalid status', invalid_status_count;
    
    UPDATE tasks 
    SET status = 'Open', employee_id = NULL
    WHERE status NOT IN ('Open', 'Assigned', 'In Progress', 'Completed');
    
    -- Fix inconsistent Open tasks (should not have employee)
    SELECT COUNT(*) INTO inconsistent_open_count 
    FROM tasks 
    WHERE status = 'Open' AND employee_id IS NOT NULL;
    
    RAISE NOTICE 'Found % Open tasks with employees (fixing)', inconsistent_open_count;
    
    UPDATE tasks 
    SET employee_id = NULL 
    WHERE status = 'Open' AND employee_id IS NOT NULL;
    
    -- Fix inconsistent Assigned/In Progress/Completed tasks (should have employee)
    SELECT COUNT(*) INTO inconsistent_assigned_count 
    FROM tasks 
    WHERE status IN ('Assigned', 'In Progress', 'Completed') AND employee_id IS NULL;
    
    RAISE NOTICE 'Found % Assigned/In Progress/Completed tasks without employees (fixing)', inconsistent_assigned_count;
    
    UPDATE tasks 
    SET status = 'Open' 
    WHERE status IN ('Assigned', 'In Progress', 'Completed') AND employee_id IS NULL;
    
    RAISE NOTICE 'Data cleanup completed';
END $$;

-- Step 3: Add the constraint
DO $$
BEGIN
    ALTER TABLE tasks 
    ADD CONSTRAINT tasks_status_employee_constraint_final
    CHECK (
      (status = 'Open' AND employee_id IS NULL) OR
      (status IN ('Assigned', 'In Progress', 'Completed') AND employee_id IS NOT NULL)
    );
    RAISE NOTICE 'Added final constraint successfully';
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Could not add constraint: %', SQLERRM;
        RAISE NOTICE 'This might be due to remaining data inconsistencies';
END $$;

-- Step 4: Final verification (NO INSERTIONS)
DO $$
BEGIN
    RAISE NOTICE '=== FINAL VERIFICATION ===';
    RAISE NOTICE 'Total tasks: %', (SELECT COUNT(*) FROM tasks);
    RAISE NOTICE 'Tasks with NULL names: %', (SELECT COUNT(*) FROM tasks WHERE name IS NULL);
    RAISE NOTICE 'Tasks with NULL task_name: %', (SELECT COUNT(*) FROM tasks WHERE task_name IS NULL);
    RAISE NOTICE 'Open tasks: %', (SELECT COUNT(*) FROM tasks WHERE status = 'Open');
    RAISE NOTICE 'Assigned tasks: %', (SELECT COUNT(*) FROM tasks WHERE status = 'Assigned');
    RAISE NOTICE 'In Progress tasks: %', (SELECT COUNT(*) FROM tasks WHERE status = 'In Progress');
    RAISE NOTICE 'Completed tasks: %', (SELECT COUNT(*) FROM tasks WHERE status = 'Completed');
    RAISE NOTICE 'Tasks with employees: %', (SELECT COUNT(*) FROM tasks WHERE employee_id IS NOT NULL);
    RAISE NOTICE 'Tasks without employees: %', (SELECT COUNT(*) FROM tasks WHERE employee_id IS NULL);
    RAISE NOTICE '=== VERIFICATION COMPLETE ===';
END $$;

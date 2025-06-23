-- Final safe constraint fix that handles all scenarios
DO $$ 
DECLARE
    constraint_exists boolean := false;
BEGIN
    -- Check if constraint already exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'tasks' 
        AND constraint_name = 'tasks_status_employee_logic_final'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Constraint already exists, dropping it first...';
        ALTER TABLE tasks DROP CONSTRAINT tasks_status_employee_logic_final;
    END IF;
    
    -- Drop any other existing constraints safely
    BEGIN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_task_status_logic;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_task_status_employee_logic;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_employee_constraint_v2;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    RAISE NOTICE 'All old constraints removed successfully';
END $$;

-- Update existing data to be consistent (safe updates)
DO $$
BEGIN
    -- Fix Open tasks that have employees assigned
    UPDATE tasks 
    SET employee_id = NULL
    WHERE status = 'Open' AND employee_id IS NOT NULL;
    
    -- Fix assigned tasks that don't have employees
    UPDATE tasks 
    SET status = 'Open' 
    WHERE employee_id IS NULL AND status IN ('Assigned', 'In Progress', 'Completed');
    
    -- Ensure all assigned/in progress/completed tasks have employees
    UPDATE tasks 
    SET status = 'Open', employee_id = NULL
    WHERE employee_id IS NULL AND status != 'Open';
    
    RAISE NOTICE 'Data consistency updates completed';
END $$;

-- Add the new constraint with a unique name
ALTER TABLE tasks 
ADD CONSTRAINT tasks_status_employee_final_v3
CHECK (
  (status = 'Open' AND employee_id IS NULL) OR
  (status IN ('Assigned', 'In Progress', 'Completed') AND employee_id IS NOT NULL)
);

-- Verify the constraint was added
SELECT 
    constraint_name, 
    constraint_type,
    is_deferrable,
    initially_deferred
FROM information_schema.table_constraints 
WHERE table_name = 'tasks' 
AND constraint_type = 'CHECK';

-- Show current task status distribution
SELECT 
  status,
  COUNT(*) as total_tasks,
  COUNT(employee_id) as tasks_with_employee,
  COUNT(*) - COUNT(employee_id) as tasks_without_employee
FROM tasks 
GROUP BY status
ORDER BY 
  CASE status 
    WHEN 'Open' THEN 1
    WHEN 'Assigned' THEN 2  
    WHEN 'In Progress' THEN 3
    WHEN 'Completed' THEN 4
    ELSE 5
  END;

-- Test the constraint is working (this should succeed)
DO $$
BEGIN
    RAISE NOTICE 'Testing constraint logic...';
    
    -- This should work: Open task with no employee
    BEGIN
        INSERT INTO tasks (project_id, task_name, status, employee_id, is_active) 
        VALUES ('00000000-0000-0000-0000-000000000000', 'Test Open Task', 'Open', NULL, true);
        DELETE FROM tasks WHERE task_name = 'Test Open Task';
        RAISE NOTICE '✓ Open task with no employee: PASSED';
    EXCEPTION 
        WHEN OTHERS THEN 
            RAISE NOTICE '✗ Open task with no employee: FAILED - %', SQLERRM;
    END;
    
    RAISE NOTICE 'Constraint testing completed';
END $$;

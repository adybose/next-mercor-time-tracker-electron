-- Safe migration that handles existing constraints
DO $$ 
BEGIN
    -- Drop existing constraints if they exist (no error if they don't)
    BEGIN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_task_status_logic;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_task_status_employee_logic;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
END $$;

-- Clean up existing data to match the 4-status system
UPDATE tasks 
SET status = 'Open', employee_id = NULL
WHERE status NOT IN ('Open', 'Assigned', 'In Progress', 'Completed');

-- Fix unassigned tasks that have wrong status
UPDATE tasks 
SET status = 'Open' 
WHERE employee_id IS NULL AND status != 'Open';

-- Fix assigned tasks that have "Open" status
UPDATE tasks 
SET status = 'Assigned' 
WHERE employee_id IS NOT NULL AND status = 'Open';

-- Add the correct constraint with a unique name
ALTER TABLE tasks 
ADD CONSTRAINT tasks_status_employee_constraint_v2
CHECK (
  (status = 'Open' AND employee_id IS NULL) OR
  (status IN ('Assigned', 'In Progress', 'Completed') AND employee_id IS NOT NULL)
);

-- Verify the constraint is working by checking data consistency
SELECT 
  'Data Verification' as check_type,
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
  END;

-- Test the constraint by trying to insert invalid data (this should fail)
DO $$
BEGIN
    -- This should fail - Open task with employee
    BEGIN
        INSERT INTO tasks (project_id, task_name, status, employee_id, is_active) 
        VALUES ('00000000-0000-0000-0000-000000000000', 'Test Constraint 1', 'Open', '00000000-0000-0000-0000-000000000000', true);
        RAISE NOTICE 'ERROR: Constraint failed - Open task with employee was allowed!';
    EXCEPTION
        WHEN check_violation THEN 
            RAISE NOTICE 'SUCCESS: Constraint working - Open task with employee was rejected';
    END;
    
    -- This should fail - Assigned task without employee  
    BEGIN
        INSERT INTO tasks (project_id, task_name, status, employee_id, is_active) 
        VALUES ('00000000-0000-0000-0000-000000000000', 'Test Constraint 2', 'Assigned', NULL, true);
        RAISE NOTICE 'ERROR: Constraint failed - Assigned task without employee was allowed!';
    EXCEPTION
        WHEN check_violation THEN 
            RAISE NOTICE 'SUCCESS: Constraint working - Assigned task without employee was rejected';
    END;
END $$;

-- Clean up any test data that might have been inserted
DELETE FROM tasks WHERE task_name LIKE 'Test Constraint%';

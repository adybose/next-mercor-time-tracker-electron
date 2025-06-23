-- Simple constraint fix without test inserts
DO $$ 
BEGIN
    -- Drop existing constraints safely
    BEGIN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_task_status_logic;
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_task_status_employee_logic;
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_employee_constraint_v2;
    EXCEPTION
        WHEN OTHERS THEN 
            RAISE NOTICE 'Some constraints may not have existed, continuing...';
    END;
END $$;

-- Update existing data to be consistent
UPDATE tasks 
SET status = 'Open', employee_id = NULL
WHERE employee_id IS NULL AND status != 'Open';

UPDATE tasks 
SET status = 'Assigned' 
WHERE employee_id IS NOT NULL AND status = 'Open';

-- Add the new constraint
ALTER TABLE tasks 
ADD CONSTRAINT tasks_status_employee_logic_final
CHECK (
  (status = 'Open' AND employee_id IS NULL) OR
  (status IN ('Assigned', 'In Progress', 'Completed') AND employee_id IS NOT NULL)
);

-- Show current task status distribution
SELECT 
  status,
  COUNT(*) as count,
  COUNT(employee_id) as with_employee
FROM tasks 
GROUP BY status
ORDER BY status;

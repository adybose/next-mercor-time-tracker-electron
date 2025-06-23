-- First, drop the existing check constraint that's causing issues
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_task_status_logic;

-- Update existing data to fix any inconsistencies
-- Set unassigned tasks to "Open" status
UPDATE tasks 
SET status = 'Open' 
WHERE employee_id IS NULL AND status != 'Open';

-- Set assigned tasks to "Assigned" status if they have an employee but wrong status
UPDATE tasks 
SET status = 'Assigned' 
WHERE employee_id IS NOT NULL AND status = 'Open';

-- Update any dummy/default tasks to have "Open" status and remove employee assignment
UPDATE tasks 
SET status = 'Open', employee_id = NULL
WHERE (task_name ILIKE '%default%' OR task_name ILIKE '%dummy%' OR task_name ILIKE '%test%')
AND status != 'Completed';

-- Now add the correct check constraint
ALTER TABLE tasks 
ADD CONSTRAINT check_task_status_employee_logic 
CHECK (
  (status = 'Open' AND employee_id IS NULL) OR
  (status IN ('Assigned', 'In Progress', 'Completed') AND employee_id IS NOT NULL)
);

-- Verify the data is consistent
SELECT 
  status,
  COUNT(*) as count,
  COUNT(employee_id) as assigned_count
FROM tasks 
GROUP BY status
ORDER BY status;

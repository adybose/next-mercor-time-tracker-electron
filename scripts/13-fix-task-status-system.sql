-- Update tasks table to use new 4-status system
-- First, update any existing tasks with invalid status combinations

-- Set unassigned tasks to "Open" status
UPDATE tasks 
SET status = 'Open' 
WHERE employee_id IS NULL AND status != 'Open';

-- Set assigned tasks to "Assigned" status if they have an employee
UPDATE tasks 
SET status = 'Assigned' 
WHERE employee_id IS NOT NULL AND status = 'Open';

-- Add check constraint to ensure status logic
ALTER TABLE tasks 
ADD CONSTRAINT check_task_status_logic 
CHECK (
  (status = 'Open' AND employee_id IS NULL) OR
  (status IN ('Assigned', 'In Progress', 'Completed') AND employee_id IS NOT NULL)
);

-- Update any dummy/default tasks to have "Open" status
UPDATE tasks 
SET status = 'Open', employee_id = NULL
WHERE task_name LIKE '%Default%' OR task_name LIKE '%dummy%';

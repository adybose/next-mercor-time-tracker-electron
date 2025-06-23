-- Update tasks table to include new fields
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS task_name TEXT,
ADD COLUMN IF NOT EXISTS task_description TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'In Progress', 'Completed')),
ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0;

-- Update existing tasks to use new column names
UPDATE tasks 
SET task_name = name 
WHERE task_name IS NULL AND name IS NOT NULL;

UPDATE tasks 
SET task_description = description 
WHERE task_description IS NULL AND description IS NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_employee_id ON tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- Ensure time_entries table has all required columns
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_paused_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_pause_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS mac_address TEXT;

-- Create screenshots table if it doesn't exist
CREATE TABLE IF NOT EXISTS screenshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    has_permissions BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for screenshots
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

-- Policy for employees to insert their own screenshots
CREATE POLICY "Employees can insert their own screenshots" ON screenshots
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.id = employee_id 
            AND employees.email = auth.jwt() ->> 'email'
        )
    );

-- Policy for organizations to view screenshots of their employees
CREATE POLICY "Organizations can view employee screenshots" ON screenshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            JOIN organizations ON employees.organization_id = organizations.id
            WHERE employees.id = screenshots.employee_id 
            AND organizations.email = auth.jwt() ->> 'email'
        )
    );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_screenshots_employee_id ON screenshots(employee_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_time_entry_id ON screenshots(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_taken_at ON screenshots(taken_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_is_active ON time_entries(is_active);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_task ON time_entries(employee_id, task_id);

-- Update existing time_entries to have proper default values
UPDATE time_entries 
SET is_active = false, total_paused_seconds = 0 
WHERE is_active IS NULL OR total_paused_seconds IS NULL;

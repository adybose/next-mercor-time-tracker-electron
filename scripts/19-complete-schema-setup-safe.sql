-- Ensure time_entries table has all required columns
DO $$ 
BEGIN
    -- Add columns only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'is_active') THEN
        ALTER TABLE time_entries ADD COLUMN is_active BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'total_paused_seconds') THEN
        ALTER TABLE time_entries ADD COLUMN total_paused_seconds INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'last_pause_time') THEN
        ALTER TABLE time_entries ADD COLUMN last_pause_time TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'ip_address') THEN
        ALTER TABLE time_entries ADD COLUMN ip_address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'mac_address') THEN
        ALTER TABLE time_entries ADD COLUMN mac_address TEXT;
    END IF;
END $$;

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

-- Enable RLS on screenshots table
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Employees can insert their own screenshots" ON screenshots;
    DROP POLICY IF EXISTS "Organizations can view employee screenshots" ON screenshots;
    
    -- Create policies
    CREATE POLICY "Employees can insert their own screenshots" ON screenshots
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM employees 
                WHERE employees.id = employee_id 
                AND employees.email = auth.jwt() ->> 'email'
            )
        );

    CREATE POLICY "Organizations can view employee screenshots" ON screenshots
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM employees 
                JOIN organizations ON employees.organization_id = organizations.id
                WHERE employees.id = screenshots.employee_id 
                AND organizations.email = auth.jwt() ->> 'email'
            )
        );
        
    RAISE NOTICE 'Screenshot policies created successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

-- Add indexes for better performance (only if they don't exist)
DO $$ 
BEGIN
    -- Create indexes if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_screenshots_employee_id') THEN
        CREATE INDEX idx_screenshots_employee_id ON screenshots(employee_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_screenshots_time_entry_id') THEN
        CREATE INDEX idx_screenshots_time_entry_id ON screenshots(time_entry_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_screenshots_taken_at') THEN
        CREATE INDEX idx_screenshots_taken_at ON screenshots(taken_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_time_entries_is_active') THEN
        CREATE INDEX idx_time_entries_is_active ON time_entries(is_active);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_time_entries_employee_task') THEN
        CREATE INDEX idx_time_entries_employee_task ON time_entries(employee_id, task_id);
    END IF;
    
    RAISE NOTICE 'Indexes created successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating indexes: %', SQLERRM;
END $$;

-- Update existing time_entries to have proper default values
UPDATE time_entries 
SET is_active = COALESCE(is_active, false), 
    total_paused_seconds = COALESCE(total_paused_seconds, 0) 
WHERE is_active IS NULL OR total_paused_seconds IS NULL;

-- Final verification
DO $$ 
BEGIN
    RAISE NOTICE 'Schema setup completed successfully!';
    RAISE NOTICE 'Screenshots table exists: %', (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screenshots'));
    RAISE NOTICE 'Time entries columns added: %', (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name IN ('is_active', 'total_paused_seconds', 'ip_address', 'mac_address'));
END $$;

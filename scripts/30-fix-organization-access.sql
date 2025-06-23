-- Fix organization name access for employees
DO $$
BEGIN
    RAISE NOTICE 'Fixing organization access for employees...';
    
    -- Drop existing problematic policies
    DROP POLICY IF EXISTS "Employees can view their organization" ON organizations;
    DROP POLICY IF EXISTS "Organizations can view themselves" ON organizations;
    
    -- Create simple policy for employees to view their organization
    CREATE POLICY "Employees can view their organization" ON organizations
        FOR SELECT USING (
            id IN (
                SELECT organization_id 
                FROM employees 
                WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
            )
        );
    
    -- Create policy for organizations to view themselves
    CREATE POLICY "Organizations can view themselves" ON organizations
        FOR ALL USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
    
    -- Ensure time_entries table has all necessary columns
    ALTER TABLE time_entries 
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS total_paused_seconds INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_pause_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'stopped';
    
    RAISE NOTICE 'Organization access fixed successfully!';
END $$;

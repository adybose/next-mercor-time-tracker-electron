-- Fix organization name field access
DO $$
BEGIN
    RAISE NOTICE 'Fixing organization name field access...';
    
    -- Check if we need to rename column from company_name to name
    DO $inner$
    BEGIN
        -- Try to add name column if it doesn't exist
        ALTER TABLE organizations ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        
        -- Copy data from company_name to name if company_name exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'organizations' AND column_name = 'company_name') THEN
            UPDATE organizations SET name = company_name WHERE name IS NULL;
        END IF;
        
        RAISE NOTICE 'Organization name field updated successfully!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating organization name field: %', SQLERRM;
    END $inner$;
    
    -- Ensure RLS policies work with correct field
    DROP POLICY IF EXISTS "Employees can view their organization" ON organizations;
    
    CREATE POLICY "Employees can view their organization" ON organizations
        FOR SELECT USING (
            id IN (
                SELECT organization_id 
                FROM employees 
                WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
            )
        );
    
    RAISE NOTICE 'Organization access policies updated successfully!';
END $$;

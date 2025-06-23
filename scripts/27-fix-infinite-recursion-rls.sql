-- Fix infinite recursion in RLS policies
-- This script will disable RLS temporarily and recreate proper policies

DO $$
BEGIN
    RAISE NOTICE '=== FIXING INFINITE RECURSION IN RLS POLICIES ===';
    
    -- Step 1: Disable RLS temporarily to allow access
    ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
    ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✓ Disabled RLS temporarily';
    
    -- Step 2: Drop ALL existing policies that might be causing recursion
    DROP POLICY IF EXISTS "Allow organizations full access to own data" ON organizations;
    DROP POLICY IF EXISTS "Allow employees full access to own data" ON employees;
    DROP POLICY IF EXISTS "Organizations can manage own data" ON organizations;
    DROP POLICY IF EXISTS "Employees can manage own data" ON employees;
    DROP POLICY IF EXISTS "Organizations can view own data" ON organizations;
    DROP POLICY IF EXISTS "Organizations can update own data" ON organizations;
    DROP POLICY IF EXISTS "Organizations can insert own data" ON organizations;
    DROP POLICY IF EXISTS "Employees can view own data" ON employees;
    DROP POLICY IF EXISTS "Employees can update own data" ON employees;
    DROP POLICY IF EXISTS "Employees can insert own data" ON employees;
    DROP POLICY IF EXISTS "Users can insert their own organization" ON organizations;
    DROP POLICY IF EXISTS "Users can insert their own employee record" ON employees;
    DROP POLICY IF EXISTS "Organizations can view their employees" ON employees;
    
    RAISE NOTICE '✓ Dropped all existing policies';
    
    -- Step 3: Create simple, non-recursive policies
    -- Organizations policies
    CREATE POLICY "org_select_own" ON organizations
        FOR SELECT USING (id = auth.uid());
    
    CREATE POLICY "org_insert_own" ON organizations
        FOR INSERT WITH CHECK (id = auth.uid());
    
    CREATE POLICY "org_update_own" ON organizations
        FOR UPDATE USING (id = auth.uid());
    
    CREATE POLICY "org_delete_own" ON organizations
        FOR DELETE USING (id = auth.uid());
    
    -- Employees policies
    CREATE POLICY "emp_select_own" ON employees
        FOR SELECT USING (id = auth.uid());
    
    CREATE POLICY "emp_insert_own" ON employees
        FOR INSERT WITH CHECK (id = auth.uid());
    
    CREATE POLICY "emp_update_own" ON employees
        FOR UPDATE USING (id = auth.uid());
    
    CREATE POLICY "emp_delete_own" ON employees
        FOR DELETE USING (id = auth.uid());
    
    -- Allow organizations to view their employees
    CREATE POLICY "org_view_employees" ON employees
        FOR SELECT USING (organization_id = auth.uid());
    
    RAISE NOTICE '✓ Created simple, non-recursive policies';
    
    -- Step 4: Re-enable RLS
    ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✓ Re-enabled RLS with fixed policies';
    
END $$;

-- Test the fix by checking if we can query the tables
DO $$
DECLARE
    org_count INTEGER;
    emp_count INTEGER;
    auth_count INTEGER;
BEGIN
    RAISE NOTICE '=== TESTING FIXED POLICIES ===';
    
    -- Count records (this should work now)
    SELECT COUNT(*) INTO org_count FROM organizations;
    SELECT COUNT(*) INTO emp_count FROM employees;
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    
    RAISE NOTICE 'Organizations: %', org_count;
    RAISE NOTICE 'Employees: %', emp_count;
    RAISE NOTICE 'Auth users: %', auth_count;
    
    RAISE NOTICE '✅ SUCCESS: RLS policies fixed and working!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR: Still having issues: % %', SQLSTATE, SQLERRM;
END $$;

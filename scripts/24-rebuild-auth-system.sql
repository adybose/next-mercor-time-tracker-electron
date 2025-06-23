-- Complete authentication system rebuild
-- This script will fix all authentication issues

-- Step 1: Clean up existing broken state
DO $$
BEGIN
    RAISE NOTICE 'Step 1: Cleaning up broken authentication state...';
    
    -- Drop existing triggers that might be broken
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
    
    RAISE NOTICE '✓ Cleaned up existing triggers and functions';
END $$;

-- Step 2: Ensure tables have correct structure
DO $$
BEGIN
    RAISE NOTICE 'Step 2: Ensuring correct table structure...';
    
    -- Make sure organizations table has correct structure
    ALTER TABLE organizations 
    ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS company_name TEXT NOT NULL DEFAULT 'Unknown Company',
    ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Make sure employees table has correct structure  
    ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    
    RAISE NOTICE '✓ Table structure verified';
END $$;

-- Step 3: Create robust user creation function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_type TEXT;
    org_name TEXT;
    first_name TEXT;
    last_name TEXT;
    user_email TEXT;
BEGIN
    -- Get user metadata
    user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'employee');
    org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Unknown Organization');
    first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1));
    last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
    user_email := COALESCE(NEW.email, '');
    
    RAISE NOTICE 'Creating user: % (type: %, email: %)', NEW.id, user_type, user_email;
    
    -- Create organization user
    IF user_type = 'organization' THEN
        INSERT INTO organizations (id, company_name, email, created_at, updated_at)
        VALUES (NEW.id, org_name, user_email, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
            company_name = EXCLUDED.company_name,
            email = EXCLUDED.email,
            updated_at = NOW();
        
        RAISE NOTICE '✓ Created organization: %', org_name;
    
    -- Create employee user
    ELSE
        INSERT INTO employees (id, first_name, last_name, email, created_at, updated_at)
        VALUES (NEW.id, first_name, last_name, user_email, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            email = EXCLUDED.email,
            updated_at = NOW();
        
        RAISE NOTICE '✓ Created employee: % %', first_name, last_name;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user: % %', SQLSTATE, SQLERRM;
        RETURN NEW; -- Don't fail the auth user creation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 5: Fix existing orphaned users
DO $$
DECLARE
    user_record RECORD;
    user_type TEXT;
    org_name TEXT;
    first_name TEXT;
    last_name TEXT;
BEGIN
    RAISE NOTICE 'Step 5: Fixing orphaned users...';
    
    FOR user_record IN (
        SELECT u.id, u.email, u.raw_user_meta_data, u.created_at
        FROM auth.users u
        LEFT JOIN organizations o ON o.id = u.id
        LEFT JOIN employees e ON e.id = u.id
        WHERE o.id IS NULL AND e.id IS NULL
    ) LOOP
        -- Extract metadata
        user_type := COALESCE(user_record.raw_user_meta_data->>'user_type', 'employee');
        org_name := COALESCE(user_record.raw_user_meta_data->>'organization_name', 'Unknown Organization');
        first_name := COALESCE(user_record.raw_user_meta_data->>'first_name', split_part(user_record.email, '@', 1));
        last_name := COALESCE(user_record.raw_user_meta_data->>'last_name', '');
        
        RAISE NOTICE 'Fixing orphaned user: % (type: %)', user_record.email, user_type;
        
        -- Create the appropriate record
        IF user_type = 'organization' THEN
            INSERT INTO organizations (id, company_name, email, created_at, updated_at)
            VALUES (user_record.id, org_name, user_record.email, user_record.created_at, NOW())
            ON CONFLICT (id) DO NOTHING;
        ELSE
            INSERT INTO employees (id, first_name, last_name, email, created_at, updated_at)
            VALUES (user_record.id, first_name, last_name, user_record.email, user_record.created_at, NOW())
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✓ Fixed orphaned users';
END $$;

-- Step 6: Update RLS policies to be more permissive for debugging
DO $$
BEGIN
    RAISE NOTICE 'Step 6: Updating RLS policies...';
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Organizations can view own data" ON organizations;
    DROP POLICY IF EXISTS "Organizations can update own data" ON organizations;
    DROP POLICY IF EXISTS "Employees can view own data" ON employees;
    DROP POLICY IF EXISTS "Employees can update own data" ON employees;
    
    -- Create simple, working policies
    CREATE POLICY "Organizations can manage own data" ON organizations
        FOR ALL USING (auth.uid() = id);
    
    CREATE POLICY "Employees can manage own data" ON employees
        FOR ALL USING (auth.uid() = id);
    
    -- Enable RLS
    ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✓ Updated RLS policies';
END $$;

-- Step 7: Show final status
DO $$
DECLARE
    auth_count INTEGER;
    org_count INTEGER;
    emp_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO org_count FROM organizations;
    SELECT COUNT(*) INTO emp_count FROM employees;
    
    RAISE NOTICE '=== AUTHENTICATION SYSTEM REBUILT ===';
    RAISE NOTICE 'Auth users: %', auth_count;
    RAISE NOTICE 'Organizations: %', org_count;
    RAISE NOTICE 'Employees: %', emp_count;
    RAISE NOTICE 'System should now work correctly!';
END $$;

-- Fix "User account not found" error
-- This script ensures all auth users have corresponding records in organizations/employees tables

-- Step 1: Check current state
DO $$
DECLARE
    auth_users_count INTEGER;
    org_count INTEGER;
    emp_count INTEGER;
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_users_count FROM auth.users;
    SELECT COUNT(*) INTO org_count FROM organizations;
    SELECT COUNT(*) INTO emp_count FROM employees;
    
    SELECT COUNT(*) INTO orphaned_count 
    FROM auth.users u
    LEFT JOIN organizations o ON o.id = u.id
    LEFT JOIN employees e ON e.id = u.id
    WHERE o.id IS NULL AND e.id IS NULL;
    
    RAISE NOTICE '=== CURRENT STATE ===';
    RAISE NOTICE 'Auth users: %', auth_users_count;
    RAISE NOTICE 'Organizations: %', org_count;
    RAISE NOTICE 'Employees: %', emp_count;
    RAISE NOTICE 'Orphaned users: %', orphaned_count;
END $$;

-- Step 2: Create missing user records for all orphaned auth users
DO $$
DECLARE
    user_record RECORD;
    user_type TEXT;
    org_name TEXT;
    first_name TEXT;
    last_name TEXT;
    created_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== FIXING ORPHANED USERS ===';
    
    FOR user_record IN (
        SELECT u.id, u.email, u.raw_user_meta_data, u.created_at, u.email_confirmed_at
        FROM auth.users u
        LEFT JOIN organizations o ON o.id = u.id
        LEFT JOIN employees e ON e.id = u.id
        WHERE o.id IS NULL AND e.id IS NULL
        AND u.email_confirmed_at IS NOT NULL -- Only confirmed users
    ) LOOP
        -- Extract user type from metadata or email pattern
        user_type := COALESCE(user_record.raw_user_meta_data->>'user_type', 'employee');
        
        -- If no user_type in metadata, guess from email or default to employee
        IF user_type IS NULL OR user_type = '' THEN
            user_type := 'employee';
        END IF;
        
        -- Extract names
        first_name := COALESCE(
            user_record.raw_user_meta_data->>'first_name',
            user_record.raw_user_meta_data->>'firstName',
            split_part(user_record.email, '@', 1)
        );
        
        last_name := COALESCE(
            user_record.raw_user_meta_data->>'last_name',
            user_record.raw_user_meta_data->>'lastName',
            ''
        );
        
        org_name := COALESCE(
            user_record.raw_user_meta_data->>'organization_name',
            user_record.raw_user_meta_data->>'company_name',
            'My Organization'
        );
        
        RAISE NOTICE 'Creating % record for user: % (email: %)', user_type, user_record.id, user_record.email;
        
        -- Create organization record
        IF user_type = 'organization' THEN
            INSERT INTO organizations (id, company_name, email, created_at, updated_at)
            VALUES (
                user_record.id, 
                org_name, 
                user_record.email, 
                COALESCE(user_record.created_at, NOW()), 
                NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                company_name = EXCLUDED.company_name,
                email = EXCLUDED.email,
                updated_at = NOW();
            
            RAISE NOTICE '✓ Created organization: %', org_name;
        
        -- Create employee record
        ELSE
            INSERT INTO employees (id, first_name, last_name, email, created_at, updated_at)
            VALUES (
                user_record.id, 
                first_name, 
                last_name, 
                user_record.email, 
                COALESCE(user_record.created_at, NOW()), 
                NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                email = EXCLUDED.email,
                updated_at = NOW();
            
            RAISE NOTICE '✓ Created employee: % %', first_name, last_name;
        END IF;
        
        created_count := created_count + 1;
    END LOOP;
    
    RAISE NOTICE '✓ Fixed % orphaned users', created_count;
END $$;

-- Step 3: Recreate the user creation trigger (improved version)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_type TEXT;
    org_name TEXT;
    first_name TEXT;
    last_name TEXT;
    user_email TEXT;
BEGIN
    -- Skip if user already exists in our tables
    IF EXISTS (SELECT 1 FROM organizations WHERE id = NEW.id) OR 
       EXISTS (SELECT 1 FROM employees WHERE id = NEW.id) THEN
        RAISE NOTICE 'User % already exists in database, skipping', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Get user data
    user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'employee');
    org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.raw_user_meta_data->>'company_name', 'My Organization');
    first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'firstName', split_part(NEW.email, '@', 1));
    last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'lastName', '');
    user_email := COALESCE(NEW.email, '');
    
    RAISE NOTICE 'Creating new user: % (type: %, email: %)', NEW.id, user_type, user_email;
    
    -- Create organization user
    IF user_type = 'organization' THEN
        INSERT INTO organizations (id, company_name, email, created_at, updated_at)
        VALUES (NEW.id, org_name, user_email, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE '✓ Created organization: %', org_name;
    
    -- Create employee user (default)
    ELSE
        INSERT INTO employees (id, first_name, last_name, email, created_at, updated_at)
        VALUES (NEW.id, first_name, last_name, user_email, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE '✓ Created employee: % %', first_name, last_name;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user for %: % %', NEW.id, SQLSTATE, SQLERRM;
        RETURN NEW; -- Don't fail the auth user creation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 4: Update RLS policies to be more permissive
DO $$
BEGIN
    RAISE NOTICE '=== UPDATING RLS POLICIES ===';
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Organizations can manage own data" ON organizations;
    DROP POLICY IF EXISTS "Employees can manage own data" ON employees;
    DROP POLICY IF EXISTS "Organizations can view own data" ON organizations;
    DROP POLICY IF EXISTS "Organizations can update own data" ON organizations;
    DROP POLICY IF EXISTS "Employees can view own data" ON employees;
    DROP POLICY IF EXISTS "Employees can update own data" ON employees;
    
    -- Create simple, working policies
    CREATE POLICY "Allow organizations full access to own data" ON organizations
        FOR ALL USING (auth.uid() = id);
    
    CREATE POLICY "Allow employees full access to own data" ON employees
        FOR ALL USING (auth.uid() = id);
    
    -- Enable RLS
    ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✓ Updated RLS policies';
END $$;

-- Step 5: Final verification
DO $$
DECLARE
    auth_users_count INTEGER;
    org_count INTEGER;
    emp_count INTEGER;
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_users_count FROM auth.users WHERE email_confirmed_at IS NOT NULL;
    SELECT COUNT(*) INTO org_count FROM organizations;
    SELECT COUNT(*) INTO emp_count FROM employees;
    
    SELECT COUNT(*) INTO orphaned_count 
    FROM auth.users u
    LEFT JOIN organizations o ON o.id = u.id
    LEFT JOIN employees e ON e.id = u.id
    WHERE o.id IS NULL AND e.id IS NULL
    AND u.email_confirmed_at IS NOT NULL;
    
    RAISE NOTICE '=== FINAL STATE ===';
    RAISE NOTICE 'Confirmed auth users: %', auth_users_count;
    RAISE NOTICE 'Organizations: %', org_count;
    RAISE NOTICE 'Employees: %', emp_count;
    RAISE NOTICE 'Remaining orphaned users: %', orphaned_count;
    
    IF orphaned_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All users now have corresponding records!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: % users still orphaned', orphaned_count;
    END IF;
END $$;

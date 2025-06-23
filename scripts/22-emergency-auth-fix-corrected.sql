-- Emergency fix for authentication issues
-- This script will restore basic auth functionality

DO $$
BEGIN
  RAISE NOTICE 'Starting emergency authentication fix...';

  -- 1. Recreate the user creation function with better error handling
  CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS TRIGGER AS $func$
  DECLARE
    org_name TEXT;
    user_type TEXT;
  BEGIN
    RAISE NOTICE 'Processing new user: % with email: %', NEW.id, NEW.email;
    
    -- Get user type from metadata
    user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'employee');
    
    RAISE NOTICE 'User type detected: %', user_type;
    
    -- Handle organization users
    IF user_type = 'organization' THEN
      org_name := COALESCE(
        NEW.raw_user_meta_data->>'organization_name', 
        'New Organization'
      );
      
      RAISE NOTICE 'Creating organization: %', org_name;
      
      INSERT INTO organizations (id, name, email, created_at, updated_at)
      VALUES (
        NEW.id,
        org_name,
        NEW.email,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        updated_at = NOW();
        
      RAISE NOTICE 'Organization created successfully';
      
    -- Handle employee users
    ELSIF user_type = 'employee' THEN
      RAISE NOTICE 'Creating employee record';
      
      INSERT INTO employees (
        id, 
        organization_id, 
        email, 
        first_name, 
        last_name, 
        is_active, 
        email_verified,
        created_at, 
        updated_at
      )
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'organization_id', '00000000-0000-0000-0000-000000000000'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Employee'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
        true,
        NEW.email_confirmed_at IS NOT NULL,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email_verified = EXCLUDED.email_verified,
        updated_at = NOW();
        
      RAISE NOTICE 'Employee created successfully';
    END IF;
    
    RETURN NEW;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
      -- Don't fail the user creation, just log the error
      RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

  -- 2. Recreate the trigger
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

  -- 3. Fix RLS policies to be more permissive during auth
  ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

  -- Drop all existing policies and recreate them
  DROP POLICY IF EXISTS "Users can insert their own organization" ON organizations;
  DROP POLICY IF EXISTS "Organizations can view own data" ON organizations;
  DROP POLICY IF EXISTS "Organizations can update own data" ON organizations;

  CREATE POLICY "Users can insert their own organization" ON organizations
    FOR INSERT WITH CHECK (true);

  CREATE POLICY "Organizations can view own data" ON organizations
    FOR SELECT USING (auth.uid() = id);

  CREATE POLICY "Organizations can update own data" ON organizations
    FOR UPDATE USING (auth.uid() = id);

  -- Employee policies
  DROP POLICY IF EXISTS "Users can insert their own employee record" ON employees;
  DROP POLICY IF EXISTS "Employees can view own data" ON employees;
  DROP POLICY IF EXISTS "Employees can update own data" ON employees;
  DROP POLICY IF EXISTS "Organizations can view their employees" ON employees;

  CREATE POLICY "Users can insert their own employee record" ON employees
    FOR INSERT WITH CHECK (true);

  CREATE POLICY "Employees can view own data" ON employees
    FOR SELECT USING (auth.uid() = id);

  CREATE POLICY "Employees can update own data" ON employees
    FOR UPDATE USING (auth.uid() = id);

  CREATE POLICY "Organizations can view their employees" ON employees
    FOR SELECT USING (auth.uid() = organization_id);

  RAISE NOTICE 'Policies recreated successfully';

END $$;

-- 4. Create missing records for existing auth users
DO $$
DECLARE
  user_record RECORD;
  user_type TEXT;
  org_name TEXT;
BEGIN
  RAISE NOTICE 'Checking for users missing organization/employee records...';
  
  FOR user_record IN (
    SELECT u.id, u.email, u.raw_user_meta_data, u.email_confirmed_at
    FROM auth.users u
    WHERE u.id NOT IN (SELECT id FROM organizations WHERE id IS NOT NULL)
      AND u.id NOT IN (SELECT id FROM employees WHERE id IS NOT NULL)
  ) LOOP
    user_type := COALESCE(user_record.raw_user_meta_data->>'user_type', 'employee');
    
    IF user_type = 'organization' THEN
      org_name := COALESCE(
        user_record.raw_user_meta_data->>'organization_name', 
        'Recovered Organization'
      );
      
      INSERT INTO organizations (id, name, email, created_at, updated_at)
      VALUES (
        user_record.id,
        org_name,
        user_record.email,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
      
      RAISE NOTICE 'Recovered organization: %', org_name;
      
    ELSE
      INSERT INTO employees (
        id, 
        organization_id, 
        email, 
        first_name, 
        last_name, 
        is_active, 
        email_verified,
        created_at, 
        updated_at
      )
      VALUES (
        user_record.id,
        COALESCE(user_record.raw_user_meta_data->>'organization_id', '00000000-0000-0000-0000-000000000000'),
        user_record.email,
        COALESCE(user_record.raw_user_meta_data->>'first_name', 'Employee'),
        COALESCE(user_record.raw_user_meta_data->>'last_name', 'User'),
        true,
        user_record.email_confirmed_at IS NOT NULL,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
      
      RAISE NOTICE 'Recovered employee: %', user_record.email;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Emergency authentication fix completed!';
END $$;

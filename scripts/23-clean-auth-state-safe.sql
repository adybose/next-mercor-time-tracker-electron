-- Clean up corrupted authentication state (Supabase compatible)
DO $$
BEGIN
  RAISE NOTICE 'Cleaning up authentication state...';
  
  -- Clear expired sessions (using correct Supabase column names)
  DELETE FROM auth.sessions WHERE expires_at < NOW();
  
  -- If expires_at doesn't exist, try other common column names
  EXCEPTION WHEN undefined_column THEN
    BEGIN
      DELETE FROM auth.sessions WHERE created_at < NOW() - INTERVAL '7 days';
      RAISE NOTICE 'Cleaned sessions using created_at fallback';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not clean sessions table: %', SQLERRM;
    END;
END $$;

-- Clean up refresh tokens
DO $$
BEGIN
  DELETE FROM auth.refresh_tokens WHERE expires_at < NOW();
  
  EXCEPTION WHEN undefined_column THEN
    BEGIN
      DELETE FROM auth.refresh_tokens WHERE created_at < NOW() - INTERVAL '30 days';
      RAISE NOTICE 'Cleaned refresh tokens using created_at fallback';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not clean refresh tokens: %', SQLERRM;
    END;
END $$;

-- Update user metadata for proper type detection
DO $$
DECLARE
  org_count INTEGER;
  emp_count INTEGER;
BEGIN
  -- Count organizations
  SELECT COUNT(*) INTO org_count FROM organizations;
  RAISE NOTICE 'Found % organizations', org_count;
  
  -- Count employees  
  SELECT COUNT(*) INTO emp_count FROM employees;
  RAISE NOTICE 'Found % employees', emp_count;
  
  -- Update organization users
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"user_type": "organization"}'::jsonb
  WHERE id IN (SELECT id FROM organizations);
  
  GET DIAGNOSTICS org_count = ROW_COUNT;
  RAISE NOTICE 'Updated % organization user records', org_count;
  
  -- Update employee users
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"user_type": "employee"}'::jsonb
  WHERE id IN (SELECT id FROM employees);
  
  GET DIAGNOSTICS emp_count = ROW_COUNT;
  RAISE NOTICE 'Updated % employee user records', emp_count;
  
END $$;

-- Show current auth state
DO $$
DECLARE
  auth_users_count INTEGER;
  org_users_count INTEGER;
  emp_users_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO auth_users_count FROM auth.users;
  SELECT COUNT(*) INTO org_users_count FROM organizations;
  SELECT COUNT(*) INTO emp_users_count FROM employees;
  
  RAISE NOTICE 'Auth Summary:';
  RAISE NOTICE '- Total auth.users: %', auth_users_count;
  RAISE NOTICE '- Total organizations: %', org_users_count;
  RAISE NOTICE '- Total employees: %', emp_users_count;
  
  -- Show any orphaned users
  IF auth_users_count > (org_users_count + emp_users_count) THEN
    RAISE NOTICE 'WARNING: % orphaned users detected', (auth_users_count - org_users_count - emp_users_count);
  END IF;
END $$;

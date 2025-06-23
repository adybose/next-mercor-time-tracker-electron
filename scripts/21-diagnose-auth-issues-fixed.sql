-- Diagnostic script to check what's broken with authentication
DO $$
DECLARE
    user_count INTEGER;
    org_count INTEGER;
    emp_count INTEGER;
    org_policies INTEGER;
    emp_policies INTEGER;
    user_record RECORD;
BEGIN
    RAISE NOTICE '=== AUTHENTICATION DIAGNOSTIC REPORT ===';
    
    -- Check if auth.users table has data
    RAISE NOTICE 'Checking auth.users table...';
    SELECT COUNT(*) INTO user_count FROM auth.users;
    IF user_count > 0 THEN
        RAISE NOTICE '✓ auth.users table has data';
        RAISE NOTICE 'Total users: %', user_count;
    ELSE
        RAISE NOTICE '✗ auth.users table is empty';
    END IF;
    
    -- Check organizations table
    RAISE NOTICE 'Checking organizations table...';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        SELECT COUNT(*) INTO org_count FROM organizations;
        RAISE NOTICE '✓ organizations table exists';
        RAISE NOTICE 'Total organizations: %', org_count;
    ELSE
        RAISE NOTICE '✗ organizations table missing';
    END IF;
    
    -- Check employees table
    RAISE NOTICE 'Checking employees table...';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        SELECT COUNT(*) INTO emp_count FROM employees;
        RAISE NOTICE '✓ employees table exists';
        RAISE NOTICE 'Total employees: %', emp_count;
    ELSE
        RAISE NOTICE '✗ employees table missing';
    END IF;
    
    -- Check user creation trigger
    RAISE NOTICE 'Checking user creation trigger...';
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') THEN
        RAISE NOTICE '✓ User creation trigger exists';
    ELSE
        RAISE NOTICE '✗ User creation trigger missing';
    END IF;
    
    -- Check handle_new_user function
    RAISE NOTICE 'Checking handle_new_user function...';
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') THEN
        RAISE NOTICE '✓ handle_new_user function exists';
    ELSE
        RAISE NOTICE '✗ handle_new_user function missing';
    END IF;
    
    -- Check RLS policies
    RAISE NOTICE 'Checking RLS policies...';
    SELECT COUNT(*) INTO org_policies FROM pg_policies WHERE tablename = 'organizations';
    SELECT COUNT(*) INTO emp_policies FROM pg_policies WHERE tablename = 'employees';
    RAISE NOTICE 'Organizations policies: %', org_policies;
    RAISE NOTICE 'Employees policies: %', emp_policies;
    
    -- Show recent auth.users entries
    RAISE NOTICE 'Recent auth.users entries:';
    FOR user_record IN (
        SELECT id, email, created_at, 
               raw_user_meta_data->>'user_type' as user_type,
               raw_user_meta_data->>'organization_name' as org_name
        FROM auth.users 
        ORDER BY created_at DESC 
        LIMIT 5
    ) LOOP
        RAISE NOTICE 'User: % | Email: % | Type: % | Org: % | Created: %', 
            user_record.id, user_record.email, user_record.user_type, user_record.org_name, user_record.created_at;
    END LOOP;
    
    -- Check for orphaned auth.users (users without organization/employee records)
    RAISE NOTICE 'Checking for orphaned users...';
    FOR user_record IN (
        SELECT u.id, u.email, u.raw_user_meta_data->>'user_type' as user_type
        FROM auth.users u
        LEFT JOIN organizations o ON o.user_id = u.id
        LEFT JOIN employees e ON e.user_id = u.id
        WHERE o.id IS NULL AND e.id IS NULL
        LIMIT 5
    ) LOOP
        RAISE NOTICE 'Orphaned user: % | Email: % | Type: %', 
            user_record.id, user_record.email, user_record.user_type;
    END LOOP;
    
    RAISE NOTICE '=== END DIAGNOSTIC REPORT ===';
END $$;

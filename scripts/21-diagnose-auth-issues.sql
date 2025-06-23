-- Diagnostic script to check what's broken with authentication
DO $$
BEGIN
    RAISE NOTICE '=== AUTHENTICATION DIAGNOSTIC REPORT ===';
    
    -- Check if auth.users table has data
    RAISE NOTICE 'Checking auth.users table...';
    PERFORM 1 FROM auth.users LIMIT 1;
    IF FOUND THEN
        RAISE NOTICE '✓ auth.users table has data';
        RAISE NOTICE 'Total users: %', (SELECT COUNT(*) FROM auth.users);
    ELSE
        RAISE NOTICE '✗ auth.users table is empty';
    END IF;
    
    -- Check organizations table
    RAISE NOTICE 'Checking organizations table...';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        RAISE NOTICE '✓ organizations table exists';
        RAISE NOTICE 'Total organizations: %', (SELECT COUNT(*) FROM organizations);
    ELSE
        RAISE NOTICE '✗ organizations table missing';
    END IF;
    
    -- Check employees table
    RAISE NOTICE 'Checking employees table...';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        RAISE NOTICE '✓ employees table exists';
        RAISE NOTICE 'Total employees: %', (SELECT COUNT(*) FROM employees);
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
    RAISE NOTICE 'Organizations policies: %', (
        SELECT COUNT(*) FROM pg_policies WHERE tablename = 'organizations'
    );
    RAISE NOTICE 'Employees policies: %', (
        SELECT COUNT(*) FROM pg_policies WHERE tablename = 'employees'
    );
    
    -- Show recent auth.users entries
    RAISE NOTICE 'Recent auth.users entries:';
    FOR rec IN (
        SELECT id, email, created_at, 
               raw_user_meta_data->>'user_type' as user_type,
               raw_user_meta_data->>'organization_name' as org_name
        FROM auth.users 
        ORDER BY created_at DESC 
        LIMIT 5
    ) LOOP
        RAISE NOTICE 'User: % | Email: % | Type: % | Org: % | Created: %', 
            rec.id, rec.email, rec.user_type, rec.org_name, rec.created_at;
    END LOOP;
    
    RAISE NOTICE '=== END DIAGNOSTIC REPORT ===';
END $$;

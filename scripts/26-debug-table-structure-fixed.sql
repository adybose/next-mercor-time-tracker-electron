-- Debug actual table structure to see what exists
DO $$
DECLARE
    table_record RECORD;
    column_record RECORD;
    count_result INTEGER;
    sample_record RECORD;
BEGIN
    RAISE NOTICE '=== CHECKING ALL TABLES ===';
    
    -- List all tables in public schema
    FOR table_record IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    ) LOOP
        RAISE NOTICE 'Table: %', table_record.table_name;
        
        -- Show columns for each table
        FOR column_record IN (
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = table_record.table_name
            ORDER BY ordinal_position
        ) LOOP
            RAISE NOTICE '  - %: % (%)', column_record.column_name, column_record.data_type, 
                CASE WHEN column_record.is_nullable = 'YES' THEN 'nullable' ELSE 'not null' END;
        END LOOP;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '=== CHECKING AUTH USERS ===';
    -- Show auth users
    FOR sample_record IN (
        SELECT id, email, email_confirmed_at IS NOT NULL as confirmed
        FROM auth.users
        LIMIT 5
    ) LOOP
        RAISE NOTICE 'Auth user: % (email: %, confirmed: %)', 
            sample_record.id, sample_record.email, sample_record.confirmed;
    END LOOP;
    
    RAISE NOTICE '=== CHECKING DATA IN EACH TABLE ===';
    
    -- Check organizations table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        SELECT COUNT(*) INTO count_result FROM organizations;
        RAISE NOTICE 'Organizations count: %', count_result;
        
        -- Show sample data
        FOR sample_record IN (
            SELECT id, 
                   COALESCE(name, company_name, 'no name') as display_name, 
                   email 
            FROM organizations 
            LIMIT 3
        ) LOOP
            RAISE NOTICE '  Org: % - % (%)', sample_record.id, sample_record.display_name, sample_record.email;
        END LOOP;
    ELSE
        RAISE NOTICE 'Organizations table does not exist';
    END IF;
    
    -- Check employees table  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        SELECT COUNT(*) INTO count_result FROM employees;
        RAISE NOTICE 'Employees count: %', count_result;
        
        -- Show sample data
        FOR sample_record IN (
            SELECT id, 
                   COALESCE(first_name, 'no name') as fname, 
                   COALESCE(last_name, '') as lname, 
                   email 
            FROM employees 
            LIMIT 3
        ) LOOP
            RAISE NOTICE '  Emp: % - % % (%)', sample_record.id, sample_record.fname, sample_record.lname, sample_record.email;
        END LOOP;
    ELSE
        RAISE NOTICE 'Employees table does not exist';
    END IF;
    
    -- Check for user_id columns in tables
    RAISE NOTICE '=== CHECKING FOR USER_ID COLUMNS ===';
    FOR table_record IN (
        SELECT t.table_name, c.column_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
        AND c.column_name LIKE '%user_id%'
        ORDER BY t.table_name
    ) LOOP
        RAISE NOTICE 'Table % has column %', table_record.table_name, table_record.column_name;
    END LOOP;
    
END $$;

-- Debug actual table structure to see what exists
DO $$
DECLARE
    table_record RECORD;
    column_record RECORD;
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
    PERFORM (
        SELECT RAISE NOTICE 'Auth user: % (email: %, confirmed: %)', 
            id, email, email_confirmed_at IS NOT NULL
        FROM auth.users
        LIMIT 5
    );
    
    RAISE NOTICE '=== CHECKING DATA IN EACH TABLE ===';
    
    -- Check organizations table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        EXECUTE 'SELECT COUNT(*) FROM organizations' INTO column_record;
        RAISE NOTICE 'Organizations count: %', column_record;
        
        -- Show sample data
        FOR column_record IN (
            EXECUTE 'SELECT id, COALESCE(name, company_name, ''no name'') as name, email FROM organizations LIMIT 3'
        ) LOOP
            RAISE NOTICE '  Org: % - % (%)', column_record.id, column_record.name, column_record.email;
        END LOOP;
    END IF;
    
    -- Check employees table  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        EXECUTE 'SELECT COUNT(*) FROM employees' INTO column_record;
        RAISE NOTICE 'Employees count: %', column_record;
        
        -- Show sample data
        FOR column_record IN (
            EXECUTE 'SELECT id, COALESCE(first_name, ''no name'') as fname, COALESCE(last_name, '''') as lname, email FROM employees LIMIT 3'
        ) LOOP
            RAISE NOTICE '  Emp: % - % % (%)', column_record.id, column_record.fname, column_record.lname, column_record.email;
        END LOOP;
    END IF;
    
END $$;

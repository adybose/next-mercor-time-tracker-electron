-- Safe task status system fix
-- First, let's see what we're working with and fix data step by step

DO $$
BEGIN
    -- Check if tasks table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
        
        -- Step 1: Remove any existing problematic constraints
        BEGIN
            ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_task_status_logic;
            ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors if constraints don't exist
            NULL;
        END;
        
        -- Step 2: Update invalid status values to valid ones
        -- Fix any tasks with invalid statuses
        UPDATE tasks 
        SET status = 'Open' 
        WHERE status NOT IN ('Open', 'Assigned', 'In Progress', 'Completed');
        
        -- Step 3: Fix data consistency issues
        -- Set unassigned tasks to "Open" status
        UPDATE tasks 
        SET status = 'Open' 
        WHERE employee_id IS NULL AND status != 'Open';
        
        -- Set assigned tasks to "Assigned" status if they have an employee but are marked as "Open"
        UPDATE tasks 
        SET status = 'Assigned' 
        WHERE employee_id IS NOT NULL AND status = 'Open';
        
        -- Step 4: Clean up any dummy/test data
        UPDATE tasks 
        SET status = 'Open', employee_id = NULL
        WHERE task_name ILIKE '%default%' OR task_name ILIKE '%dummy%' OR task_name ILIKE '%test%';
        
        -- Step 5: Add the constraint back (but only if data is consistent)
        BEGIN
            -- First check if all data is consistent
            IF NOT EXISTS (
                SELECT 1 FROM tasks 
                WHERE (status = 'Open' AND employee_id IS NOT NULL) 
                   OR (status IN ('Assigned', 'In Progress', 'Completed') AND employee_id IS NULL)
            ) THEN
                -- Data is consistent, add the constraint
                ALTER TABLE tasks 
                ADD CONSTRAINT check_task_status_logic 
                CHECK (
                    (status = 'Open' AND employee_id IS NULL) OR
                    (status IN ('Assigned', 'In Progress', 'Completed') AND employee_id IS NOT NULL)
                );
                
                RAISE NOTICE 'Task status constraint added successfully';
            ELSE
                RAISE NOTICE 'Data inconsistency found, constraint not added. Please check task data.';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add constraint: %', SQLERRM;
        END;
        
        RAISE NOTICE 'Task status system fix completed';
    ELSE
        RAISE NOTICE 'Tasks table does not exist, skipping';
    END IF;
END $$;

-- Verify the results
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
        RAISE NOTICE 'Task status distribution:';
        RAISE NOTICE 'Open tasks: %', (SELECT COUNT(*) FROM tasks WHERE status = 'Open');
        RAISE NOTICE 'Assigned tasks: %', (SELECT COUNT(*) FROM tasks WHERE status = 'Assigned');
        RAISE NOTICE 'In Progress tasks: %', (SELECT COUNT(*) FROM tasks WHERE status = 'In Progress');
        RAISE NOTICE 'Completed tasks: %', (SELECT COUNT(*) FROM tasks WHERE status = 'Completed');
        RAISE NOTICE 'Tasks with employees: %', (SELECT COUNT(*) FROM tasks WHERE employee_id IS NOT NULL);
        RAISE NOTICE 'Tasks without employees: %', (SELECT COUNT(*) FROM tasks WHERE employee_id IS NULL);
    END IF;
END $$;

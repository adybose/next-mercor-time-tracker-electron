-- Add sample data for testing (Fixed version)

DO $$
DECLARE
    org_id UUID;
    emp1_id UUID;
    emp2_id UUID;
    proj1_id UUID;
    proj2_id UUID;
    task1_id UUID;
    task2_id UUID;
    team1_id UUID;
BEGIN
    -- Get or create organization (handle duplicates)
    SELECT id INTO org_id FROM organizations WHERE email = 'admin@acme.com' LIMIT 1;
    
    IF org_id IS NULL THEN
        INSERT INTO organizations (name, email) 
        VALUES ('Acme Corp', 'admin@acme.com') 
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO org_id;
        
        -- If still null, get the existing one
        IF org_id IS NULL THEN
            SELECT id INTO org_id FROM organizations WHERE email = 'admin@acme.com' LIMIT 1;
        END IF;
    END IF;

    -- Add sample employees (handle duplicates)
    INSERT INTO employees (organization_id, email, first_name, last_name, is_active, email_verified)
    VALUES 
        (org_id, 'john.doe@acme.com', 'John', 'Doe', true, true),
        (org_id, 'jane.smith@acme.com', 'Jane', 'Smith', true, true)
    ON CONFLICT (email) DO UPDATE SET 
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        is_active = EXCLUDED.is_active,
        email_verified = EXCLUDED.email_verified;

    -- Get employee IDs
    SELECT id INTO emp1_id FROM employees WHERE email = 'john.doe@acme.com' LIMIT 1;
    SELECT id INTO emp2_id FROM employees WHERE email = 'jane.smith@acme.com' LIMIT 1;

    -- Add sample projects (handle duplicates)
    INSERT INTO projects (organization_id, name, description, is_active)
    VALUES 
        (org_id, 'Website Redesign', 'Complete redesign of company website', true),
        (org_id, 'Mobile App Development', 'Develop new mobile application', true)
    ON CONFLICT DO NOTHING;

    -- Get project IDs
    SELECT id INTO proj1_id FROM projects WHERE name = 'Website Redesign' AND organization_id = org_id LIMIT 1;
    SELECT id INTO proj2_id FROM projects WHERE name = 'Mobile App Development' AND organization_id = org_id LIMIT 1;

    -- Add sample tasks
    IF proj1_id IS NOT NULL THEN
        INSERT INTO tasks (project_id, name, description, is_active)
        VALUES 
            (proj1_id, 'Frontend Development', 'Develop frontend components', true),
            (proj1_id, 'Backend API', 'Create backend API endpoints', true)
        ON CONFLICT DO NOTHING;
    END IF;

    IF proj2_id IS NOT NULL THEN
        INSERT INTO tasks (project_id, name, description, is_active)
        VALUES 
            (proj2_id, 'UI Design', 'Design mobile app interface', true),
            (proj2_id, 'App Development', 'Develop mobile application', true)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Add sample team (handle duplicates)
    INSERT INTO teams (organization_id, name, description)
    VALUES (org_id, 'Development Team', 'Main development team')
    ON CONFLICT DO NOTHING;

    -- Get team ID
    SELECT id INTO team1_id FROM teams WHERE name = 'Development Team' AND organization_id = org_id LIMIT 1;

    -- Check if employee_teams table exists before inserting
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_teams') THEN
        -- Assign employees to team
        IF emp1_id IS NOT NULL AND team1_id IS NOT NULL THEN
            INSERT INTO employee_teams (employee_id, team_id) 
            VALUES (emp1_id, team1_id) 
            ON CONFLICT DO NOTHING;
        END IF;
        
        IF emp2_id IS NOT NULL AND team1_id IS NOT NULL THEN
            INSERT INTO employee_teams (employee_id, team_id) 
            VALUES (emp2_id, team1_id) 
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- Check if employee_projects table exists before inserting
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_projects') THEN
        -- Assign employees to projects
        IF emp1_id IS NOT NULL AND proj1_id IS NOT NULL THEN
            INSERT INTO employee_projects (employee_id, project_id) 
            VALUES (emp1_id, proj1_id) 
            ON CONFLICT DO NOTHING;
        END IF;
        
        IF emp2_id IS NOT NULL AND proj2_id IS NOT NULL THEN
            INSERT INTO employee_projects (employee_id, project_id) 
            VALUES (emp2_id, proj2_id) 
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- Add sample time entries
    SELECT id INTO task1_id FROM tasks WHERE project_id = proj1_id LIMIT 1;
    
    IF emp1_id IS NOT NULL AND proj1_id IS NOT NULL AND task1_id IS NOT NULL THEN
        INSERT INTO time_entries (employee_id, project_id, task_id, start_time, end_time, duration_seconds, description)
        VALUES 
            (emp1_id, proj1_id, task1_id, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 3600, 'Working on frontend components'),
            (emp1_id, proj1_id, task1_id, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '2 hours', 7200, 'Implementing user authentication')
        ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE 'Sample data setup completed successfully';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in sample data setup: %', SQLERRM;
        -- Don't fail the entire script, just log the error
END $$;

-- Add sample data for testing (Fixed version with dynamic IDs)

DO $$
DECLARE
    org_id UUID;
    emp1_id UUID;
    emp2_id UUID;
    emp3_id UUID;
    proj1_id UUID;
    proj2_id UUID;
    proj3_id UUID;
    task1_id UUID;
    task2_id UUID;
    task3_id UUID;
    task4_id UUID;
    team1_id UUID;
    team2_id UUID;
BEGIN
    -- Get existing organization or create one
    SELECT id INTO org_id FROM organizations LIMIT 1;
    
    IF org_id IS NULL THEN
        INSERT INTO organizations (name, email) 
        VALUES ('Acme Corporation', 'admin@acme.com') 
        RETURNING id INTO org_id;
        RAISE NOTICE 'Created new organization with ID: %', org_id;
    ELSE
        RAISE NOTICE 'Using existing organization with ID: %', org_id;
    END IF;

    -- Insert sample employees with the actual organization ID
    INSERT INTO employees (organization_id, email, first_name, last_name, is_active, email_verified) 
    VALUES 
        (org_id, 'john.doe@acme.com', 'John', 'Doe', true, true),
        (org_id, 'jane.smith@acme.com', 'Jane', 'Smith', true, true),
        (org_id, 'mike.wilson@acme.com', 'Mike', 'Wilson', true, false)
    ON CONFLICT (email) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        is_active = EXCLUDED.is_active,
        email_verified = EXCLUDED.email_verified
    RETURNING id;

    -- Get employee IDs
    SELECT id INTO emp1_id FROM employees WHERE email = 'john.doe@acme.com';
    SELECT id INTO emp2_id FROM employees WHERE email = 'jane.smith@acme.com';
    SELECT id INTO emp3_id FROM employees WHERE email = 'mike.wilson@acme.com';

    -- Insert sample teams
    INSERT INTO teams (organization_id, name, description) 
    VALUES 
        (org_id, 'Development Team', 'Frontend and backend developers'),
        (org_id, 'Design Team', 'UI/UX designers and graphic artists')
    ON CONFLICT DO NOTHING;

    -- Get team IDs
    SELECT id INTO team1_id FROM teams WHERE name = 'Development Team' AND organization_id = org_id;
    SELECT id INTO team2_id FROM teams WHERE name = 'Design Team' AND organization_id = org_id;

    -- Insert sample projects
    INSERT INTO projects (organization_id, name, description, is_active) 
    VALUES 
        (org_id, 'Website Redesign', 'Complete overhaul of company website', true),
        (org_id, 'Mobile App Development', 'iOS and Android mobile application', true),
        (org_id, 'API Integration', 'Third-party API integrations', false)
    ON CONFLICT DO NOTHING;

    -- Get project IDs
    SELECT id INTO proj1_id FROM projects WHERE name = 'Website Redesign' AND organization_id = org_id;
    SELECT id INTO proj2_id FROM projects WHERE name = 'Mobile App Development' AND organization_id = org_id;
    SELECT id INTO proj3_id FROM projects WHERE name = 'API Integration' AND organization_id = org_id;

    -- Insert sample tasks
    IF proj1_id IS NOT NULL THEN
        INSERT INTO tasks (project_id, name, description, is_active) 
        VALUES 
            (proj1_id, 'Frontend Development', 'React components and styling', true),
            (proj1_id, 'Backend API', 'REST API development', true)
        ON CONFLICT DO NOTHING;
    END IF;

    IF proj2_id IS NOT NULL THEN
        INSERT INTO tasks (project_id, name, description, is_active) 
        VALUES 
            (proj2_id, 'UI Design', 'Mobile app user interface design', true),
            (proj2_id, 'App Development', 'React Native development', true)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Get task IDs
    SELECT id INTO task1_id FROM tasks WHERE name = 'Frontend Development' AND project_id = proj1_id;
    SELECT id INTO task2_id FROM tasks WHERE name = 'Backend API' AND project_id = proj1_id;
    SELECT id INTO task3_id FROM tasks WHERE name = 'UI Design' AND project_id = proj2_id;
    SELECT id INTO task4_id FROM tasks WHERE name = 'App Development' AND project_id = proj2_id;

    -- Insert project assignments (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_assignments') THEN
        INSERT INTO project_assignments (employee_id, project_id) 
        VALUES 
            (emp1_id, proj1_id),
            (emp1_id, proj2_id),
            (emp2_id, proj1_id),
            (emp3_id, proj2_id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert task assignments (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_assignments') THEN
        IF task1_id IS NOT NULL AND emp1_id IS NOT NULL THEN
            INSERT INTO task_assignments (task_id, employee_id) VALUES (task1_id, emp1_id) ON CONFLICT DO NOTHING;
        END IF;
        IF task2_id IS NOT NULL AND emp2_id IS NOT NULL THEN
            INSERT INTO task_assignments (task_id, employee_id) VALUES (task2_id, emp2_id) ON CONFLICT DO NOTHING;
        END IF;
        IF task3_id IS NOT NULL AND emp3_id IS NOT NULL THEN
            INSERT INTO task_assignments (task_id, employee_id) VALUES (task3_id, emp3_id) ON CONFLICT DO NOTHING;
        END IF;
        IF task4_id IS NOT NULL AND emp1_id IS NOT NULL THEN
            INSERT INTO task_assignments (task_id, employee_id) VALUES (task4_id, emp1_id) ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- Insert sample time entries
    IF emp1_id IS NOT NULL AND proj1_id IS NOT NULL AND task1_id IS NOT NULL THEN
        INSERT INTO time_entries (employee_id, project_id, task_id, start_time, end_time, duration_seconds, description) 
        VALUES 
            (emp1_id, proj1_id, task1_id, '2024-01-15 09:00:00+00', '2024-01-15 17:00:00+00', 28800, 'Working on homepage components'),
            (emp1_id, proj2_id, task4_id, '2024-01-16 09:30:00+00', NULL, NULL, 'Currently working on mobile app features')
        ON CONFLICT DO NOTHING;
    END IF;

    IF emp2_id IS NOT NULL AND proj1_id IS NOT NULL AND task2_id IS NOT NULL THEN
        INSERT INTO time_entries (employee_id, project_id, task_id, start_time, end_time, duration_seconds, description) 
        VALUES 
            (emp2_id, proj1_id, task2_id, '2024-01-15 10:00:00+00', '2024-01-15 18:00:00+00', 28800, 'API endpoint development')
        ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE 'Sample data setup completed successfully with organization ID: %', org_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in sample data setup: %', SQLERRM;
        -- Continue execution, don't fail
END $$;

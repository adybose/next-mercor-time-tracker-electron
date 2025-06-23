-- Fix employee data access issues
DO $$
BEGIN
    RAISE NOTICE 'Fixing employee data access...';
    
    -- Ensure employees can read their organization data
    DROP POLICY IF EXISTS "Employees can view their organization" ON organizations;
    CREATE POLICY "Employees can view their organization" ON organizations
        FOR SELECT USING (
            id IN (
                SELECT organization_id 
                FROM employees 
                WHERE id = auth.uid()
            )
        );
    
    -- Ensure employees can read their assigned tasks
    DROP POLICY IF EXISTS "Employees can view their tasks" ON tasks;
    CREATE POLICY "Employees can view their tasks" ON tasks
        FOR ALL USING (employee_id = auth.uid());
    
    -- Ensure employees can read projects they have tasks in
    DROP POLICY IF EXISTS "Employees can view their projects" ON projects;
    CREATE POLICY "Employees can view their projects" ON projects
        FOR SELECT USING (
            id IN (
                SELECT project_id 
                FROM tasks 
                WHERE employee_id = auth.uid()
            )
        );
    
    -- Ensure employees can manage their time entries
    DROP POLICY IF EXISTS "Employees can manage their time entries" ON time_entries;
    CREATE POLICY "Employees can manage their time entries" ON time_entries
        FOR ALL USING (employee_id = auth.uid());
    
    RAISE NOTICE 'Employee data access policies updated successfully!';
END $$;

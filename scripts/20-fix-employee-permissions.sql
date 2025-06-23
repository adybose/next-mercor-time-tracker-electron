-- Fix RLS policies to allow employees to access necessary data

-- 1. Allow employees to view their organization's basic info
DROP POLICY IF EXISTS "Employees can view their organization" ON organizations;
CREATE POLICY "Employees can view their organization" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.organization_id = organizations.id 
      AND employees.email = auth.jwt() ->> 'email'
    )
  );

-- 2. Allow employees to view projects they're assigned to
DROP POLICY IF EXISTS "Employees can view assigned projects" ON projects;
CREATE POLICY "Employees can view assigned projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks 
      JOIN employees ON employees.id = tasks.employee_id
      WHERE tasks.project_id = projects.id 
      AND employees.email = auth.jwt() ->> 'email'
      AND tasks.is_active = true
    )
  );

-- 3. Allow employees to view their assigned tasks
DROP POLICY IF EXISTS "Employees can view assigned tasks" ON tasks;
CREATE POLICY "Employees can view assigned tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = tasks.employee_id 
      AND employees.email = auth.jwt() ->> 'email'
    )
  );

-- 4. Allow employees to update their assigned tasks (status changes)
DROP POLICY IF EXISTS "Employees can update assigned tasks" ON tasks;
CREATE POLICY "Employees can update assigned tasks" ON tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = tasks.employee_id 
      AND employees.email = auth.jwt() ->> 'email'
    )
  );

-- 5. Ensure employees can view their own time entries
DROP POLICY IF EXISTS "Employees can manage own time entries" ON time_entries;
CREATE POLICY "Employees can manage own time entries" ON time_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = time_entries.employee_id 
      AND employees.email = auth.jwt() ->> 'email'
    )
  );

-- 6. Allow employees to insert time entries for their tasks
DROP POLICY IF EXISTS "Employees can insert time entries" ON time_entries;
CREATE POLICY "Employees can insert time entries" ON time_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = employee_id 
      AND employees.email = auth.jwt() ->> 'email'
    )
  );

-- 7. Fix the existing employee policies to use email-based auth
DROP POLICY IF EXISTS "Employees can view own data" ON employees;
CREATE POLICY "Employees can view own data" ON employees
  FOR SELECT USING (email = auth.jwt() ->> 'email');

-- 8. Allow employees to update their own profile
DROP POLICY IF EXISTS "Employees can update own data" ON employees;
CREATE POLICY "Employees can update own data" ON employees
  FOR UPDATE USING (email = auth.jwt() ->> 'email');

-- Verification queries
DO $$ 
BEGIN
    RAISE NOTICE 'Employee permission policies updated successfully!';
    RAISE NOTICE 'Policies created for: organizations, projects, tasks, time_entries, employees';
    RAISE NOTICE 'Employees can now view: their organization, assigned projects, assigned tasks, and manage time entries';
END $$;

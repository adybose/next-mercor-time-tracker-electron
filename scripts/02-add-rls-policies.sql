-- RLS Policies for organizations
CREATE POLICY "Organizations can view own data" ON organizations
  FOR ALL USING (auth.uid()::text = id::text);

-- RLS Policies for employees
CREATE POLICY "Organizations can manage their employees" ON employees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = employees.organization_id 
      AND auth.uid()::text = organizations.id::text
    )
  );

CREATE POLICY "Employees can view own data" ON employees
  FOR SELECT USING (auth.uid()::text = id::text);

-- RLS Policies for teams
CREATE POLICY "Organizations can manage their teams" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = teams.organization_id 
      AND auth.uid()::text = organizations.id::text
    )
  );

-- RLS Policies for team_members
CREATE POLICY "Organizations can manage team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams 
      JOIN organizations ON organizations.id = teams.organization_id
      WHERE teams.id = team_members.team_id 
      AND auth.uid()::text = organizations.id::text
    )
  );

-- RLS Policies for projects
CREATE POLICY "Organizations can manage their projects" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = projects.organization_id 
      AND auth.uid()::text = organizations.id::text
    )
  );

-- RLS Policies for project_assignments
CREATE POLICY "Organizations can manage project assignments" ON project_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      JOIN organizations ON organizations.id = projects.organization_id
      WHERE projects.id = project_assignments.project_id 
      AND auth.uid()::text = organizations.id::text
    )
  );

-- RLS Policies for tasks
CREATE POLICY "Organizations can manage tasks" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      JOIN organizations ON organizations.id = projects.organization_id
      WHERE projects.id = tasks.project_id 
      AND auth.uid()::text = organizations.id::text
    )
  );

-- RLS Policies for task_assignments
CREATE POLICY "Organizations can manage task assignments" ON task_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks 
      JOIN projects ON projects.id = tasks.project_id
      JOIN organizations ON organizations.id = projects.organization_id
      WHERE tasks.id = task_assignments.task_id 
      AND auth.uid()::text = organizations.id::text
    )
  );

-- RLS Policies for time_entries
CREATE POLICY "Organizations can view employee time entries" ON time_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees 
      JOIN organizations ON organizations.id = employees.organization_id
      WHERE employees.id = time_entries.employee_id 
      AND auth.uid()::text = organizations.id::text
    )
  );

CREATE POLICY "Employees can manage own time entries" ON time_entries
  FOR ALL USING (auth.uid()::text = employee_id::text);

-- RLS Policies for screenshots
CREATE POLICY "Organizations can view employee screenshots" ON screenshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees 
      JOIN organizations ON organizations.id = employees.organization_id
      WHERE employees.id = screenshots.employee_id 
      AND auth.uid()::text = organizations.id::text
    )
  );

CREATE POLICY "Employees can manage own screenshots" ON screenshots
  FOR ALL USING (auth.uid()::text = employee_id::text);

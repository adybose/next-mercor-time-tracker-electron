-- Complete Fresh Database Setup
-- This single script replaces all previous scripts (00-31)

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS public.time_entries CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Disable RLS temporarily for setup
ALTER TABLE IF EXISTS public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.time_entries DISABLE ROW LEVEL SECURITY;

-- Create organizations table
CREATE TABLE public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Create employees table
CREATE TABLE public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'In Progress', 'Completed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    estimated_hours INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create time_entries table
CREATE TABLE public.time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    current_duration_seconds INTEGER DEFAULT 0,
    description TEXT,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed')),
    is_active BOOLEAN DEFAULT true,
    pause_start_time TIMESTAMP WITH TIME ZONE,
    total_paused_seconds INTEGER DEFAULT 0,
    ip_address TEXT,
    mac_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_employees_organization_id ON public.employees(organization_id);
CREATE INDEX idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_employee_id ON public.tasks(employee_id);
CREATE INDEX idx_time_entries_task_id ON public.time_entries(task_id);
CREATE INDEX idx_time_entries_employee_id ON public.time_entries(employee_id);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies (no recursion)
-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view their organization" ON public.organizations
    FOR ALL USING (
        id IN (
            SELECT organization_id 
            FROM public.employees 
            WHERE user_id = auth.uid()
        )
    );

-- Employees: Users can see employees in their organization
CREATE POLICY "Users can view organization employees" ON public.employees
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.employees 
            WHERE user_id = auth.uid()
        )
    );

-- Projects: Users can see projects in their organization
CREATE POLICY "Users can view organization projects" ON public.projects
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.employees 
            WHERE user_id = auth.uid()
        )
    );

-- Tasks: Users can see tasks in their organization
CREATE POLICY "Users can view organization tasks" ON public.tasks
    FOR ALL USING (
        employee_id IN (
            SELECT id 
            FROM public.employees 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM public.employees 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Time entries: Users can see time entries in their organization
CREATE POLICY "Users can view organization time entries" ON public.time_entries
    FOR ALL USING (
        employee_id IN (
            SELECT id 
            FROM public.employees 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM public.employees 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Create trigger function for user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create employee record if one doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.employees WHERE user_id = NEW.id) THEN
        -- Try to find existing employee by email and link them
        UPDATE public.employees 
        SET user_id = NEW.id 
        WHERE email = NEW.email AND user_id IS NULL;
        
        -- If no existing employee found, this is handled by the application
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample data
INSERT INTO public.organizations (id, name, company_name) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'AcmeAI', 'AcmeAI Corporation');

INSERT INTO public.employees (id, organization_id, email, first_name, last_name, role) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'admin@acmeai.com', 'Admin', 'User', 'admin'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'adi26mar@gmail.com', 'Adi', 'B', 'employee');

INSERT INTO public.projects (id, organization_id, name, description) VALUES 
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Test Project 1', 'First test project'),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Test Project 2', 'Second test project');

INSERT INTO public.tasks (id, project_id, employee_id, task_name, description, status) VALUES 
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Test Project 1 Task 1', 'First task for project 1', 'Assigned'),
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Test Project 1 Task 2', 'Second task for project 1', 'Completed'),
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Test Project 1 Task 1', 'Another task', 'Completed');

-- Insert sample time entry for completed task
INSERT INTO public.time_entries (task_id, employee_id, start_time, end_time, duration_seconds, status) VALUES 
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 3600, 'completed');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

SELECT 'Database setup completed successfully!' as result;

-- Add sample data for testing the application

-- Insert sample organization
INSERT INTO organizations (id, name, email) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Acme Corporation', 'admin@acme.com')
ON CONFLICT (email) DO NOTHING;

-- Insert sample employees
INSERT INTO employees (id, organization_id, email, first_name, last_name, is_active, email_verified) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'john.doe@acme.com', 'John', 'Doe', true, true),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'jane.smith@acme.com', 'Jane', 'Smith', true, true),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'mike.wilson@acme.com', 'Mike', 'Wilson', true, false)
ON CONFLICT (email) DO NOTHING;

-- Insert sample teams
INSERT INTO teams (id, organization_id, name, description) VALUES 
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Development Team', 'Frontend and backend developers'),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Design Team', 'UI/UX designers and graphic artists')
ON CONFLICT DO NOTHING;

-- Insert sample projects
INSERT INTO projects (id, organization_id, name, description, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', 'Website Redesign', 'Complete overhaul of company website', true),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', 'Mobile App Development', 'iOS and Android mobile application', true),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', 'API Integration', 'Third-party API integrations', false)
ON CONFLICT DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (id, project_id, name, description, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440020', 'Frontend Development', 'React components and styling', true),
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440020', 'Backend API', 'REST API development', true),
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440021', 'UI Design', 'Mobile app user interface design', true),
('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440021', 'App Development', 'React Native development', true)
ON CONFLICT DO NOTHING;

-- Insert sample project assignments
INSERT INTO project_assignments (employee_id, project_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440020'),
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440021'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440020'),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440021')
ON CONFLICT DO NOTHING;

-- Insert sample time entries
INSERT INTO time_entries (id, employee_id, project_id, task_id, start_time, end_time, duration_seconds, description) VALUES 
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440030', '2024-01-15 09:00:00+00', '2024-01-15 17:00:00+00', 28800, 'Working on homepage components'),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440031', '2024-01-15 10:00:00+00', '2024-01-15 18:00:00+00', 28800, 'API endpoint development'),
('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440033', '2024-01-16 09:30:00+00', NULL, NULL, 'Currently working on mobile app features')
ON CONFLICT DO NOTHING;

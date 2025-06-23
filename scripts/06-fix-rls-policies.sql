-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Organizations can view own data" ON organizations;

-- Create more permissive policies for organizations
CREATE POLICY "Users can insert their own organization" ON organizations
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Organizations can view own data" ON organizations
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Organizations can update own data" ON organizations
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Fix employees policies to be less restrictive for initial setup
DROP POLICY IF EXISTS "Organizations can manage their employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own data" ON employees;

CREATE POLICY "Organizations can manage their employees" ON employees
  FOR ALL USING (
    auth.uid()::text = organization_id::text OR
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = employees.organization_id 
      AND auth.uid()::text = organizations.id::text
    )
  );

CREATE POLICY "Employees can view own data" ON employees
  FOR SELECT USING (
    auth.uid()::text = id::text OR
    auth.uid()::text = organization_id::text
  );

CREATE POLICY "Employees can insert own data" ON employees
  FOR INSERT WITH CHECK (
    auth.uid()::text = id::text OR
    auth.uid()::text = organization_id::text
  );

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create organization record if user_type is 'organization'
  IF NEW.raw_user_meta_data->>'user_type' = 'organization' THEN
    INSERT INTO organizations (id, name, email)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'organization_name',
      NEW.email
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

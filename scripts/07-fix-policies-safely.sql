-- Safely drop and recreate policies for organizations
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can insert their own organization" ON organizations;
    DROP POLICY IF EXISTS "Organizations can view own data" ON organizations;
    DROP POLICY IF EXISTS "Organizations can update own data" ON organizations;
    
    -- Create new policies
    CREATE POLICY "Users can insert their own organization" ON organizations
      FOR INSERT WITH CHECK (auth.uid()::text = id::text);

    CREATE POLICY "Organizations can view own data" ON organizations
      FOR SELECT USING (auth.uid()::text = id::text);

    CREATE POLICY "Organizations can update own data" ON organizations
      FOR UPDATE USING (auth.uid()::text = id::text);
END $$;

-- Safely handle employees policies
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Organizations can manage their employees" ON employees;
    DROP POLICY IF EXISTS "Employees can view own data" ON employees;
    DROP POLICY IF EXISTS "Employees can insert own data" ON employees;
    
    -- Create new policies for employees
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
END $$;

-- Safely create or replace the trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create organization record if user_type is 'organization'
  IF NEW.raw_user_meta_data->>'user_type' = 'organization' THEN
    INSERT INTO organizations (id, name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'organization_name', 'New Organization'),
      NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

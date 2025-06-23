-- Fix the user creation trigger and add better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_name TEXT;
BEGIN
  -- Only create organization record if user_type is 'organization'
  IF NEW.raw_user_meta_data->>'user_type' = 'organization' THEN
    -- Get organization name from metadata, with fallback
    org_name := COALESCE(
      NEW.raw_user_meta_data->>'organization_name', 
      'New Organization'
    );
    
    -- Insert organization record
    INSERT INTO organizations (id, name, email, created_at, updated_at)
    VALUES (
      NEW.id,
      org_name,
      NEW.email,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating organization for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also ensure RLS is properly configured
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Update RLS policies to be more permissive for new user creation
DROP POLICY IF EXISTS "Users can insert their own organization" ON organizations;
CREATE POLICY "Users can insert their own organization" ON organizations
  FOR INSERT WITH CHECK (true); -- Allow all inserts, the trigger handles the logic

DROP POLICY IF EXISTS "Organizations can view own data" ON organizations;
CREATE POLICY "Organizations can view own data" ON organizations
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Organizations can update own data" ON organizations;
CREATE POLICY "Organizations can update own data" ON organizations
  FOR UPDATE USING (auth.uid() = id);

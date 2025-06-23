-- Debug and fix the trigger function
-- First, let's check what's in the auth.users table
SELECT 
  id, 
  email, 
  raw_user_meta_data,
  raw_user_meta_data->>'user_type' as user_type,
  raw_user_meta_data->>'organization_name' as org_name
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Fix the trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_name TEXT;
  user_type TEXT;
BEGIN
  -- Get user type and organization name
  user_type := NEW.raw_user_meta_data->>'user_type';
  org_name := NEW.raw_user_meta_data->>'organization_name';
  
  RAISE LOG 'Processing new user: %, type: %, org: %', NEW.id, user_type, org_name;
  
  -- Only create organization record if user_type is 'organization'
  IF user_type = 'organization' THEN
    -- Use fallback if organization name is null
    org_name := COALESCE(org_name, 'New Organization');
    
    RAISE LOG 'Creating organization for user % with name %', NEW.id, org_name;
    
    -- Insert organization record
    INSERT INTO public.organizations (id, name, email, created_at, updated_at)
    VALUES (
      NEW.id,
      org_name,
      NEW.email,
      NOW(),
      NOW()
    );
    
    RAISE LOG 'Successfully created organization for user %', NEW.id;
  ELSE
    RAISE LOG 'Skipping organization creation for user % (type: %)', NEW.id, user_type;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating organization for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

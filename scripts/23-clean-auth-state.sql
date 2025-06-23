-- Clean up corrupted authentication state
DO $$
BEGIN
  RAISE NOTICE 'Cleaning up authentication state...';
  
  -- Clear any corrupted sessions or tokens
  -- Note: This will log out all users, but it's necessary to fix the issue
  DELETE FROM auth.sessions WHERE expires_at < NOW();
  DELETE FROM auth.refresh_tokens WHERE expires_at < NOW();
  
  RAISE NOTICE 'Cleaned up expired sessions and tokens';
  
  -- Verify user records are properly linked
  UPDATE auth.users 
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{user_type}',
    '"organization"'
  )
  WHERE id IN (SELECT id FROM organizations);
  
  UPDATE auth.users 
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{user_type}',
    '"employee"'
  )
  WHERE id IN (SELECT id FROM employees);
  
  RAISE NOTICE 'Updated user metadata for proper type detection';
  
END $$;

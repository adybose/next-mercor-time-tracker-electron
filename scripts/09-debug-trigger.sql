-- Debug script to check if the trigger is working properly

-- Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if the function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Test the function manually (you can run this after a user signs up)
-- SELECT handle_new_user() FROM auth.users WHERE email = 'your-test-email@example.com';

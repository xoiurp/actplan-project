/*
  # Fix user trigger permissions

  1. Changes
    - Grant necessary permissions to the trigger function
    - Enable trigger for authenticated and anon roles
    - Add error handling for missing user data

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Limited to specific operations needed
*/

-- Revoke existing permissions to start fresh
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Drop and recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Validate required data
  IF new.email IS NULL THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  -- Insert into public.users with proper error handling
  BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
      new.id,
      new.email,
      COALESCE((new.raw_user_meta_data->>'name')::text, '')
    );
  EXCEPTION WHEN unique_violation THEN
    -- Ignore if user already exists
    RETURN new;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user record: %', SQLERRM;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- Grant execute permission to the authenticator role
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Ensure the trigger exists and is enabled
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions on the users table
GRANT INSERT ON public.users TO service_role;
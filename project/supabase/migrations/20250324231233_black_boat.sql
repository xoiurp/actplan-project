/*
  # Fix user trigger and policies

  1. Changes
    - Add policy existence check before creation
    - Ensure proper permissions for service role
    - Improve error handling in trigger function
    - Fix search_path issues

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Limited to specific operations needed
*/

-- Drop existing trigger and function to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the function with proper permissions and error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  _name text;
BEGIN
  -- Get name from metadata with fallback
  _name := COALESCE(
    (new.raw_user_meta_data->>'name')::text,
    split_part(new.email, '@', 1)
  );

  -- Insert into public.users with proper error handling
  BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (new.id, new.email, _name);
  EXCEPTION 
    WHEN unique_violation THEN
      -- Log and ignore if user already exists
      RAISE NOTICE 'User already exists: %', new.email;
      RETURN new;
    WHEN OTHERS THEN
      -- Log other errors but don't block auth
      RAISE WARNING 'Failed to create user record: % %', SQLERRM, new.email;
      RETURN new;
  END;

  RETURN new;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant proper permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT ON auth.users TO service_role;
GRANT ALL ON public.users TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Ensure RLS is enabled but service_role can bypass it
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own data" ON public.users;
  DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create policy for authenticated users to read their own data
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create policy for service_role to manage all users
CREATE POLICY "Service role can manage all users"
  ON public.users
  TO service_role
  USING (true)
  WITH CHECK (true);
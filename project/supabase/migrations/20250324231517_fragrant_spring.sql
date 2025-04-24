/*
  # Fix user creation and duplicate email handling

  1. Changes
    - Add better error handling for duplicate emails
    - Ensure proper user creation from auth
    - Fix permissions and policies

  2. Security
    - Maintain RLS policies
    - Grant minimum required permissions
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
  _existing_user_id uuid;
BEGIN
  -- Get name from metadata with fallback
  _name := COALESCE(
    (new.raw_user_meta_data->>'name')::text,
    split_part(new.email, '@', 1)
  );

  -- Check if a user with this email already exists
  SELECT id INTO _existing_user_id
  FROM public.users
  WHERE email = new.email;

  IF _existing_user_id IS NOT NULL THEN
    -- If the user exists but has a different ID, update the ID
    IF _existing_user_id != new.id THEN
      UPDATE public.users
      SET id = new.id
      WHERE id = _existing_user_id;
    END IF;
    RETURN new;
  END IF;

  -- Insert new user if they don't exist
  INSERT INTO public.users (id, email, name)
  VALUES (new.id, new.email, _name);

  RETURN new;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error but don't block auth
    RAISE WARNING 'Failed to handle new user: % %', SQLERRM, new.email;
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

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own data" ON public.users;
  DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
  DROP POLICY IF EXISTS "Users can update own data" ON public.users;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create policies
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can manage all users"
  ON public.users
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sync any missing users from auth.users
INSERT INTO public.users (id, email, name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)) as name
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE users.id = auth.users.id
)
ON CONFLICT (email) DO UPDATE
SET id = EXCLUDED.id;
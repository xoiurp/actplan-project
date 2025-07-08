/*
  # Create trigger for auth users

  1. New Trigger
    - Creates a trigger that automatically creates a user record in the `users` table
    - Runs when a new user signs up through Supabase Auth
    - Copies email and metadata.name to users table
  
  2. Security
    - Trigger runs with security definer permissions
    - Only accessible to the postgres role
*/

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    new.id,
    new.email,
    (new.raw_user_meta_data->>'name')::text
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call this function after an insert on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Add birthdate and gender fields to profiles table for enhanced registration
-- These fields will be required during registration for better user experience

-- Add required validation fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say'));

-- Create function to validate user age (minimum 13 years old)
CREATE OR REPLACE FUNCTION public.validate_user_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.birthdate IS NOT NULL AND NEW.birthdate > (CURRENT_DATE - INTERVAL '13 years') THEN
    RAISE EXCEPTION 'User must be at least 13 years old to register';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate age on profile updates
DROP TRIGGER IF EXISTS validate_age_trigger ON public.profiles;
CREATE TRIGGER validate_age_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_age();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_birthdate ON public.profiles(birthdate);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender);
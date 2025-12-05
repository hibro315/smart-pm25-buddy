-- Add RLS policies for health_profiles table
-- Enable RLS (if not already enabled)
ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.health_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.health_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.health_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete their own profile" 
ON public.health_profiles 
FOR DELETE 
USING (auth.uid() = user_id);
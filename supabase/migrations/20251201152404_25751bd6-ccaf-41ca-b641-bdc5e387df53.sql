CREATE TABLE public.health_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  name TEXT,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  height NUMERIC,
  weight NUMERIC,
  occupation TEXT,
  work_environment TEXT,
  location TEXT,
  chronic_conditions TEXT[] DEFAULT '{}',
  allergies TEXT,
  immuno_compromised BOOLEAN DEFAULT false,
  smoking_status TEXT,
  alcohol_consumption TEXT,
  exercise_frequency INTEGER,
  dust_sensitivity TEXT NOT NULL,
  has_air_purifier BOOLEAN NOT NULL DEFAULT false,
  mask_usage TEXT,
  outdoor_time_daily INTEGER,
  physical_activity TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.health_profiles ADD CONSTRAINT health_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_health_profiles_user_id ON public.health_profiles(user_id);

ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;
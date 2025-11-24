-- Create vital_signs table for health monitoring
CREATE TABLE public.vital_signs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  heart_rate INTEGER NOT NULL,
  respiration_rate INTEGER NOT NULL,
  temperature NUMERIC(4,1) NOT NULL,
  bp_systolic INTEGER NOT NULL,
  bp_diastolic INTEGER NOT NULL,
  spo2 INTEGER NOT NULL,
  pulse_pressure INTEGER,
  mean_arterial_pressure NUMERIC(5,2),
  shock_index NUMERIC(4,2),
  risk_score INTEGER,
  risk_level TEXT,
  anomalies TEXT[],
  trends JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Enable Row Level Security
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own vital signs"
ON public.vital_signs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vital signs"
ON public.vital_signs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vital signs"
ON public.vital_signs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vital signs"
ON public.vital_signs
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_vital_signs_user_id ON public.vital_signs(user_id);
CREATE INDEX idx_vital_signs_created_at ON public.vital_signs(created_at DESC);
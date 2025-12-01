-- Create notification settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  aqi_threshold INTEGER DEFAULT 100,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '07:00:00',
  enable_quiet_hours BOOLEAN DEFAULT true,
  location_rules JSONB DEFAULT '[]'::jsonb,
  symptom_alerts_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own settings"
  ON public.notification_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.notification_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.notification_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create daily symptoms table
CREATE TABLE IF NOT EXISTS public.daily_symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  log_date DATE DEFAULT CURRENT_DATE,
  cough BOOLEAN DEFAULT false,
  cough_severity INTEGER CHECK (cough_severity BETWEEN 0 AND 10),
  sneeze BOOLEAN DEFAULT false,
  sneeze_severity INTEGER CHECK (sneeze_severity BETWEEN 0 AND 10),
  wheezing BOOLEAN DEFAULT false,
  wheezing_severity INTEGER CHECK (wheezing_severity BETWEEN 0 AND 10),
  chest_tightness BOOLEAN DEFAULT false,
  chest_tightness_severity INTEGER CHECK (chest_tightness_severity BETWEEN 0 AND 10),
  eye_irritation BOOLEAN DEFAULT false,
  eye_irritation_severity INTEGER CHECK (eye_irritation_severity BETWEEN 0 AND 10),
  fatigue BOOLEAN DEFAULT false,
  fatigue_severity INTEGER CHECK (fatigue_severity BETWEEN 0 AND 10),
  shortness_of_breath BOOLEAN DEFAULT false,
  shortness_of_breath_severity INTEGER CHECK (shortness_of_breath_severity BETWEEN 0 AND 10),
  notes TEXT,
  symptom_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Enable RLS
ALTER TABLE public.daily_symptoms ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own symptoms"
  ON public.daily_symptoms
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own symptoms"
  ON public.daily_symptoms
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own symptoms"
  ON public.daily_symptoms
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own symptoms"
  ON public.daily_symptoms
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger for notification_settings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
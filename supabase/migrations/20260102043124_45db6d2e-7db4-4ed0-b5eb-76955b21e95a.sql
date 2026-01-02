-- Create table for storing important health information extracted from conversations
CREATE TABLE public.user_health_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_type TEXT NOT NULL, -- 'medication', 'symptom', 'allergy', 'condition', 'preference'
  key TEXT NOT NULL, -- e.g., 'paracetamol', 'headache', 'penicillin'
  value TEXT, -- additional context/details
  frequency INTEGER DEFAULT 1, -- how many times mentioned
  confidence REAL DEFAULT 1.0, -- 0-1 confidence score
  last_mentioned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  first_mentioned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.user_health_memory ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own health memory"
ON public.user_health_memory
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own health memory"
ON public.user_health_memory
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health memory"
ON public.user_health_memory
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health memory"
ON public.user_health_memory
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_health_memory_user_type ON public.user_health_memory(user_id, memory_type);
CREATE INDEX idx_user_health_memory_key ON public.user_health_memory(user_id, key);

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_user_health_memory_updated_at
BEFORE UPDATE ON public.user_health_memory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create conversation_history table for storing chat messages
CREATE TABLE IF NOT EXISTS public.conversation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_conversation_history_user_session ON public.conversation_history(user_id, session_id, created_at DESC);
CREATE INDEX idx_conversation_history_created_at ON public.conversation_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own conversation history"
ON public.conversation_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
ON public.conversation_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation history"
ON public.conversation_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create health_knowledge table for storing curated health information
CREATE TABLE IF NOT EXISTS public.health_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for health knowledge
CREATE INDEX idx_health_knowledge_category ON public.health_knowledge(category);
CREATE INDEX idx_health_knowledge_tags ON public.health_knowledge USING GIN(tags);

-- Enable RLS for health_knowledge (read-only for all authenticated users)
ALTER TABLE public.health_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read health knowledge"
ON public.health_knowledge
FOR SELECT
USING (true);

-- Trigger for updating updated_at
CREATE TRIGGER update_health_knowledge_updated_at
BEFORE UPDATE ON public.health_knowledge
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
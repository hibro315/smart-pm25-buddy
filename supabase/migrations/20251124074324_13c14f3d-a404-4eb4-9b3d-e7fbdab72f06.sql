-- Create performance metrics table for monitoring system performance
CREATE TABLE public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  operation TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  latency_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own metrics" 
ON public.performance_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics" 
ON public.performance_metrics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_created_at ON public.performance_metrics(created_at);
CREATE INDEX idx_performance_metrics_type ON public.performance_metrics(metric_type);

-- Create view for performance summary
CREATE VIEW public.performance_summary AS
SELECT 
  user_id,
  metric_type,
  operation,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE success = true) as successful_calls,
  COUNT(*) FILTER (WHERE success = false) as failed_calls,
  ROUND((100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(*))::numeric, 2) as success_rate,
  ROUND(AVG(latency_ms)::numeric, 2) as avg_latency_ms,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2) as median_latency_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2) as p95_latency_ms,
  MAX(latency_ms) as max_latency_ms,
  MIN(created_at) as first_recorded,
  MAX(created_at) as last_recorded
FROM public.performance_metrics
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id, metric_type, operation;
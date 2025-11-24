-- Drop the old view
DROP VIEW IF EXISTS public.performance_summary;

-- Recreate view with SECURITY INVOKER (uses querying user's permissions)
CREATE VIEW public.performance_summary 
WITH (security_invoker = true)
AS
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
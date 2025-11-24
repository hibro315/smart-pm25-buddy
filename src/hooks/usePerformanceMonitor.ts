import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceMetric {
  metricType: 'air_quality' | 'location_monitor' | 'notification' | 'mask_detection';
  operation: string;
  success: boolean;
  latencyMs?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

interface PerformanceStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
  avgLatencyMs: number;
  medianLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
}

export const usePerformanceMonitor = () => {
  const trackMetric = useCallback(async (metric: PerformanceMetric) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('performance_metrics').insert({
        user_id: user.id,
        metric_type: metric.metricType,
        operation: metric.operation,
        success: metric.success,
        latency_ms: metric.latencyMs,
        error_message: metric.errorMessage,
        metadata: metric.metadata || {}
      });
    } catch (error) {
      // Silently fail - don't interrupt user experience
      console.error('Failed to track performance metric:', error);
    }
  }, []);

  const getPerformanceStats = useCallback(async (
    metricType?: string,
    operation?: string
  ): Promise<PerformanceStats[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('performance_summary')
        .select('*')
        .eq('user_id', user.id);

      if (metricType) {
        query = query.eq('metric_type', metricType);
      }
      if (operation) {
        query = query.eq('operation', operation);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(row => ({
        totalCalls: row.total_calls,
        successfulCalls: row.successful_calls,
        failedCalls: row.failed_calls,
        successRate: typeof row.success_rate === 'number' ? row.success_rate : parseFloat(String(row.success_rate || '0')),
        avgLatencyMs: typeof row.avg_latency_ms === 'number' ? row.avg_latency_ms : parseFloat(String(row.avg_latency_ms || '0')),
        medianLatencyMs: typeof row.median_latency_ms === 'number' ? row.median_latency_ms : parseFloat(String(row.median_latency_ms || '0')),
        p95LatencyMs: typeof row.p95_latency_ms === 'number' ? row.p95_latency_ms : parseFloat(String(row.p95_latency_ms || '0')),
        maxLatencyMs: row.max_latency_ms || 0
      }));
    } catch (error) {
      console.error('Failed to fetch performance stats:', error);
      return [];
    }
  }, []);

  const measureOperation = useCallback(
    async <T,>(
      metricType: PerformanceMetric['metricType'],
      operation: string,
      fn: () => Promise<T>,
      metadata?: Record<string, any>
    ): Promise<T> => {
      const startTime = Date.now();
      try {
        const result = await fn();
        const latencyMs = Date.now() - startTime;
        
        await trackMetric({
          metricType,
          operation,
          success: true,
          latencyMs,
          metadata
        });

        return result;
      } catch (error: any) {
        const latencyMs = Date.now() - startTime;
        
        await trackMetric({
          metricType,
          operation,
          success: false,
          latencyMs,
          errorMessage: error?.message || 'Unknown error',
          metadata
        });

        throw error;
      }
    },
    [trackMetric]
  );

  return {
    trackMetric,
    getPerformanceStats,
    measureOperation
  };
};

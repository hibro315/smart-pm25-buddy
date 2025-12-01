import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface WeeklySummaryStatistics {
  avgPhri: string;
  avgAqi: string;
  avgSymptomScore: string;
  totalLogs: number;
  totalSymptomLogs: number;
}

interface WeeklySummaryPeriod {
  start: string;
  end: string;
}

interface WeeklySummaryResponse {
  success: boolean;
  summary: string;
  statistics: WeeklySummaryStatistics;
  period: WeeklySummaryPeriod;
  error?: string;
}

export const useWeeklyHealthSummary = () => {
  const [summary, setSummary] = useState<string>('');
  const [statistics, setStatistics] = useState<WeeklySummaryStatistics | null>(null);
  const [period, setPeriod] = useState<WeeklySummaryPeriod | null>(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      // Refresh session to get a fresh token
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !session?.access_token) {
        toast({
          title: 'กรุณาเข้าสู่ระบบใหม่',
          description: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
          variant: 'destructive',
        });
        setLoading(false);
        // Redirect to auth page after a delay
        setTimeout(() => {
          window.location.href = '/auth';
        }, 2000);
        return;
      }

      console.log("✅ Session refreshed for weekly summary");

      const { data, error } = await supabase.functions.invoke('weekly-health-summary', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      const response = data as WeeklySummaryResponse;

      if (response.error) {
        throw new Error(response.error);
      }

      setSummary(response.summary);
      setStatistics(response.statistics);
      setPeriod(response.period);

      toast({
        title: 'สร้างสรุปสุขภาพสำเร็จ',
        description: 'คุณสามารถดูรายงานสุขภาพรายสัปดาห์ได้แล้ว',
      });
    } catch (error: any) {
      console.error('Error generating weekly summary:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถสร้างสรุปสุขภาพได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    summary,
    statistics,
    period,
    loading,
    generateSummary,
  };
};

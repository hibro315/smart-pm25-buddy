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
      // Check and refresh session if needed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast({
          title: 'กรุณาเข้าสู่ระบบ',
          description: 'คุณต้องเข้าสู่ระบบก่อนใช้ฟีเจอร์นี้',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('weekly-health-summary', {
        body: {},
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

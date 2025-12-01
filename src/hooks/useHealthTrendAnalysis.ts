import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TrendAnalysisResponse {
  success: boolean;
  analysis: string;
  statistics: {
    totalConversations: number;
    totalHealthLogs: number;
    totalSymptomLogs: number;
    daysAnalyzed: number;
  };
  period: {
    start: string;
    end: string;
  };
  error?: string;
}

export const useHealthTrendAnalysis = () => {
  const [analysis, setAnalysis] = useState<string>('');
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const analyzeTrend = async (sessionId?: string, daysBack: number = 7) => {
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

      console.log("✅ Session refreshed for trend analysis");

      const { data, error } = await supabase.functions.invoke('health-trend-analysis', {
        body: { sessionId, daysBack },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      const response = data as TrendAnalysisResponse;

      if (response.error) {
        if (response.error === 'rate_limit') {
          toast({
            title: 'ใช้งานเกินขีดจำกัด',
            description: 'กรุณาลองใหม่อีกครั้งภายหลัง',
            variant: 'destructive',
          });
          return;
        }
        throw new Error(response.error);
      }

      if (!response.success) {
        toast({
          title: 'ไม่พบข้อมูล',
          description: response.analysis || 'ไม่พบประวัติการสนทนาในช่วงเวลาที่เลือก',
        });
        return;
      }

      setAnalysis(response.analysis);
      setStatistics(response.statistics);
      
      toast({
        title: 'วิเคราะห์แนวโน้มสำเร็จ',
        description: `วิเคราะห์จาก ${response.statistics.totalConversations} การสนทนา`,
      });
    } catch (error: any) {
      console.error('Error analyzing health trend:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถวิเคราะห์แนวโน้มได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    analysis,
    statistics,
    loading,
    analyzeTrend,
  };
};
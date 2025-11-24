import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HealthAdviceParams {
  pm25: number;
  temperature: number;
  humidity: number;
  healthConditions?: string[];
}

export const useHealthAdvice = () => {
  const [advice, setAdvice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getAdvice = async (params: HealthAdviceParams) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-health-advice', {
        body: params
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        if (data.error === 'rate_limit') {
          toast({
            title: 'ใช้งานเกินขีดจำกัด',
            description: data.message,
            variant: 'destructive',
          });
          return;
        }
        throw new Error(data.message);
      }

      setAdvice(data.advice);
      
      toast({
        title: 'ได้รับคำแนะนำจาก AI',
        description: 'คำแนะนำสุขภาพพร้อมใช้งาน',
      });
    } catch (error: any) {
      console.error('Error getting health advice:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถดึงคำแนะนำได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    advice,
    loading,
    getAdvice,
  };
};

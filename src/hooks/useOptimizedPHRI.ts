import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { phriInputSchema, type PHRIInput } from '@/lib/validations';
import { z } from 'zod';

export interface PHRIResult {
  phri: number;
  riskLevel: 'info' | 'warning' | 'urgent' | 'emergency';
  recommendation: string;
  breakdown: {
    environmental: number;
    personal: number;
    behavioral: number;
    symptoms: number;
    protective: number;
  };
}

export const useOptimizedPHRI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePHRI = useCallback(async (input: PHRIInput): Promise<PHRIResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // Validate input with zod
      const validatedInput = phriInputSchema.parse(input);

      // Environmental factors (0-3 points)
      let envScore = 0;
      if (validatedInput.pm25 > 75) envScore = 3;
      else if (validatedInput.pm25 > 50) envScore = 2;
      else if (validatedInput.pm25 > 25) envScore = 1;

      if (validatedInput.aqi > 150) envScore += 1;

      // Personal factors (0-2 points)
      let personalScore = 0;
      if (validatedInput.age < 5 || validatedInput.age > 65) personalScore += 1;
      
      const highRiskConditions = validatedInput.chronicConditions?.filter(c =>
        ['asthma', 'copd', 'heart', 'pregnant'].includes(c)
      ) || [];
      if (highRiskConditions.length > 0) personalScore += 1;

      if (validatedInput.dustSensitivity === 'high') personalScore += 0.5;

      // Behavioral factors (0-2 points)
      let behavioralScore = 0;
      const outdoorHours = validatedInput.outdoorTime;
      if (outdoorHours > 4) behavioralScore = 2;
      else if (outdoorHours > 2) behavioralScore = 1;

      if (validatedInput.physicalActivity === 'active') behavioralScore += 0.5;

      // Symptoms (0-2 points)
      const symptomsScore = validatedInput.hasSymptoms ? 2 : 0;

      // Protective factors (reduce score by 0-1.5)
      let protectiveReduction = 0;
      if (validatedInput.wearingMask) protectiveReduction += 1;
      if (validatedInput.hasAirPurifier) protectiveReduction += 0.5;

      // Calculate final PHRI (0-10 scale)
      const rawScore = envScore + personalScore + behavioralScore + symptomsScore;
      const phri = Math.max(0, Math.min(10, rawScore - protectiveReduction));

      // Determine risk level
      let riskLevel: 'info' | 'warning' | 'urgent' | 'emergency';
      if (phri < 3) riskLevel = 'info';
      else if (phri < 6) riskLevel = 'warning';
      else if (phri < 9) riskLevel = 'urgent';
      else riskLevel = 'emergency';

      // Generate recommendation
      const recommendation = generateRecommendation(phri, riskLevel, validatedInput);

      const result: PHRIResult = {
        phri: Math.round(phri * 10) / 10,
        riskLevel,
        recommendation,
        breakdown: {
          environmental: envScore,
          personal: personalScore,
          behavioral: behavioralScore,
          symptoms: symptomsScore,
          protective: protectiveReduction,
        },
      };

      return result;
    } catch (err) {
      console.error('Error calculating PHRI:', err);
      
      let errorMessage = 'ไม่สามารถคำนวณ PHRI ได้';
      if (err instanceof z.ZodError) {
        errorMessage = err.issues[0]?.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const savePHRILog = useCallback(async (
    phriResult: PHRIResult,
    input: PHRIInput,
    location?: string
  ): Promise<boolean> => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('ต้องเข้าสู่ระบบก่อนบันทึกข้อมูล');
      }

      const { error: insertError } = await supabase.from('health_logs').insert({
        user_id: user.id,
        phri: phriResult.phri,
        pm25: input.pm25,
        aqi: input.aqi,
        outdoor_time: input.outdoorTime,
        age: input.age,
        has_symptoms: input.hasSymptoms || false,
        wearing_mask: input.wearingMask || false,
        location: location || null,
        log_date: new Date().toISOString().split('T')[0],
      });

      if (insertError) throw insertError;

      toast({
        title: 'บันทึกข้อมูลสำเร็จ',
        description: 'ข้อมูล PHRI ถูกบันทึกแล้ว',
      });

      return true;
    } catch (err) {
      console.error('Error saving PHRI log:', err);
      toast({
        title: 'ไม่สามารถบันทึกข้อมูล',
        description: err instanceof Error ? err.message : 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
      return false;
    }
  }, []);

  const returnValue = useMemo(
    () => ({
      calculatePHRI,
      savePHRILog,
      loading,
      error,
    }),
    [calculatePHRI, savePHRILog, loading, error]
  );

  return returnValue;
};

function generateRecommendation(
  phri: number,
  riskLevel: string,
  input: PHRIInput
): string {
  const hasConditions = (input.chronicConditions?.length || 0) > 0;

  if (riskLevel === 'emergency') {
    return hasConditions
      ? '🚨 อันตรายมาก! อยู่ในร่มและปิดหน้าต่างทั้งหมด เปิดเครื่องฟอกอากาศ หากมีอาการรุนแรง ติดต่อแพทย์ทันที'
      : '🚨 อันตรายมาก! หลีกเลี่ยงการออกกลางแจ้ง อยู่ในร่มและปิดหน้าต่าง';
  }

  if (riskLevel === 'urgent') {
    return hasConditions
      ? '⚠️ เสี่ยงสูง! ไม่ควรออกกลางแจ้ง สวมหน้ากาก N95 หากจำเป็น เปิดเครื่องฟอกอากาศในร่ม'
      : '⚠️ เสี่ยงสูง! ลดเวลากลางแจ้ง สวมหน้ากาก N95 หากต้องออกนอกบ้าน';
  }

  if (riskLevel === 'warning') {
    return hasConditions
      ? '⚡ ระวัง! ลดกิจกรรมกลางแจ้ง สวมหน้ากากป้องกัน ติดตามอาการของตนเอง'
      : '⚡ ระวัง! ลดเวลากลางแจ้ง สวมหน้ากากเมื่อออกนอกบ้าน';
  }

  return '✅ ปลอดภัย: คุณภาพอากาศดี สามารถทำกิจกรรมตามปกติได้';
}

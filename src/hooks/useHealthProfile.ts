import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { healthProfileSchema, type HealthProfileInput, sanitizeArray } from '@/lib/validations';
import { z } from 'zod';

export interface HealthProfile {
  userId?: string;
  chronicConditions: string[];
  dustSensitivity: 'low' | 'medium' | 'high';
  physicalActivity: 'sedentary' | 'moderate' | 'active';
  hasAirPurifier: boolean;
  age: number;
  gender: string;
  weight?: number;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_PROFILE: HealthProfile = {
  chronicConditions: [],
  dustSensitivity: 'medium',
  physicalActivity: 'moderate',
  hasAirPurifier: false,
  age: 30,
  gender: 'other',
};

export const useHealthProfile = () => {
  const [profile, setProfile] = useState<HealthProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load profile from localStorage on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try to load from Supabase if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw new Error(`Authentication error: ${authError.message}`);
      }
      
      if (user) {
        // Load from Supabase (future implementation)
        // For now, load from localStorage with validation
        const stored = localStorage.getItem('healthProfile');
        if (stored) {
          try {
            const parsedProfile = JSON.parse(stored);
            // Validate the stored profile
            const validatedProfile = healthProfileSchema.parse(parsedProfile);
            setProfile(validatedProfile as HealthProfile);
          } catch (validationError) {
            console.error('Invalid profile data in localStorage:', validationError);
            // Clear invalid data
            localStorage.removeItem('healthProfile');
            toast({
              title: 'ข้อมูลโปรไฟล์ไม่ถูกต้อง',
              description: 'กรุณาตั้งค่าโปรไฟล์ใหม่',
              variant: 'destructive',
            });
          }
        }
      } else {
        // Load from localStorage for non-authenticated users with validation
        const stored = localStorage.getItem('healthProfile');
        if (stored) {
          try {
            const parsedProfile = JSON.parse(stored);
            const validatedProfile = healthProfileSchema.parse(parsedProfile);
            setProfile(validatedProfile as HealthProfile);
          } catch (validationError) {
            console.error('Invalid profile data:', validationError);
            localStorage.removeItem('healthProfile');
          }
        }
      }
    } catch (error) {
      console.error('Error loading health profile:', error);
      toast({
        title: 'ไม่สามารถโหลดข้อมูลโปรไฟล์',
        description: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProfile = useCallback(async (newProfile: HealthProfile) => {
    try {
      setSaving(true);
      
      // Sanitize and validate profile data
      const sanitizedProfile = {
        ...newProfile,
        chronicConditions: sanitizeArray(newProfile.chronicConditions),
      };

      // Validate with zod schema
      const validatedProfile = healthProfileSchema.parse(sanitizedProfile);

      // Save to localStorage
      localStorage.setItem('healthProfile', JSON.stringify(validatedProfile));
      setProfile(validatedProfile as HealthProfile);

      // Try to save to Supabase if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.warn('Not authenticated, profile saved locally only');
      } else if (user) {
        // Future: Save to Supabase table with proper error handling
        // const { error: dbError } = await supabase.from('health_profiles').upsert({
        //   user_id: user.id,
        //   ...validatedProfile,
        // });
        // if (dbError) throw dbError;
      }

      toast({
        title: 'บันทึกโปรไฟล์สำเร็จ',
        description: 'ข้อมูลสุขภาพของคุณถูกบันทึกแล้ว',
      });

      return true;
    } catch (error) {
      console.error('Error saving health profile:', error);
      
      let errorMessage = 'กรุณาลองใหม่อีกครั้ง';
      if (error instanceof z.ZodError) {
        errorMessage = error.issues[0]?.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'ไม่สามารถบันทึกโปรไฟล์',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<HealthProfile>) => {
    const newProfile = { ...profile, ...updates };
    return saveProfile(newProfile);
  }, [profile, saveProfile]);

  const resetProfile = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
    localStorage.removeItem('healthProfile');
    toast({
      title: 'รีเซ็ตโปรไฟล์สำเร็จ',
      description: 'ข้อมูลถูกรีเซ็ตเป็นค่าเริ่มต้น',
    });
  }, []);

  // Memoize the return value to prevent unnecessary re-renders
  const returnValue = useMemo(
    () => ({
      profile,
      loading,
      saving,
      loadProfile,
      saveProfile,
      updateProfile,
      resetProfile,
    }),
    [profile, loading, saving, loadProfile, saveProfile, updateProfile, resetProfile]
  );

  return returnValue;
};

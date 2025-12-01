import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { healthProfileSchema, type HealthProfileInput, sanitizeArray } from '@/lib/validations';
import { z } from 'zod';

export interface HealthProfile {
  // ข้อมูลส่วนตัวพื้นฐาน
  name?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  height?: number;
  weight?: number;
  occupation?: string;
  workEnvironment?: 'outdoor' | 'indoor' | 'mixed';
  location?: string;
  
  // ประวัติสุขภาพพื้นฐาน
  chronicConditions: string[];
  allergies?: string;
  immunoCompromised?: boolean;
  smokingStatus?: 'non_smoker' | 'occasional' | 'regular';
  alcoholConsumption?: 'none' | 'occasional' | 'regular';
  exerciseFrequency?: number;
  
  // ปัจจัยเสี่ยงด้านคุณภาพอากาศ
  dustSensitivity: 'low' | 'medium' | 'high';
  hasAirPurifier: boolean;
  maskUsage?: 'none' | 'regular' | 'n95' | 'kf94';
  outdoorTimeDaily?: number;
  physicalActivity: 'sedentary' | 'moderate' | 'active';
  
  // Metadata
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_PROFILE: HealthProfile = {
  age: 30,
  gender: 'male',
  chronicConditions: [],
  dustSensitivity: 'medium',
  physicalActivity: 'moderate',
  hasAirPurifier: false,
  smokingStatus: 'non_smoker',
  alcoholConsumption: 'none',
};

export const useHealthProfile = () => {
  const [profile, setProfile] = useState<HealthProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load profile from Supabase
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        // Load from localStorage if not authenticated
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
        return;
      }

      // Load from Supabase
      const { data: profileData, error } = await supabase
        .from('health_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is okay
        throw error;
      }

      if (profileData) {
        const mappedProfile: HealthProfile = {
          name: profileData.name,
          age: profileData.age,
          gender: profileData.gender as 'male' | 'female' | 'other',
          height: profileData.height,
          weight: profileData.weight,
          occupation: profileData.occupation,
          workEnvironment: profileData.work_environment as 'outdoor' | 'indoor' | 'mixed' | undefined,
          location: profileData.location,
          chronicConditions: profileData.chronic_conditions || [],
          allergies: profileData.allergies,
          immunoCompromised: profileData.immuno_compromised,
          smokingStatus: profileData.smoking_status as 'non_smoker' | 'occasional' | 'regular' | undefined,
          alcoholConsumption: profileData.alcohol_consumption as 'none' | 'occasional' | 'regular' | undefined,
          exerciseFrequency: profileData.exercise_frequency,
          dustSensitivity: profileData.dust_sensitivity as 'low' | 'medium' | 'high',
          hasAirPurifier: profileData.has_air_purifier,
          maskUsage: profileData.mask_usage as 'none' | 'regular' | 'n95' | 'kf94' | undefined,
          outdoorTimeDaily: profileData.outdoor_time_daily,
          physicalActivity: profileData.physical_activity as 'sedentary' | 'moderate' | 'active',
          userId: profileData.user_id,
          createdAt: profileData.created_at,
          updatedAt: profileData.updated_at,
        };
        setProfile(mappedProfile);
      } else {
        // Try loading from localStorage as fallback
        const stored = localStorage.getItem('healthProfile');
        if (stored) {
          try {
            const parsedProfile = JSON.parse(stored);
            const validatedProfile = healthProfileSchema.parse(parsedProfile);
            setProfile(validatedProfile as HealthProfile);
          } catch (validationError) {
            console.error('Invalid profile data:', validationError);
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

      // Save to localStorage as backup
      localStorage.setItem('healthProfile', JSON.stringify(validatedProfile));
      setProfile(validatedProfile as HealthProfile);

      // Save to Supabase if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.warn('Not authenticated, profile saved locally only');
        toast({
          title: 'บันทึกโปรไฟล์สำเร็จ',
          description: 'ข้อมูลถูกบันทึกในเครื่องของคุณ',
        });
        return true;
      }

      // Map to database column names
      const dbProfile = {
        user_id: user.id,
        name: validatedProfile.name,
        age: validatedProfile.age,
        gender: validatedProfile.gender,
        height: validatedProfile.height,
        weight: validatedProfile.weight,
        occupation: validatedProfile.occupation,
        work_environment: validatedProfile.workEnvironment,
        location: validatedProfile.location,
        chronic_conditions: validatedProfile.chronicConditions,
        allergies: validatedProfile.allergies,
        immuno_compromised: validatedProfile.immunoCompromised,
        smoking_status: validatedProfile.smokingStatus,
        alcohol_consumption: validatedProfile.alcoholConsumption,
        exercise_frequency: validatedProfile.exerciseFrequency,
        dust_sensitivity: validatedProfile.dustSensitivity,
        has_air_purifier: validatedProfile.hasAirPurifier,
        mask_usage: validatedProfile.maskUsage,
        outdoor_time_daily: validatedProfile.outdoorTimeDaily,
        physical_activity: validatedProfile.physicalActivity,
      };

      const { error: dbError } = await supabase
        .from('health_profiles')
        .upsert(dbProfile, {
          onConflict: 'user_id'
        });

      if (dbError) throw dbError;

      toast({
        title: 'บันทึกโปรไฟล์สำเร็จ',
        description: 'ข้อมูลสุขภาพของคุณถูกบันทึกใน Cloud แล้ว',
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

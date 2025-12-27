import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSubscription {
  id: string;
  user_id: string;
  subscription: any;
  last_location?: {
    latitude: number;
    longitude: number;
  };
  last_pm25?: number;
  notification_settings?: {
    pm25_threshold: number;
    enabled: boolean;
  };
}

interface HealthProfile {
  age: number;
  gender: string;
  chronic_conditions: string[];
  dust_sensitivity: string;
  has_air_purifier: boolean;
  physical_activity: string;
}

// Generate personalized health advice based on profile and PM2.5
const generatePersonalizedAdvice = (pm25: number, aqi: number, profile: HealthProfile | null): string[] => {
  const advice: string[] = [];
  const conditions = profile?.chronic_conditions || [];
  const dustSensitivity = profile?.dust_sensitivity || 'medium';
  const age = profile?.age || 30;
  const hasAirPurifier = profile?.has_air_purifier || false;
  
  // High risk conditions
  const hasAsthma = conditions.some(c => c.toLowerCase().includes('asthma') || c.includes('หอบหืด'));
  const hasCOPD = conditions.some(c => c.toLowerCase().includes('copd') || c.includes('ปอดอุดกั้น'));
  const hasHeartDisease = conditions.some(c => c.toLowerCase().includes('heart') || c.includes('หัวใจ'));
  const hasAllergy = conditions.some(c => c.toLowerCase().includes('allergy') || c.includes('ภูมิแพ้'));
  const isHighRisk = hasAsthma || hasCOPD || hasHeartDisease || age > 60 || age < 12;
  
  // Base advice by PM2.5 level (Thai standard)
  if (pm25 > 90) {
    advice.push('🚨 ห้ามออกนอกอาคารโดยเด็ดขาด');
    advice.push('🏠 ปิดหน้าต่างและประตูให้สนิท');
    if (hasAirPurifier) {
      advice.push('🌀 เปิดเครื่องฟอกอากาศตลอดเวลา');
    }
  } else if (pm25 > 50) {
    advice.push('⚠️ จำกัดกิจกรรมกลางแจ้ง');
    advice.push('😷 สวมหน้ากาก N95/KF94 ทุกครั้ง');
  } else if (pm25 > 37) {
    advice.push('😷 แนะนำสวมหน้ากากเมื่อออกนอกอาคาร');
    if (isHighRisk) {
      advice.push('⚠️ กลุ่มเสี่ยงควรระมัดระวังเป็นพิเศษ');
    }
  }
  
  // Condition-specific advice
  if (hasAsthma && pm25 > 37) {
    advice.push('💊 หอบหืด: พกยาพ่นขยายหลอดลมติดตัว');
  }
  
  if (hasCOPD && pm25 > 37) {
    advice.push('🫁 COPD: หลีกเลี่ยงการออกแรงมาก ตรวจ SpO2 บ่อยขึ้น');
  }
  
  if (hasHeartDisease && pm25 > 50) {
    advice.push('❤️ โรคหัวใจ: หลีกเลี่ยงออกกำลังกายหนัก วัดความดันเป็นระยะ');
  }
  
  if (hasAllergy && pm25 > 37) {
    advice.push('🤧 ภูมิแพ้: รับประทานยาแก้แพ้ตามแพทย์สั่ง');
  }
  
  // Age-specific advice
  if (age > 60 && pm25 > 50) {
    advice.push('👴 ผู้สูงอายุ: ควรอยู่ในอาคารที่มีระบบกรองอากาศ');
  }
  
  if (age < 12 && pm25 > 50) {
    advice.push('👶 เด็ก: งดกิจกรรมกลางแจ้งและพีอีที่โรงเรียน');
  }
  
  // High sensitivity
  if (dustSensitivity === 'high' && pm25 > 37) {
    advice.push('⚡ คุณมีความไวต่อฝุ่นสูง: ใช้ความระมัดระวังเป็นพิเศษ');
  }
  
  return advice.slice(0, 4); // Max 4 advice items for notification
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting personalized air quality check for push notifications...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('enabled', true);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} active subscriptions`);

    const results = [];

    // Check each subscription
    for (const sub of (subscriptions || []) as PushSubscription[]) {
      try {
        if (!sub.last_location) {
          console.log(`Skipping subscription ${sub.id}: no location data`);
          continue;
        }

        // Fetch user's health profile
        const { data: healthProfile } = await supabase
          .from('health_profiles')
          .select('*')
          .eq('user_id', sub.user_id)
          .maybeSingle();

        // Fetch air quality for this location
        const { data: aqData, error: aqError } = await supabase.functions.invoke('get-air-quality', {
          body: { 
            latitude: sub.last_location.latitude,
            longitude: sub.last_location.longitude
          }
        });

        if (aqError || !aqData) {
          console.error(`Error fetching air quality for subscription ${sub.id}:`, aqError);
          continue;
        }

        const currentPM25 = aqData.pm25;
        const previousPM25 = sub.last_pm25 || 0;
        const threshold = sub.notification_settings?.pm25_threshold || 50;
        
        // Calculate PM2.5 change
        const pm25Change = Math.abs(currentPM25 - previousPM25);
        
        // Check if user has high-risk conditions
        const conditions = healthProfile?.chronic_conditions || [];
        const isHighRisk = conditions.some((c: string) => 
          c.toLowerCase().includes('asthma') || 
          c.toLowerCase().includes('copd') || 
          c.toLowerCase().includes('heart') ||
          c.includes('หอบหืด') ||
          c.includes('ปอดอุดกั้น') ||
          c.includes('หัวใจ')
        ) || (healthProfile?.age && (healthProfile.age > 60 || healthProfile.age < 12));
        
        // Adjust threshold for high-risk users (more sensitive)
        const adjustedThreshold = isHighRisk ? Math.min(threshold, 37) : threshold;
        
        console.log(`Subscription ${sub.id}: PM2.5 ${previousPM25} → ${currentPM25} (threshold: ${adjustedThreshold}, high-risk: ${isHighRisk})`);

        // Check if notification should be sent
        const shouldNotify = 
          currentPM25 > adjustedThreshold || // Exceeds threshold
          pm25Change > (isHighRisk ? 5 : 10) || // Significant change (lower for high-risk)
          (isHighRisk && currentPM25 > 37); // High-risk users get notified earlier

        if (shouldNotify) {
          // Generate personalized health advice
          const personalizedAdvice = generatePersonalizedAdvice(currentPM25, aqData.aqi || 0, healthProfile);
          const adviceText = personalizedAdvice.length > 0 
            ? '\n\n' + personalizedAdvice.join('\n') 
            : '';
          
          // Determine rich notification content and vibration pattern
          let title = '';
          let body = '';
          let vibrate = [300, 100, 300];
          const riskMultiplier = isHighRisk ? 1.5 : 1;

          if (currentPM25 > 90) {
            title = isHighRisk ? '🚨 อันตรายมาก! แจ้งเตือนเร่งด่วนสำหรับคุณ' : '🚨 อันตราย! ค่าฝุ่น PM2.5 สูงมาก';
            body = `PM2.5: ${currentPM25} µg/m³\n📍 ${aqData.location || 'ตำแหน่งของคุณ'}${adviceText}`;
            vibrate = [500, 200, 500, 200, 500, 200, 500].map(v => Math.round(v * riskMultiplier));
          } else if (currentPM25 > 50) {
            title = isHighRisk ? '⚠️ แจ้งเตือนเร่งด่วน: ค่าฝุ่นสูงสำหรับคุณ' : '⚠️ แจ้งเตือน: ค่าฝุ่น PM2.5 สูง';
            body = `PM2.5: ${currentPM25} µg/m³\n📍 ${aqData.location || 'ตำแหน่งของคุณ'}${adviceText}`;
            vibrate = [400, 150, 400, 150, 400, 150, 400].map(v => Math.round(v * riskMultiplier));
          } else if (currentPM25 > 37) {
            title = isHighRisk ? '🩺 แจ้งเตือนสำหรับสุขภาพของคุณ' : '📈 ค่าฝุ่น PM2.5 เพิ่มขึ้น';
            body = `PM2.5: ${currentPM25} µg/m³\n📍 ${aqData.location || 'ตำแหน่งของคุณ'}${adviceText}`;
            vibrate = [300, 100, 300, 100, 300].map(v => Math.round(v * riskMultiplier));
          } else if (pm25Change > 5) {
            title = '📊 ค่าฝุ่น PM2.5 เปลี่ยนแปลง';
            body = `PM2.5: ${currentPM25} µg/m³\n📍 ${aqData.location || 'ตำแหน่งของคุณ'}${adviceText}`;
            vibrate = [200, 100, 200, 100, 200];
          } else {
            title = '✅ คุณภาพอากาศปกติ';
            body = `PM2.5: ${currentPM25} µg/m³\n📍 ${aqData.location || 'ตำแหน่งของคุณ'}`;
            vibrate = [200, 100, 200];
          }

          // Send rich push notification
          const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: {
              subscription: sub.subscription,
              title,
              body,
              pm25: currentPM25,
              location: aqData.location,
              vibrate,
              requireInteraction: currentPM25 > 50 || isHighRisk,
              data: {
                isHighRisk,
                personalizedAdvice,
                conditions: conditions.slice(0, 3)
              }
            }
          });

          if (pushError) {
            console.error(`Error sending notification for subscription ${sub.id}:`, pushError);
          } else {
            console.log(`✅ Personalized notification sent to subscription ${sub.id} (high-risk: ${isHighRisk})`);
            results.push({ subscription_id: sub.id, success: true, isHighRisk });
          }

          // Update last_pm25 in database
          await supabase
            .from('push_subscriptions')
            .update({ 
              last_pm25: currentPM25,
              last_check: new Date().toISOString()
            })
            .eq('id', sub.id);
        } else {
          console.log(`No notification needed for subscription ${sub.id}`);
          
          // Still update last check time
          await supabase
            .from('push_subscriptions')
            .update({ 
              last_check: new Date().toISOString()
            })
            .eq('id', sub.id);
        }
      } catch (error) {
        console.error(`Error processing subscription ${sub.id}:`, error);
        results.push({ 
          subscription_id: sub.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        checked: subscriptions?.length || 0,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in check-air-quality-push:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to check air quality for push notifications'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

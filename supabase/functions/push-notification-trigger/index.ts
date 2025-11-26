import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, phri, alertLevel, location, personalFactors } = await req.json();

    console.log('Push notification trigger:', { userId, phri, alertLevel, location });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user health profile
    const { data: healthLogs } = await supabase
      .from('health_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Analyze PHRI threshold
    let shouldTriggerNotification = false;
    let notificationMessage = '';

    if (phri >= 8) {
      shouldTriggerNotification = true;
      notificationMessage = '🚨 ฉุกเฉิน! PHRI สูงมาก - อยู่ในอาคารทันที';
    } else if (phri >= 6) {
      shouldTriggerNotification = true;
      notificationMessage = '⚠️ เร่งด่วน! PHRI สูง - หลีกเลี่ยงกิจกรรมกลางแจ้ง';
    } else if (phri >= 3) {
      // Check if this is a significant increase
      if (healthLogs && healthLogs.length > 0) {
        const previousPHRI = healthLogs[0].phri || 0;
        if (phri > previousPHRI + 2) {
          shouldTriggerNotification = true;
          notificationMessage = '⚠️ เตือน! PHRI เพิ่มขึ้นอย่างรวดเร็ว';
        }
      }
    }

    // Consider personal factors
    if (personalFactors?.hasHighRiskConditions && phri >= 3) {
      shouldTriggerNotification = true;
      notificationMessage += ' (คุณมีโรคประจำตัวกลุ่มเสี่ยง)';
    }

    // Location-based trigger
    if (location && personalFactors?.isNearHighPollutionArea) {
      shouldTriggerNotification = true;
      notificationMessage = `📍 คุณเข้าใกล้พื้นที่ PM2.5 สูงที่ ${location}`;
    }

    // Log notification event
    if (shouldTriggerNotification) {
      await supabase.from('performance_metrics').insert({
        user_id: userId,
        metric_type: 'notification',
        operation: 'push_notification_sent',
        success: true,
        metadata: {
          phri,
          alertLevel,
          location,
          message: notificationMessage,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        shouldTriggerNotification,
        notificationMessage,
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in push notification trigger:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process notification trigger',
        message: errorMessage,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

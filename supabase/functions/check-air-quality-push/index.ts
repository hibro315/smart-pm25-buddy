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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting air quality check for push notifications...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active push subscriptions from a hypothetical table
    // Note: You'll need to create this table to store push subscriptions
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
        
        console.log(`Subscription ${sub.id}: PM2.5 ${previousPM25} → ${currentPM25} (change: ${pm25Change})`);

        // Check if notification should be sent
        const shouldNotify = 
          currentPM25 > threshold || // Exceeds threshold
          pm25Change > 10; // Significant change (>10 µg/m³)

        if (shouldNotify) {
          // Determine rich notification content and vibration pattern
          let title = '';
          let body = '';
          let vibrate = [300, 100, 300];

          if (currentPM25 > 150) {
            title = '🚨 อันตราย! ค่าฝุ่น PM2.5 สูงมาก';
            body = `PM2.5: ${currentPM25} µg/m³\n📍 ${aqData.location || 'ตำแหน่งของคุณ'}\n\n❌ ห้ามออกนอกอาคาร\n😷 สวมหน้ากาก N95\n🏠 อยู่ในที่ร่มปิดหน้าต่าง`;
            vibrate = [500, 200, 500, 200, 500, 200, 500];
          } else if (currentPM25 > 100) {
            title = '⚠️ แจ้งเตือน: ค่าฝุ่น PM2.5 สูง';
            body = `PM2.5: ${currentPM25} µg/m³\n📍 ${aqData.location || 'ตำแหน่งของคุณ'}\n\n⏱️ จำกัดเวลานอกอาคาร\n😷 สวมหน้ากากทุกครั้ง\n🚫 หลีกเลี่ยงออกกำลังกาย`;
            vibrate = [400, 150, 400, 150, 400, 150, 400];
          } else if (pm25Change > 10) {
            title = '📈 ค่าฝุ่น PM2.5 เปลี่ยนแปลง';
            body = `PM2.5: ${currentPM25} µg/m³\n📍 ${aqData.location || 'ตำแหน่งของคุณ'}\n\n⚠️ ค่าฝุ่นเพิ่มขึ้นอย่างรวดเร็ว\n😷 ควรสวมหน้ากาก`;
            vibrate = [300, 100, 300, 100, 300, 100, 300];
          } else if (currentPM25 > 50) {
            title = '⚠️ ค่าฝุ่น PM2.5 เกินเกณฑ์';
            body = `PM2.5: ${currentPM25} µg/m³\n📍 ${aqData.location || 'ตำแหน่งของคุณ'}\n\n😷 แนะนำสวมหน้ากาก\n⚠️ กลุ่มเสี่ยงควรระมัดระวัง`;
            vibrate = [300, 100, 300, 100, 300];
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
              vibrate
            }
          });

          if (pushError) {
            console.error(`Error sending notification for subscription ${sub.id}:`, pushError);
          } else {
            console.log(`✅ Notification sent to subscription ${sub.id}`);
            results.push({ subscription_id: sub.id, success: true });
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

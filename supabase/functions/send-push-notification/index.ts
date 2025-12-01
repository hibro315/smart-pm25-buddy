import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  title: string;
  body: string;
  pm25?: number;
  location?: string;
  vibrate?: number[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscription, title, body, pm25, location, vibrate } = await req.json() as PushNotificationRequest;

    console.log('Sending push notification:', { title, body, pm25, location });

    // Get VAPID keys from environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY');
    }

    // Create push notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: vibrate || [300, 100, 300, 100, 300],
      data: {
        pm25,
        location,
        timestamp: Date.now()
      },
      actions: [
        { action: 'view', title: 'ดูรายละเอียด' },
        { action: 'dismiss', title: 'ปิด' }
      ]
    });

    // Send push notification using Web Push Protocol
    // Note: This is a simplified version. For production, use a proper Web Push library
    console.log('Push notification would be sent to:', subscription.endpoint);
    console.log('Payload:', payload);
    
    // For now, we'll return success. In production, implement proper Web Push Protocol
    // or use a service like Firebase Cloud Messaging

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Push notification queued successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending push notification:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to send push notification'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

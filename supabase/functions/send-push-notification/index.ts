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

// Helper functions for Web Push Protocol
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToUrlBase64(uint8Array: Uint8Array): string {
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binaryString);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  // Create JWT header
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };
  
  // Create JWT payload
  const jwtPayload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: 'mailto:notifications@smartpm25buddy.com'
  };
  
  // Encode header and payload
  const encodedHeader = uint8ArrayToUrlBase64(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const encodedPayload = uint8ArrayToUrlBase64(
    new TextEncoder().encode(JSON.stringify(jwtPayload))
  );
  
  // Import private key for signing
  const privateKeyData = urlBase64ToUint8Array(vapidPrivateKey);
  const privateKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(privateKeyData).buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  // Sign the JWT
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );
  
  const encodedSignature = uint8ArrayToUrlBase64(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${encodedSignature}`;
  
  return `vapid t=${jwt}, k=${vapidPublicKey}`;
}

async function encryptPayload(
  payload: string,
  userPublicKey: string,
  userAuthSecret: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; publicKey: Uint8Array }> {
  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  // Export local public key
  const rawLocalPublicKey = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  
  // Import user public key
  const userPublicKeyBuffer = urlBase64ToUint8Array(userPublicKey);
  const importedUserPublicKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(userPublicKeyBuffer).buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  
  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: importedUserPublicKey },
    localKeyPair.privateKey,
    256
  );
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Derive encryption key
  const authSecret = urlBase64ToUint8Array(userAuthSecret);
  const prk = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(sharedSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Create content encryption key
  const info = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const keyInfo = new Uint8Array([...info, ...authSecret, ...new Uint8Array(rawLocalPublicKey), ...userPublicKeyBuffer]);
  
  const cek = await crypto.subtle.sign('HMAC', prk, keyInfo);
  const contentKey = await crypto.subtle.importKey(
    'raw',
    cek.slice(0, 16),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encrypt payload
  const paddedPayload = new Uint8Array([...new TextEncoder().encode(payload), 2]);
  const iv = new Uint8Array(12);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    contentKey,
    paddedPayload
  );
  
  return {
    ciphertext: new Uint8Array(ciphertext),
    salt,
    publicKey: new Uint8Array(rawLocalPublicKey)
  };
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
      throw new Error('VAPID keys not configured');
    }

    // Create rich push notification payload (Shopee-style)
    const payload = JSON.stringify({
      title,
      body,
      icon: pm25 && pm25 > 150 ? '/icon-512.png' : '/icon-192.png',
      badge: '/icon-192.png',
      image: null,
      vibrate: vibrate || [400, 150, 400, 150, 400],
      requireInteraction: pm25 && pm25 > 150,
      silent: false,
      renotify: true,
      tag: 'pm25-alert',
      timestamp: Date.now(),
      data: {
        pm25,
        location,
        timestamp: Date.now(),
        url: '/'
      },
      actions: [
        { action: 'view', title: '📊 ดูรายละเอียด', icon: '/icon-192.png' },
        { action: 'map', title: '🗺️ ดูแผนที่', icon: '/icon-192.png' },
        { action: 'dismiss', title: '❌ ปิด' }
      ]
    });

    // Encrypt payload
    const { ciphertext, salt, publicKey } = await encryptPayload(
      payload,
      subscription.keys.p256dh,
      subscription.keys.auth
    );

    // Create VAPID authorization header
    const authorization = await createVapidAuthHeader(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey
    );

    // Send push notification
    const pushResponse = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': authorization,
        'Crypto-Key': `p256ecdsa=${vapidPublicKey}`,
        'TTL': '86400'
      },
      body: new Uint8Array([
        ...salt,
        ...new Uint8Array([0, 0, 0x10, 0]),
        ...new Uint8Array([publicKey.length]),
        ...publicKey,
        ...ciphertext
      ])
    });

    if (!pushResponse.ok) {
      const errorText = await pushResponse.text();
      console.error('Push service error:', pushResponse.status, errorText);
      throw new Error(`Push service responded with ${pushResponse.status}: ${errorText}`);
    }

    console.log('✅ Push notification sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Push notification sent successfully'
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
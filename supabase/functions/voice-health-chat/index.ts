import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const authHeader = req.headers.get("authorization");
    const { message, context, language = 'th' } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Processing voice health chat:', message.substring(0, 50));

    // Get user health profile if authenticated
    let userProfile = null;
    if (authHeader) {
      try {
        const jwt = authHeader.replace("Bearer ", "");
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } } }
        );
        
        const { data: { user } } = await supabaseClient.auth.getUser(jwt);
        if (user) {
          const { data: profile } = await supabaseClient
            .from("health_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          userProfile = profile;
        }
      } catch (e) {
        console.log('Could not fetch user profile:', e);
      }
    }

    // Build personalized context
    let personalContext = '';
    if (userProfile) {
      personalContext = `
ข้อมูลผู้ใช้:
- อายุ: ${userProfile.age} ปี
- เพศ: ${userProfile.gender === 'male' ? 'ชาย' : 'หญิง'}
- โรคประจำตัว: ${userProfile.chronic_conditions?.length > 0 ? userProfile.chronic_conditions.join(', ') : 'ไม่มี'}
- ความไวต่อฝุ่น: ${userProfile.dust_sensitivity === 'high' ? 'สูง' : userProfile.dust_sensitivity === 'medium' ? 'ปานกลาง' : 'ต่ำ'}
- มีเครื่องฟอก: ${userProfile.has_air_purifier ? 'มี' : 'ไม่มี'}`;
    }

    // Risk assessment
    let riskLevel = 'ปกติ';
    let urgency = '';
    const pm25 = context?.pm25;
    if (pm25) {
      if (pm25 > 90) {
        riskLevel = 'อันตรายมาก';
        urgency = '🚨 สถานการณ์วิกฤต - ';
      } else if (pm25 > 75) {
        riskLevel = 'อันตราย';
        urgency = '⚠️ ';
      } else if (pm25 > 50) {
        riskLevel = 'ไม่ดีต่อสุขภาพ';
      } else if (pm25 > 35) {
        riskLevel = 'ปานกลาง';
      } else {
        riskLevel = 'ดี';
      }
    }

    // Language-specific instructions
    const langInstructions = {
      th: 'ตอบเป็นภาษาไทย',
      en: 'Answer in English',
      zh: '用中文回答'
    };

    const systemPrompt = `คุณคือ "Smart PM2.5 Health Advisor" ผู้เชี่ยวชาญด้านสุขภาพ ฉลาด แม่นยำ

**บริบท:**
${context?.pm25 ? `PM2.5: ${context.pm25} µg/m³ (${riskLevel})` : ''}
${context?.aqi ? `AQI: ${context.aqi}` : ''}
${context?.temperature ? `อุณหภูมิ: ${context.temperature}°C` : ''}
${context?.humidity ? `ความชื้น: ${context.humidity}%` : ''}
${context?.location ? `ตำแหน่ง: ${context.location}` : ''}
${personalContext}

**กฎเหล็ก:**
1. ตอบสั้น 2-4 ประโยค (เหมาะกับการฟัง)
2. ${langInstructions[language as keyof typeof langInstructions] || langInstructions.th}
3. ให้ข้อมูลถูกต้องตามหลักวิชาการ
4. ห้ามให้คำแนะนำที่เป็นอันตราย

**รูปแบบคำตอบ:**
${urgency}[สรุปสถานการณ์ 1 ประโยค]

[คำแนะนำหลัก 1-2 ประโยค]

**ตัวเลือกต่อ:**
• [ตัวเลือก 1]
• [ตัวเลือก 2]
• [ถามเพิ่มเติม?]

**ตัวอย่าง:**
"PM2.5 สูง 85 ไม่ควรออกกลางแจ้ง ใส่ N95 ถ้าจำเป็นต้องออก

**ต้องการอะไรเพิ่ม:**
• ดูเส้นทางที่ปลอดภัย
• คำแนะนำออกกำลังกายในร่ม
• มีคำถามอื่นไหม?"

**ข้อมูลอ้างอิง (Thai DOH Standards):**
- PM2.5 > 50 µg/m³: กลุ่มเสี่ยงควรอยู่ในอาคาร
- PM2.5 > 75 µg/m³: ทุกคนควรหลีกเลี่ยงกลางแจ้ง
- PM2.5 > 90 µg/m³: สถานการณ์วิกฤต หลีกเลี่ยงกิจกรรมกลางแจ้งทั้งหมด
- หน้ากาก N95/KN95 กรองได้ 95% เมื่อใส่ถูกวิธี
- เครื่องฟอกอากาศควรมี HEPA filter

**ห้าม:**
- วินิจฉัยโรค
- สั่งยา
- ให้ข้อมูลเท็จ`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
        temperature: 0.3, // Lower for more consistent, accurate responses
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'ขออภัย ไม่สามารถตอบได้ในขณะนี้';

    // Extract choices from response for UI
    const choiceMatches = reply.match(/[•\-]\s*(.+?)(?=\n|$)/g);
    const choices = choiceMatches?.slice(0, 3).map((c: string) => c.replace(/^[•\-]\s*/, '').trim()) || [];

    console.log('AI response generated successfully');

    return new Response(
      JSON.stringify({ 
        reply,
        choices,
        riskLevel,
        pm25: context?.pm25
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
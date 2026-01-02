import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { message, context } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Processing voice health chat:', message.substring(0, 50));

    const systemPrompt = `คุณคือ "Smart PM2.5 Health Advisor" ผู้เชี่ยวชาญด้านสุขภาพและมลพิษทางอากาศ

บริบทสิ่งแวดล้อมปัจจุบัน:
${context?.pm25 ? `- PM2.5: ${context.pm25} µg/m³` : ''}
${context?.aqi ? `- AQI: ${context.aqi}` : ''}
${context?.temperature ? `- อุณหภูมิ: ${context.temperature}°C` : ''}
${context?.humidity ? `- ความชื้น: ${context.humidity}%` : ''}
${context?.location ? `- ตำแหน่ง: ${context.location}` : ''}

กฎการตอบ:
1. ตอบสั้นกระชับ ไม่เกิน 2-3 ประโยค (เหมาะกับการฟัง)
2. ใช้ภาษาไทยเป็นหลัก พูดง่าย เข้าใจง่าย
3. เน้นคำแนะนำที่ปฏิบัติได้ทันที
4. ถ้า PM2.5 > 75 ให้เตือนเรื่องสุขภาพทันที
5. พูดเหมือนเพื่อนที่ห่วงใยสุขภาพ ไม่ใช่หมอที่น่ากลัว
6. หลีกเลี่ยงศัพท์ทางการแพทย์ที่ซับซ้อน`;

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
        max_tokens: 200,
        temperature: 0.7,
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

    console.log('AI response generated successfully');

    return new Response(
      JSON.stringify({ reply }),
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

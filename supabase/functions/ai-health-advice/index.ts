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
    const { pm25, temperature, humidity, healthConditions } = await req.json();
    
    console.log('Health advice request:', { pm25, temperature, humidity, healthConditions });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Create context-aware prompt
    const systemPrompt = `คุณเป็นผู้เชี่ยวชาญด้านสุขภาพและคุณภาพอากาศในประเทศไทย คุณให้คำแนะนำที่แม่นยำและเป็นประโยชน์เกี่ยวกับการปกป้องตัวเองจากมลพิษทางอากาศ โดยเฉพาะฝุ่น PM2.5

คำแนะนำของคุณควร:
1. อิงจากข้อมูลทางวิทยาศาสตร์และแนวทางของกรมควบคุมมลพิษ
2. เฉพาะเจาะจงกับระดับ PM2.5 และสภาพอากาศปัจจุบัน
3. พิจารณาโรคประจำตัวของผู้ใช้ (ถ้ามี)
4. ให้คำแนะนำที่ปฏิบัติได้จริง เช่น การใช้หน้ากาก การออกกำลังกาย การดูแลสุขภาพ

มาตรฐาน PM2.5 ของไทย:
- 0-25 µg/m³: คุณภาพอากาศดีมาก
- 26-37 µg/m³: คุณภาพอากาศดี
- 38-50 µg/m³: คุณภาพอากาศปานกลาง เริ่มมีผลกระทบต่อสุขภาพ
- 51-90 µg/m³: คุณภาพอากาศเริ่มมีผลกระทบต่อสุขภาพ
- มากกว่า 90 µg/m³: คุณภาพอากาศมีผลกระทบต่อสุขภาพ`;

    const userPrompt = `ให้คำแนะนำสุขภาพสำหรับสถานการณ์ปัจจุบัน:

ข้อมูลคุณภาพอากาศ:
- ระดับ PM2.5: ${pm25} µg/m³
- อุณหภูมิ: ${temperature}°C
- ความชื้น: ${humidity}%

โรคประจำตัว: ${healthConditions && healthConditions.length > 0 ? healthConditions.join(', ') : 'ไม่มี'}

กรุณาให้คำแนะนำที่ครอบคลุม:
1. การป้องกันตัวเอง (หน้ากาก อุปกรณ์)
2. กิจกรรมที่ควรทำและไม่ควรทำ
3. คำแนะนำเฉพาะสำหรับโรคประจำตัว (ถ้ามี)
4. คำเตือนพิเศษ (ถ้าจำเป็น)

ตอบเป็นภาษาไทยที่กระชับ ชัดเจน ไม่เกิน 200 คำ`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'rate_limit',
          message: 'ใช้งาน AI เกินขีดจำกัด กรุณารอสักครู่แล้วลองใหม่อีกครั้ง' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'payment_required',
          message: 'ระบบ AI ไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('AI service error');
    }

    const aiData = await aiResponse.json();
    const advice = aiData.choices[0].message.content;

    console.log('Generated advice successfully');

    return new Response(JSON.stringify({ advice }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-health-advice:', error);
    return new Response(JSON.stringify({ 
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงคำแนะนำ' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

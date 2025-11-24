import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, pm25, temperature, humidity } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `คุณเป็นที่ปรึกษาด้านสุขภาพเกี่ยวกับคุณภาพอากาศ พูดภาษาไทยเสมอ

ข้อมูลสภาพอากาศปัจจุบัน:
- PM2.5: ${pm25 || 'ไม่ทราบ'} µg/m³
- อุณหภูมิ: ${temperature || 'ไม่ทราบ'}°C
- ความชื้น: ${humidity || 'ไม่ทราบ'}%

แนวทางการให้คำแนะนำ:
1. อธิบายผลกระทบต่อสุขภาพจากระดับ PM2.5 ปัจจุบัน
2. ให้คำแนะนำการป้องกันตัว เช่น สวมหน้ากาก, หลีกเลี่ยงกิจกรรมกลางแจ้ง
3. แนะนำการดูแลสุขภาพ เช่น ดื่มน้ำ, ทานอาหารบำรุง
4. ตอบคำถามเกี่ยวกับโรคระบบทางเดินหายใจ, ภูมิแพ้, หอบหืด
5. พูดด้วยน้ำเสียงเป็นกันเอง กระชับ ชัดเจน

หมายเหตุ: ไม่ใช่แพทย์ หากมีอาการรุนแรงควรพบแพทย์`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "ใช้งานเกินกำหนด กรุณาลองใหม่อีกครั้ง" }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "กรุณาเติมเครดิต Lovable AI" }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("health-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

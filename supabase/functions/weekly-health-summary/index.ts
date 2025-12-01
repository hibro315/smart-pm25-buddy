import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("❌ No authorization header");
      return new Response(
        JSON.stringify({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");
    console.log("🔑 JWT received:", jwt.substring(0, 20) + "...");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    if (userError || !user) {
      console.error("❌ User verification failed:", userError?.message || "No user");
      return new Response(
        JSON.stringify({ 
          error: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
          details: userError?.message 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ User authenticated:", user.email);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];

    // Fetch PHRI logs from last 7 days
    const { data: phriLogs, error: phriError } = await supabaseClient
      .from("health_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("log_date", dateStr)
      .order("log_date", { ascending: true });

    if (phriError) {
      console.error("Error fetching PHRI logs:", phriError);
      throw phriError;
    }

    // Fetch symptom logs from last 7 days
    const { data: symptomLogs, error: symptomError } = await supabaseClient
      .from("daily_symptoms")
      .select("*")
      .eq("user_id", user.id)
      .gte("log_date", dateStr)
      .order("log_date", { ascending: true });

    if (symptomError) {
      console.error("Error fetching symptom logs:", symptomError);
      throw symptomError;
    }

    // Prepare data summary for AI
    const phriSummary = phriLogs?.map((log) => ({
      date: log.log_date,
      phri: log.phri,
      aqi: log.aqi,
      pm25: log.pm25,
      location: log.location,
      outdoor_time: log.outdoor_time,
      wearing_mask: log.wearing_mask,
      symptoms: log.symptoms,
    })) || [];

    const symptomSummary = symptomLogs?.map((log) => ({
      date: log.log_date,
      symptom_score: log.symptom_score,
      cough: log.cough,
      cough_severity: log.cough_severity,
      sneeze: log.sneeze,
      sneeze_severity: log.sneeze_severity,
      wheezing: log.wheezing,
      wheezing_severity: log.wheezing_severity,
      chest_tightness: log.chest_tightness,
      chest_tightness_severity: log.chest_tightness_severity,
      eye_irritation: log.eye_irritation,
      eye_irritation_severity: log.eye_irritation_severity,
      fatigue: log.fatigue,
      fatigue_severity: log.fatigue_severity,
      shortness_of_breath: log.shortness_of_breath,
      shortness_of_breath_severity: log.shortness_of_breath_severity,
      notes: log.notes,
    })) || [];

    const systemPrompt = `คุณเป็น AI Health Analyst ที่เชี่ยวชาญในการวิเคราะห์แนวโน้มสุขภาพและข้อมูลคุณภาพอากาศ 
ภารกิจของคุณคือสร้างรายงานสรุปสุขภาพรายสัปดาห์ที่ครบถ้วน เข้าใจง่าย และให้ข้อมูลที่เป็นประโยชน์

โครงสร้างรายงาน:

📊 **สรุปภาพรวม**
- แนวโน้มค่า PHRI เฉลี่ย และการเปลี่ยนแปลงเทียบกับสัปดาห์ที่แล้ว
- ระดับความเสี่ยงโดยรวมของสัปดาห์นี้
- วันที่มีความเสี่ยงสูงสุดและต่ำสุด

🌡️ **วิเคราะห์สภาพแวดล้อม**
- ค่า AQI และ PM2.5 เฉลี่ย
- วันที่มีมลพิษสูงและผลกระทบต่อสุขภาพ
- แนวโน้มคุณภาพอากาศในแต่ละวัน

😷 **วิเคราะห์อาการ**
- อาการที่พบบ่อยที่สุด
- ความรุนแรงของอาการในแต่ละวัน
- ความสัมพันธ์ระหว่างอาการกับคุณภาพอากาศ

💡 **คำแนะนำและข้อเสนอแนะ**
- พฤติกรรมที่ควรปรับปรุง (เช่น เวลาที่ออกกลางแจ้ง การสวมหน้ากาก)
- กิจกรรมที่แนะนำสำหรับสัปดาห์หน้า
- แนวทางการดูแลสุขภาพเพิ่มเติม

⚠️ **คำเตือน**
- จุดที่ควรระวัง
- สัญญาณที่ควรพบแพทย์

ใช้ภาษาไทยที่เป็นมิตร เข้าใจง่าย มีอิโมจิประกอบ และให้คำแนะนำที่ปฏิบัติได้จริง`;

    const userPrompt = `กรุณาวิเคราะห์และสรุปข้อมูลสุขภาพรายสัปดาห์ (7 วันที่ผ่านมา):

**ข้อมูล PHRI และสิ่งแวดล้อม:**
${JSON.stringify(phriSummary, null, 2)}

**ข้อมูลอาการประจำวัน:**
${JSON.stringify(symptomSummary, null, 2)}

กรุณาให้การวิเคราะห์ที่ครบถ้วนตามโครงสร้างที่กำหนด พร้อมคำแนะนำที่เป็นประโยชน์`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "ใช้งานเกินกำหนด กรุณาลองใหม่อีกครั้ง" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "กรุณาเติมเครดิต Lovable AI" }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices[0]?.message?.content || "ไม่สามารถสร้างสรุปได้";

    // Calculate statistics for the response
    const avgPhri = phriLogs && phriLogs.length > 0
      ? phriLogs.reduce((sum, log) => sum + Number(log.phri), 0) / phriLogs.length
      : 0;

    const avgAqi = phriLogs && phriLogs.length > 0
      ? phriLogs.reduce((sum, log) => sum + Number(log.aqi), 0) / phriLogs.length
      : 0;

    const avgSymptomScore = symptomLogs && symptomLogs.length > 0
      ? symptomLogs.reduce((sum, log) => sum + (Number(log.symptom_score) || 0), 0) / symptomLogs.length
      : 0;

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        statistics: {
          avgPhri: avgPhri.toFixed(1),
          avgAqi: avgAqi.toFixed(0),
          avgSymptomScore: avgSymptomScore.toFixed(1),
          totalLogs: phriLogs?.length || 0,
          totalSymptomLogs: symptomLogs?.length || 0,
        },
        period: {
          start: dateStr,
          end: new Date().toISOString().split('T')[0],
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("weekly-health-summary error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

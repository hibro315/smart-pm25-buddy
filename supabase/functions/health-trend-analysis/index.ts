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
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { sessionId, daysBack = 7 } = await req.json();

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Fetch conversation history
    let query = supabaseClient
      .from("conversation_history")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data: conversations, error: convError } = await query;

    if (convError) {
      console.error("Error fetching conversations:", convError);
      throw convError;
    }

    if (!conversations || conversations.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "ไม่พบประวัติการสนทนา",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch health logs for the same period
    const { data: healthLogs } = await supabaseClient
      .from("health_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", startDate.toISOString())
      .order("log_date", { ascending: true });

    // Fetch symptom logs
    const { data: symptomLogs } = await supabaseClient
      .from("daily_symptoms")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", startDate.toISOString())
      .order("log_date", { ascending: true });

    // Prepare conversation summary
    const conversationSummary = conversations.map((conv) => ({
      role: conv.role,
      content: conv.content.substring(0, 500), // Limit to 500 chars per message
      timestamp: conv.created_at,
      metadata: conv.metadata,
    }));

    // Prepare health data summary
    const healthSummary = {
      totalConversations: conversations.length,
      timeRange: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
      },
      healthLogs: healthLogs?.map((log) => ({
        date: log.log_date,
        phri: log.phri,
        aqi: log.aqi,
        pm25: log.pm25,
        symptoms: log.symptoms,
      })) || [],
      symptomLogs: symptomLogs?.map((log) => ({
        date: log.log_date,
        symptomScore: log.symptom_score,
        symptoms: {
          cough: log.cough,
          shortness_of_breath: log.shortness_of_breath,
          wheezing: log.wheezing,
        },
      })) || [],
    };

    const systemPrompt = `คุณเป็น AI Health Trend Analyst ที่เชี่ยวชาญในการวิเคราะห์แนวโน้มสุขภาพจากข้อมูลประวัติ

**ภารกิจของคุณ:**
วิเคราะห์ประวัติการสนทนา ข้อมูลสุขภาพ และอาการที่บันทึกไว้ เพื่อ:
1. ระบุแนวโน้มสุขภาพที่สำคัญ (ดีขึ้น แย่ลง หรือคงที่)
2. ชี้ประเด็นที่ควรให้ความสนใจ
3. ให้คำแนะนำเชิงรุกเพื่อป้องกันปัญหาสุขภาพ
4. เสนอแนะการปรับเปลี่ยนพฤติกรรม

**โครงสร้างรายงาน:**

📊 **สรุปภาพรวม**
- จำนวนครั้งที่ปรึกษา และหัวข้อหลักที่ถามบ่อย
- แนวโน้มการเปลี่ยนแปลงของอาการ
- ระดับความเสี่ยงโดยรวม

🔍 **การวิเคราะห์เชิงลึก**
- อาการที่ปรากฏซ้ำหรือเพิ่มขึ้น
- ความสัมพันธ์ระหว่างอาการกับสภาพแวดล้อม (PM2.5, AQI)
- พฤติกรรมที่มีผลต่อสุขภาพ

⚠️ **สัญญาณเตือน**
- อาการที่ควรระวัง
- ปัจจัยเสี่ยงที่เพิ่มขึ้น
- สิ่งที่ควรปรึกษาแพทย์

💡 **คำแนะนำเชิงรุก**
- การปรับเปลี่ยนพฤติกรรม
- การป้องกันที่เฉพาะเจาะจง
- แผนการดูแลสุขภาพระยะสั้นและระยะยาว

✅ **จุดแข็งและสิ่งที่ทำได้ดี**
- พฤติกรรมเชิงบวกที่ควรรักษาไว้
- ความก้าวหน้าที่เห็นได้ชัด

**รูปแบบการนำเสนอ:**
- ใช้ภาษาไทยที่เข้าใจง่าย เป็นมิตร
- มีอิโมจิประกอบเพื่อความชัดเจน
- ให้คำแนะนำที่ปฏิบัติได้จริง
- เน้นความปลอดภัยและการป้องกัน
- หลีกเลี่ยงการวินิจฉัยโรคหรือสั่งยา`;

    const userPrompt = `กรุณาวิเคราะห์แนวโน้มสุขภาพจากข้อมูลต่อไปนี้:

**ประวัติการสนทนา (${daysBack} วันที่ผ่านมา):**
${JSON.stringify(conversationSummary, null, 2)}

**ข้อมูลสุขภาพและอาการ:**
${JSON.stringify(healthSummary, null, 2)}

กรุณาวิเคราะห์อย่างละเอียดและให้คำแนะนำที่เป็นประโยชน์`;

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
        max_tokens: 2500,
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
    const analysis = aiData.choices[0]?.message?.content || "ไม่สามารถวิเคราะห์ได้";

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        statistics: {
          totalConversations: conversations.length,
          totalHealthLogs: healthLogs?.length || 0,
          totalSymptomLogs: symptomLogs?.length || 0,
          daysAnalyzed: daysBack,
        },
        period: {
          start: startDate.toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("health-trend-analysis error:", error);
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
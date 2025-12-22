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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { chatContent, pm25, aqi, temperature, humidity, location, profile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Use AI to analyze symptoms and calculate PHRI
    const analysisPrompt = `จากการสนทนาต่อไปนี้ วิเคราะห์ความเสี่ยงสุขภาพ (PHRI) ในรูปแบบ JSON:

ข้อมูลสิ่งแวดล้อม:
- PM2.5: ${pm25 || 'ไม่ทราบ'} µg/m³
- AQI: ${aqi || 'ไม่ทราบ'}
- อุณหภูมิ: ${temperature || 'ไม่ทราบ'}°C
- ความชื้น: ${humidity || 'ไม่ทราบ'}%

ข้อมูลผู้ใช้:
- อายุ: ${profile?.age || 'ไม่ทราบ'}
- เพศ: ${profile?.gender || 'ไม่ทราบ'}
- โรคประจำตัว: ${profile?.chronicConditions?.join(', ') || 'ไม่มี'}
- ความไวต่อฝุ่น: ${profile?.dustSensitivity || 'ไม่ทราบ'}

เนื้อหาการสนทนา:
${chatContent}

วิเคราะห์และตอบในรูปแบบ JSON เท่านั้น:
{
  "phri": <ตัวเลข 0-10>,
  "alertLevel": <"info" | "warning" | "urgent" | "emergency">,
  "symptoms": [<รายการอาการที่พบ>],
  "riskFactors": [<ปัจจัยเสี่ยง>],
  "outdoorTime": <ประมาณการเวลานอกอาคาร นาที>,
  "wearingMask": <true/false ถ้าพบว่าสวมหน้ากาก>,
  "recommendation": <คำแนะนำสั้นๆ>
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "คุณเป็น AI วิเคราะห์ความเสี่ยงสุขภาพ ตอบเป็น JSON เท่านั้น" },
          { role: "user", content: analysisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("AI analysis error:", response.status);
      // Fallback to rule-based calculation
      return calculateFallbackPHRI(pm25, aqi, profile, user.id, supabaseClient, corsHeaders, location);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Parse JSON from AI response
    let analysis;
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      console.log("AI response parsing failed, using fallback");
      return calculateFallbackPHRI(pm25, aqi, profile, user.id, supabaseClient, corsHeaders, location);
    }

    // Save to health_logs
    const today = new Date().toISOString().split('T')[0];
    let saved = false;

    try {
      const { data: existingLog } = await supabaseClient
        .from('health_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle();

      const logData = {
        aqi: aqi || 0,
        pm25: pm25 || 0,
        outdoor_time: analysis.outdoorTime || 0,
        has_symptoms: (analysis.symptoms?.length || 0) > 0,
        symptoms: analysis.symptoms || [],
        phri: analysis.phri,
        location: location || 'Unknown',
        wearing_mask: analysis.wearingMask || false,
        age: profile?.age || 30,
        gender: profile?.gender || 'unknown',
      };

      if (existingLog) {
        await supabaseClient
          .from('health_logs')
          .update(logData)
          .eq('id', existingLog.id);
      } else {
        await supabaseClient.from('health_logs').insert({
          user_id: user.id,
          log_date: today,
          ...logData,
        });
      }
      saved = true;
    } catch (error) {
      console.error("Error saving health log:", error);
    }

    return new Response(
      JSON.stringify({
        phri: analysis.phri,
        alertLevel: analysis.alertLevel,
        symptoms: analysis.symptoms,
        riskFactors: analysis.riskFactors,
        recommendation: analysis.recommendation,
        saved,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("analyze-phri error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fallback rule-based PHRI calculation
async function calculateFallbackPHRI(
  pm25: number | undefined,
  aqi: number | undefined,
  profile: any,
  userId: string,
  supabaseClient: any,
  corsHeaders: Record<string, string>,
  location?: string
) {
  let phri = 0;
  
  // Environmental score
  if (pm25) {
    if (pm25 > 150) phri += 3.0;
    else if (pm25 > 90) phri += 2.5;
    else if (pm25 > 50) phri += 2.0;
    else if (pm25 > 37) phri += 1.5;
    else if (pm25 > 12) phri += 1.0;
    else phri += 0.3;
  }

  // AQI score
  if (aqi) {
    if (aqi > 300) phri += 1.5;
    else if (aqi > 200) phri += 1.2;
    else if (aqi > 150) phri += 1.0;
    else if (aqi > 100) phri += 0.7;
    else if (aqi > 50) phri += 0.4;
  }

  // Personal risk factors
  if (profile) {
    if (profile.age < 5 || profile.age > 65) phri += 0.5;
    if (profile.chronicConditions?.length > 0) phri += 0.7;
    if (profile.dustSensitivity === 'high') phri += 0.5;
  }

  phri = Math.min(10, Math.max(0, phri));
  phri = Math.round(phri * 10) / 10;

  let alertLevel: string;
  if (phri >= 8) alertLevel = 'emergency';
  else if (phri >= 6) alertLevel = 'urgent';
  else if (phri >= 3) alertLevel = 'warning';
  else alertLevel = 'info';

  // Try to save
  let saved = false;
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: existingLog } = await supabaseClient
      .from('health_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('log_date', today)
      .maybeSingle();

    const logData = {
      aqi: aqi || 0,
      pm25: pm25 || 0,
      outdoor_time: 0,
      has_symptoms: false,
      symptoms: [],
      phri,
      location: location || 'Unknown',
      wearing_mask: false,
      age: profile?.age || 30,
      gender: profile?.gender || 'unknown',
    };

    if (existingLog) {
      await supabaseClient.from('health_logs').update(logData).eq('id', existingLog.id);
    } else {
      await supabaseClient.from('health_logs').insert({ user_id: userId, log_date: today, ...logData });
    }
    saved = true;
  } catch (e) {
    console.error("Fallback save error:", e);
  }

  return new Response(
    JSON.stringify({
      phri,
      alertLevel,
      symptoms: [],
      riskFactors: [],
      recommendation: phri >= 6 ? 'หลีกเลี่ยงกิจกรรมกลางแจ้ง' : 'สามารถทำกิจกรรมได้ตามปกติ',
      saved,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

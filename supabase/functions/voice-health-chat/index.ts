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
    const { message, context, language = 'th', conversationHistory = [] } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Processing voice health chat:', message.substring(0, 50));

    // Get user health profile if authenticated
    let userProfile = null;
    let recentSymptoms = null;
    let healthKnowledge: string[] = [];
    
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
          // Get health profile
          const { data: profile } = await supabaseClient
            .from("health_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          userProfile = profile;

          // Get recent symptoms (last 7 days)
          const { data: symptoms } = await supabaseClient
            .from("daily_symptoms")
            .select("*")
            .eq("user_id", user.id)
            .order("log_date", { ascending: false })
            .limit(7);
          recentSymptoms = symptoms;
        }

        // Get health knowledge from database
        const { data: knowledge } = await supabaseClient
          .from("health_knowledge")
          .select("topic, content, category")
          .limit(20);
        healthKnowledge = knowledge?.map(k => `${k.category}: ${k.topic} - ${k.content}`) || [];
        
      } catch (e) {
        console.log('Could not fetch user data:', e);
      }
    }

    // Build comprehensive personal context
    let personalContext = '';
    if (userProfile) {
      const chronicConditions = userProfile.chronic_conditions || [];
      const isHighRisk = chronicConditions.some((c: string) => 
        ['asthma', 'copd', 'heart', 'cardiovascular'].includes(c.toLowerCase())
      );
      
      personalContext = `
**ข้อมูลผู้ป่วย:**
- อายุ: ${userProfile.age} ปี
- เพศ: ${userProfile.gender === 'male' ? 'ชาย' : 'หญิง'}
- โรคประจำตัว: ${chronicConditions.length > 0 ? chronicConditions.join(', ') : 'ไม่มี'}
- ความไวต่อฝุ่น: ${userProfile.dust_sensitivity === 'high' ? 'สูงมาก' : userProfile.dust_sensitivity === 'medium' ? 'ปานกลาง' : 'ต่ำ'}
- มีเครื่องฟอกอากาศ: ${userProfile.has_air_purifier ? 'มี' : 'ไม่มี'}
- หน้ากากที่ใช้: ${userProfile.mask_usage || 'ไม่ระบุ'}
- กิจกรรมประจำวัน: ${userProfile.physical_activity === 'active' ? 'กระฉับกระเฉง' : userProfile.physical_activity === 'moderate' ? 'ปานกลาง' : 'นั่งทำงานเป็นหลัก'}
- กลุ่มเสี่ยง: ${isHighRisk ? '⚠️ ใช่ (ต้องระวังเป็นพิเศษ)' : 'ไม่ใช่'}`;
    }

    // Analyze recent symptoms
    let symptomAnalysis = '';
    if (recentSymptoms && recentSymptoms.length > 0) {
      const avgScore = recentSymptoms.reduce((sum: number, s: any) => sum + (s.symptom_score || 0), 0) / recentSymptoms.length;
      const hasRecurringSymptoms = recentSymptoms.filter((s: any) => s.cough || s.shortness_of_breath).length >= 3;
      
      symptomAnalysis = `
**อาการล่าสุด (7 วัน):**
- คะแนนอาการเฉลี่ย: ${avgScore.toFixed(1)}/10
- มีอาการซ้ำๆ: ${hasRecurringSymptoms ? 'ใช่ (ไอ/หายใจลำบาก)' : 'ไม่มี'}
- จำนวนวันที่มีอาการ: ${recentSymptoms.filter((s: any) => s.symptom_score > 0).length} วัน`;
    }

    // Risk assessment based on PM2.5
    let riskLevel = 'ปกติ';
    let riskEmoji = '🟢';
    let clinicalAction = '';
    const pm25 = context?.pm25;
    
    if (pm25) {
      if (pm25 > 150) {
        riskLevel = 'อันตรายมาก (Hazardous)';
        riskEmoji = '🔴';
        clinicalAction = 'แนะนำอย่างยิ่งให้อยู่ในอาคารปิด หลีกเลี่ยงกิจกรรมกลางแจ้งทุกชนิด';
      } else if (pm25 > 90) {
        riskLevel = 'อันตราย (Very Unhealthy)';
        riskEmoji = '🟠';
        clinicalAction = 'กลุ่มเสี่ยงควรอยู่ในอาคาร ทุกคนควรลดกิจกรรมกลางแจ้ง';
      } else if (pm25 > 55) {
        riskLevel = 'ไม่ดีต่อสุขภาพ (Unhealthy)';
        riskEmoji = '🟡';
        clinicalAction = 'กลุ่มเสี่ยงควรจำกัดกิจกรรมกลางแจ้ง ใส่หน้ากาก N95';
      } else if (pm25 > 35) {
        riskLevel = 'ปานกลาง (Moderate)';
        riskEmoji = '🟢';
        clinicalAction = 'ทำกิจกรรมได้ตามปกติ แต่ควรสังเกตอาการ';
      } else {
        riskLevel = 'ดี (Good)';
        riskEmoji = '🟢';
        clinicalAction = 'อากาศดี ทำกิจกรรมกลางแจ้งได้ปกติ';
      }
    }

    // Language-specific doctor persona
    const doctorPersonas: Record<string, string> = {
      th: `คุณคือแพทย์ผู้เชี่ยวชาญด้านอายุรกรรมและโรคระบบทางเดินหายใจ ชื่อ "หมอใจดี"
ประสบการณ์: 15 ปีในการรักษาโรคที่เกี่ยวกับมลพิษทางอากาศ
สไตล์: พูดคุยเป็นกันเอง อบอุ่น แต่ให้ข้อมูลทางการแพทย์ที่ถูกต้อง`,
      en: `You are a senior pulmonologist and internal medicine specialist named "Dr. Heart"
Experience: 15 years treating air pollution-related conditions
Style: Warm, friendly, but medically accurate`,
      zh: `您是一位高级呼吸科和内科专家，名叫"心医生"
经验：15年治疗空气污染相关疾病
风格：温暖友好，但医学准确`
    };

    const systemPrompt = `${doctorPersonas[language] || doctorPersonas.th}

**บริบทสิ่งแวดล้อมปัจจุบัน:**
${pm25 ? `• ${riskEmoji} PM2.5: ${pm25} µg/m³ (${riskLevel})` : ''}
${context?.aqi ? `• AQI: ${context.aqi}` : ''}
${context?.temperature ? `• อุณหภูมิ: ${context.temperature}°C` : ''}
${context?.humidity ? `• ความชื้น: ${context.humidity}%` : ''}
${context?.location ? `• ตำแหน่ง: ${context.location}` : ''}
${clinicalAction ? `• **การดำเนินการ**: ${clinicalAction}` : ''}
${personalContext}
${symptomAnalysis}

**ความรู้ทางการแพทย์ที่เกี่ยวข้อง:**
${healthKnowledge.slice(0, 5).join('\n')}

**แนวทางการตอบ (เหมือนหมอจริงๆ):**

1. **รับฟังและเข้าใจ**: ตอบสนองต่อความกังวลของคนไข้ก่อน
2. **ประเมินสถานการณ์**: วิเคราะห์ความเสี่ยงจากข้อมูลที่มี
3. **ให้คำแนะนำเฉพาะบุคคล**: อ้างอิงจากโปรไฟล์สุขภาพของเขา
4. **ถามต่อเพื่อเข้าใจมากขึ้น**: ถ้าข้อมูลไม่พอ ให้ถามเพิ่ม
5. **ให้ตัวเลือก**: เสนอทางเลือกให้เลือกเสมอ

**รูปแบบคำตอบ:**
- สั้นกระชับ (3-5 ประโยค สำหรับเสียง)
- ใช้ภาษาที่เข้าใจง่าย ไม่ใช่ศัพท์แพทย์มากเกินไป
- ลงท้ายด้วยคำถามหรือตัวเลือก

**ตัวอย่างการตอบแบบหมอ:**

ถ้าถามว่า "วันนี้ออกไปวิ่งได้ไหม":
"จากค่า PM2.5 ที่ 65 และคุณมีประวัติหอบหืด ผมแนะนำให้ออกกำลังกายในร่มวันนี้ครับ ถ้าจะออกกลางแจ้งจริงๆ ควรใส่ N95 และออกช่วงเย็น

**มีอะไรให้ช่วยอีกไหม:**
• ดูสถานที่ออกกำลังกายในร่มใกล้คุณ
• แนะนำท่าออกกำลังกายในบ้าน
• ถามเรื่องอื่นได้เลย"

**ห้ามเด็ดขาด:**
❌ วินิจฉัยโรคหรือสั่งยา
❌ ให้ข้อมูลที่ขัดกับหลักวิชาการ
❌ ตอบแบบ AI ทั่วไป (ต้องเป็นหมอที่รู้จักคนไข้)
❌ ตอบยาวเกินไป (เหมาะกับการฟัง)

**ถ้าคำถามไม่เกี่ยวกับสุขภาพ:**
ตอบสั้นๆ อย่างเป็นมิตร แล้วถามว่า "มีเรื่องสุขภาพอะไรให้ช่วยไหมครับ?"`;

    // Build messages with conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 400,
        temperature: 0.4, // Slightly higher for more natural conversation
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'ขอโทษครับ ระบบกำลังใช้งานหนัก กรุณาลองใหม่อีกครั้ง' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'ระบบมีปัญหา กรุณาติดต่อผู้ดูแล' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'ขออภัยครับ ไม่สามารถตอบได้ในขณะนี้';

    // Extract choices from response for quick reply buttons
    const choiceMatches = reply.match(/[•\-]\s*(.+?)(?=\n|$)/g);
    const choices = choiceMatches?.slice(0, 4).map((c: string) => c.replace(/^[•\-]\s*/, '').trim()) || [
      'สอบถามเพิ่มเติม',
      'ดูคำแนะนำอื่น',
      'จบการสนทนา'
    ];

    console.log('Doctor AI response generated successfully');

    return new Response(
      JSON.stringify({ 
        reply,
        choices,
        riskLevel,
        riskEmoji,
        pm25: context?.pm25,
        clinicalAction
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

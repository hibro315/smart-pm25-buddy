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
    // Get JWT from Authorization header
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

    // Extract JWT token
    const jwt = authHeader.replace("Bearer ", "");
    console.log("🔑 JWT received:", jwt.substring(0, 20) + "...");

    // Create Supabase client with JWT
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { 
        global: { 
          headers: { Authorization: authHeader } 
        },
        auth: {
          persistSession: false
        }
      }
    );

    // Get user from JWT
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

    const { messages, sessionId, saveHistory = true, pm25, aqi, temperature, humidity, location } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // =====================
    // RAG: Load Personal Health Data
    // =====================
    
    // 1. Load user's health profile
    const { data: healthProfile } = await supabaseClient
      .from("health_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // 2. Load user's recent daily symptoms (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentSymptoms } = await supabaseClient
      .from("daily_symptoms")
      .select("*")
      .eq("user_id", user.id)
      .gte("log_date", sevenDaysAgo.toISOString().split('T')[0])
      .order("log_date", { ascending: false })
      .limit(7);

    // 3. Load user's recent PHRI logs (last 7 days)
    const { data: recentHealthLogs } = await supabaseClient
      .from("health_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("log_date", sevenDaysAgo.toISOString().split('T')[0])
      .order("log_date", { ascending: false })
      .limit(7);

    // 4. Load conversation history for context
    let conversationHistory: any[] = [];
    if (sessionId && saveHistory) {
      const { data: historyData } = await supabaseClient
        .from("conversation_history")
        .select("role, content")
        .eq("user_id", user.id)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(20);
      
      if (historyData) {
        conversationHistory = historyData;
      }
    }

    // =====================
    // RAG: Load Health Knowledge Base (Thai DOH Standards)
    // =====================
    
    // Extract keywords from user message for relevant knowledge retrieval
    const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const keywords: string[] = [];
    
    // Detect relevant topics
    if (userMessage.includes('หอบหืด') || userMessage.includes('asthma')) keywords.push('asthma');
    if (userMessage.includes('copd')) keywords.push('copd');
    if (userMessage.includes('หัวใจ') || userMessage.includes('heart')) keywords.push('heart_disease');
    if (userMessage.includes('แพ้') || userMessage.includes('allergy')) keywords.push('allergy');
    if (userMessage.includes('ออกกำลังกาย') || userMessage.includes('exercise')) keywords.push('exercise');
    if (userMessage.includes('หน้ากาก') || userMessage.includes('mask') || userMessage.includes('n95')) keywords.push('mask');
    if (userMessage.includes('เครื่องฟอก') || userMessage.includes('purifier')) keywords.push('air_purifier');
    if (userMessage.includes('อาการ') || userMessage.includes('symptom')) keywords.push('symptoms');
    if (userMessage.includes('เส้นทาง') || userMessage.includes('route') || userMessage.includes('เดินทาง')) keywords.push('navigation');
    if (userMessage.includes('pm2.5') || userMessage.includes('pm25') || userMessage.includes('ฝุ่น')) keywords.push('pm25');
    if (userMessage.includes('aqi')) keywords.push('aqi');
    
    // Add user's chronic conditions to keywords for personalized retrieval
    if (healthProfile?.chronic_conditions) {
      healthProfile.chronic_conditions.forEach((condition: string) => {
        if (condition.toLowerCase().includes('asthma') || condition.includes('หอบหืด')) keywords.push('asthma');
        if (condition.toLowerCase().includes('copd')) keywords.push('copd');
        if (condition.toLowerCase().includes('heart') || condition.includes('หัวใจ')) keywords.push('heart_disease');
        if (condition.toLowerCase().includes('allergy') || condition.includes('แพ้')) keywords.push('allergy');
      });
    }
    
    // Always include core standards
    keywords.push('standards', 'phri', 'risk_groups');

    // Query health knowledge base with relevant tags
    let healthKnowledge: any[] = [];
    if (keywords.length > 0) {
      const { data: knowledgeData } = await supabaseClient
        .from("health_knowledge")
        .select("category, topic, content, source")
        .overlaps("tags", keywords)
        .limit(10);
      
      if (knowledgeData) {
        healthKnowledge = knowledgeData;
      }
    }

    // Fallback: get general knowledge if no specific matches
    if (healthKnowledge.length === 0) {
      const { data: generalKnowledge } = await supabaseClient
        .from("health_knowledge")
        .select("category, topic, content, source")
        .limit(5);
      
      if (generalKnowledge) {
        healthKnowledge = generalKnowledge;
      }
    }

    // =====================
    // Build RAG Context
    // =====================
    
    // Personal Health Context
    let personalHealthContext = "";
    if (healthProfile) {
      personalHealthContext = `
**ข้อมูลสุขภาพส่วนบุคคลของผู้ใช้:**
- ชื่อ: ${healthProfile.name || 'ไม่ระบุ'}
- อายุ: ${healthProfile.age} ปี
- เพศ: ${healthProfile.gender === 'male' ? 'ชาย' : healthProfile.gender === 'female' ? 'หญิง' : healthProfile.gender}
- โรคประจำตัว: ${healthProfile.chronic_conditions?.length > 0 ? healthProfile.chronic_conditions.join(', ') : 'ไม่มี'}
- ความไวต่อฝุ่น: ${healthProfile.dust_sensitivity === 'high' ? 'สูง' : healthProfile.dust_sensitivity === 'medium' ? 'ปานกลาง' : 'ต่ำ'}
- มีเครื่องฟอกอากาศ: ${healthProfile.has_air_purifier ? 'มี' : 'ไม่มี'}
- กิจกรรมทางกาย: ${healthProfile.physical_activity === 'active' ? 'ออกกำลังกายสม่ำเสมอ' : healthProfile.physical_activity === 'moderate' ? 'ปานกลาง' : 'น้อย'}
- การใช้หน้ากาก: ${healthProfile.mask_usage || 'ไม่ระบุ'}
- สภาพแวดล้อมทำงาน: ${healthProfile.work_environment || 'ไม่ระบุ'}
- เวลาอยู่กลางแจ้งต่อวัน: ${healthProfile.outdoor_time_daily || 0} นาที`;
    }

    // Recent Symptoms Context
    let symptomsContext = "";
    if (recentSymptoms && recentSymptoms.length > 0) {
      symptomsContext = `\n\n**อาการรายวันล่าสุด (7 วัน):**`;
      recentSymptoms.forEach((log: any) => {
        const symptoms = [];
        if (log.cough) symptoms.push(`ไอ (รุนแรง: ${log.cough_severity}/5)`);
        if (log.sneeze) symptoms.push(`จาม (รุนแรง: ${log.sneeze_severity}/5)`);
        if (log.shortness_of_breath) symptoms.push(`หายใจลำบาก (รุนแรง: ${log.shortness_of_breath_severity}/5)`);
        if (log.chest_tightness) symptoms.push(`แน่นหน้าอก (รุนแรง: ${log.chest_tightness_severity}/5)`);
        if (log.eye_irritation) symptoms.push(`ระคายเคืองตา (รุนแรง: ${log.eye_irritation_severity}/5)`);
        if (log.fatigue) symptoms.push(`อ่อนเพลีย (รุนแรง: ${log.fatigue_severity}/5)`);
        
        if (symptoms.length > 0) {
          symptomsContext += `\n- ${log.log_date}: ${symptoms.join(', ')}`;
          if (log.notes) symptomsContext += ` (หมายเหตุ: ${log.notes})`;
        }
      });
    }

    // Recent PHRI History Context
    let phriHistoryContext = "";
    if (recentHealthLogs && recentHealthLogs.length > 0) {
      phriHistoryContext = `\n\n**ประวัติความเสี่ยงสุขภาพ (PHRI) ล่าสุด:**`;
      recentHealthLogs.forEach((log: any) => {
        const riskLevel = log.phri >= 8 ? 'ฉุกเฉิน' : log.phri >= 6 ? 'เร่งด่วน' : log.phri >= 3 ? 'เตือน' : 'ปลอดภัย';
        phriHistoryContext += `\n- ${log.log_date}: PHRI ${log.phri}/10 (${riskLevel}), PM2.5: ${log.pm25}, AQI: ${log.aqi}, อยู่กลางแจ้ง: ${log.outdoor_time} นาที`;
        if (log.symptoms?.length > 0) phriHistoryContext += `, อาการ: ${log.symptoms.join(', ')}`;
      });
    }

    // Health Knowledge Base Context (Thai DOH Standards)
    let knowledgeBaseContext = "";
    if (healthKnowledge.length > 0) {
      knowledgeBaseContext = `\n\n**ฐานความรู้สุขภาพ (เกณฑ์มาตรฐานกรมอนามัย):**`;
      healthKnowledge.forEach((k: any) => {
        knowledgeBaseContext += `\n\n📚 **${k.topic}** (${k.category}):\n${k.content}\n(แหล่งข้อมูล: ${k.source})`;
      });
    }

    // Current Environmental Context
    const environmentalData = `
**ข้อมูลสิ่งแวดล้อมปัจจุบัน:**
- PM2.5: ${pm25 || 'ไม่ทราบ'} µg/m³ ${pm25 ? (pm25 > 90 ? '(อันตรายมาก 🚨)' : pm25 > 75 ? '(อันตราย ⚠️)' : pm25 > 50 ? '(ไม่ดีต่อสุขภาพ ⚠️)' : pm25 > 37 ? '(ไม่ดีสำหรับกลุ่มเสี่ยง)' : pm25 > 12 ? '(ปานกลาง)' : '(ดีมาก ✅)') : ''}
- AQI: ${aqi || 'ไม่ทราบ'} ${aqi ? (aqi > 300 ? '(อันตราย)' : aqi > 200 ? '(ไม่ดีมาก)' : aqi > 150 ? '(ไม่ดี)' : aqi > 100 ? '(ไม่ดีสำหรับกลุ่มเสี่ยง)' : aqi > 50 ? '(ปานกลาง)' : '(ดี)') : ''}
- อุณหภูมิ: ${temperature || 'ไม่ทราบ'}°C ${temperature ? (temperature > 35 ? '(ร้อนมาก)' : temperature < 15 ? '(เย็นมาก)' : '') : ''}
- ความชื้น: ${humidity || 'ไม่ทราบ'}% ${humidity ? (humidity > 80 ? '(ชื้นมาก)' : humidity < 30 ? '(แห้งมาก)' : '') : ''}
- สถานที่: ${location || 'ไม่ทราบ'}`;

    // Calculate current risk level for context
    let riskAssessment = "";
    if (pm25 && healthProfile) {
      let riskLevel = "ต่ำ";
      const isHighRisk = healthProfile.chronic_conditions?.some((c: string) => 
        ['asthma', 'COPD', 'heart disease'].some(condition => c.toLowerCase().includes(condition))
      ) || healthProfile.age < 5 || healthProfile.age > 65 || healthProfile.dust_sensitivity === 'high';
      
      if (isHighRisk) {
        if (pm25 > 50) riskLevel = "สูงมาก ⚠️ (กลุ่มเสี่ยง)";
        else if (pm25 > 37) riskLevel = "สูง (กลุ่มเสี่ยง)";
        else if (pm25 > 25) riskLevel = "ปานกลาง (กลุ่มเสี่ยง)";
      } else {
        if (pm25 > 90) riskLevel = "สูงมาก";
        else if (pm25 > 50) riskLevel = "สูง";
        else if (pm25 > 37) riskLevel = "ปานกลาง";
      }
      
      riskAssessment = `\n\n**การประเมินความเสี่ยงเบื้องต้น:** ${riskLevel}${isHighRisk ? ' (ผู้ใช้อยู่ในกลุ่มเสี่ยงสูง)' : ''}`;
    }

    // =====================
    // Build System Prompt with RAG Context
    // =====================
    
    // Determine disease-aware persona based on health profile
    let personaFocus = "comfort_prevention"; // default
    if (healthProfile?.chronic_conditions?.some((c: string) => 
      c.toLowerCase().includes('asthma') || c.includes('หอบหืด'))) {
      personaFocus = "asthma";
    } else if (healthProfile?.chronic_conditions?.some((c: string) => 
      c.toLowerCase().includes('heart') || c.includes('หัวใจ') || c.toLowerCase().includes('cardio'))) {
      personaFocus = "cardiovascular";
    } else if (healthProfile && healthProfile.age > 65) {
      personaFocus = "elderly";
    }

    // Check if high risk situation
    const isHighRiskSituation = pm25 && pm25 > 75;

    const personaInstructions = {
      asthma: "Focus on peak exposure and short-term avoidance. เน้นการหลีกเลี่ยงช่วงฝุ่นสูงและการป้องกันอาการกำเริบ",
      cardiovascular: "Focus on cumulative exposure and duration. เน้นการสะสมของการสัมผัสฝุ่นและระยะเวลา",
      elderly: "Focus on recovery time and stability. เน้นเวลาฟื้นตัวและความมั่นคงของสุขภาพ",
      comfort_prevention: "Focus on comfort and prevention. เน้นความสบายและการป้องกัน"
    };

    const systemPrompt = `คุณเป็น AI Health Advisor ที่ปรึกษาสุขภาพระยะยาว

**⏱️ VOICE TIME CONSTRAINT:**
- คำตอบต้องสั้นกระชับ อ่านออกเสียงได้ภายใน 20 วินาที
- ถ้าต้องอธิบายยาว ให้สรุปก่อน แล้วถามว่า "ต้องการรายละเอียดเพิ่มเติมไหมครับ?"
- ไม่เกิน 2-3 ประโยคต่อคำตอบ

**🎯 DISEASE-AWARE PERSONA (${personaFocus}):**
${personaInstructions[personaFocus as keyof typeof personaInstructions]}

${isHighRiskSituation ? `
**🚨 HIGH RISK MODE ACTIVE (PM2.5: ${pm25}µg/m³):**
- ลดคำตอบเหลือแค่สิ่งจำเป็น
- พูดชัดเจนและหนักแน่น
- ไม่มีตัวเลือกนอกจากเรื่องความปลอดภัย
- ตัวอย่าง: "ตอนนี้ความเสี่ยงสูง แนะนำให้อยู่ในอาคารทันที"
` : ''}

**📊 LONG-TERM ADVISOR MODE:**
- อ้างอิงแนวโน้มรายวัน/รายสัปดาห์ได้
- เช่น "ช่วงนี้คุณมีแนวโน้มไวต่อฝุ่นมากขึ้น"
- ไม่พูดถึง storage, logs, หรือ system memory

**🤝 TRUST COMMUNICATION:**
- น้ำเสียงสงบ สม่ำเสมอ
- ไม่ตื่นตระหนกเกินไป
- ไม่ขัดแย้งคำแนะนำก่อนหน้าโดยไม่อธิบาย
- ถ้าคำแนะนำเปลี่ยน พูดว่า "จากข้อมูลล่าสุดที่เพิ่มเข้ามา..."
- หลีกเลี่ยง: คำพูดสุดโต่ง, คำเตือนเกินจริง, ศัพท์แพทย์ยากๆ

**🔄 REAL-TIME VOICE HANDLING:**
- ถ้าผู้ใช้ขัดจังหวะ หยุดทันที
- รับทราบสั้นๆ แล้วพูดเฉพาะที่เกี่ยวข้อง
- เช่น "เข้าใจครับ สรุปสั้นๆ คือวันนี้ไม่ควรออกนอกอาคารนาน"

**หลักการหลัก:**
1. ใช้ข้อมูลสุขภาพส่วนบุคคล: โรคประจำตัว, อายุ, กลุ่มเสี่ยง, ประวัติอาการ
2. อ้างอิงเกณฑ์กรมอนามัย
3. ❌ ไม่วินิจฉัยโรค ❌ ไม่สั่งยา ✅ แนะนำพบแพทย์เมื่อจำเป็น

${environmentalData}
${personalHealthContext}
${symptomsContext}
${phriHistoryContext}
${riskAssessment}
${knowledgeBaseContext}

🚨 **อาการที่ต้องพบแพทย์ทันที:**
- หายใจลำบากมาก/แน่นหน้าอกรุนแรง
- ริมฝีปากเขียว/สับสน/ไอเป็นเลือด

💡 คำแนะนำเป็นข้อมูลทั่วไป ไม่ใช่การวินิจฉัยทางการแพทย์`;

    // Combine conversation history with new messages
    const allMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      ...messages
    ];

    // Save user message to history
    if (saveHistory && sessionId) {
      const userMsg = messages.find((m: any) => m.role === 'user');
      if (userMsg) {
        await supabaseClient.from("conversation_history").insert({
          user_id: user.id,
          session_id: sessionId,
          role: 'user',
          content: userMsg.content,
          metadata: { pm25, aqi, temperature, humidity, location }
        });
      }
    }

    console.log("📚 RAG Context loaded:", {
      hasHealthProfile: !!healthProfile,
      recentSymptomsCount: recentSymptoms?.length || 0,
      recentHealthLogsCount: recentHealthLogs?.length || 0,
      knowledgeBaseCount: healthKnowledge.length,
      keywords
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: allMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1500,
        top_p: 0.95,
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

    // Stream response and collect assistant message
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const json = JSON.parse(line.slice(6));
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                    assistantMessage += content;
                  }
                } catch (e) {
                  // Ignore JSON parse errors for partial chunks
                }
              }
            }
            
            controller.enqueue(value);
          }
          
          // Save assistant message to history after streaming completes
          if (saveHistory && sessionId && assistantMessage) {
            await supabaseClient.from("conversation_history").insert({
              user_id: user.id,
              session_id: sessionId,
              role: 'assistant',
              content: assistantMessage,
            });
          }
          
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
      },
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

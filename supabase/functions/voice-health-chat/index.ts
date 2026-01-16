import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Voice Health Chat - Enhanced AI Doctor
 * 
 * Features:
 * 1. Persistent conversation memory (stored in DB)
 * 2. Doctor-grade persona with ethical constraints
 * 3. Disease-aware personalization
 * 4. Real-time context integration
 */

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
    const { 
      message, 
      context, 
      language = 'th', 
      sessionId,
      conversationHistory = [] 
    } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Processing voice health chat:', message.substring(0, 50));

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
    );

    // Get user health profile if authenticated
    let userProfile = null;
    let recentSymptoms: any[] = [];
    let healthKnowledge: string[] = [];
    let persistedHistory: any[] = [];
    let healthMemory: any[] = [];
    let userId: string | null = null;
    
    if (authHeader) {
      try {
        const jwt = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabaseClient.auth.getUser(jwt);
        
        if (user) {
          userId = user.id;
          
          // Get health profile
          const { data: profile } = await supabaseClient
            .from("health_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          userProfile = profile;

          // Get recent symptoms (last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const { data: symptoms } = await supabaseClient
            .from("daily_symptoms")
            .select("*")
            .eq("user_id", user.id)
            .gte("log_date", sevenDaysAgo.toISOString().split('T')[0])
            .order("log_date", { ascending: false })
            .limit(7);
          recentSymptoms = symptoms || [];

          // Load conversation history from DB (last 20 messages)
          if (sessionId) {
            const { data: historyData } = await supabaseClient
              .from("conversation_history")
              .select("role, content, created_at")
              .eq("user_id", user.id)
              .eq("session_id", sessionId)
              .order("created_at", { ascending: true })
              .limit(20);
            
            if (historyData && historyData.length > 0) {
              persistedHistory = historyData.map(h => ({
                role: h.role,
                content: h.content
              }));
            }
          }

          // Load health memory (medications, frequent symptoms, allergies)
          const { data: memory } = await supabaseClient
            .from("user_health_memory")
            .select("memory_type, key, value, frequency")
            .eq("user_id", user.id)
            .order("frequency", { ascending: false })
            .limit(15);
          healthMemory = memory || [];
        }

        // Get health knowledge from database
        const { data: knowledge } = await supabaseClient
          .from("health_knowledge")
          .select("topic, content, category")
          .limit(10);
        healthKnowledge = knowledge?.map(k => `${k.category}: ${k.topic} - ${k.content}`) || [];
        
      } catch (e) {
        console.log('Could not fetch user data:', e);
      }
    }

    // Build comprehensive personal context
    const chronicConditions = userProfile?.chronic_conditions || [];
    const isAsthmatic = chronicConditions.some((c: string) => 
      c.toLowerCase().includes('asthma') || c.includes('หอบหืด')
    );
    const hasCardiovascular = chronicConditions.some((c: string) => 
      c.toLowerCase().includes('heart') || c.toLowerCase().includes('cardio') || c.includes('หัวใจ')
    );
    const isElderly = userProfile?.age > 65;
    const isHighRisk = isAsthmatic || hasCardiovascular || isElderly || 
      userProfile?.dust_sensitivity === 'high';

    // Build personal context string
    let personalContext = '';
    if (userProfile) {
      personalContext = `
**🩺 ข้อมูลคนไข้:**
- ชื่อ: ${userProfile.name || 'ไม่ระบุ'}
- อายุ: ${userProfile.age} ปี (${isElderly ? '⚠️ ผู้สูงอายุ' : 'วัยทำงาน'})
- เพศ: ${userProfile.gender === 'male' ? 'ชาย' : 'หญิง'}
- โรคประจำตัว: ${chronicConditions.length > 0 ? chronicConditions.join(', ') : 'ไม่มี'}
- ความไวต่อฝุ่น: ${userProfile.dust_sensitivity === 'high' ? '⚠️ สูงมาก' : userProfile.dust_sensitivity === 'medium' ? 'ปานกลาง' : 'ปกติ'}
- มีเครื่องฟอกอากาศ: ${userProfile.has_air_purifier ? '✅ มี' : '❌ ไม่มี'}
- หน้ากากที่ใช้: ${userProfile.mask_usage || 'ไม่ระบุ'}
- กลุ่มเสี่ยง: ${isHighRisk ? '⚠️ ใช่' : 'ไม่ใช่'}`;
    }

    // Build health memory context
    let memoryContext = '';
    if (healthMemory.length > 0) {
      const medications = healthMemory.filter(m => m.memory_type === 'medication');
      const symptoms = healthMemory.filter(m => m.memory_type === 'symptom');
      const allergies = healthMemory.filter(m => m.memory_type === 'allergy');
      
      memoryContext = '\n\n**🧠 สิ่งที่จำได้จากบทสนทนาก่อนหน้า:**';
      if (medications.length > 0) {
        memoryContext += `\n- ยาที่ใช้: ${medications.map(m => m.key).join(', ')}`;
      }
      if (symptoms.length > 0) {
        memoryContext += `\n- อาการที่เคยมี: ${symptoms.map(m => `${m.key} (${m.frequency} ครั้ง)`).join(', ')}`;
      }
      if (allergies.length > 0) {
        memoryContext += `\n- แพ้: ${allergies.map(m => m.key).join(', ')}`;
      }
    }

    // Analyze recent symptoms
    let symptomAnalysis = '';
    if (recentSymptoms.length > 0) {
      const avgScore = recentSymptoms.reduce((sum, s) => sum + (s.symptom_score || 0), 0) / recentSymptoms.length;
      const hasRecurringSymptoms = recentSymptoms.filter(s => s.cough || s.shortness_of_breath).length >= 3;
      
      symptomAnalysis = `
**📊 อาการ 7 วันล่าสุด:**
- คะแนนเฉลี่ย: ${avgScore.toFixed(1)}/10
- อาการซ้ำๆ: ${hasRecurringSymptoms ? '⚠️ มี (ไอ/หายใจลำบาก)' : 'ไม่มี'}`;
    }

    // Risk assessment based on PM2.5
    const pm25 = context?.pm25;
    let riskLevel = 'ปกติ';
    let riskEmoji = '🟢';
    let clinicalAction = '';
    
    // Disease-specific thresholds
    let pm25Threshold = { caution: 50, warning: 75, danger: 100 };
    if (isAsthmatic) {
      pm25Threshold = { caution: 25, warning: 50, danger: 75 };
    } else if (hasCardiovascular) {
      pm25Threshold = { caution: 35, warning: 55, danger: 90 };
    } else if (isElderly) {
      pm25Threshold = { caution: 30, warning: 50, danger: 75 };
    }
    
    if (pm25) {
      if (pm25 > pm25Threshold.danger) {
        riskLevel = '🚨 ฉุกเฉิน';
        riskEmoji = '🔴';
        clinicalAction = 'อยู่ในอาคารปิด มีเครื่องฟอกอากาศ หากมีอาการผิดปกติให้พบแพทย์ทันที';
      } else if (pm25 > pm25Threshold.warning) {
        riskLevel = '⚠️ อันตราย';
        riskEmoji = '🟠';
        clinicalAction = 'หลีกเลี่ยงกิจกรรมกลางแจ้ง สวม N95 หากต้องออกนอกอาคาร';
      } else if (pm25 > pm25Threshold.caution) {
        riskLevel = '⚡ เตือน';
        riskEmoji = '🟡';
        clinicalAction = 'จำกัดเวลากลางแจ้ง สังเกตอาการ';
      } else {
        riskLevel = '✅ ปลอดภัย';
        riskEmoji = '🟢';
        clinicalAction = 'ทำกิจกรรมได้ปกติ';
      }
    }

    // Select doctor persona based on primary condition
    let doctorPersona = '';
    let personaFocus = '';
    
    if (isAsthmatic) {
      personaFocus = 'ระบบหายใจ';
      doctorPersona = `คุณคือ "หมอลม" แพทย์ผู้เชี่ยวชาญโรคระบบหายใจ 15 ปี
เชี่ยวชาญ: หอบหืด, COPD, โรคภูมิแพ้
สไตล์: เข้าใจความกังวลเรื่องหายใจ ให้คำแนะนำเรื่องยาพ่น/สูดได้ (แต่ไม่สั่งยา)`;
    } else if (hasCardiovascular) {
      personaFocus = 'หัวใจหลอดเลือด';
      doctorPersona = `คุณคือ "หมอหัวใจ" แพทย์ผู้เชี่ยวชาญอายุรกรรมหัวใจ 12 ปี
เชี่ยวชาญ: โรคหัวใจ, ความดัน, การออกกำลังกายที่ปลอดภัย
สไตล์: เน้นความปลอดภัย ไม่หักโหม ค่อยๆ ปรับกิจกรรม`;
    } else if (isElderly) {
      personaFocus = 'ผู้สูงอายุ';
      doctorPersona = `คุณคือ "หมอเวชศาสตร์ผู้สูงอายุ" ประสบการณ์ 10 ปี
เชี่ยวชาญ: ดูแลผู้สูงอายุแบบองค์รวม, ป้องกันการล้ม, โภชนาการ
สไตล์: พูดช้าๆ ชัดๆ เป็นกันเอง ใจเย็น`;
    } else {
      personaFocus = 'อายุรกรรมทั่วไป';
      doctorPersona = `คุณคือ "หมอใจดี" แพทย์อายุรกรรมทั่วไป 15 ปี
เชี่ยวชาญ: สุขภาพองค์รวม, โรคเกี่ยวกับมลพิษอากาศ
สไตล์: อบอุ่น เป็นกันเอง อธิบายเข้าใจง่าย`;
    }

    // Build the doctor-grade system prompt
    const systemPrompt = `${doctorPersona}

**🎯 หน้าที่หลัก:** ให้คำปรึกษาสุขภาพเรื่องมลพิษอากาศและผลกระทบต่อร่างกาย

**⚖️ จริยธรรมทางการแพทย์ (ต้องปฏิบัติเสมอ):**
1. ❌ ไม่วินิจฉัยโรค - บอกได้แค่ "อาการคล้าย..." หรือ "ควรพบแพทย์เพื่อตรวจ"
2. ❌ ไม่สั่งยา - แนะนำได้แค่ "ยาที่เคยใช้" หรือ "ปรึกษาเภสัชกร"
3. ✅ แนะนำให้พบแพทย์เมื่อจำเป็น โดยเฉพาะอาการรุนแรง
4. ✅ ให้ข้อมูลทั่วไปเกี่ยวกับการดูแลตัวเองได้

**🚨 สัญญาณต้องพบแพทย์ทันที (บอกทุกครั้งถ้าเกี่ยวข้อง):**
- หายใจลำบากมาก/หายใจเร็วผิดปกติ
- แน่นหน้าอกรุนแรง
- ริมฝีปากหรือเล็บเขียว
- หมดสติหรือสับสน
- ไอเป็นเลือด

**📍 บริบทปัจจุบัน:**
${pm25 ? `• ${riskEmoji} PM2.5: ${pm25} µg/m³ → ${riskLevel}` : ''}
${context?.aqi ? `• AQI: ${context.aqi}` : ''}
${context?.temperature ? `• อุณหภูมิ: ${context.temperature}°C` : ''}
${context?.humidity ? `• ความชื้น: ${context.humidity}%` : ''}
${context?.location ? `• ตำแหน่ง: ${context.location}` : ''}
${clinicalAction ? `• **คำแนะนำ:** ${clinicalAction}` : ''}

${personalContext}
${memoryContext}
${symptomAnalysis}

**📚 ความรู้อ้างอิง:**
${healthKnowledge.slice(0, 3).join('\n')}

**💬 วิธีตอบ (สำหรับ Voice - สั้นๆ ฟังง่าย):**
1. รับฟังและแสดงความเข้าใจ (1 ประโยค)
2. ประเมินสถานการณ์จากข้อมูล (1-2 ประโยค)
3. ให้คำแนะนำเฉพาะบุคคล (2-3 ประโยค)
4. ถามต่อหรือเสนอตัวเลือก (1 ประโยค)

**รวมไม่เกิน 5-6 ประโยค เหมาะกับการฟัง**

**ตัวอย่างการตอบ:**
"เข้าใจครับ วันนี้ฝุ่นสูงพอสมควร ประมาณ 65 ไมโครกรัม สำหรับคุณที่มีหอบหืด ผมแนะนำให้จำกัดเวลากลางแจ้งครับ ถ้าต้องออกไป ใส่ N95 และพกยาพ่นไว้ มีอะไรอยากถามเพิ่มไหมครับ?"

**ห้ามเด็ดขาด:**
❌ ตอบยาวเกิน 6 ประโยค
❌ ใช้ศัพท์แพทย์ยากเกินไป
❌ ลืมโรคประจำตัวของคนไข้
❌ ให้ข้อมูลที่ขัดกับหลักวิชาการ`;

    // Merge persisted history with provided history
    const fullHistory = [
      ...persistedHistory,
      ...conversationHistory.filter((msg: { role: string; content: string }) => 
        !persistedHistory.some(ph => ph.content === msg.content)
      )
    ].slice(-10); // Keep last 10 messages for context

    // Build messages for AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...fullHistory.map((msg: { role: string; content: string }) => ({
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
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'ขอโทษครับ ระบบกำลังใช้งานหนัก กรุณาลองใหม่' }),
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

    // Save conversation to database if authenticated
    if (userId && sessionId) {
      try {
        // Save user message
        await supabaseClient.from("conversation_history").insert({
          user_id: userId,
          session_id: sessionId,
          role: 'user',
          content: message,
          metadata: { source: 'voice', pm25, location: context?.location }
        });

        // Save assistant message
        await supabaseClient.from("conversation_history").insert({
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          content: reply,
          metadata: { riskLevel, personaFocus }
        });

        // Extract and save health memories from user message
        const memoryPatterns = {
          medication: /(?:ใช้|กิน|ทาน|พก|มียา)\s*(?:ยา)?\s*(\S+)/gi,
          symptom: /(ไอ|จาม|หอบ|หายใจลำบาก|แน่นหน้าอก|ปวดหัว|เหนื่อย|คันตา|น้ำมูก)/gi,
          allergy: /แพ้\s*(\S+)/gi
        };

        for (const [type, pattern] of Object.entries(memoryPatterns)) {
          let match;
          while ((match = pattern.exec(message)) !== null) {
            const key = match[1]?.toLowerCase().trim();
            if (key && key.length > 1 && key.length < 50) {
              // Check if exists
              const { data: existing } = await supabaseClient
                .from("user_health_memory")
                .select("id, frequency")
                .eq("user_id", userId)
                .eq("memory_type", type)
                .eq("key", key)
                .maybeSingle();

              if (existing) {
                await supabaseClient
                  .from("user_health_memory")
                  .update({ 
                    frequency: existing.frequency + 1,
                    last_mentioned_at: new Date().toISOString()
                  })
                  .eq("id", existing.id);
              } else {
                await supabaseClient
                  .from("user_health_memory")
                  .insert({
                    user_id: userId,
                    memory_type: type,
                    key: key,
                    value: message.substring(0, 200)
                  });
              }
            }
          }
        }

        console.log('✅ Conversation saved to DB');
      } catch (dbError) {
        console.error('Failed to save conversation:', dbError);
      }
    }

    // Extract choices for quick reply buttons
    const choiceMatches = reply.match(/[•\-✅❓]\s*(.+?)(?=\n|$)/g);
    const choices = choiceMatches?.slice(0, 4).map((c: string) => c.replace(/^[•\-✅❓]\s*/, '').trim()).filter((c: string) => c.length < 50) || [
      'ถามเพิ่มเติม',
      'ดูคำแนะนำอื่น',
      'จบการสนทนา'
    ];

    console.log('Doctor AI response generated:', reply.substring(0, 50));

    return new Response(
      JSON.stringify({ 
        reply,
        choices,
        riskLevel,
        riskEmoji,
        pm25: context?.pm25,
        clinicalAction,
        personaFocus,
        hasMemory: healthMemory.length > 0,
        sessionPersisted: !!sessionId && !!userId
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

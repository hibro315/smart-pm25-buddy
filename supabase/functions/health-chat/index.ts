import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Memory extraction patterns for Thai/English
const MEMORY_PATTERNS = {
  medication: [
    /(?:ใช้|กิน|ทาน|รับประทาน|พก|มียา)\s*(?:ยา)?\s*([ก-๙a-zA-Z0-9]+(?:\s+[ก-๙a-zA-Z0-9]+)?)/gi,
    /(?:paracetamol|ibuprofen|aspirin|ventolin|inhaler|antihistamine|cetirizine|loratadine|salbutamol|budesonide|montelukast|prednisolone)/gi,
    /(?:ยาแก้แพ้|ยาแก้ไอ|ยาแก้หอบ|ยาพ่น|ยาสูด|ยาหยอดตา|ยาหยอดจมูก|ยาลดไข้)/gi,
  ],
  symptom: [
    /(?:มีอาการ|เป็น|รู้สึก|ปวด|คัน|แสบ|เจ็บ|ไอ|จาม|หายใจลำบาก|แน่นหน้าอก|เหนื่อย|อ่อนเพลีย|ตาแดง|คัดจมูก|น้ำมูกไหล|หอบ|หืด)/gi,
    /(?:cough|sneeze|wheeze|chest tightness|shortness of breath|fatigue|eye irritation|runny nose|headache)/gi,
  ],
  allergy: [
    /(?:แพ้|allergy|allergic to)\s*([ก-๙a-zA-Z0-9\s,]+)/gi,
    /(?:แพ้ยา|แพ้อาหาร|แพ้ฝุ่น|แพ้ละอองเกสร)/gi,
  ],
  preference: [
    /(?:ชอบ|ต้องการ|อยากได้|prefer)\s*([ก-๙a-zA-Z0-9\s]+)/gi,
  ],
};

// Function to extract memories from conversation
function extractMemories(text: string): Array<{type: string; key: string; value: string}> {
  const memories: Array<{type: string; key: string; value: string}> = [];
  
  // Medication extraction
  const medicationKeywords = [
    'paracetamol', 'ibuprofen', 'aspirin', 'ventolin', 'inhaler', 'antihistamine',
    'cetirizine', 'loratadine', 'salbutamol', 'budesonide', 'montelukast', 'prednisolone',
    'ยาแก้แพ้', 'ยาแก้ไอ', 'ยาแก้หอบ', 'ยาพ่น', 'ยาสูด', 'ยาหยอดตา', 'ยาหยอดจมูก', 'ยาลดไข้',
    'ยาแก้ปวด', 'ยานอนหลับ', 'วิตามิน'
  ];
  
  const lowerText = text.toLowerCase();
  medicationKeywords.forEach(med => {
    if (lowerText.includes(med.toLowerCase())) {
      memories.push({ type: 'medication', key: med, value: text.substring(0, 200) });
    }
  });
  
  // Symptom extraction
  const symptomKeywords = [
    { key: 'cough', patterns: ['ไอ', 'cough', 'ไอแห้ง', 'ไอมีเสมหะ'] },
    { key: 'sneeze', patterns: ['จาม', 'sneeze'] },
    { key: 'wheeze', patterns: ['หอบ', 'หืด', 'wheeze', 'หายใจมีเสียง'] },
    { key: 'chest_tightness', patterns: ['แน่นหน้าอก', 'chest tight', 'อึดอัด'] },
    { key: 'shortness_of_breath', patterns: ['หายใจลำบาก', 'หายใจไม่สะดวก', 'shortness of breath', 'เหนื่อยหอบ'] },
    { key: 'eye_irritation', patterns: ['ตาแดง', 'คันตา', 'แสบตา', 'eye irritation', 'ตาระคายเคือง'] },
    { key: 'runny_nose', patterns: ['น้ำมูก', 'คัดจมูก', 'runny nose', 'จมูกตัน'] },
    { key: 'headache', patterns: ['ปวดหัว', 'ปวดศีรษะ', 'headache', 'หัวตื้อ'] },
    { key: 'fatigue', patterns: ['เหนื่อย', 'อ่อนเพลีย', 'ไม่มีแรง', 'fatigue', 'เพลีย'] },
    { key: 'sore_throat', patterns: ['เจ็บคอ', 'คอแห้ง', 'sore throat', 'คออักเสบ'] },
  ];
  
  symptomKeywords.forEach(symptom => {
    symptom.patterns.forEach(pattern => {
      if (lowerText.includes(pattern.toLowerCase())) {
        memories.push({ type: 'symptom', key: symptom.key, value: text.substring(0, 200) });
      }
    });
  });
  
  // Allergy extraction
  const allergyPatterns = [
    /แพ้\s*([ก-๙a-zA-Z0-9]+)/gi,
    /allergic to\s*([a-zA-Z0-9]+)/gi,
  ];
  
  allergyPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      memories.push({ type: 'allergy', key: match[1].trim(), value: text.substring(0, 200) });
    }
  });
  
  return memories;
}

// Generate follow-up questions based on context
function generateFollowUpQuestions(
  assistantMessage: string,
  pm25: number | undefined,
  userSymptoms: string[],
  healthProfile: any
): string[] {
  const questions: string[] = [];
  
  // Based on PM2.5 level
  if (pm25 && pm25 > 50) {
    questions.push("ต้องการคำแนะนำเพิ่มเติมเกี่ยวกับการป้องกันฝุ่นไหม?");
    questions.push("มีหน้ากาก N95 พร้อมใช้งานไหม?");
  }
  
  // Based on symptoms mentioned
  if (userSymptoms.length > 0) {
    questions.push("อาการดีขึ้นหรือแย่ลงเมื่อเทียบกับวันก่อน?");
    questions.push("ต้องการบันทึกอาการประจำวันไหม?");
  }
  
  // Based on health profile
  if (healthProfile?.chronic_conditions?.length > 0) {
    const hasAsthma = healthProfile.chronic_conditions.some((c: string) => 
      c.toLowerCase().includes('asthma') || c.includes('หอบหืด')
    );
    if (hasAsthma) {
      questions.push("วันนี้ใช้ยาพ่นไปกี่ครั้งแล้ว?");
    }
  }
  
  // General follow-ups based on response content
  if (assistantMessage.includes('ออกกำลังกาย') || assistantMessage.includes('exercise')) {
    questions.push("สนใจคำแนะนำการออกกำลังกายในร่มไหม?");
  }
  
  if (assistantMessage.includes('หน้ากาก') || assistantMessage.includes('mask')) {
    questions.push("รู้วิธีใส่หน้ากาก N95 ให้ถูกต้องไหม?");
  }
  
  if (assistantMessage.includes('เครื่องฟอก') || assistantMessage.includes('purifier')) {
    questions.push("ต้องการคำแนะนำการเลือกซื้อเครื่องฟอกอากาศไหม?");
  }
  
  // Return max 3 questions
  return questions.slice(0, 3);
}

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

    // 5. Load user's health memory (medications, common symptoms, etc.)
    const { data: healthMemory } = await supabaseClient
      .from("user_health_memory")
      .select("*")
      .eq("user_id", user.id)
      .order("frequency", { ascending: false })
      .limit(20);

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

    // Health Memory Context (medications, common symptoms, etc.)
    let healthMemoryContext = "";
    if (healthMemory && healthMemory.length > 0) {
      const medications = healthMemory.filter((m: any) => m.memory_type === 'medication');
      const symptoms = healthMemory.filter((m: any) => m.memory_type === 'symptom');
      const allergies = healthMemory.filter((m: any) => m.memory_type === 'allergy');
      
      healthMemoryContext = `\n\n**🧠 ความจำจากบทสนทนาก่อนหน้า:**`;
      
      if (medications.length > 0) {
        healthMemoryContext += `\n📦 ยาที่ผู้ใช้เคยพูดถึง: ${medications.map((m: any) => `${m.key} (พูดถึง ${m.frequency} ครั้ง)`).join(', ')}`;
      }
      
      if (symptoms.length > 0) {
        healthMemoryContext += `\n🤒 อาการที่พบบ่อย: ${symptoms.map((m: any) => `${m.key} (พูดถึง ${m.frequency} ครั้ง)`).join(', ')}`;
      }
      
      if (allergies.length > 0) {
        healthMemoryContext += `\n⚠️ ข้อมูลการแพ้: ${allergies.map((m: any) => m.key).join(', ')}`;
      }
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

    const systemPrompt = `คุณคือ "หมอประจำตัว AI" ที่รู้จักผู้ใช้คนนี้อย่างลึกซึ้ง เหมือนแพทย์ที่ดูแลคนไข้มานานหลายปี

**🧬 PERSONAL DOCTOR IDENTITY:**
- คุณรู้ประวัติสุขภาพ, โรคประจำตัว, แนวโน้มอาการ, ยาที่ใช้, และพฤติกรรมของผู้ใช้คนนี้
- พูดเหมือนหมอที่รู้จักคนไข้ดี: "จากประวัติคุณที่มีหอบหืด วันนี้ PM2.5 สูง ผมแนะนำว่า..."
- ใช้ข้อมูลจาก "ความจำ" ในการให้คำแนะนำ เช่น ถ้าคนไข้เคยบอกว่าใช้ยา Ventolin ให้อ้างอิงถึงมัน
- ไม่พูดแบบ AI ทั่วไป แต่พูดเหมือนแพทย์ที่ห่วงใยคนไข้จริงๆ

**💊 HYPER-PERSONALIZED ADVICE:**
เมื่อให้คำแนะนำ ต้องคำนึงถึงทุกมิติ:
1. **โรคประจำตัว** → ปรับคำแนะนำตามโรค (หอบหืดต้องระวังฝุ่นมากกว่าคนปกติ)
2. **อายุ** → เด็ก/ผู้สูงอายุ ต้องระวังมากกว่า
3. **ความไวต่อฝุ่น** → คนไวสูงต้องป้องกันตั้งแต่ PM2.5 ยังไม่สูงมาก
4. **พฤติกรรม** → ออกกำลังกายบ่อยไหม? ทำงานกลางแจ้งไหม?
5. **ประวัติอาการ 7 วันล่าสุด** → มีแนวโน้มอาการแย่ลงไหม?
6. **PHRI ล่าสุด** → ความเสี่ยงสะสมเป็นอย่างไร?
7. **ยาที่ใช้** → อ้างอิงยาที่คนไข้บอกเคยใช้
8. **อาการที่พบบ่อย** → ใช้ข้อมูลจากความจำเพื่อแนะนำเฉพาะบุคคล

**📋 STRUCTURED RESPONSE FORMAT:**
ทุกคำตอบต้องมีโครงสร้างชัดเจน:

1. **📊 การประเมินเฉพาะคุณ** (1-2 ประโยค)
   - วิเคราะห์สถานการณ์เจาะจงกับผู้ใช้คนนี้
   - เช่น "จากประวัติหอบหืดของคุณ ร่วมกับ PM2.5 วันนี้ที่ 75 คุณมีความเสี่ยงสูงกว่าปกติ"

2. **💡 คำแนะนำหลัก** (สิ่งที่ต้องทำ)
   - ชัดเจน ปฏิบัติได้ทันที
   - เช่น "หลีกเลี่ยงกิจกรรมกลางแจ้งวันนี้"

3. **⚡ ออฟชั่นเสริม** (2-3 ทางเลือก)
   - ให้ตัวเลือกที่เหมาะกับไลฟ์สไตล์
   - เช่น:
     • ถ้าต้องออกข้างนอก → ใส่ N95 + จำกัดเวลา 30 นาที
     • ถ้าอยู่บ้าน → เปิดเครื่องฟอก + ปิดหน้าต่าง
     • ถ้าออกกำลังกาย → เปลี่ยนเป็นออกกำลังในร่ม

4. **🔮 สิ่งที่ควรสังเกต** (ถ้าเกี่ยวข้อง)
   - อาการที่ควรระวัง
   - เช่น "ถ้าเริ่มแน่นหน้าอกหรือไอบ่อยขึ้น ให้พักทันที"

**🎯 DISEASE-AWARE PERSONA (${personaFocus}):**
${personaInstructions[personaFocus as keyof typeof personaInstructions]}

${isHighRiskSituation ? `
**🚨 HIGH RISK MODE (PM2.5: ${pm25}µg/m³):**
- เน้นความปลอดภัยเป็นหลัก
- พูดหนักแน่นแต่ไม่ตื่นตระหนก
- ให้คำแนะนำเร่งด่วนก่อน
` : ''}

**🤝 COMMUNICATION STYLE:**
- น้ำเสียงอบอุ่น เป็นกันเอง เหมือนหมอที่รู้จักกันนาน
- ใช้ชื่อถ้าทราบ: "คุณ[ชื่อ] วันนี้..."
- ไม่ใช้ศัพท์แพทย์ยากเกินไป
- ถ้าคนไข้ถามเรื่องที่เสี่ยง ตอบด้วยความห่วงใย ไม่ตำหนิ
- เช่น "ผมเข้าใจว่าบางทีก็ต้องออกข้างนอก มาดูวิธีป้องกันกันดีกว่าครับ"

**📚 CLINICAL KNOWLEDGE:**
${environmentalData}
${personalHealthContext}
${healthMemoryContext}
${symptomsContext}
${phriHistoryContext}
${riskAssessment}
${knowledgeBaseContext}

**🚨 RED FLAGS - แนะนำพบแพทย์ทันที:**
- หายใจลำบากมาก, แน่นหน้าอกรุนแรง
- ริมฝีปากเขียว, สับสน, ไอเป็นเลือด
- อาการแย่ลงอย่างรวดเร็วภายใน 1-2 ชั่วโมง

**⚠️ LIMITATIONS:**
- ไม่วินิจฉัยโรค ไม่สั่งยา
- แนะนำพบแพทย์เมื่อจำเป็น
- คำแนะนำเป็นข้อมูลเพื่อการดูแลตัวเอง ไม่ทดแทนการรักษาจริง`;

    // Combine conversation history with new messages
    const allMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      ...messages
    ];

    // Save user message to history and extract memories
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

        // Extract and save memories from user message
        const extractedMemories = extractMemories(userMsg.content);
        for (const memory of extractedMemories) {
          // Check if memory already exists
          const { data: existing } = await supabaseClient
            .from("user_health_memory")
            .select("id, frequency")
            .eq("user_id", user.id)
            .eq("memory_type", memory.type)
            .eq("key", memory.key)
            .maybeSingle();

          if (existing) {
            // Update frequency
            await supabaseClient
              .from("user_health_memory")
              .update({ 
                frequency: existing.frequency + 1,
                last_mentioned_at: new Date().toISOString(),
                value: memory.value
              })
              .eq("id", existing.id);
          } else {
            // Insert new memory
            await supabaseClient
              .from("user_health_memory")
              .insert({
                user_id: user.id,
                memory_type: memory.type,
                key: memory.key,
                value: memory.value
              });
          }
        }
        
        console.log("🧠 Extracted memories:", extractedMemories.length);
      }
    }

    console.log("📚 RAG Context loaded:", {
      hasHealthProfile: !!healthProfile,
      recentSymptomsCount: recentSymptoms?.length || 0,
      recentHealthLogsCount: recentHealthLogs?.length || 0,
      healthMemoryCount: healthMemory?.length || 0,
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

    // Collect symptoms from recent logs for follow-up generation
    const userSymptomsList: string[] = [];
    if (recentSymptoms) {
      recentSymptoms.forEach((log: any) => {
        if (log.cough) userSymptomsList.push('cough');
        if (log.sneeze) userSymptomsList.push('sneeze');
        if (log.shortness_of_breath) userSymptomsList.push('shortness_of_breath');
      });
    }

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
            // Generate follow-up questions
            const followUpQuestions = generateFollowUpQuestions(
              assistantMessage,
              pm25,
              userSymptomsList,
              healthProfile
            );

            await supabaseClient.from("conversation_history").insert({
              user_id: user.id,
              session_id: sessionId,
              role: 'assistant',
              content: assistantMessage,
              metadata: { followUpQuestions }
            });
            
            // Send follow-up questions as a separate SSE event
            if (followUpQuestions.length > 0) {
              const followUpData = `data: ${JSON.stringify({ 
                type: 'follow_up_questions', 
                questions: followUpQuestions 
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(followUpData));
            }
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

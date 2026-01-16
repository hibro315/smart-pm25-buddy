import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Intelligent Advisor - AI-Powered Decision Engine
 * 
 * Replaces template-based DORAAdvisor with real AI reasoning.
 * Uses context-aware analysis including:
 * - Real-time air quality data
 * - User health profile and disease history
 * - Recent symptoms and patterns
 * - Weather conditions
 * - Time of day and activity patterns
 */

interface AdvisorRequest {
  pm25: number;
  aqi?: number;
  temperature?: number;
  humidity?: number;
  location?: string;
  travelMode?: 'walking' | 'cycling' | 'motorcycle' | 'car' | 'bts_mrt' | 'indoor';
  destination?: string;
  activityType?: 'exercise' | 'commute' | 'errand' | 'leisure';
  duration?: number; // minutes
}

interface AdvisorOption {
  id: string;
  label: string;
  icon: string;
  action: 'proceed' | 'modify' | 'avoid' | 'info';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  estimatedRiskReduction?: number;
}

interface AdvisorResponse {
  decision: string;
  decisionLevel: 'safe' | 'caution' | 'warning' | 'danger';
  reasoning: string;
  options: AdvisorOption[];
  confidenceScore: number;
  personalizedFactors: string[];
  timestamp: number;
}

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
    const requestData: AdvisorRequest = await req.json();
    
    const { pm25, aqi, temperature, humidity, location, travelMode, destination, activityType, duration } = requestData;

    console.log('Intelligent Advisor Request:', { pm25, travelMode, destination });

    // Fetch user health profile if authenticated
    let userProfile: any = null;
    let recentSymptoms: any[] = [];
    let healthMemory: any[] = [];

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

          // Get recent symptoms (7 days)
          const { data: symptoms } = await supabaseClient
            .from("daily_symptoms")
            .select("*")
            .eq("user_id", user.id)
            .order("log_date", { ascending: false })
            .limit(7);
          recentSymptoms = symptoms || [];

          // Get health memory
          const { data: memory } = await supabaseClient
            .from("user_health_memory")
            .select("*")
            .eq("user_id", user.id)
            .order("frequency", { ascending: false })
            .limit(10);
          healthMemory = memory || [];
        }
      } catch (e) {
        console.log('Could not fetch user data:', e);
      }
    }

    // Build comprehensive context for AI
    const chronicConditions = userProfile?.chronic_conditions || [];
    const isAsthmatic = chronicConditions.some((c: string) => 
      c.toLowerCase().includes('asthma') || c.includes('หอบหืด')
    );
    const hasCardiovascular = chronicConditions.some((c: string) => 
      c.toLowerCase().includes('heart') || c.toLowerCase().includes('cardio')
    );
    const isElderly = userProfile?.age > 65;
    const isChild = userProfile?.age < 12;
    const isHighRiskGroup = isAsthmatic || hasCardiovascular || isElderly || isChild || 
      userProfile?.dust_sensitivity === 'high';

    // Calculate symptom severity
    const recentSymptomScore = recentSymptoms.reduce((sum, s) => sum + (s.symptom_score || 0), 0) / Math.max(recentSymptoms.length, 1);
    const hasRecentRespiratorySymptoms = recentSymptoms.some(s => s.cough || s.shortness_of_breath || s.wheezing);

    // Build AI prompt
    const systemPrompt = `คุณคือระบบให้คำแนะนำสุขภาพ AI ที่ต้องตัดสินใจเร็ว แม่นยำ และเฉพาะบุคคล

**หลักการตัดสินใจ:**
1. ความปลอดภัยมาก่อนความสะดวกสบาย
2. กลุ่มเสี่ยงต้องเข้มงวดกว่าคนทั่วไป
3. ให้ตัวเลือกที่ทำได้จริง ไม่ใช่แค่ "อยู่บ้าน"
4. อธิบายเหตุผลสั้นๆ ให้เข้าใจง่าย
5. ไม่วินิจฉัยโรค ไม่สั่งยา

**Disease-Specific Thresholds:**
- หอบหืด (Asthma): PM2.5 > 25 = เตือน, > 50 = อันตราย, > 75 = ฉุกเฉิน
- หัวใจ (Cardiovascular): PM2.5 > 35 = เตือน, > 55 = อันตราย
- ผู้สูงอายุ/เด็ก: PM2.5 > 30 = เตือน, > 50 = อันตราย
- คนปกติ: PM2.5 > 50 = เตือน, > 90 = อันตราย

**Travel Mode Risk Multipliers:**
- เดิน/วิ่ง: x2.0 (หายใจลึก+เร็ว)
- จักรยาน: x1.8
- มอเตอร์ไซค์: x1.5
- รถยนต์ (เปิด AC): x0.3
- BTS/MRT: x0.4
- ในร่ม: x0.1

**ปัจจัยเพิ่มเติม:**
- อุณหภูมิ > 35°C: เพิ่มความเสี่ยง (ร่างกายทำงานหนัก)
- ความชื้น < 30%: เพิ่มการระคายเคือง
- มีอาการล่าสุด: ต้องระวังเป็นพิเศษ

**รูปแบบการตอบ (JSON):**
{
  "decision": "คำตัดสินใจ 1-2 ประโยค ชัดเจน ไม่กำกวม",
  "decisionLevel": "safe|caution|warning|danger",
  "reasoning": "เหตุผลสั้นๆ ว่าทำไมตัดสินใจแบบนี้ (1-2 ประโยค)",
  "options": [
    {
      "id": "unique_id",
      "label": "ชื่อตัวเลือก (สั้น)",
      "icon": "emoji เดียว",
      "action": "proceed|modify|avoid|info",
      "riskLevel": "low|medium|high|critical",
      "reasoning": "ทำไมตัวเลือกนี้ดี/ไม่ดี",
      "estimatedRiskReduction": 0-100
    }
  ],
  "confidenceScore": 0.0-1.0,
  "personalizedFactors": ["ปัจจัยที่ใช้ในการตัดสินใจเฉพาะคนนี้"]
}

**ตัวอย่าง:**
สถานการณ์: PM2.5 = 78, ผู้ใช้หอบหืด, จะเดินไปซื้อของ

{
  "decision": "ไม่แนะนำเดิน PM2.5 สูงกว่าเกณฑ์หอบหืด 3 เท่า",
  "decisionLevel": "danger",
  "reasoning": "หอบหืด + PM2.5 78 = เสี่ยงกำเริบสูง การเดินเพิ่มความเสี่ยง 2 เท่า",
  "options": [
    {
      "id": "car_ac",
      "label": "ไปรถยนต์ (เปิด AC)",
      "icon": "🚗",
      "action": "modify",
      "riskLevel": "medium",
      "reasoning": "ลดการสัมผัสฝุ่น 70%",
      "estimatedRiskReduction": 70
    },
    {
      "id": "postpone",
      "label": "เลื่อนเป็นพรุ่งนี้",
      "icon": "📅",
      "action": "avoid",
      "riskLevel": "low",
      "reasoning": "รอฝุ่นลดลง",
      "estimatedRiskReduction": 100
    },
    {
      "id": "delivery",
      "label": "สั่งเดลิเวอรี่",
      "icon": "🛵",
      "action": "modify",
      "riskLevel": "low",
      "reasoning": "ไม่ต้องออกนอกบ้าน",
      "estimatedRiskReduction": 100
    }
  ],
  "confidenceScore": 0.92,
  "personalizedFactors": ["หอบหืด", "PM2.5 สูงมาก", "กิจกรรมไม่เร่งด่วน"]
}

**ข้อห้าม:**
❌ ตอบกำกวม ("แล้วแต่", "ก็ได้", "ลองดู")
❌ ให้ตัวเลือกที่ทำไม่ได้ (เช่น "นั่งเฮลิคอปเตอร์")
❌ ละเลยโรคประจำตัว
❌ วินิจฉัยโรคหรือสั่งยา`;

    const userQuery = `**สถานการณ์ปัจจุบัน:**
- PM2.5: ${pm25} µg/m³
${aqi ? `- AQI: ${aqi}` : ''}
${temperature ? `- อุณหภูมิ: ${temperature}°C` : ''}
${humidity ? `- ความชื้น: ${humidity}%` : ''}
${location ? `- สถานที่: ${location}` : ''}
${travelMode ? `- วิธีเดินทาง: ${travelMode}` : ''}
${destination ? `- จุดหมาย: ${destination}` : ''}
${activityType ? `- ประเภทกิจกรรม: ${activityType}` : ''}
${duration ? `- ระยะเวลา: ${duration} นาที` : ''}

**ข้อมูลผู้ใช้:**
- อายุ: ${userProfile?.age || 'ไม่ทราบ'} ปี
- เพศ: ${userProfile?.gender === 'male' ? 'ชาย' : userProfile?.gender === 'female' ? 'หญิง' : 'ไม่ทราบ'}
- โรคประจำตัว: ${chronicConditions.length > 0 ? chronicConditions.join(', ') : 'ไม่มี'}
- กลุ่มเสี่ยง: ${isHighRiskGroup ? 'ใช่' : 'ไม่ใช่'}
- ความไวต่อฝุ่น: ${userProfile?.dust_sensitivity || 'ปกติ'}
- มีเครื่องฟอกอากาศ: ${userProfile?.has_air_purifier ? 'มี' : 'ไม่มี'}
- คะแนนอาการล่าสุด: ${recentSymptomScore.toFixed(1)}/10
- มีอาการทางหายใจล่าสุด: ${hasRecentRespiratorySymptoms ? 'มี' : 'ไม่มี'}

กรุณาวิเคราะห์และให้คำแนะนำในรูปแบบ JSON`;

    // Call AI
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
          { role: 'user', content: userQuery }
        ],
        max_tokens: 1000,
        temperature: 0.3, // Lower for more consistent decisions
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'ระบบกำลังใช้งานหนัก กรุณาลองใหม่' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'กรุณาเติมเครดิต' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    let advisorResponse: AdvisorResponse;
    try {
      advisorResponse = JSON.parse(content);
      advisorResponse.timestamp = Date.now();
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      // Fallback response
      advisorResponse = {
        decision: pm25 > 75 ? 'ควรอยู่ในอาคาร หรือใช้รถยนต์' : pm25 > 50 ? 'ควรสวมหน้ากาก N95' : 'ดำเนินการได้ตามปกติ',
        decisionLevel: pm25 > 75 ? 'danger' : pm25 > 50 ? 'warning' : pm25 > 35 ? 'caution' : 'safe',
        reasoning: 'วิเคราะห์จากค่า PM2.5 เบื้องต้น',
        options: [
          {
            id: 'proceed',
            label: 'ดำเนินการ',
            icon: '✓',
            action: 'proceed',
            riskLevel: pm25 > 75 ? 'high' : 'medium',
            reasoning: 'ตามแผนเดิม'
          }
        ],
        confidenceScore: 0.5,
        personalizedFactors: ['PM2.5'],
        timestamp: Date.now()
      };
    }

    console.log('Advisor response:', advisorResponse.decisionLevel, advisorResponse.confidenceScore);

    return new Response(
      JSON.stringify(advisorResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Intelligent Advisor error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

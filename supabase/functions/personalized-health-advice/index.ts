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
    const { phri, alertLevel, conditions, location } = await req.json();

    console.log('Generating personalized health advice for:', { phri, alertLevel, conditions });

    const additionalTips: string[] = [];

    // Generate context-specific tips based on PHRI and conditions
    if (phri >= 8) {
      additionalTips.push('🚨 ระดับฉุกเฉิน: พิจารณาพักงาน/เรียนจากบ้าน');
      additionalTips.push('เตรียมกระเป๋าฉุกเฉินพร้อมยาและเอกสารสำคัญ');
    }

    if (phri >= 6) {
      additionalTips.push('ติดตั้งแอปพลิเคชันติดตามคุณภาพอากาศ');
      additionalTips.push('พิจารณาซื้อเครื่องวัดคุณภาพอากาศในบ้าน');
    }

    // Condition-specific advice
    if (conditions?.includes('asthma')) {
      additionalTips.push('ผู้ป่วยหอบหืด: ตรวจสอบยาพ่นขยายหลอดลมไม่หมดอายุ');
      additionalTips.push('บันทึกอาการและปัจจัยกระตุ้นในสมุดบันทึกสุขภาพ');
    }

    if (conditions?.includes('COPD')) {
      additionalTips.push('ผู้ป่วย COPD: ฝึกหายใจแบบ pursed-lip breathing');
      additionalTips.push('ตรวจวัดปริมาณออกซิเจนในเลือด (SpO2) เป็นประจำ');
    }

    if (conditions?.includes('heart disease')) {
      additionalTips.push('โรคหัวใจ: ตรวจวัดความดันโลหิตทุกวัน');
      additionalTips.push('หลีกเลี่ยงอาหารรสจัดและอาหารมันในช่วงฝุ่นสูง');
    }

    if (conditions?.includes('allergy')) {
      additionalTips.push('โรคภูมิแพ้: เปลี่ยนผ้าปูที่นอนและปลอกหมอนบ่อยขึ้น');
      additionalTips.push('ใช้ผ้าปูที่นอนกันไรฝุ่น');
    }

    // Location-based recommendations
    if (location) {
      additionalTips.push('แนะนำเส้นทางหลีกเลี่ยงถนนหลักในช่วงเร่งด่วน');
      additionalTips.push('มีร้านอาหารและคาเฟ่ที่มีระบบฟอกอากาศในพื้นที่ใกล้เคียง');
    }

    // General preventive measures
    additionalTips.push('รับประทานอาหารที่อุดมด้วยสารต้านอนุมูลอิสระ');
    additionalTips.push('ดื่มน้ำอย่างน้อย 8 แก้วต่อวัน');
    additionalTips.push('นอนหลับพักผ่อนให้เพียงพอ 7-8 ชั่วโมงต่อคืน');

    return new Response(
      JSON.stringify({ 
        success: true,
        additionalTips,
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error generating personalized advice:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate personalized advice',
        message: errorMessage,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

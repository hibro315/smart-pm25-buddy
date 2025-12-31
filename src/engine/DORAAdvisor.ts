/**
 * DORA - Decision-Oriented Response Architecture
 * 
 * AI Advisory layer that generates:
 * 1. Decision statement (1-2 sentences max)
 * 2. Actionable options (clickable actions)
 * 
 * No storytelling, no markdown, no emojis in decisions.
 * Risk Engine handles logic; this layer handles presentation only.
 * 
 * @version 1.0.0
 */

import { RiskEngine, RiskScore, AirQualityInput, UserProfile, TravelInput } from './RiskEngine';
import { DORA_CONFIG, TRAVEL_MODIFIERS, type TravelMode } from '@/config/constants';

// ============================================================================
// TYPES
// ============================================================================

export interface DORAOption {
  id: string;
  label: string;
  icon: string;
  action: 'proceed' | 'modify' | 'avoid' | 'info';
  travelMode?: TravelMode;
  description?: string;
  riskDelta?: number; // How much this option changes risk
}

export interface DORAResponse {
  decision: string;
  decisionLevel: 'safe' | 'caution' | 'warning' | 'danger';
  options: DORAOption[];
  riskScore: RiskScore;
  timestamp: number;
}

export interface DORAContext {
  airQuality: AirQualityInput;
  profile: UserProfile;
  travel: TravelInput;
  destination?: string;
}

// ============================================================================
// DECISION TEMPLATES
// ============================================================================

const DECISION_TEMPLATES = {
  safe: {
    canProceed: [
      'คุณภาพอากาศดี เดินทางได้ปลอดภัย',
      'สภาพอากาศเหมาะสม ทำกิจกรรมกลางแจ้งได้',
      'ไม่มีความเสี่ยงสำคัญ ดำเนินการได้ตามปกติ',
    ],
  },
  caution: {
    proceed: [
      'คุณภาพอากาศปานกลาง ควรระมัดระวัง',
      'สามารถเดินทางได้ แต่ลดเวลากลางแจ้ง',
      'กลุ่มเสี่ยงควรพิจารณาทางเลือกอื่น',
    ],
  },
  warning: {
    reconsider: [
      'คุณภาพอากาศไม่ดี ควรเลื่อนกิจกรรม',
      'ความเสี่ยงสูง แนะนำใช้รถยนต์หรือ BTS',
      'ควรสวมหน้ากาก N95 หากต้องออกนอกอาคาร',
    ],
  },
  danger: {
    avoid: [
      'อากาศอันตราย หลีกเลี่ยงกิจกรรมกลางแจ้ง',
      'ความเสี่ยงรุนแรง ไม่แนะนำให้เดินทาง',
      'ควรอยู่ในอาคารที่มีเครื่องฟอกอากาศ',
    ],
  },
} as const;

// ============================================================================
// OPTION GENERATORS
// ============================================================================

const generateSafeOptions = (context: DORAContext): DORAOption[] => {
  const options: DORAOption[] = [
    {
      id: 'proceed',
      label: 'เดินทางตามแผน',
      icon: '✓',
      action: 'proceed',
      travelMode: context.travel.mode,
      description: 'ดำเนินการตามที่วางแผน',
    },
    {
      id: 'info',
      label: 'ดูรายละเอียด',
      icon: 'ℹ',
      action: 'info',
      description: 'ดูข้อมูลคุณภาพอากาศเพิ่มเติม',
    },
  ];
  return options;
};

const generateCautionOptions = (context: DORAContext): DORAOption[] => {
  const currentMode = context.travel.mode;
  const options: DORAOption[] = [];

  // Add current option with mask
  options.push({
    id: 'proceed-mask',
    label: 'ไปพร้อมหน้ากาก',
    icon: '😷',
    action: 'proceed',
    travelMode: currentMode,
    description: 'สวมหน้ากากตลอดการเดินทาง',
    riskDelta: -15,
  });

  // Suggest safer transport if walking/cycling
  if (currentMode === 'walking' || currentMode === 'cycling' || currentMode === 'motorcycle') {
    options.push({
      id: 'switch-car',
      label: 'เปลี่ยนเป็นรถยนต์',
      icon: TRAVEL_MODIFIERS.car.icon,
      action: 'modify',
      travelMode: 'car',
      description: 'ลดการสัมผัสมลพิษ',
      riskDelta: -20,
    });
    
    options.push({
      id: 'switch-bts',
      label: 'ใช้ BTS/MRT',
      icon: TRAVEL_MODIFIERS.bts_mrt.icon,
      action: 'modify',
      travelMode: 'bts_mrt',
      description: 'ลดเวลากลางแจ้ง',
      riskDelta: -25,
    });
  }

  options.push({
    id: 'postpone',
    label: 'เลื่อนออกไป',
    icon: '⏰',
    action: 'avoid',
    description: 'รอจนกว่าอากาศจะดีขึ้น',
    riskDelta: -100,
  });

  return options.slice(0, DORA_CONFIG.MAX_OPTIONS);
};

const generateWarningOptions = (context: DORAContext): DORAOption[] => {
  return [
    {
      id: 'switch-bts',
      label: 'ใช้ BTS/MRT แทน',
      icon: TRAVEL_MODIFIERS.bts_mrt.icon,
      action: 'modify',
      travelMode: 'bts_mrt',
      description: 'ทางเลือกที่ปลอดภัยกว่า',
      riskDelta: -30,
    },
    {
      id: 'switch-car',
      label: 'ใช้รถยนต์ (เปิด AC)',
      icon: TRAVEL_MODIFIERS.car.icon,
      action: 'modify',
      travelMode: 'car',
      description: 'กรองอากาศในรถ',
      riskDelta: -25,
    },
    {
      id: 'postpone',
      label: 'เลื่อนเป็นพรุ่งนี้',
      icon: '📅',
      action: 'avoid',
      description: 'รอสภาพอากาศดีขึ้น',
      riskDelta: -100,
    },
    {
      id: 'stay-indoor',
      label: 'อยู่ในอาคาร',
      icon: TRAVEL_MODIFIERS.indoor.icon,
      action: 'avoid',
      description: 'ปลอดภัยที่สุด',
      riskDelta: -100,
    },
  ];
};

const generateDangerOptions = (): DORAOption[] => {
  return [
    {
      id: 'stay-indoor',
      label: 'อยู่ในอาคาร',
      icon: TRAVEL_MODIFIERS.indoor.icon,
      action: 'avoid',
      description: 'แนะนำอย่างยิ่ง',
      riskDelta: -100,
    },
    {
      id: 'emergency',
      label: 'ติดต่อโรงพยาบาล',
      icon: '🏥',
      action: 'info',
      description: 'หากมีอาการผิดปกติ',
    },
    {
      id: 'postpone',
      label: 'เลื่อนไม่มีกำหนด',
      icon: '❌',
      action: 'avoid',
      description: 'รอจนกว่าจะปลอดภัย',
      riskDelta: -100,
    },
  ];
};

// ============================================================================
// MAIN DORA ADVISOR CLASS
// ============================================================================

export class DORAAdvisor {
  /**
   * Generates a DORA-compliant response
   * 
   * @param context - Air quality, user profile, and travel info
   * @returns DORAResponse with decision and options
   */
  static generate(context: DORAContext): DORAResponse {
    // Get risk assessment from Risk Engine
    const riskScore = RiskEngine.compute(
      context.airQuality,
      context.profile,
      context.travel
    );

    // Determine decision level
    const decisionLevel = this.getDecisionLevel(riskScore);

    // Generate decision text
    const decision = this.generateDecision(decisionLevel, context);

    // Generate options
    const options = this.generateOptions(decisionLevel, context);

    return {
      decision,
      decisionLevel,
      options,
      riskScore,
      timestamp: Date.now(),
    };
  }

  /**
   * Maps risk score to decision level
   */
  private static getDecisionLevel(score: RiskScore): DORAResponse['decisionLevel'] {
    switch (score.category) {
      case 'LOW': return 'safe';
      case 'MODERATE': return 'caution';
      case 'HIGH': return 'warning';
      case 'SEVERE': return 'danger';
      default: return 'caution';
    }
  }

  /**
   * Generates decision text (max 2 sentences)
   */
  private static generateDecision(
    level: DORAResponse['decisionLevel'],
    context: DORAContext
  ): string {
    const templates = DECISION_TEMPLATES[level];
    const templateKey = Object.keys(templates)[0] as keyof typeof templates;
    const options = templates[templateKey] as readonly string[];
    
    // Select template based on context hash for consistency
    const index = Math.abs(this.hashContext(context)) % options.length;
    let decision = options[index];

    // Add destination if provided
    if (context.destination && decision.length + context.destination.length < DORA_CONFIG.MAX_DECISION_CHARS) {
      decision = decision.replace('เดินทาง', `เดินทางไป${context.destination}`);
    }

    return decision;
  }

  /**
   * Generates options based on decision level
   */
  private static generateOptions(
    level: DORAResponse['decisionLevel'],
    context: DORAContext
  ): DORAOption[] {
    switch (level) {
      case 'safe':
        return generateSafeOptions(context);
      case 'caution':
        return generateCautionOptions(context);
      case 'warning':
        return generateWarningOptions(context);
      case 'danger':
        return generateDangerOptions();
      default:
        return generateCautionOptions(context);
    }
  }

  /**
   * Creates a deterministic hash from context for reproducibility
   */
  private static hashContext(context: DORAContext): number {
    const str = JSON.stringify({
      pm25: Math.round(context.airQuality.pm25),
      mode: context.travel.mode,
    });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Simulates risk change for an option
   */
  static simulateOption(
    option: DORAOption,
    context: DORAContext
  ): RiskScore {
    if (option.travelMode) {
      const modifiedContext = {
        ...context,
        travel: { ...context.travel, mode: option.travelMode },
      };
      return RiskEngine.compute(
        modifiedContext.airQuality,
        modifiedContext.profile,
        modifiedContext.travel
      );
    }
    return RiskEngine.compute(context.airQuality, context.profile, context.travel);
  }

  /**
   * Formats response for display (strips any unwanted elements)
   */
  static formatForDisplay(response: DORAResponse): DORAResponse {
    // Ensure decision meets constraints
    let decision = response.decision;
    
    // Remove any accidental markdown
    decision = decision.replace(/[*#_`]/g, '');
    
    // Remove any URLs
    decision = decision.replace(/https?:\/\/\S+/g, '');
    
    // Truncate if needed
    if (decision.length > DORA_CONFIG.MAX_DECISION_CHARS) {
      decision = decision.slice(0, DORA_CONFIG.MAX_DECISION_CHARS - 3) + '...';
    }

    return { ...response, decision };
  }
}

export default DORAAdvisor;

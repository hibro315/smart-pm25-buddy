/**
 * useIntelligentAdvisor Hook
 * 
 * Connects to the AI-powered intelligent-advisor edge function
 * to get personalized health decisions based on real-time context.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DecisionBlockData, RiskLevel } from '@/components/DecisionBlock';

export interface AdvisorRequest {
  pm25: number;
  aqi?: number;
  temperature?: number;
  humidity?: number;
  location?: string;
  travelMode?: 'walking' | 'cycling' | 'motorcycle' | 'car' | 'bts_mrt' | 'indoor';
  destination?: string;
  activityType?: 'exercise' | 'commute' | 'errand' | 'leisure';
  duration?: number;
}

export interface AdvisorOption {
  id: string;
  label: string;
  icon: string;
  action: 'proceed' | 'modify' | 'avoid' | 'info';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  estimatedRiskReduction?: number;
}

export interface AdvisorResponse {
  decision: string;
  decisionLevel: 'safe' | 'caution' | 'warning' | 'danger';
  reasoning: string;
  options: AdvisorOption[];
  confidenceScore: number;
  personalizedFactors: string[];
  timestamp: number;
}

// Map AI risk level to score approximation
const riskLevelToScore: Record<RiskLevel, number> = {
  safe: 15,
  caution: 40,
  warning: 65,
  danger: 90,
};

// Map AI option feasibility
const actionToFeasibility = (action: string): 'easy' | 'moderate' | 'difficult' => {
  switch (action) {
    case 'proceed':
    case 'info':
      return 'easy';
    case 'modify':
      return 'moderate';
    case 'avoid':
      return 'difficult';
    default:
      return 'moderate';
  }
};

export function useIntelligentAdvisor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AdvisorResponse | null>(null);
  const [decisionData, setDecisionData] = useState<DecisionBlockData | null>(null);

  const getAdvice = useCallback(async (request: AdvisorRequest): Promise<AdvisorResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('intelligent-advisor', {
        body: request,
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to get advice');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const advisorResponse = data as AdvisorResponse;
      setResponse(advisorResponse);

      // Convert to DecisionBlockData format
      const converted: DecisionBlockData = {
        riskLevel: advisorResponse.decisionLevel,
        riskScore: riskLevelToScore[advisorResponse.decisionLevel] || 50,
        primaryDecision: advisorResponse.decision,
        supportingFacts: [
          advisorResponse.reasoning,
          ...advisorResponse.personalizedFactors.map(f => `• ${f}`),
          `ความมั่นใจ: ${Math.round(advisorResponse.confidenceScore * 100)}%`,
        ],
        options: advisorResponse.options.map((opt) => ({
          id: opt.id,
          action: `${opt.icon} ${opt.label}`,
          riskReduction: opt.estimatedRiskReduction || 0,
          feasibility: actionToFeasibility(opt.action),
          timeToImplement: opt.reasoning,
        })),
      };

      setDecisionData(converted);
      return advisorResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Intelligent Advisor error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResponse(null);
    setDecisionData(null);
    setError(null);
  }, []);

  return {
    getAdvice,
    reset,
    loading,
    error,
    response,
    decisionData,
  };
}

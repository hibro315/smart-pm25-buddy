/**
 * Decision Block Component
 * 
 * "AI that decides — not talks"
 * 
 * Displays actionable decision outputs in a clean, scannable format:
 * - RISK level
 * - ACTION to take
 * - SAFE WINDOW
 * - ROUTE options
 * 
 * No essays. No narratives. Pure decisions.
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  Shield, 
  Clock, 
  MapPin, 
  ChevronDown,
  ChevronUp,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

export type RiskLevel = 'safe' | 'caution' | 'warning' | 'danger';

export interface DecisionOption {
  id: string;
  action: string;
  riskReduction: number;
  feasibility: 'easy' | 'moderate' | 'difficult';
  timeToImplement: string;
}

export interface DecisionBlockData {
  // Core decision
  riskLevel: RiskLevel;
  riskScore: number;          // 0-100
  primaryDecision: string;    // Single sentence
  
  // Supporting data
  supportingFacts: string[];
  
  // Actions
  options: DecisionOption[];
  
  // Time window
  safeWindow?: {
    start: string;
    end: string;
  };
  
  // Route (if applicable)
  recommendedRoute?: {
    index: number;
    healthSavings: number;
    timeCost: number;
  };
}

export interface DecisionBlockProps {
  data: DecisionBlockData;
  onOptionSelect?: (optionId: string) => void;
  compact?: boolean;
  className?: string;
}

// ============================================================================
// STYLING
// ============================================================================

const LEVEL_STYLES: Record<RiskLevel, {
  bg: string;
  border: string;
  badge: string;
  text: string;
  icon: string;
}> = {
  safe: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: 'text-emerald-500',
  },
  caution: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'text-amber-500',
  },
  warning: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500',
    text: 'text-orange-700 dark:text-orange-300',
    icon: 'text-orange-500',
  },
  danger: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    badge: 'bg-red-500',
    text: 'text-red-700 dark:text-red-300',
    icon: 'text-red-500',
  },
};

const LEVEL_LABELS: Record<RiskLevel, { th: string; en: string }> = {
  safe: { th: 'ปลอดภัย', en: 'SAFE' },
  caution: { th: 'ระวัง', en: 'CAUTION' },
  warning: { th: 'เตือน', en: 'WARNING' },
  danger: { th: 'อันตราย', en: 'DANGER' },
};

const FEASIBILITY_STYLES: Record<DecisionOption['feasibility'], string> = {
  easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  difficult: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const DecisionBlock: React.FC<DecisionBlockProps> = ({
  data,
  onOptionSelect,
  compact = false,
  className,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  const styles = LEVEL_STYLES[data.riskLevel];
  const labels = LEVEL_LABELS[data.riskLevel];
  
  const handleOptionClick = (optionId: string) => {
    setSelectedOption(optionId);
    onOptionSelect?.(optionId);
  };
  
  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        styles.bg,
        styles.border,
        className
      )}>
        <div className={cn('px-2 py-1 rounded text-xs font-bold text-white', styles.badge)}>
          {labels.en}
        </div>
        <span className={cn('font-medium', styles.text)}>
          {data.primaryDecision}
        </span>
      </div>
    );
  }
  
  return (
    <div className={cn(
      'rounded-xl border-2 overflow-hidden transition-all duration-300',
      styles.bg,
      styles.border,
      className
    )}>
      {/* Header - Risk Level + Score */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center justify-center w-12 h-12 rounded-lg',
            styles.badge
          )}>
            {data.riskLevel === 'safe' ? (
              <Shield className="w-6 h-6 text-white" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                RISK
              </span>
              <span className={cn('text-xl font-bold', styles.text)}>
                {labels.en}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Score: {data.riskScore}/100
            </div>
          </div>
        </div>
        
        {data.safeWindow && (
          <div className="flex items-center gap-2 text-sm bg-background/50 px-3 py-2 rounded-lg">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">
              {data.safeWindow.start} - {data.safeWindow.end}
            </span>
          </div>
        )}
      </div>
      
      {/* Primary Decision */}
      <div className="p-4 border-b border-border/50">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          ACTION
        </div>
        <p className={cn('text-lg font-semibold', styles.text)}>
          {data.primaryDecision}
        </p>
      </div>
      
      {/* Route Recommendation (if applicable) */}
      {data.recommendedRoute && (
        <div className="p-4 border-b border-border/50 bg-background/30">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            ROUTE
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="font-semibold">
                เส้นทาง {data.recommendedRoute.index + 1}
              </span>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                ↓ {data.recommendedRoute.healthSavings}% ความเสี่ยง
              </span>
              {data.recommendedRoute.timeCost > 0 && (
                <span className="text-muted-foreground">
                  +{data.recommendedRoute.timeCost} นาที
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Options */}
      {data.options.length > 0 && (
        <div className="p-4 border-b border-border/50">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            OPTIONS
          </div>
          <div className="space-y-2">
            {data.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border transition-all',
                  'hover:border-primary hover:bg-primary/5',
                  selectedOption === option.id && 'border-primary bg-primary/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center',
                    selectedOption === option.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  )}>
                    {selectedOption === option.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-medium">
                        {data.options.indexOf(option) + 1}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-left">{option.action}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    FEASIBILITY_STYLES[option.feasibility]
                  )}>
                    {option.feasibility === 'easy' ? 'ง่าย' : 
                     option.feasibility === 'moderate' ? 'ปานกลาง' : 'ยาก'}
                  </span>
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    -{option.riskReduction}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Supporting Facts (Collapsible) */}
      {data.supportingFacts.length > 0 && (
        <div className="border-t border-border/50">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-4 hover:bg-background/50 transition-colors"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              DETAILS
            </span>
            {showDetails ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          
          {showDetails && (
            <div className="px-4 pb-4 space-y-2">
              {data.supportingFacts.map((fact, i) => (
                <div 
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-primary">•</span>
                  <span>{fact}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// QUICK DECISION BLOCK (Minimal)
// ============================================================================

export interface QuickDecisionProps {
  risk: RiskLevel;
  action: string;
  onClick?: () => void;
}

export const QuickDecision: React.FC<QuickDecisionProps> = ({
  risk,
  action,
  onClick,
}) => {
  const styles = LEVEL_STYLES[risk];
  const labels = LEVEL_LABELS[risk];
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border-2 w-full transition-all',
        'hover:scale-[1.02] active:scale-[0.98]',
        styles.bg,
        styles.border
      )}
    >
      <div className={cn(
        'px-2 py-1 rounded text-xs font-bold text-white uppercase',
        styles.badge
      )}>
        {labels.en}
      </div>
      <span className={cn('font-semibold flex-1 text-left', styles.text)}>
        {action}
      </span>
      <ChevronDown className="w-4 h-4 text-muted-foreground" />
    </button>
  );
};

// ============================================================================
// ROUTE DECISION BLOCK
// ============================================================================

export interface RouteDecisionProps {
  safestIndex: number;
  fastestIndex: number;
  healthSavings: number;
  timeCost: number;
  recommendation: string;
  onSelectRoute: (index: number) => void;
}

export const RouteDecision: React.FC<RouteDecisionProps> = ({
  safestIndex,
  fastestIndex,
  healthSavings,
  timeCost,
  recommendation,
  onSelectRoute,
}) => {
  const isSameRoute = safestIndex === fastestIndex;
  
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        ROUTE DECISION
      </div>
      
      <p className="text-lg font-semibold mb-4">
        {recommendation}
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={safestIndex === fastestIndex ? 'default' : 'outline'}
          onClick={() => onSelectRoute(safestIndex)}
          className="flex flex-col items-start h-auto py-3"
        >
          <span className="text-xs uppercase tracking-wider opacity-70">
            {isSameRoute ? 'BEST' : 'SAFEST'}
          </span>
          <span className="font-semibold">
            เส้นทาง {safestIndex + 1}
          </span>
          {!isSameRoute && (
            <span className="text-xs text-emerald-500">
              ↓ {healthSavings}% ความเสี่ยง
            </span>
          )}
        </Button>
        
        {!isSameRoute && (
          <Button
            variant="outline"
            onClick={() => onSelectRoute(fastestIndex)}
            className="flex flex-col items-start h-auto py-3"
          >
            <span className="text-xs uppercase tracking-wider opacity-70">
              FASTEST
            </span>
            <span className="font-semibold">
              เส้นทาง {fastestIndex + 1}
            </span>
            <span className="text-xs text-muted-foreground">
              เร็วกว่า {timeCost} นาที
            </span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default DecisionBlock;

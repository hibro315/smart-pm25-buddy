/**
 * AI Decision Block Component
 * 
 * Enhanced DecisionBlock that fetches real-time AI-powered decisions
 * from the intelligent-advisor edge function.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  Shield, 
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  RefreshCw,
  Loader2,
  Brain,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIntelligentAdvisor, type AdvisorRequest, type AdvisorOption } from '@/hooks/useIntelligentAdvisor';
import { toast } from 'sonner';

export type RiskLevel = 'safe' | 'caution' | 'warning' | 'danger';

interface AIDecisionBlockProps {
  pm25: number;
  aqi?: number;
  temperature?: number;
  humidity?: number;
  location?: string;
  travelMode?: AdvisorRequest['travelMode'];
  onOptionSelect?: (option: AdvisorOption) => void;
  compact?: boolean;
  autoFetch?: boolean;
  className?: string;
}

const LEVEL_STYLES: Record<RiskLevel, {
  bg: string;
  border: string;
  badge: string;
  text: string;
  glow: string;
}> = {
  safe: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    badge: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    text: 'text-emerald-700 dark:text-emerald-300',
    glow: 'shadow-emerald-500/20',
  },
  caution: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-gradient-to-r from-amber-500 to-amber-600',
    text: 'text-amber-700 dark:text-amber-300',
    glow: 'shadow-amber-500/20',
  },
  warning: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    badge: 'bg-gradient-to-r from-orange-500 to-orange-600',
    text: 'text-orange-700 dark:text-orange-300',
    glow: 'shadow-orange-500/20',
  },
  danger: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    badge: 'bg-gradient-to-r from-red-500 to-red-600',
    text: 'text-red-700 dark:text-red-300',
    glow: 'shadow-red-500/20',
  },
};

const LEVEL_LABELS: Record<RiskLevel, { th: string; en: string }> = {
  safe: { th: 'ปลอดภัย', en: 'SAFE' },
  caution: { th: 'ระวัง', en: 'CAUTION' },
  warning: { th: 'เตือน', en: 'WARNING' },
  danger: { th: 'อันตราย', en: 'DANGER' },
};

const ACTION_STYLES: Record<string, string> = {
  proceed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  modify: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  avoid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
};

export const AIDecisionBlock: React.FC<AIDecisionBlockProps> = ({
  pm25,
  aqi,
  temperature,
  humidity,
  location,
  travelMode,
  onOptionSelect,
  compact = false,
  autoFetch = true,
  className,
}) => {
  const { getAdvice, loading, error, response, reset } = useIntelligentAdvisor();
  const [showDetails, setShowDetails] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Auto-fetch on mount or when PM2.5 changes significantly
  useEffect(() => {
    if (autoFetch && pm25 > 0 && !hasFetched) {
      fetchAdvice();
    }
  }, [pm25, autoFetch, hasFetched]);

  const fetchAdvice = async () => {
    setHasFetched(true);
    await getAdvice({
      pm25,
      aqi,
      temperature,
      humidity,
      location,
      travelMode,
    });
  };

  const handleRefresh = async () => {
    reset();
    setSelectedOption(null);
    setHasFetched(false);
    await fetchAdvice();
  };

  const handleOptionClick = (option: AdvisorOption) => {
    setSelectedOption(option.id);
    onOptionSelect?.(option);
    
    // Show toast with option reasoning
    toast.success(option.label, {
      description: option.reasoning,
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className={cn(
        'rounded-xl border-2 border-primary/20 bg-card/50 backdrop-blur-sm p-4',
        className
      )}>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <div className="relative w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI กำลังวิเคราะห์...</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              พิจารณาข้อมูลสุขภาพและสภาพแวดล้อม
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !response) {
    return (
      <div className={cn(
        'rounded-xl border-2 border-red-500/30 bg-red-500/10 p-4',
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // No response yet
  if (!response) {
    return (
      <div className={cn(
        'rounded-xl border-2 border-dashed border-primary/30 bg-card/30 p-4',
        className
      )}>
        <div className="flex items-center justify-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">กดเพื่อขอคำแนะนำจาก AI</span>
          <Button variant="outline" size="sm" onClick={fetchAdvice}>
            วิเคราะห์
          </Button>
        </div>
      </div>
    );
  }

  const styles = LEVEL_STYLES[response.decisionLevel];
  const labels = LEVEL_LABELS[response.decisionLevel];

  // Compact mode
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-center gap-3 p-4 rounded-xl border-2 shadow-lg',
          styles.bg,
          styles.border,
          styles.glow,
          className
        )}
      >
        <div className={cn('px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-md', styles.badge)}>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            {labels.en}
          </div>
        </div>
        <span className={cn('font-medium flex-1', styles.text)}>
          {response.decision}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </motion.div>
    );
  }

  // Full mode
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border-2 overflow-hidden shadow-lg backdrop-blur-sm',
        styles.bg,
        styles.border,
        styles.glow,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30 bg-gradient-to-r from-transparent via-background/20 to-transparent">
        <div className="flex items-center gap-3">
          <motion.div 
            className={cn('flex items-center justify-center w-12 h-12 rounded-xl shadow-lg', styles.badge)}
            animate={{ 
              scale: [1, 1.05, 1],
              boxShadow: [
                '0 0 0 0 rgba(255,255,255,0)',
                '0 0 20px 2px rgba(255,255,255,0.3)',
                '0 0 0 0 rgba(255,255,255,0)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {response.decisionLevel === 'safe' ? (
              <Shield className="w-6 h-6 text-white" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-white" />
            )}
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AI DECISION
              </span>
              <span className={cn('text-xl font-bold', styles.text)}>
                {labels.th}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="w-3 h-3" />
              <span>ความมั่นใจ {Math.round(response.confidenceScore * 100)}%</span>
            </div>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Primary Decision */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            คำแนะนำ
          </span>
        </div>
        <p className={cn('text-lg font-semibold', styles.text)}>
          {response.decision}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {response.reasoning}
        </p>
      </div>

      {/* Options */}
      {response.options.length > 0 && (
        <div className="p-4 border-b border-border/30">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            ตัวเลือก
          </div>
          <div className="grid gap-2">
            <AnimatePresence>
              {response.options.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleOptionClick(option)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    selectedOption === option.id 
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30' 
                      : cn('border-border/50', ACTION_STYLES[option.action] || ACTION_STYLES.info)
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div className="text-left">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {option.reasoning}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {option.estimatedRiskReduction && option.estimatedRiskReduction > 0 && (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                        -{option.estimatedRiskReduction}%
                      </span>
                    )}
                    {selectedOption === option.id && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Personalized Factors (Collapsible) */}
      {response.personalizedFactors.length > 0 && (
        <div className="border-t border-border/30">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-4 hover:bg-background/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ปัจจัยที่พิจารณา ({response.personalizedFactors.length})
              </span>
            </div>
            {showDetails ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 flex flex-wrap gap-2">
                  {response.personalizedFactors.map((factor, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default AIDecisionBlock;

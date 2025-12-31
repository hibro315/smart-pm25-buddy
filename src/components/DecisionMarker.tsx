/**
 * Decision Marker Component
 * 
 * Color-coded map marker with risk information and DORA options
 * 
 * @version 1.0.0
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type DORAOption, type DORAResponse } from '@/engine/DORAAdvisor';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';

interface DecisionMarkerProps {
  doraResponse: DORAResponse;
  locationName?: string;
  onOptionSelect: (option: DORAOption) => void;
  compact?: boolean;
  className?: string;
}

const LEVEL_STYLES = {
  safe: {
    bg: 'bg-success/10',
    border: 'border-success',
    badge: 'bg-success',
    text: 'text-success',
    pulse: '',
  },
  caution: {
    bg: 'bg-warning/10',
    border: 'border-warning',
    badge: 'bg-warning',
    text: 'text-warning',
    pulse: '',
  },
  warning: {
    bg: 'bg-destructive/10',
    border: 'border-destructive',
    badge: 'bg-destructive',
    text: 'text-destructive',
    pulse: 'animate-pulse',
  },
  danger: {
    bg: 'bg-destructive/20',
    border: 'border-destructive',
    badge: 'bg-destructive',
    text: 'text-destructive',
    pulse: 'animate-pulse',
  },
};

export const DecisionMarker = ({
  doraResponse,
  locationName,
  onOptionSelect,
  compact = false,
  className,
}: DecisionMarkerProps) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const styles = LEVEL_STYLES[doraResponse.decisionLevel];

  const getLevelLabel = () => {
    switch (doraResponse.decisionLevel) {
      case 'safe': return 'ปลอดภัย';
      case 'caution': return 'ระวัง';
      case 'warning': return 'เตือน';
      case 'danger': return 'อันตราย';
    }
  };

  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all',
          styles.bg,
          styles.border,
          styles.pulse,
          className
        )}
      >
        <MapPin className={cn('w-4 h-4', styles.text)} />
        <span className="text-sm font-medium">{locationName || 'จุดหมาย'}</span>
        <Badge className={cn('text-xs', styles.badge)}>{getLevelLabel()}</Badge>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <Card className={cn(
      'p-4 border-2 transition-all',
      styles.bg,
      styles.border,
      styles.pulse,
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className={cn('w-5 h-5', styles.text)} />
          <div>
            <p className="font-medium text-sm">{locationName || 'จุดหมาย'}</p>
            <Badge className={cn('mt-1', styles.badge)}>{getLevelLabel()}</Badge>
          </div>
        </div>
        {compact && (
          <button onClick={() => setIsExpanded(false)}>
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Decision Statement */}
      <p className="text-sm font-medium mb-4">
        {doraResponse.decision}
      </p>

      {/* Risk Score */}
      <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
        <span>ความเสี่ยง: <strong className={styles.text}>{doraResponse.riskScore.total}%</strong></span>
        <span>PM2.5: {doraResponse.riskScore.baseExposure} µg/m³</span>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">ทางเลือก:</p>
        <div className="flex flex-wrap gap-2">
          {doraResponse.options.map((option) => (
            <Button
              key={option.id}
              variant={option.action === 'proceed' ? 'default' : 
                       option.action === 'avoid' ? 'outline' : 'secondary'}
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => onOptionSelect(option)}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
              {option.riskDelta && option.riskDelta < 0 && (
                <span className="text-success ml-1">
                  {option.riskDelta}%
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default DecisionMarker;

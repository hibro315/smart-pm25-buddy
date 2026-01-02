/**
 * Health State Animation Engine
 * 
 * State-driven animation system that reflects physiological metaphors:
 * - Calm: Slow, rhythmic breathing animations
 * - Alert: Elevated pulse, attention-grabbing
 * - Emergency: Rapid, urgent shockwave effects
 * 
 * All animations convey health state, not decoration.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// HEALTH STATE TYPES
// ============================================================================

export type HealthState = 'calm' | 'alert' | 'warning' | 'emergency';

export interface HealthStateConfig {
  state: HealthState;
  pulseSpeed: 'slow' | 'medium' | 'fast' | 'urgent';
  glowIntensity: number; // 0-1
  backgroundColor: string;
  borderColor: string;
  accentColor: string;
  shadowColor: string;
  breathingRate: number; // seconds per cycle
  hapticPattern?: number[]; // vibration pattern
}

// ============================================================================
// STATE CONFIGURATIONS
// ============================================================================

const STATE_CONFIGS: Record<HealthState, Omit<HealthStateConfig, 'state'>> = {
  calm: {
    pulseSpeed: 'slow',
    glowIntensity: 0.2,
    backgroundColor: 'hsl(var(--success) / 0.05)',
    borderColor: 'hsl(var(--success) / 0.3)',
    accentColor: 'hsl(var(--success))',
    shadowColor: 'hsl(var(--success) / 0.2)',
    breathingRate: 4, // 4 seconds = calm breathing
    hapticPattern: [100],
  },
  alert: {
    pulseSpeed: 'medium',
    glowIntensity: 0.4,
    backgroundColor: 'hsl(var(--warning) / 0.08)',
    borderColor: 'hsl(var(--warning) / 0.5)',
    accentColor: 'hsl(var(--warning))',
    shadowColor: 'hsl(var(--warning) / 0.3)',
    breathingRate: 2.5,
    hapticPattern: [200, 100, 200],
  },
  warning: {
    pulseSpeed: 'fast',
    glowIntensity: 0.6,
    backgroundColor: 'hsl(33 100% 50% / 0.1)',
    borderColor: 'hsl(33 100% 50% / 0.6)',
    accentColor: 'hsl(33 100% 50%)',
    shadowColor: 'hsl(33 100% 50% / 0.4)',
    breathingRate: 1.5,
    hapticPattern: [300, 100, 300],
  },
  emergency: {
    pulseSpeed: 'urgent',
    glowIntensity: 0.8,
    backgroundColor: 'hsl(var(--destructive) / 0.1)',
    borderColor: 'hsl(var(--destructive) / 0.7)',
    accentColor: 'hsl(var(--destructive))',
    shadowColor: 'hsl(var(--destructive) / 0.5)',
    breathingRate: 0.8, // Rapid breathing
    hapticPattern: [400, 100, 400, 100, 400],
  },
};

// ============================================================================
// PHRI TO STATE MAPPING
// ============================================================================

export function phriToHealthState(phri: number): HealthState {
  if (phri < 2.5) return 'calm';
  if (phri < 5) return 'alert';
  if (phri < 7.5) return 'warning';
  return 'emergency';
}

export function pm25ToHealthState(pm25: number): HealthState {
  if (pm25 <= 25) return 'calm';
  if (pm25 <= 50) return 'alert';
  if (pm25 <= 100) return 'warning';
  return 'emergency';
}

// ============================================================================
// ANIMATION CLASSES
// ============================================================================

export const PULSE_CLASSES = {
  slow: 'animate-pulse-slow',
  medium: 'animate-pulse-medium',
  fast: 'animate-pulse-fast',
  urgent: 'animate-pulse-urgent',
};

export const GLOW_CLASSES = {
  calm: 'shadow-glow-calm',
  alert: 'shadow-glow-alert',
  warning: 'shadow-glow-warning',
  emergency: 'shadow-glow-emergency',
};

// ============================================================================
// HOOKS
// ============================================================================

export function useHealthState(phri: number): HealthStateConfig {
  return useMemo(() => {
    const state = phriToHealthState(phri);
    return {
      state,
      ...STATE_CONFIGS[state],
    };
  }, [phri]);
}

export function useHealthAnimationClasses(
  healthState: HealthState,
  options?: {
    enablePulse?: boolean;
    enableGlow?: boolean;
    enableBreathing?: boolean;
  }
): string {
  const { enablePulse = true, enableGlow = true, enableBreathing = true } = options || {};
  
  return useMemo(() => {
    const classes: string[] = [];
    
    if (enablePulse) {
      classes.push(PULSE_CLASSES[STATE_CONFIGS[healthState].pulseSpeed]);
    }
    
    if (enableGlow) {
      classes.push(GLOW_CLASSES[healthState]);
    }
    
    if (enableBreathing) {
      classes.push(`breathing-${healthState}`);
    }
    
    return cn(...classes);
  }, [healthState, enablePulse, enableGlow, enableBreathing]);
}

// ============================================================================
// INLINE STYLES GENERATOR
// ============================================================================

export function getHealthStateStyles(state: HealthState): React.CSSProperties {
  const config = STATE_CONFIGS[state];
  
  return {
    backgroundColor: config.backgroundColor,
    borderColor: config.borderColor,
    boxShadow: `0 0 ${config.glowIntensity * 30}px ${config.shadowColor}`,
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  };
}

export function getBreathingAnimation(state: HealthState): React.CSSProperties {
  const config = STATE_CONFIGS[state];
  
  return {
    animation: `breathing ${config.breathingRate}s ease-in-out infinite`,
  };
}

// ============================================================================
// CSS KEYFRAMES (to be added to index.css)
// ============================================================================

export const ANIMATION_CSS = `
/* Health State Breathing Animations */
@keyframes breathing {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.02); opacity: 0.95; }
}

@keyframes pulse-slow {
  0%, 100% { box-shadow: 0 0 0 0 hsl(var(--success) / 0.4); }
  50% { box-shadow: 0 0 20px 5px hsl(var(--success) / 0.2); }
}

@keyframes pulse-medium {
  0%, 100% { box-shadow: 0 0 0 0 hsl(var(--warning) / 0.5); }
  50% { box-shadow: 0 0 25px 8px hsl(var(--warning) / 0.3); }
}

@keyframes pulse-fast {
  0%, 100% { box-shadow: 0 0 0 0 hsl(33 100% 50% / 0.5); }
  50% { box-shadow: 0 0 30px 10px hsl(33 100% 50% / 0.3); }
}

@keyframes pulse-urgent {
  0%, 100% { box-shadow: 0 0 0 0 hsl(var(--destructive) / 0.6); }
  50% { box-shadow: 0 0 35px 12px hsl(var(--destructive) / 0.4); }
}

@keyframes shockwave {
  0% { transform: scale(1); box-shadow: 0 0 0 0 hsl(var(--destructive) / 0.8); }
  50% { transform: scale(1.05); box-shadow: 0 0 50px 20px hsl(var(--destructive) / 0.3); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 hsl(var(--destructive) / 0); }
}

@keyframes contraction {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.98); }
}

@keyframes expansion {
  0% { transform: scale(0.95); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Animation utility classes */
.animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
.animate-pulse-medium { animation: pulse-medium 2.5s ease-in-out infinite; }
.animate-pulse-fast { animation: pulse-fast 1.5s ease-in-out infinite; }
.animate-pulse-urgent { animation: pulse-urgent 0.8s ease-in-out infinite; }

.animate-shockwave { animation: shockwave 0.6s ease-out; }
.animate-contraction { animation: contraction 1.5s ease-in-out infinite; }
.animate-expansion { animation: expansion 0.5s ease-out forwards; }
.animate-flow { animation: flow 3s ease-in-out infinite; background-size: 200% 200%; }

/* Breathing animations per state */
.breathing-calm { animation: breathing 4s ease-in-out infinite; }
.breathing-alert { animation: breathing 2.5s ease-in-out infinite; }
.breathing-warning { animation: breathing 1.5s ease-in-out infinite; }
.breathing-emergency { animation: breathing 0.8s ease-in-out infinite; }

/* Glow shadows per state */
.shadow-glow-calm { box-shadow: 0 0 20px hsl(var(--success) / 0.2); }
.shadow-glow-alert { box-shadow: 0 0 25px hsl(var(--warning) / 0.3); }
.shadow-glow-warning { box-shadow: 0 0 30px hsl(33 100% 50% / 0.4); }
.shadow-glow-emergency { box-shadow: 0 0 35px hsl(var(--destructive) / 0.5); }
`;

export default {
  phriToHealthState,
  pm25ToHealthState,
  useHealthState,
  useHealthAnimationClasses,
  getHealthStateStyles,
  getBreathingAnimation,
  STATE_CONFIGS,
  PULSE_CLASSES,
  GLOW_CLASSES,
};

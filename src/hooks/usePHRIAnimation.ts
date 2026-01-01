import { useState, useEffect, useRef, useCallback } from 'react';

interface AnimationConfig {
  duration?: number;
  easing?: 'linear' | 'easeOut' | 'easeOutExpo' | 'easeInOut';
}

// Easing functions for smooth animations
const easingFunctions = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

/**
 * Hook for animating numeric PHRI values with smooth transitions
 */
export const usePHRIAnimation = (
  targetValue: number,
  config: AnimationConfig = {}
) => {
  const { duration = 800, easing = 'easeOutExpo' } = config;
  const [displayValue, setDisplayValue] = useState(targetValue);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Skip animation if value hasn't changed significantly
    if (Math.abs(targetValue - displayValue) < 0.1) {
      setDisplayValue(targetValue);
      return;
    }

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    startValueRef.current = displayValue;
    startTimeRef.current = null;
    setIsAnimating(true);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFunctions[easing](progress);
      
      const currentValue = startValueRef.current + 
        (targetValue - startValueRef.current) * easedProgress;
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
        setIsAnimating(false);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration, easing]);

  return { displayValue, isAnimating };
};

/**
 * Hook for determining dominant risk factor from PHRI breakdown
 */
export const useDominantFactor = (breakdown: Record<string, number>) => {
  const [dominantFactor, setDominantFactor] = useState<{
    name: string;
    value: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    if (!breakdown || Object.keys(breakdown).length === 0) {
      setDominantFactor(null);
      return;
    }

    // Filter out negative/protective factors for dominant calculation
    const positiveFactors = Object.entries(breakdown).filter(([_, value]) => value > 0);
    
    if (positiveFactors.length === 0) {
      setDominantFactor(null);
      return;
    }

    const total = positiveFactors.reduce((sum, [_, value]) => sum + value, 0);
    const sorted = positiveFactors.sort((a, b) => b[1] - a[1]);
    const [name, value] = sorted[0];
    
    setDominantFactor({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    });
  }, [breakdown]);

  return dominantFactor;
};

/**
 * Hook for color interpolation based on PHRI score
 */
export const usePHRIColor = (score: number) => {
  const getColor = useCallback((value: number): string => {
    if (value < 25) return 'hsl(var(--success))';
    if (value < 50) return 'hsl(var(--warning))';
    if (value < 75) return 'hsl(var(--aqi-unhealthy))';
    return 'hsl(var(--destructive))';
  }, []);

  const getCategory = useCallback((value: number): string => {
    if (value < 25) return 'low';
    if (value < 50) return 'moderate';
    if (value < 75) return 'high';
    return 'severe';
  }, []);

  const getCategoryLabel = useCallback((value: number): string => {
    if (value < 25) return 'ต่ำ';
    if (value < 50) return 'ปานกลาง';
    if (value < 75) return 'สูง';
    return 'รุนแรง';
  }, []);

  return {
    color: getColor(score),
    category: getCategory(score),
    categoryLabel: getCategoryLabel(score),
  };
};

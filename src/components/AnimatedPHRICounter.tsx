import { usePHRIAnimation, usePHRIColor } from '@/hooks/usePHRIAnimation';
import { cn } from '@/lib/utils';

interface AnimatedPHRICounterProps {
  value: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
}

export const AnimatedPHRICounter = ({
  value,
  size = 'lg',
  showLabel = true,
  className,
}: AnimatedPHRICounterProps) => {
  const { displayValue, isAnimating } = usePHRIAnimation(value, {
    duration: 800,
    easing: 'easeOutExpo',
  });
  const { color, categoryLabel } = usePHRIColor(displayValue);

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-8xl',
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'font-bold font-display tabular-nums transition-colors duration-300',
          sizeClasses[size],
          isAnimating && 'animate-pulse'
        )}
        style={{ color }}
      >
        {displayValue.toFixed(1)}
      </div>
      {showLabel && (
        <div
          className="text-sm font-medium px-3 py-1 rounded-full transition-all duration-300"
          style={{
            backgroundColor: `${color}15`,
            color,
          }}
        >
          {categoryLabel}
        </div>
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AvatarState } from '@/services/ThaiTTSService';

interface AnimatedAvatarProps {
  state: AvatarState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AnimatedAvatar = ({ state, size = 'md', className }: AnimatedAvatarProps) => {
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    if (state === 'speaking') {
      const interval = setInterval(() => {
        setPulseScale(prev => prev === 1 ? 1.1 : 1);
      }, 300);
      return () => clearInterval(interval);
    }
    setPulseScale(1);
  }, [state]);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
  };

  const stateColors = {
    idle: 'from-primary/60 to-primary',
    listening: 'from-blue-400 to-blue-600',
    speaking: 'from-green-400 to-green-600',
    warning: 'from-orange-400 to-red-500',
    thinking: 'from-purple-400 to-purple-600',
  };

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Outer glow ring */}
      <div className={cn(
        'absolute rounded-full transition-all duration-300',
        sizeClasses[size],
        state === 'speaking' && 'animate-ping opacity-30',
        state === 'listening' && 'animate-pulse opacity-50',
        `bg-gradient-to-br ${stateColors[state]}`
      )} style={{ transform: `scale(${state === 'speaking' ? 1.3 : 1.1})` }} />

      {/* Main avatar circle */}
      <div 
        className={cn(
          'relative rounded-full bg-gradient-to-br shadow-lg transition-transform duration-200',
          sizeClasses[size],
          stateColors[state],
          state === 'thinking' && 'animate-pulse'
        )}
        style={{ transform: `scale(${pulseScale})` }}
      >
        {/* Face */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Eyes */}
          <div className="flex gap-2">
            <div className={cn(
              'rounded-full bg-white transition-all duration-200',
              size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4',
              state === 'speaking' && 'scale-110',
              state === 'listening' && 'animate-bounce'
            )} />
            <div className={cn(
              'rounded-full bg-white transition-all duration-200',
              size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4',
              state === 'speaking' && 'scale-110',
              state === 'listening' && 'animate-bounce'
            )} />
          </div>
        </div>

        {/* Mouth */}
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2">
          <div className={cn(
            'bg-white rounded-full transition-all duration-150',
            state === 'speaking' ? 'w-4 h-3 animate-pulse' : 'w-3 h-1',
            state === 'warning' && 'w-4 h-2 rounded-none'
          )} />
        </div>
      </div>

      {/* State indicator */}
      <div className={cn(
        'absolute -bottom-1 -right-1 rounded-full border-2 border-background',
        size === 'sm' ? 'w-3 h-3' : 'w-4 h-4',
        state === 'idle' && 'bg-gray-400',
        state === 'listening' && 'bg-blue-500 animate-pulse',
        state === 'speaking' && 'bg-green-500 animate-ping',
        state === 'warning' && 'bg-red-500 animate-pulse',
        state === 'thinking' && 'bg-purple-500 animate-spin'
      )} />
    </div>
  );
};

export default AnimatedAvatar;

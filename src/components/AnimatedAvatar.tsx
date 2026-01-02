import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AvatarState } from '@/services/ThaiTTSService';
import { motion } from 'framer-motion';

interface AnimatedAvatarProps {
  state: AvatarState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AnimatedAvatar = ({ state, size = 'md', className }: AnimatedAvatarProps) => {
  const [mouthOpen, setMouthOpen] = useState(0);
  const [eyeBlink, setEyeBlink] = useState(false);
  const animationRef = useRef<number>();

  // Mouth animation for speaking
  useEffect(() => {
    if (state === 'speaking') {
      const animateMouth = () => {
        setMouthOpen(Math.random() * 0.8 + 0.2); // Random mouth opening 0.2-1.0
        animationRef.current = requestAnimationFrame(() => {
          setTimeout(animateMouth, 100 + Math.random() * 100);
        });
      };
      animateMouth();
      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    } else {
      setMouthOpen(0);
    }
  }, [state]);

  // Eye blink animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyeBlink(true);
      setTimeout(() => setEyeBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  const sizeConfig = {
    sm: { container: 'w-10 h-10', eye: 6, eyeGap: 8, mouth: 10, ring: 48 },
    md: { container: 'w-16 h-16', eye: 8, eyeGap: 12, mouth: 14, ring: 72 },
    lg: { container: 'w-24 h-24', eye: 12, eyeGap: 18, mouth: 20, ring: 104 },
  };

  const config = sizeConfig[size];

  const stateColors = {
    idle: { bg: 'from-primary/80 to-primary', glow: 'hsl(var(--primary) / 0.3)' },
    listening: { bg: 'from-blue-400 to-blue-600', glow: 'rgba(59, 130, 246, 0.4)' },
    speaking: { bg: 'from-emerald-400 to-emerald-600', glow: 'rgba(16, 185, 129, 0.5)' },
    warning: { bg: 'from-orange-400 to-red-500', glow: 'rgba(239, 68, 68, 0.4)' },
    thinking: { bg: 'from-violet-400 to-violet-600', glow: 'rgba(139, 92, 246, 0.4)' },
  };

  const colors = stateColors[state];

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Animated glow rings */}
      {state === 'speaking' && (
        <>
          <motion.div
            className="absolute rounded-full bg-emerald-400/30"
            style={{ width: config.ring, height: config.ring }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute rounded-full bg-emerald-400/20"
            style={{ width: config.ring, height: config.ring }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
          />
        </>
      )}

      {state === 'listening' && (
        <motion.div
          className="absolute rounded-full border-2 border-blue-400/50"
          style={{ width: config.ring, height: config.ring }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.3, 0.8] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      {state === 'thinking' && (
        <motion.div
          className="absolute rounded-full border-2 border-violet-400/50 border-dashed"
          style={{ width: config.ring, height: config.ring }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Main avatar */}
      <motion.div
        className={cn(
          'relative rounded-full bg-gradient-to-br shadow-xl flex items-center justify-center',
          config.container,
          colors.bg
        )}
        style={{ boxShadow: `0 0 20px ${colors.glow}` }}
        animate={
          state === 'speaking'
            ? { scale: [1, 1.05, 1] }
            : state === 'thinking'
            ? { scale: [1, 0.95, 1] }
            : {}
        }
        transition={{ duration: 0.3, repeat: state === 'speaking' || state === 'thinking' ? Infinity : 0 }}
      >
        {/* Face container */}
        <div className="flex flex-col items-center justify-center gap-1">
          {/* Eyes */}
          <div className="flex items-center" style={{ gap: config.eyeGap }}>
            <motion.div
              className="bg-white rounded-full"
              style={{ width: config.eye, height: eyeBlink ? 2 : config.eye }}
              animate={state === 'listening' ? { y: [0, -2, 0] } : {}}
              transition={{ duration: 0.5, repeat: state === 'listening' ? Infinity : 0 }}
            />
            <motion.div
              className="bg-white rounded-full"
              style={{ width: config.eye, height: eyeBlink ? 2 : config.eye }}
              animate={state === 'listening' ? { y: [0, -2, 0] } : {}}
              transition={{ duration: 0.5, repeat: state === 'listening' ? Infinity : 0, delay: 0.1 }}
            />
          </div>

          {/* Mouth */}
          <motion.div
            className="bg-white/90 rounded-full"
            style={{
              width: config.mouth,
              height: state === 'speaking' ? Math.max(4, mouthOpen * config.mouth * 0.6) : 3,
              borderRadius: state === 'speaking' ? '50%' : '999px',
            }}
          />
        </div>

        {/* Sound waves when speaking */}
        {state === 'speaking' && (
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="bg-white/80 rounded-full"
                style={{ width: 2, height: 6 }}
                animate={{ scaleY: [0.5, 1.5, 0.5], opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Status indicator */}
      <motion.div
        className={cn(
          'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background',
          size === 'sm' ? 'w-3 h-3' : 'w-4 h-4',
          state === 'idle' && 'bg-muted-foreground/50',
          state === 'listening' && 'bg-blue-500',
          state === 'speaking' && 'bg-emerald-500',
          state === 'warning' && 'bg-red-500',
          state === 'thinking' && 'bg-violet-500'
        )}
        animate={
          state === 'speaking'
            ? { scale: [1, 1.3, 1] }
            : state === 'listening'
            ? { scale: [1, 1.2, 1] }
            : state === 'thinking'
            ? { rotate: 360 }
            : {}
        }
        transition={{
          duration: state === 'thinking' ? 1 : 0.5,
          repeat: Infinity,
          ease: state === 'thinking' ? 'linear' : 'easeInOut',
        }}
      />
    </div>
  );
};

export default AnimatedAvatar;

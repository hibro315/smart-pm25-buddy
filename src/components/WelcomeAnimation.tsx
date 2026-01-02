import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sparkles, Heart, Shield, Check } from 'lucide-react';

interface WelcomeAnimationProps {
  show: boolean;
  userName?: string;
  onComplete: () => void;
}

export const WelcomeAnimation = ({ show, userName, onComplete }: WelcomeAnimationProps) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (show) {
      setStage(0);
      const timers = [
        setTimeout(() => setStage(1), 500),
        setTimeout(() => setStage(2), 1500),
        setTimeout(() => setStage(3), 2500),
        setTimeout(() => {
          setStage(4);
          setTimeout(onComplete, 800);
        }, 3500),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      >
        {/* Ambient Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 3, opacity: 0.3 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-primary/30 via-primary/10 to-transparent rounded-full"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 2.5, opacity: 0.2 }}
            transition={{ duration: 2.5, delay: 0.3, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-radial from-accent/30 via-accent/10 to-transparent rounded-full"
          />
          
          {/* Floating particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                opacity: 0,
                y: Math.random() * 100 + 50,
                x: Math.random() * window.innerWidth,
              }}
              animate={{ 
                opacity: [0, 1, 0],
                y: -100,
              }}
              transition={{ 
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                ease: 'easeOut'
              }}
              className="absolute w-1 h-1 bg-primary/50 rounded-full"
              style={{ left: `${Math.random() * 100}%` }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center px-6 max-w-md">
          {/* Stage 0: Initial icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: stage >= 0 ? 1 : 0, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mb-8 inline-block"
          >
            <div className="relative">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-primary/30 blur-2xl rounded-full"
              />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center shadow-glow-primary">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-primary-foreground/20"
                />
                {stage < 3 ? (
                  <Heart className="w-12 h-12 text-primary-foreground" />
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Check className="w-12 h-12 text-primary-foreground" />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stage 1: Welcome text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: stage >= 1 ? 1 : 0, y: stage >= 1 ? 0 : 20 }}
            transition={{ duration: 0.5 }}
            className="space-y-3"
          >
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              ยินดีต้อนรับ
            </h1>
            {userName && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: stage >= 1 ? 1 : 0 }}
                className="text-xl text-foreground font-medium"
              >
                {userName}
              </motion.p>
            )}
          </motion.div>

          {/* Stage 2: Features list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? 0 : 20 }}
            transition={{ duration: 0.5 }}
            className="mt-8 space-y-4"
          >
            <p className="text-muted-foreground">
              โปรไฟล์สุขภาพของคุณพร้อมแล้ว
            </p>
            <div className="flex flex-col gap-3">
              {[
                { icon: Shield, text: 'การแจ้งเตือนแบบเฉพาะบุคคล', delay: 0 },
                { icon: Sparkles, text: 'คำแนะนำจาก AI ส่วนตัว', delay: 0.1 },
                { icon: Heart, text: 'ติดตามสุขภาพอัจฉริยะ', delay: 0.2 },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: stage >= 2 ? 1 : 0, x: stage >= 2 ? 0 : -20 }}
                  transition={{ duration: 0.4, delay: item.delay }}
                  className="flex items-center gap-3 justify-center"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Stage 3: Ready message */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: stage >= 3 ? 1 : 0, scale: stage >= 3 ? 1 : 0.9 }}
            transition={{ duration: 0.5 }}
            className="mt-8"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium shadow-glow-primary">
              <Sparkles className="w-5 h-5" />
              <span>กำลังเข้าสู่ระบบ...</span>
            </div>
          </motion.div>

          {/* Stage 4: Fade out */}
          {stage >= 4 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-background z-20"
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

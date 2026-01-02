import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  isActive: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  getInputVolume?: () => number;
  getOutputVolume?: () => number;
  barCount?: number;
  className?: string;
}

export const AudioWaveform = ({
  isActive,
  isSpeaking = false,
  isListening = false,
  getInputVolume,
  getOutputVolume,
  barCount = 32,
  className,
}: AudioWaveformProps) => {
  const [bars, setBars] = useState<number[]>(Array(barCount).fill(0.1));
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isActive) {
      setBars(Array(barCount).fill(0.1));
      return;
    }

    const animate = () => {
      let volume = 0;
      
      if (isSpeaking && getOutputVolume) {
        volume = getOutputVolume();
      } else if (isListening && getInputVolume) {
        volume = getInputVolume();
      }

      // Create organic waveform effect
      setBars((prev) =>
        prev.map((_, i) => {
          const baseHeight = 0.1;
          const maxHeight = 1;
          
          // Create wave pattern based on position
          const waveOffset = (Date.now() / 100 + i * 0.5) % (Math.PI * 2);
          const waveFactor = Math.sin(waveOffset) * 0.3 + 0.5;
          
          // Apply volume influence
          const volumeInfluence = volume * 0.8;
          
          // Add some randomness for organic feel
          const randomFactor = Math.random() * 0.2;
          
          // Calculate final height
          let height = baseHeight + (waveFactor + volumeInfluence + randomFactor) * (maxHeight - baseHeight);
          
          // Smooth transition
          const smoothing = 0.3;
          height = prev[i] + (height - prev[i]) * smoothing;
          
          return Math.min(Math.max(height, baseHeight), maxHeight);
        })
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, isSpeaking, isListening, getInputVolume, getOutputVolume, barCount]);

  // Simulate volume when no actual volume functions available
  useEffect(() => {
    if (!isActive) return;
    
    const hasVolumeFunctions = getInputVolume || getOutputVolume;
    if (hasVolumeFunctions) return;

    // Simulate organic waveform when voice functions aren't available
    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map((_, i) => {
          const baseHeight = 0.1;
          const time = Date.now() / 150;
          const waveOffset = (time + i * 0.4) % (Math.PI * 2);
          
          // Different wave patterns for speaking vs listening
          const amplitude = isSpeaking ? 0.7 : isListening ? 0.5 : 0.2;
          const frequency = isSpeaking ? 1.5 : 1;
          
          const wave1 = Math.sin(waveOffset * frequency) * amplitude;
          const wave2 = Math.sin(waveOffset * 2.3 + i * 0.2) * (amplitude * 0.4);
          const wave3 = Math.sin(waveOffset * 0.7 - i * 0.3) * (amplitude * 0.3);
          
          const combined = (wave1 + wave2 + wave3) / 3 + 0.5;
          const random = Math.random() * 0.1;
          
          let height = baseHeight + combined * (1 - baseHeight) + random;
          
          // Smooth transition
          height = prev[i] + (height - prev[i]) * 0.4;
          
          return Math.min(Math.max(height, baseHeight), 1);
        })
      );
    }, 50);

    return () => clearInterval(interval);
  }, [isActive, isSpeaking, isListening, getInputVolume, getOutputVolume]);

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-[2px] h-16",
        "transition-opacity duration-500",
        isActive ? "opacity-100" : "opacity-30",
        className
      )}
    >
      {bars.map((height, i) => {
        // Color gradient based on position and state
        const hue = isSpeaking 
          ? 180 + (i / barCount) * 40 // Cyan to teal
          : isListening
            ? 160 + (i / barCount) * 60 // Green to cyan  
            : 200; // Default blue
        
        const saturation = 70;
        const lightness = 55 + height * 15;

        return (
          <div
            key={i}
            className="rounded-full transition-all duration-75"
            style={{
              width: "3px",
              height: `${height * 100}%`,
              minHeight: "4px",
              backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
              boxShadow: isActive
                ? `0 0 ${4 + height * 8}px hsl(${hue}, ${saturation}%, ${lightness}%)`
                : "none",
            }}
          />
        );
      })}
    </div>
  );
};

// Circular waveform variant for the Health Orb
export const CircularWaveform = ({
  isActive,
  isSpeaking = false,
  isListening = false,
  size = 200,
  className,
}: {
  isActive: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  size?: number;
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = size * 0.3;
    const maxAmplitude = size * 0.08;
    const pointCount = 64;

    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      
      if (!isActive) {
        // Draw calm circle when inactive
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = "hsla(180, 50%, 60%, 0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      phase += isSpeaking ? 0.08 : isListening ? 0.05 : 0.02;

      // Draw multiple wave layers
      for (let layer = 0; layer < 3; layer++) {
        const layerPhase = phase + layer * 0.5;
        const layerAmplitude = maxAmplitude * (1 - layer * 0.25);
        const layerOpacity = 0.8 - layer * 0.2;
        
        ctx.beginPath();
        
        for (let i = 0; i <= pointCount; i++) {
          const angle = (i / pointCount) * Math.PI * 2;
          
          // Multiple wave frequencies for organic feel
          const wave1 = Math.sin(angle * 3 + layerPhase) * (isSpeaking ? 1 : 0.5);
          const wave2 = Math.sin(angle * 5 - layerPhase * 1.3) * 0.5;
          const wave3 = Math.sin(angle * 7 + layerPhase * 0.7) * 0.3;
          
          const amplitude = layerAmplitude * (1 + (wave1 + wave2 + wave3) / 3);
          const radius = baseRadius + amplitude;
          
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        
        // Color based on state
        const hue = isSpeaking ? 175 : isListening ? 160 : 190;
        ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${layerOpacity})`;
        ctx.lineWidth = 2 - layer * 0.5;
        ctx.stroke();
        
        // Add glow effect
        ctx.shadowColor = `hsla(${hue}, 70%, 60%, 0.5)`;
        ctx.shadowBlur = 10;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, isSpeaking, isListening, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={cn("pointer-events-none", className)}
    />
  );
};

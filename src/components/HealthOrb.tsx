import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type HealthState = "calm" | "alert" | "warning" | "emergency";

interface HealthOrbProps {
  phri?: number;
  pm25?: number;
  isSpeaking?: boolean;
  isListening?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showRipple?: boolean;
  onClick?: () => void;
}

const getHealthState = (phri?: number, pm25?: number): HealthState => {
  if (phri !== undefined) {
    if (phri < 2.5) return "calm";
    if (phri < 5) return "alert";
    if (phri < 7.5) return "warning";
    return "emergency";
  }
  if (pm25 !== undefined) {
    if (pm25 <= 25) return "calm";
    if (pm25 <= 50) return "alert";
    if (pm25 <= 75) return "warning";
    return "emergency";
  }
  return "calm";
};

const sizeClasses = {
  sm: "w-24 h-24",
  md: "w-32 h-32",
  lg: "w-48 h-48",
  xl: "w-64 h-64",
};

export const HealthOrb = ({
  phri,
  pm25,
  isSpeaking = false,
  isListening = false,
  className,
  size = "lg",
  showRipple = true,
  onClick,
}: HealthOrbProps) => {
  const [ripples, setRipples] = useState<number[]>([]);
  const healthState = getHealthState(phri, pm25);

  // Generate ripples periodically when speaking
  useEffect(() => {
    if (!isSpeaking || !showRipple) return;
    
    const interval = setInterval(() => {
      setRipples(prev => [...prev, Date.now()]);
    }, 800);

    return () => clearInterval(interval);
  }, [isSpeaking, showRipple]);

  // Clean up old ripples
  useEffect(() => {
    if (ripples.length === 0) return;
    
    const timeout = setTimeout(() => {
      setRipples(prev => prev.slice(1));
    }, 2000);

    return () => clearTimeout(timeout);
  }, [ripples]);

  const orbClass = {
    calm: "orb-calm",
    alert: "orb-alert",
    warning: "orb-warning",
    emergency: "orb-emergency",
  }[healthState];

  const glowClass = {
    calm: "shadow-glow-cyan",
    alert: "shadow-glow-warm",
    warning: "shadow-glow-warm",
    emergency: "shadow-glow-alert",
  }[healthState];

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Ambient glow background */}
      <div
        className={cn(
          "absolute rounded-full blur-3xl opacity-30 animate-glow-pulse",
          sizeClasses[size],
          healthState === "calm" && "bg-glow-cyan",
          healthState === "alert" && "bg-glow-warm",
          healthState === "warning" && "bg-glow-warm",
          healthState === "emergency" && "bg-destructive"
        )}
        style={{ transform: "scale(1.5)" }}
      />

      {/* Ripple effects when speaking */}
      {ripples.map((id) => (
        <div
          key={id}
          className={cn(
            "absolute rounded-full border-2 animate-ripple pointer-events-none",
            sizeClasses[size],
            healthState === "calm" && "border-glow-cyan/40",
            healthState === "alert" && "border-glow-warm/40",
            healthState === "warning" && "border-glow-warm/50",
            healthState === "emergency" && "border-destructive/50"
          )}
        />
      ))}

      {/* Main orb */}
      <button
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          "relative rounded-full transition-all duration-500",
          sizeClasses[size],
          orbClass,
          glowClass,
          isListening && "voice-listening",
          onClick && "cursor-pointer hover:scale-105 focus-soft",
          !onClick && "cursor-default"
        )}
      >
        {/* Inner highlight */}
        <div
          className="absolute inset-4 rounded-full bg-white/20 blur-sm"
          style={{ borderRadius: "inherit" }}
        />

        {/* Voice visualization bars when speaking */}
        {isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-white/60 rounded-full voice-bar"
                style={{
                  height: "30%",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Center dot when listening */}
        {isListening && !isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-white/80 rounded-full animate-pulse" />
          </div>
        )}
      </button>

      {/* Outer ring for interaction feedback */}
      {(isListening || isSpeaking) && (
        <div
          className={cn(
            "absolute rounded-full border border-white/20 pointer-events-none",
            sizeClasses[size],
            "animate-pulse"
          )}
          style={{ transform: "scale(1.15)" }}
        />
      )}
    </div>
  );
};

import { useEffect, useState } from "react";
import { HealthOrb } from "./HealthOrb";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Volume2 } from "lucide-react";

interface AwarenessPortalProps {
  pm25?: number;
  aqi?: number;
  phri?: number;
  location?: string;
  isConnected?: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  onStartVoice?: () => void;
  onStopVoice?: () => void;
  className?: string;
}

const getAirFeeling = (pm25?: number): string => {
  if (pm25 === undefined) return "กำลังรับรู้สภาพอากาศ...";
  if (pm25 <= 15) return "อากาศสะอาดบริสุทธิ์";
  if (pm25 <= 25) return "อากาศดี";
  if (pm25 <= 37.5) return "อากาศปานกลาง";
  if (pm25 <= 50) return "เริ่มมีมลพิษ";
  if (pm25 <= 75) return "มลพิษสูง";
  return "อากาศไม่ดีต่อสุขภาพ";
};

const getHealthMessage = (phri?: number): string => {
  if (phri === undefined) return "";
  if (phri < 2.5) return "ร่างกายคุณปลอดภัย";
  if (phri < 5) return "ควรระวังเล็กน้อย";
  if (phri < 7.5) return "ความเสี่ยงปานกลาง";
  return "ต้องการการดูแลเป็นพิเศษ";
};

export const AwarenessPortal = ({
  pm25,
  aqi,
  phri,
  location,
  isConnected = false,
  isSpeaking = false,
  isListening = false,
  onStartVoice,
  onStopVoice,
  className,
}: AwarenessPortalProps) => {
  const [showDetails, setShowDetails] = useState(false);

  // Gradually reveal details
  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const airFeeling = getAirFeeling(pm25);
  const healthMessage = getHealthMessage(phri);

  const handleOrbClick = () => {
    if (isConnected) {
      onStopVoice?.();
    } else {
      onStartVoice?.();
    }
  };

  return (
    <div
      className={cn(
        "relative min-h-[70vh] flex flex-col items-center justify-center",
        "bg-ambient overflow-hidden",
        className
      )}
    >
      {/* Floating ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-32 h-32 rounded-full bg-glow-pale/10 blur-2xl animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${8 + i * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        {/* Status text - appears first */}
        <div className="text-center space-y-2 animate-fade-in">
          <p className="text-sm text-muted-foreground font-medium tracking-wide uppercase">
            {isListening ? "กำลังฟัง..." : isSpeaking ? "กำลังพูด..." : "Smart PM2.5"}
          </p>
        </div>

        {/* Health Orb - central element */}
        <HealthOrb
          phri={phri}
          pm25={pm25}
          isSpeaking={isSpeaking}
          isListening={isListening}
          size="xl"
          onClick={handleOrbClick}
          className="animate-scale-in"
        />

        {/* Air feeling text - no numbers initially */}
        <div 
          className={cn(
            "text-center space-y-3 transition-opacity duration-1000",
            "animate-fade-in"
          )}
          style={{ animationDelay: "0.5s" }}
        >
          <h2 className="text-2xl font-display font-medium text-foreground">
            {airFeeling}
          </h2>
          {healthMessage && (
            <p className="text-muted-foreground">
              {healthMessage}
            </p>
          )}
        </div>

        {/* Detailed metrics - appear after delay */}
        {showDetails && pm25 !== undefined && (
          <div 
            className={cn(
              "flex items-center gap-6 mt-4 animate-fade-in",
              "glass-card px-6 py-3"
            )}
          >
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">PM2.5</p>
              <p className="text-lg font-display font-semibold text-foreground">
                {pm25.toFixed(0)}
              </p>
            </div>
            {aqi !== undefined && (
              <>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">AQI</p>
                  <p className="text-lg font-display font-semibold text-foreground">
                    {aqi}
                  </p>
                </div>
              </>
            )}
            {phri !== undefined && (
              <>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">ความเสี่ยง</p>
                  <p className="text-lg font-display font-semibold text-foreground">
                    {phri.toFixed(1)}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Location */}
        {location && showDetails && (
          <p 
            className="text-sm text-muted-foreground animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            📍 {location}
          </p>
        )}

        {/* Voice control hint */}
        <div 
          className={cn(
            "flex items-center gap-2 text-sm text-muted-foreground",
            "animate-fade-in"
          )}
          style={{ animationDelay: "1s" }}
        >
          {isConnected ? (
            <>
              <Volume2 className="w-4 h-4 text-primary" />
              <span>แตะเพื่อหยุดการสนทนา</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>แตะเพื่อเริ่มพูดคุยกับที่ปรึกษาสุขภาพ</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

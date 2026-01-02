import { useConversation } from "@elevenlabs/react";
import { useState, useCallback } from "react";
import { AwarenessPortal } from "./AwarenessPortal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VoiceHealthInterfaceProps {
  pm25?: number;
  aqi?: number;
  phri?: number;
  temperature?: number;
  humidity?: number;
  location?: string;
}

// Hardcoded ElevenLabs Agent ID
const ELEVENLABS_AGENT_ID = "agent_0201kdyddt5jf9grj2n01htwpk70";

export const VoiceHealthInterface = ({
  pm25,
  aqi,
  phri,
  temperature,
  humidity,
  location,
}: VoiceHealthInterfaceProps) => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to health advisor");
      toast({
        title: "เชื่อมต่อสำเร็จ",
        description: "พร้อมให้คำปรึกษาแล้ว",
      });
    },
    onDisconnect: () => {
      console.log("Disconnected");
      setTranscript([]);
    },
    onMessage: (message) => {
      const msg = message as unknown as Record<string, unknown>;
      if (msg.type === "transcript" && typeof msg.text === "string") {
        setTranscript(prev => [...prev.slice(-4), msg.text as string]);
      }
    },
    onError: (error) => {
      console.error("Voice error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
      setIsConnecting(false);
    },
  });

  const buildContextMessage = useCallback(() => {
    const parts = ["สวัสดีครับ ยินดีให้คำปรึกษาด้านสุขภาพ"];
    
    if (pm25 !== undefined) {
      const riskLevel = pm25 > 75 ? "สูง" : pm25 > 35 ? "ปานกลาง" : "ต่ำ";
      parts.push(`ค่าฝุ่นตอนนี้ ${pm25.toFixed(0)} ไมโครกรัม ความเสี่ยง${riskLevel}`);
    }
    
    if (location) {
      parts.push(`ที่${location}`);
    }
    
    parts.push("มีอะไรให้ช่วยไหมครับ");
    
    return parts.join(" ");
  }, [pm25, location]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-conversation-token",
        { body: { agentId: ELEVENLABS_AGENT_ID } }
      );

      if (error || !data?.token) {
        throw new Error(error?.message || "ไม่ได้รับ token");
      }

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
        overrides: {
          agent: {
            firstMessage: buildContextMessage(),
          }
        }
      });

    } catch (error) {
      console.error("Failed to start:", error);
      toast({
        title: "ไม่สามารถเริ่มการสนทนาได้",
        description: error instanceof Error ? error.message : "กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, buildContextMessage, toast]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isConnected = conversation.status === "connected";

  return (
    <div className="relative min-h-screen bg-ambient">
      {/* Main portal */}
      <AwarenessPortal
        pm25={pm25}
        aqi={aqi}
        phri={phri}
        location={location}
        isConnected={isConnected}
        isSpeaking={conversation.isSpeaking}
        isListening={isConnected && !conversation.isSpeaking}
        onStartVoice={startConversation}
        onStopVoice={stopConversation}
      />

      {/* Transcript overlay */}
      {isConnected && transcript.length > 0 && (
        <div className="absolute bottom-24 left-0 right-0 px-6">
          <div className="glass-card p-4 max-w-md mx-auto animate-fade-in">
            <div className="space-y-2">
              {transcript.map((text, i) => (
                <p 
                  key={i} 
                  className={cn(
                    "text-sm transition-opacity",
                    i === transcript.length - 1 
                      ? "text-foreground" 
                      : "text-muted-foreground opacity-60"
                  )}
                >
                  {text}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connection status */}
      {isConnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-30">
          <div className="glass-card p-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-foreground">กำลังเชื่อมต่อ...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
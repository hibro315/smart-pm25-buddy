import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useEffect } from "react";
import { AwarenessPortal } from "./AwarenessPortal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VoiceHealthInterfaceProps {
  pm25?: number;
  aqi?: number;
  phri?: number;
  temperature?: number;
  humidity?: number;
  location?: string;
}

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
  const [showSettings, setShowSettings] = useState(false);
  const [agentId, setAgentId] = useState(() => 
    localStorage.getItem("elevenlabs_agent_id") || ""
  );

  // Save agent ID to localStorage
  useEffect(() => {
    if (agentId) {
      localStorage.setItem("elevenlabs_agent_id", agentId);
    }
  }, [agentId]);

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
    if (!agentId.trim()) {
      setShowSettings(true);
      toast({
        title: "ต้องการ Agent ID",
        description: "กรุณาตั้งค่า ElevenLabs Agent ID ก่อน",
      });
      return;
    }

    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-conversation-token",
        { body: { agentId: agentId.trim() } }
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
  }, [conversation, agentId, buildContextMessage, toast]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isConnected = conversation.status === "connected";

  return (
    <div className="relative min-h-screen bg-ambient">
      {/* Settings button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className={cn(
          "absolute top-4 right-4 z-20 p-3 rounded-full",
          "glass-card hover-lift"
        )}
      >
        <Settings className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 z-20 w-80 animate-fade-in">
          <div className="glass-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-medium">ตั้งค่า Voice AI</h3>
              <button onClick={() => setShowSettings(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                ElevenLabs Agent ID
              </label>
              <Input
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="ใส่ Agent ID"
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                สร้าง Agent ได้ที่{" "}
                <a 
                  href="https://elevenlabs.io/app/conversational-ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  ElevenLabs Console
                </a>
              </p>
            </div>

            <Button 
              onClick={() => setShowSettings(false)}
              className="w-full"
              disabled={!agentId.trim()}
            >
              บันทึก
            </Button>
          </div>
        </div>
      )}

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

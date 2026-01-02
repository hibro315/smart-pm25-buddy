import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Activity, Heart, Wind } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VoiceHealthAgentProps {
  pm25?: number;
  aqi?: number;
  temperature?: number;
  humidity?: number;
  location?: string;
  onClose?: () => void;
}

export const VoiceHealthAgent = ({
  pm25,
  aqi,
  temperature,
  humidity,
  location,
  onClose
}: VoiceHealthAgentProps) => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [agentId, setAgentId] = useState<string>("");

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs agent");
      toast({
        title: "เชื่อมต่อสำเร็จ",
        description: "พร้อมให้คำปรึกษาด้านสุขภาพแล้ว",
      });
    },
    onDisconnect: () => {
      console.log("Disconnected from agent");
      setTranscript([]);
    },
    onMessage: (message) => {
      console.log("Message:", message);
      // Handle transcript from message payload
      const msg = message as unknown as Record<string, unknown>;
      if (msg.type === "transcript" && typeof msg.text === "string") {
        setTranscript(prev => [...prev, msg.text as string]);
      }
    },
    onError: (error) => {
      console.error("Voice agent error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่",
        variant: "destructive",
      });
      setIsConnecting(false);
    },
  });

  const startConversation = useCallback(async () => {
    if (!agentId.trim()) {
      toast({
        title: "กรุณาใส่ Agent ID",
        description: "ต้องการ ElevenLabs Agent ID เพื่อเริ่มการสนทนา",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get token from edge function
      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-conversation-token",
        { body: { agentId: agentId.trim() } }
      );

      if (error || !data?.token) {
        throw new Error(error?.message || "No token received");
      }

      // Build context message for the agent
      const contextMessage = buildContextMessage();

      // Start the conversation with WebRTC
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
        overrides: {
          agent: {
            firstMessage: contextMessage,
          }
        }
      });

    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast({
        title: "ไม่สามารถเริ่มการสนทนาได้",
        description: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, agentId, toast]);

  const buildContextMessage = () => {
    const parts = ["สวัสดีครับ ยินดีให้คำปรึกษาด้านสุขภาพ"];
    
    if (pm25 !== undefined) {
      const riskLevel = pm25 > 75 ? "สูง" : pm25 > 35 ? "ปานกลาง" : "ต่ำ";
      parts.push(`ค่า PM2.5 ตอนนี้อยู่ที่ ${pm25} ไมโครกรัมต่อลูกบาศก์เมตร ความเสี่ยง${riskLevel}`);
    }
    
    if (location) {
      parts.push(`ที่${location}`);
    }
    
    parts.push("มีอะไรให้ช่วยไหมครับ");
    
    return parts.join(" ");
  };

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    // Note: ElevenLabs SDK handles muting internally
  }, [isMuted]);

  const getAqiColor = () => {
    if (!aqi) return "bg-muted";
    if (aqi <= 50) return "bg-green-500";
    if (aqi <= 100) return "bg-yellow-500";
    if (aqi <= 150) return "bg-orange-500";
    return "bg-red-500";
  };

  const getRiskBadge = () => {
    if (!pm25) return null;
    if (pm25 > 75) return <Badge variant="destructive">ความเสี่ยงสูง</Badge>;
    if (pm25 > 35) return <Badge className="bg-orange-500">ความเสี่ยงปานกลาง</Badge>;
    return <Badge className="bg-green-500">ความเสี่ยงต่ำ</Badge>;
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur-sm border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Voice Health Consultant
          </CardTitle>
          {getRiskBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Environmental Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {pm25 !== undefined && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Wind className="w-4 h-4 text-muted-foreground" />
              <span>PM2.5: {pm25} µg/m³</span>
            </div>
          )}
          {aqi !== undefined && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <div className={`w-3 h-3 rounded-full ${getAqiColor()}`} />
              <span>AQI: {aqi}</span>
            </div>
          )}
          {temperature !== undefined && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Heart className="w-4 h-4 text-muted-foreground" />
              <span>{temperature}°C</span>
            </div>
          )}
          {humidity !== undefined && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">💧</span>
              <span>{humidity}%</span>
            </div>
          )}
        </div>

        {/* Agent ID Input */}
        {conversation.status === "disconnected" && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              ElevenLabs Agent ID
            </label>
            <input
              type="text"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="ใส่ Agent ID ของคุณ"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            />
            <p className="text-xs text-muted-foreground">
              สร้าง Agent ได้ที่ <a href="https://elevenlabs.io/app/conversational-ai" target="_blank" rel="noopener noreferrer" className="text-primary underline">ElevenLabs Console</a>
            </p>
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 py-3">
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
            conversation.status === "connected" 
              ? conversation.isSpeaking 
                ? "bg-green-500 animate-pulse" 
                : "bg-blue-500"
              : "bg-muted"
          }`} />
          <span className="text-sm text-muted-foreground">
            {conversation.status === "connected"
              ? conversation.isSpeaking
                ? "กำลังพูด..."
                : "กำลังฟัง..."
              : "ไม่ได้เชื่อมต่อ"}
          </span>
        </div>

        {/* Transcript Display */}
        {transcript.length > 0 && (
          <div className="max-h-32 overflow-y-auto p-3 rounded-lg bg-muted/30 text-sm space-y-1">
            {transcript.slice(-5).map((text, i) => (
              <p key={i} className="text-muted-foreground">{text}</p>
            ))}
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-3">
          {conversation.status === "disconnected" ? (
            <Button
              onClick={startConversation}
              disabled={isConnecting || !agentId.trim()}
              size="lg"
              className="gap-2"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังเชื่อมต่อ...
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5" />
                  เริ่มการสนทนา
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
                className="h-12 w-12 rounded-full"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
              
              <Button
                variant="destructive"
                size="lg"
                onClick={stopConversation}
                className="gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                จบการสนทนา
              </Button>
            </>
          )}
        </div>

        {/* Tips */}
        <div className="text-xs text-center text-muted-foreground">
          {conversation.status === "connected" 
            ? "พูดได้เลยครับ ระบบจะฟังและตอบอัตโนมัติ"
            : "กดเริ่มการสนทนาเพื่อขอคำปรึกษาด้านสุขภาพ"}
        </div>
      </CardContent>
    </Card>
  );
};

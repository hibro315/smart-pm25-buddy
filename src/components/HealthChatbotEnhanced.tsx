import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Mic, MicOff, Volume2, VolumeX, Bot, User, Stethoscope, Heart, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface HealthChatbotEnhancedProps {
  pm25?: number;
  aqi?: number;
  temperature?: number;
  humidity?: number;
  location?: string;
}

export const HealthChatbotEnhanced = ({ 
  pm25, 
  aqi,
  temperature, 
  humidity,
  location 
}: HealthChatbotEnhancedProps) => {
  const { profile } = useHealthProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'th-TH';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "ข้อผิดพลาด",
          description: "ไม่สามารถรับฟังเสียงได้ กรุณาลองใหม่",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `สวัสดีค่ะ ฉันคือผู้ช่วยด้านสุขภาพที่พร้อมให้คำปรึกษาเกี่ยวกับผลกระทบของมลพิษทางอากาศต่อสุขภาพ\n\n📊 ข้อมูลปัจจุบัน:\n- PM2.5: ${pm25 || 'N/A'} µg/m³\n- AQI: ${aqi || 'N/A'}\n- อุณหภูมิ: ${temperature || 'N/A'}°C\n- ความชื้น: ${humidity || 'N/A'}%\n\nคุณสามารถถามเกี่ยวกับ:\n✅ อาการและผลกระทบต่อสุขภาพ\n✅ การป้องกันและดูแลตนเอง\n✅ คำแนะนำสำหรับผู้ป่วยโรคเรื้อรัง\n✅ การออกกำลังกายในช่วงฝุ่นสูง\n✅ โภชนาการที่เหมาะสม`,
        timestamp: new Date().toISOString(),
      }]);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "ไม่รองรับ",
        description: "เบราว์เซอร์นี้ไม่รองรับการรับฟังเสียง",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      role: "user", 
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      // Get current session and verify user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast({
          title: "กรุณาเข้าสู่ระบบ",
          description: "คุณต้องเข้าสู่ระบบก่อนใช้งานแชทบอท",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Verify the user is still valid
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          title: "เซสชันหมดอายุ",
          description: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Include user health profile in context
      const contextInfo = profile ? `\n\nข้อมูลสุขภาพผู้ใช้:\n- อายุ: ${profile.age} ปี\n- เพศ: ${profile.gender}\n- โรคประจำตัว: ${profile.chronicConditions.length > 0 ? profile.chronicConditions.join(', ') : 'ไม่มี'}\n- ความไวต่อฝุ่น: ${profile.dustSensitivity}\n- กิจกรรมทางกาย: ${profile.physicalActivity}` : '';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: "user", content: userMessage.content + contextInfo }
            ],
            sessionId,
            saveHistory: true,
            pm25,
            aqi,
            temperature,
            humidity,
            location,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}));
          toast({
            title: "กรุณาเข้าสู่ระบบใหม่",
            description: errorData.error || "เซสชันของคุณหมดอายุแล้ว",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        if (response.status === 429) {
          toast({
            title: "ใช้งานเกินกำหนด",
            description: "กรุณาลองใหม่อีกครั้งภายหลัง",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        if (!response.body) {
          throw new Error("Failed to start stream");
        }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      const updateAssistantMessage = (content: string) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
          }
          return [...prev, { 
            role: "assistant", 
            content,
            timestamp: new Date().toISOString(),
          }];
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              updateAssistantMessage(assistantContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Speak the response
      if (assistantContent) {
        speak(assistantContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถส่งข้อความได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPM25Status = () => {
    if (!pm25) return { text: "ไม่ทราบ", color: "bg-gray-500" };
    if (pm25 > 75) return { text: "อันตราย", color: "bg-red-500" };
    if (pm25 > 37) return { text: "ไม่ดี", color: "bg-orange-500" };
    if (pm25 > 12) return { text: "ปานกลาง", color: "bg-yellow-500" };
    return { text: "ดี", color: "bg-green-500" };
  };

  const pm25Status = getPM25Status();

  return (
    <Card className="flex flex-col h-[600px] bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 border-b bg-background/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Stethoscope className="h-6 w-6 text-primary" />
              <Heart className="h-3 w-3 text-destructive absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold">ที่ปรึกษาสุขภาพ AI</h3>
              <p className="text-xs text-muted-foreground">ผู้เชี่ยวชาญด้านสุขภาพและมลพิษ</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={isSpeaking ? stopSpeaking : undefined}
              disabled={!isSpeaking}
            >
              {isSpeaking ? (
                <VolumeX className="h-4 w-4 text-destructive animate-pulse" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Environmental Status Bar */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          <Badge className={`${pm25Status.color} text-white text-xs justify-center`}>
            PM2.5: {pm25 || 'N/A'}
          </Badge>
          <Badge variant="outline" className="text-xs justify-center">
            AQI: {aqi || 'N/A'}
          </Badge>
          <Badge variant="outline" className="text-xs justify-center">
            {temperature || 'N/A'}°C
          </Badge>
          <Badge variant="outline" className="text-xs justify-center">
            {humidity || 'N/A'}% RH
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                    <Activity className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              )}
              <div className="max-w-[80%]">
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted rounded-tl-none"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
                {message.timestamp && (
                  <p className="text-xs text-muted-foreground mt-1 px-2">
                    {new Date(message.timestamp).toLocaleTimeString('th-TH', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                )}
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center shadow-lg">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                  <Activity className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
              <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-muted">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
        <div className="flex gap-2 mb-2">
          <Button
            size="icon"
            variant={isListening ? "destructive" : "outline"}
            onClick={toggleListening}
            disabled={isLoading}
            className="shadow-sm"
          >
            {isListening ? (
              <MicOff className="h-4 w-4 animate-pulse" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder={isListening ? "กำลังฟัง..." : "ถามเกี่ยวกับสุขภาพและมลพิษ..."}
            disabled={isLoading || isListening}
            className="flex-1 shadow-sm"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
            className="shadow-sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          💡 ลองถามเช่น "PM2.5 สูงมีผลกระทบต่อสุขภาพอย่างไร" หรือ "ผู้ป่วยหอบหืดควรดูแลตัวเองอย่างไร"
        </p>
      </div>
    </Card>
  );
};

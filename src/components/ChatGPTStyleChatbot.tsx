import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Send, Mic, MicOff, Volume2, VolumeX, 
  Sparkles, TrendingUp, Satellite, RefreshCw 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ChatGPTStyleChatbotProps {
  pm25?: number;
  aqi?: number;
  temperature?: number;
  humidity?: number;
  location?: string;
}

export const ChatGPTStyleChatbot = ({ 
  pm25, 
  aqi,
  temperature, 
  humidity,
  location,
}: ChatGPTStyleChatbotProps) => {
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

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
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
      const { data: { session } } = await supabase.auth.refreshSession();
      
      if (!session?.access_token) {
        toast({
          title: "กรุณาเข้าสู่ระบบใหม่",
          variant: "destructive",
        });
        setIsLoading(false);
        window.location.href = '/auth';
        return;
      }

      const contextInfo = profile ? `\n\nข้อมูลสุขภาพ: อายุ ${profile.age} ปี, ${profile.gender}, โรคประจำตัว: ${profile.chronicConditions.length > 0 ? profile.chronicConditions.join(', ') : 'ไม่มี'}` : '';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
            analyzePHRI: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const updateAssistantMessage = (content: string) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
          }
          return [...prev, { role: "assistant", content, timestamp: new Date().toISOString() }];
        });
      };

      while (true) {
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
          if (jsonStr === "[DONE]") break;

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

      // After streaming, speak the response
      if (assistantContent) {
        speak(assistantContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถส่งข้อความได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'emergency': return 'bg-red-500';
      case 'urgent': return 'bg-orange-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const suggestedPrompts = [
    "วันนี้ควรออกกำลังกายไหม?",
    "อาการไอ คัดจมูก ควรทำอย่างไร?",
    "ค่า PM2.5 สูง ส่งผลอย่างไร?",
  ];

  return (
    <div className="flex flex-col h-[70vh] max-h-[600px] bg-background rounded-xl border shadow-sm overflow-hidden">
      {/* Compact Header */}
      <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Health AI</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs py-0">
            PM2.5: {pm25 || '-'}
          </Badge>
          <Badge variant="outline" className="text-xs py-0">
            AQI: {aqi || '-'}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={isSpeaking ? stopSpeaking : undefined}
            disabled={!isSpeaking}
          >
            {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Sparkles className="h-8 w-8 text-primary/50 mb-3" />
            <h3 className="text-sm font-medium mb-2">สวัสดีค่ะ พร้อมช่วยเหลือคุณ</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              ถามเกี่ยวกับสุขภาพ มลพิษอากาศ หรือคำแนะนำในการดูแลตัวเอง
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedPrompts.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setInput(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className="max-w-[85%] space-y-1">
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted rounded-tl-sm"
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                  
                  {message.timestamp && (
                    <p className="text-[10px] text-muted-foreground px-1">
                      {new Date(message.timestamp).toLocaleTimeString('th-TH', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 border-t bg-background">
        <div className="flex gap-2">
          <Button
            size="icon"
            variant={isListening ? "destructive" : "outline"}
            className="h-9 w-9 flex-shrink-0"
            onClick={toggleListening}
            disabled={isLoading}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder={isListening ? "กำลังฟัง..." : "พิมพ์ข้อความ..."}
            disabled={isLoading || isListening}
            className="flex-1 h-9 text-sm"
          />
          <Button 
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Send, Mic, MicOff, Volume2, VolumeX, 
  Sparkles, Settings2, AlertTriangle,
  Play, Square, Heart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AnimatedAvatar } from "@/components/AnimatedAvatar";
import { thaiTTSService, AvatarState, TTSState } from "@/services/ThaiTTSService";
import { evaluateAQI, evaluatePM25, getDiseaseCategory } from "@/utils/aqiThresholds";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  followUpQuestions?: string[];
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
  location,
}: HealthChatbotEnhancedProps) => {
  const { profile } = useHealthProfile();
  const { language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Get disease-specific AQI evaluation
  const diseaseCategory = getDiseaseCategory(profile?.chronicConditions || []);
  const aqiEvaluation = aqi !== undefined ? evaluateAQI(aqi, diseaseCategory, language as 'en' | 'th') : null;
  const pm25Evaluation = pm25 !== undefined ? evaluatePM25(pm25, diseaseCategory) : null;
  const isSensitiveGroup = diseaseCategory !== 'general';
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // TTS & Avatar State
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [ttsState, setTtsState] = useState<TTSState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [currentHighlight, setCurrentHighlight] = useState<string>("");

  // Initialize TTS service
  useEffect(() => {
    thaiTTSService.setCallbacks({
      onStateChange: setTtsState,
      onAvatarStateChange: setAvatarState,
      onProgress: (_, __, text) => setCurrentHighlight(text),
      onEnd: () => setCurrentHighlight(""),
      onError: (error) => {
        console.error('TTS Error:', error);
        toast({
          title: "ไม่สามารถเล่นเสียงได้",
          description: "กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
      }
    });

    return () => {
      thaiTTSService.stop();
    };
  }, [toast]);

  // Speech recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'th-TH';

      recognitionRef.current.onstart = () => {
        setAvatarState('listening');
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        setAvatarState('idle');
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        setAvatarState('idle');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setAvatarState('idle');
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "ไม่รองรับการฟังเสียง",
        description: "เบราว์เซอร์ของคุณไม่รองรับการรับรู้เสียง",
        variant: "destructive",
      });
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setAvatarState('idle');
    } else {
      thaiTTSService.stop(); // Stop any ongoing speech
      recognitionRef.current.start();
      setIsListening(true);
      setAvatarState('listening');
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    thaiTTSService.setMuted(newMuted);
    if (newMuted) {
      setAvatarState('idle');
    }
  };

  const handleSpeechRateChange = (value: number[]) => {
    const rate = value[0];
    setSpeechRate(rate);
    thaiTTSService.setRate(rate);
  };

  const speakText = useCallback(async (text: string) => {
    if (isMuted) return;
    setAvatarState('thinking');
    await thaiTTSService.speak(text);
  }, [isMuted]);

  const stopSpeaking = () => {
    thaiTTSService.stop();
    setAvatarState('idle');
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
    setAvatarState('thinking');

    let assistantContent = "";

    try {
      const { data: { session } } = await supabase.auth.refreshSession();
      
      if (!session?.access_token) {
        toast({
          title: "กรุณาเข้าสู่ระบบใหม่",
          variant: "destructive",
        });
        setIsLoading(false);
        setAvatarState('idle');
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
            // Check for follow-up questions
            if (parsed.type === 'follow_up_questions' && parsed.questions) {
              setFollowUpQuestions(parsed.questions);
              continue;
            }
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

      // Speak the response after streaming
      if (assistantContent && !isMuted) {
        await speakText(assistantContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setAvatarState('warning');
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถส่งข้อความได้",
        variant: "destructive",
      });
      setTimeout(() => setAvatarState('idle'), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  // Using disease-specific AQI evaluation from utility

  const suggestedPrompts = [
    "วันนี้ฝุ่นสูงไหม? ผมควรระวังอะไรบ้าง",
    "มีอาการไอ คัดจมูก ควรทำยังไงดี",
    "ช่วยวางแผนการออกกำลังกายวันนี้ให้หน่อย",
    "แนะนำวิธีป้องกันฝุ่นสำหรับคนเป็นหอบหืด",
  ];

  return (
    <div className="flex flex-col h-[75vh] max-h-[650px] bg-background rounded-xl border shadow-lg overflow-hidden">
      {/* Header with Avatar */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-blue-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AnimatedAvatar state={avatarState} size="sm" />
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Smart PM2.5 Buddy
              </h3>
              <p className="text-xs text-muted-foreground">
                {ttsState === 'speaking' ? 'กำลังพูด...' : 
                 isListening ? 'กำลังฟัง...' : 
                 isLoading ? 'กำลังคิด...' : 'พร้อมช่วยเหลือ'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AQI Badge - Disease-specific */}
            {aqiEvaluation && (
              <Badge 
                variant="outline" 
                className={cn("text-xs gap-1", aqiEvaluation.color)}
              >
                {isSensitiveGroup && <Heart className="h-3 w-3" />}
                {aqiEvaluation.level !== 'good' && aqiEvaluation.level !== 'moderate' && (
                  <AlertTriangle className="h-3 w-3" />
                )}
                AQI: {aqi || '-'}
              </Badge>
            )}

            {/* TTS Controls */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={ttsState === 'speaking' ? stopSpeaking : toggleMute}
            >
              {ttsState === 'speaking' ? (
                <Square className="h-4 w-4 text-red-500" />
              ) : isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>

            {/* Settings Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">การตั้งค่าเสียง</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">ความเร็วเสียง</label>
                      <span className="text-xs font-mono">{speechRate.toFixed(1)}x</span>
                    </div>
                    <Slider
                      value={[speechRate]}
                      onValueChange={handleSpeechRateChange}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>ช้า</span>
                      <span>ปกติ</span>
                      <span>เร็ว</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs">ปิดเสียง</label>
                    <Button 
                      size="sm" 
                      variant={isMuted ? "destructive" : "outline"}
                      onClick={toggleMute}
                      className="h-7"
                    >
                      {isMuted ? "เปิดเสียง" : "ปิดเสียง"}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Current highlight transcript */}
        {currentHighlight && (
          <div className="mt-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-xs text-primary font-medium animate-pulse">
              🔊 {currentHighlight}
            </p>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="mb-4">
              <AnimatedAvatar state="idle" size="lg" />
            </div>
            <h3 className="text-sm font-medium mb-2">สวัสดีค่ะ ยินดีให้บริการ</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              ถามเกี่ยวกับสุขภาพ มลพิษอากาศ หรือคำแนะนำในการดูแลตัวเอง
            </p>
            
            {/* Environment Info */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {pm25Evaluation && (
                <Badge variant="secondary" className={cn("text-xs", pm25Evaluation.color)}>
                  PM2.5: {pm25?.toFixed(1) || '-'} µg/m³
                </Badge>
              )}
              {aqiEvaluation && (
                <Badge variant="secondary" className={cn("text-xs text-white", aqiEvaluation.bgColor)}>
                  {isSensitiveGroup && <Heart className="w-3 h-3 mr-1" />}
                  AQI: {aqi || '-'} ({language === 'en' ? aqiEvaluation.label : aqiEvaluation.labelTh})
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                🌡️ {temperature || '-'}°C
              </Badge>
            </div>
            
            {isSensitiveGroup && (
              <p className="text-xs text-orange-600 mb-3">
                ⚠️ {language === 'en' ? 'Stricter thresholds applied for your health conditions' : 'ใช้เกณฑ์เข้มงวดสำหรับโรคประจำตัวของคุณ'}
              </p>
            )}

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
                  <div className="flex-shrink-0 mt-1">
                    <AnimatedAvatar 
                      state={index === messages.length - 1 && ttsState === 'speaking' ? 'speaking' : 'idle'} 
                      size="sm" 
                    />
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
                  
                  <div className="flex items-center gap-2 px-1">
                    {message.timestamp && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(message.timestamp).toLocaleTimeString('th-TH', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    )}
                    {message.role === "assistant" && !isMuted && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => speakText(message.content)}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <AnimatedAvatar state="thinking" size="sm" />
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

        {/* Follow-up Questions */}
        {followUpQuestions.length > 0 && !isLoading && messages.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">💬 คำถามติดตาม:</p>
            <div className="flex flex-wrap gap-2">
              {followUpQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 px-3 whitespace-normal text-left"
                  onClick={() => {
                    setInput(q);
                    setFollowUpQuestions([]);
                  }}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 border-t bg-background/80 backdrop-blur">
        <div className="flex gap-2">
          <Button
            size="icon"
            variant={isListening ? "destructive" : "outline"}
            className={cn(
              "h-10 w-10 flex-shrink-0 transition-all",
              isListening && "animate-pulse ring-2 ring-red-500/50"
            )}
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
            className="flex-1 h-10"
          />
          <Button 
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Privacy Notice */}
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          ข้อความอาจถูกส่งไปยัง AI เพื่อประมวลผล • 
          <button className="underline ml-1" onClick={toggleMute}>
            {isMuted ? "เปิดเสียง" : "โหมดข้อความอย่างเดียว"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default HealthChatbotEnhanced;
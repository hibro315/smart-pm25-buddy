import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, X, Loader2, MessageCircle, Sparkles, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VoiceHealthChatNewProps {
  pm25?: number;
  aqi?: number;
  temperature?: number;
  humidity?: number;
  location?: string;
  onClose?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const VoiceHealthChatNew: React.FC<VoiceHealthChatNewProps> = ({
  pm25,
  aqi,
  temperature,
  humidity,
  location,
  onClose
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const { toast } = useToast();

  // Get risk level and styling
  const getRiskConfig = () => {
    if (!pm25) return { 
      gradient: 'from-primary/30 via-primary/20 to-accent/20',
      glow: 'shadow-glow-cyan',
      orb: 'from-primary via-primary to-accent',
      status: 'พร้อมช่วยเหลือ'
    };
    if (pm25 <= 25) return { 
      gradient: 'from-success/30 via-success/20 to-accent/20',
      glow: 'shadow-glow-mint',
      orb: 'from-success via-success to-accent',
      status: 'คุณภาพอากาศดี'
    };
    if (pm25 <= 50) return { 
      gradient: 'from-warning/30 via-warning/20 to-warning/10',
      glow: 'shadow-glow-warm',
      orb: 'from-warning via-warning to-orange-500',
      status: 'คุณภาพอากาศปานกลาง'
    };
    if (pm25 <= 75) return { 
      gradient: 'from-orange-500/30 via-orange-500/20 to-destructive/20',
      glow: 'shadow-glow-warm',
      orb: 'from-orange-500 via-orange-500 to-destructive',
      status: 'คุณภาพอากาศไม่ดี'
    };
    return { 
      gradient: 'from-destructive/30 via-destructive/20 to-destructive/10',
      glow: 'shadow-glow-alert',
      orb: 'from-destructive via-destructive to-red-600',
      status: 'คุณภาพอากาศอันตราย'
    };
  };

  const riskConfig = getRiskConfig();

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'th-TH';

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const text = result[0].transcript;
        setTranscript(text);

        if (result.isFinal) {
          handleUserMessage(text);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast({
            title: 'ไม่สามารถฟังเสียงได้',
            description: 'กรุณาอนุญาตการใช้ไมโครโฟน',
            variant: 'destructive'
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [toast]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speak = useCallback((text: string) => {
    if (synthRef.current && !isMuted) {
      synthRef.current.cancel();
      
      // Clean text for TTS
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/µg\/m³/g, 'ไมโครกรัมต่อลูกบาศก์เมตร')
        .replace(/PM2\.5/g, 'พีเอ็ม 2.5')
        .replace(/AQI/g, 'เอคิวไอ');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'th-TH';
      utterance.rate = 0.95;
      utterance.pitch = 1;

      // Try to find Thai voice
      const voices = synthRef.current.getVoices();
      const thaiVoice = voices.find(v => v.lang.includes('th')) || voices.find(v => v.lang.includes('en'));
      if (thaiVoice) {
        utterance.voice = thaiVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current.speak(utterance);
    }
  }, [isMuted]);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const handleUserMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    setTranscript('');

    // Add user message
    const userMessage: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);

    try {
      const { data, error } = await supabase.functions.invoke('voice-health-chat', {
        body: {
          message: text,
          context: { pm25, aqi, temperature, humidity, location }
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const reply = data.reply || 'ขออภัย ไม่สามารถตอบได้';
      
      // Add assistant message
      const assistantMessage: Message = { role: 'assistant', content: reply, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMessage]);

      // Speak the response
      speak(reply);

    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถเชื่อมต่อได้',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [pm25, aqi, temperature, humidity, location, speak, toast]);

  const toggleMute = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    }
    setIsMuted(!isMuted);
  }, [isMuted, isSpeaking, stopSpeaking]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-3xl",
          "bg-gradient-to-br", riskConfig.gradient,
          "backdrop-blur-2xl border border-white/20",
          riskConfig.glow
        )}
      >
        {/* Ambient glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-accent/15 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                "bg-gradient-to-br", riskConfig.orb,
                riskConfig.glow
              )}
            >
              <Brain className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                Voice Health AI
                <Sparkles className="w-4 h-4 text-primary animate-glow-pulse" />
              </h3>
              <p className="text-xs text-muted-foreground">
                {pm25 ? `PM2.5: ${pm25} µg/m³ • ${riskConfig.status}` : riskConfig.status}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="relative h-72 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
              >
                <Mic className="w-8 h-8 text-primary" />
              </motion.div>
              <p className="text-sm text-muted-foreground">กดปุ่มไมโครโฟนเพื่อเริ่มพูด</p>
              <p className="text-xs text-muted-foreground/70 mt-1">ถามเกี่ยวกับคุณภาพอากาศและสุขภาพ</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 shadow-soft",
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                    : 'bg-card/80 backdrop-blur-sm text-foreground border border-white/10'
                )}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          ))}
          
          {/* Current transcript */}
          {transcript && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-end"
            >
              <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-primary/40 backdrop-blur-sm text-primary-foreground border border-primary/30">
                <p className="text-sm italic">{transcript}...</p>
              </div>
            </motion.div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3 border border-white/10">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      className="w-2 h-2 rounded-full bg-primary"
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">กำลังคิด...</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <div className="relative p-5 border-t border-white/10 bg-card/30 backdrop-blur-xl">
          <div className="flex items-center justify-center gap-6">
            {/* Mute button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="rounded-full w-12 h-12 hover:bg-white/10 transition-all"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>

            {/* Main mic button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              className={cn(
                "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                isListening
                  ? 'bg-destructive shadow-glow-alert'
                  : isProcessing
                  ? 'bg-muted cursor-not-allowed'
                  : cn('bg-gradient-to-br', riskConfig.orb, riskConfig.glow, 'hover:scale-105')
              )}
            >
              {isProcessing ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : isListening ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
              
              {/* Listening pulse animations */}
              {isListening && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-destructive"
                    animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-destructive"
                    animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                  />
                </>
              )}

              {/* Speaking indicator */}
              {isSpeaking && (
                <motion.div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-white"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              )}
            </motion.button>

            {/* Stop speaking button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={stopSpeaking}
              disabled={!isSpeaking}
              className="rounded-full w-12 h-12 hover:bg-white/10 transition-all"
            >
              <VolumeX className={cn("w-5 h-5", isSpeaking ? 'text-destructive' : 'text-muted-foreground')} />
            </Button>
          </div>

          {/* Status text */}
          <motion.p 
            key={isListening ? 'listening' : isSpeaking ? 'speaking' : 'idle'}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-xs text-muted-foreground mt-4"
          >
            {isListening ? (
              <span className="flex items-center justify-center gap-2 text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                กำลังฟัง...
              </span>
            ) : isSpeaking ? (
              <span className="flex items-center justify-center gap-2 text-success">
                <Volume2 className="w-3 h-3" />
                กำลังพูด...
              </span>
            ) : (
              'กดไมค์เพื่อถามคำถาม'
            )}
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VoiceHealthChatNew;
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, X, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  // Get risk level color
  const getRiskColor = () => {
    if (!pm25) return 'from-teal-500/20 to-cyan-500/20';
    if (pm25 <= 25) return 'from-green-500/20 to-emerald-500/20';
    if (pm25 <= 50) return 'from-yellow-500/20 to-amber-500/20';
    if (pm25 <= 75) return 'from-orange-500/20 to-red-500/20';
    return 'from-red-500/20 to-rose-500/20';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className={`relative w-full max-w-md bg-gradient-to-br ${getRiskColor()} backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Voice Health AI</h3>
              <p className="text-xs text-muted-foreground">
                {pm25 ? `PM2.5: ${pm25} µg/m³` : 'พร้อมช่วยเหลือ'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="h-64 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">กดปุ่มไมโครโฟนเพื่อเริ่มพูด</p>
              <p className="text-xs mt-2">หรือถามเกี่ยวกับคุณภาพอากาศ</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/10 text-foreground'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
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
              <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-primary/50 text-primary-foreground">
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
              <div className="bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">กำลังคิด...</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-center gap-4">
            {/* Mute button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="rounded-full hover:bg-white/10"
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
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500 shadow-lg shadow-red-500/50'
                  : isProcessing
                  ? 'bg-muted cursor-not-allowed'
                  : 'bg-gradient-to-br from-teal-400 to-cyan-500 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : isListening ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
              
              {/* Listening pulse animation */}
              {isListening && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-red-500"
                    animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-red-500"
                    animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                  />
                </>
              )}

              {/* Speaking indicator */}
              {isSpeaking && (
                <motion.div
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500"
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
              className="rounded-full hover:bg-white/10"
            >
              <VolumeX className={`w-5 h-5 ${isSpeaking ? 'text-red-400' : 'text-muted-foreground'}`} />
            </Button>
          </div>

          {/* Status text */}
          <p className="text-center text-xs text-muted-foreground mt-3">
            {isListening ? '🎤 กำลังฟัง...' : isSpeaking ? '🔊 กำลังพูด...' : 'กดไมค์เพื่อถาม'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default VoiceHealthChatNew;

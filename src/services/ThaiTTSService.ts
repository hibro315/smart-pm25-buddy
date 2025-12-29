/**
 * Thai Text-to-Speech Service
 * Uses Web Speech API with cloud TTS fallback
 */

import { sanitizeForTTS, splitIntoSentences } from '@/utils/textSanitizer';
import { supabase } from '@/integrations/supabase/client';

export type TTSState = 'idle' | 'loading' | 'speaking' | 'paused' | 'error';
export type AvatarState = 'idle' | 'listening' | 'speaking' | 'warning' | 'thinking';

interface TTSOptions {
  rate?: number;       // 0.5 - 2.0
  pitch?: number;      // 0 - 2
  volume?: number;     // 0 - 1
  useCloudFallback?: boolean;
}

interface TTSCallbacks {
  onStateChange?: (state: TTSState) => void;
  onAvatarStateChange?: (state: AvatarState) => void;
  onProgress?: (currentSentence: number, totalSentences: number, text: string) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

class ThaiTTSService {
  private utterance: SpeechSynthesisUtterance | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private currentState: TTSState = 'idle';
  private sentences: string[] = [];
  private currentSentenceIndex: number = 0;
  private callbacks: TTSCallbacks = {};
  private options: TTSOptions = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    useCloudFallback: true,
  };
  private isMuted: boolean = false;
  private thaiVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Load voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Find Thai voice
        this.thaiVoice = voices.find(v => 
          v.lang.includes('th') || 
          v.name.toLowerCase().includes('thai')
        ) || null;
        
        // Fallback to any available voice
        if (!this.thaiVoice && voices.length > 0) {
          this.thaiVoice = voices[0];
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  public setOptions(options: Partial<TTSOptions>) {
    this.options = { ...this.options, ...options };
  }

  public setCallbacks(callbacks: TTSCallbacks) {
    this.callbacks = callbacks;
  }

  public getState(): TTSState {
    return this.currentState;
  }

  private setState(state: TTSState) {
    this.currentState = state;
    this.callbacks.onStateChange?.(state);
    
    // Update avatar state based on TTS state
    if (state === 'speaking') {
      this.callbacks.onAvatarStateChange?.('speaking');
    } else if (state === 'loading') {
      this.callbacks.onAvatarStateChange?.('thinking');
    } else if (state === 'idle' || state === 'paused') {
      this.callbacks.onAvatarStateChange?.('idle');
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public isSpeechMuted(): boolean {
    return this.isMuted;
  }

  public async speak(text: string): Promise<void> {
    if (this.isMuted || !text.trim()) {
      return;
    }

    // Stop any ongoing speech
    this.stop();

    // Sanitize text for TTS
    const sanitizedText = sanitizeForTTS(text);
    if (!sanitizedText.trim()) {
      return;
    }

    // Split into sentences for better pacing
    this.sentences = splitIntoSentences(sanitizedText);
    this.currentSentenceIndex = 0;

    this.setState('loading');

    // Try Web Speech API first
    if (this.isWebSpeechSupported()) {
      await this.speakWithWebSpeech();
    } else if (this.options.useCloudFallback) {
      // Fallback to cloud TTS
      await this.speakWithCloudTTS(sanitizedText);
    } else {
      this.setState('error');
      this.callbacks.onError?.(new Error('TTS not supported'));
    }
  }

  private isWebSpeechSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  private async speakWithWebSpeech(): Promise<void> {
    return new Promise((resolve) => {
      const speakNextSentence = () => {
        if (this.currentSentenceIndex >= this.sentences.length) {
          this.setState('idle');
          this.callbacks.onEnd?.();
          resolve();
          return;
        }

        const sentence = this.sentences[this.currentSentenceIndex];
        this.callbacks.onProgress?.(
          this.currentSentenceIndex + 1,
          this.sentences.length,
          sentence
        );

        this.utterance = new SpeechSynthesisUtterance(sentence);
        
        if (this.thaiVoice) {
          this.utterance.voice = this.thaiVoice;
        }
        
        this.utterance.lang = 'th-TH';
        this.utterance.rate = this.options.rate || 1.0;
        this.utterance.pitch = this.options.pitch || 1.0;
        this.utterance.volume = this.options.volume || 1.0;

        this.utterance.onstart = () => {
          this.setState('speaking');
        };

        this.utterance.onend = () => {
          this.currentSentenceIndex++;
          speakNextSentence();
        };

        this.utterance.onerror = (event) => {
          console.error('Web Speech error:', event);
          // Try cloud fallback on error
          if (this.options.useCloudFallback) {
            this.speakWithCloudTTS(this.sentences.join(' ')).then(resolve);
          } else {
            this.setState('error');
            this.callbacks.onError?.(new Error('Speech synthesis failed'));
            resolve();
          }
        };

        window.speechSynthesis.speak(this.utterance);
      };

      speakNextSentence();
    });
  }

  private async speakWithCloudTTS(text: string): Promise<void> {
    try {
      this.setState('loading');

      const { data, error } = await supabase.functions.invoke('thai-tts', {
        body: { 
          text,
          voice: 'th-TH-Standard-A', // Thai female voice
          speakingRate: this.options.rate || 1.0,
        }
      });

      if (error) throw error;

      if (data?.audioContent) {
        // Play the audio
        const audioBlob = this.base64ToBlob(data.audioContent, 'audio/mp3');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        this.audioElement = new Audio(audioUrl);
        this.audioElement.volume = this.options.volume || 1.0;
        this.audioElement.playbackRate = this.options.rate || 1.0;

        this.audioElement.onplay = () => {
          this.setState('speaking');
        };

        this.audioElement.onended = () => {
          this.setState('idle');
          this.callbacks.onEnd?.();
          URL.revokeObjectURL(audioUrl);
        };

        this.audioElement.onerror = () => {
          this.setState('error');
          this.callbacks.onError?.(new Error('Audio playback failed'));
          URL.revokeObjectURL(audioUrl);
        };

        await this.audioElement.play();
      }
    } catch (error) {
      console.error('Cloud TTS error:', error);
      this.setState('error');
      this.callbacks.onError?.(error as Error);
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  public pause() {
    if (this.currentState === 'speaking') {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause();
      }
      this.setState('paused');
    }
  }

  public resume() {
    if (this.currentState === 'paused') {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      if (this.audioElement?.paused) {
        this.audioElement.play();
      }
      this.setState('speaking');
    }
  }

  public stop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }
    
    this.utterance = null;
    this.sentences = [];
    this.currentSentenceIndex = 0;
    this.setState('idle');
  }

  public setRate(rate: number) {
    this.options.rate = Math.max(0.5, Math.min(2.0, rate));
    if (this.audioElement) {
      this.audioElement.playbackRate = this.options.rate;
    }
  }

  public getRate(): number {
    return this.options.rate || 1.0;
  }
}

// Singleton instance
export const thaiTTSService = new ThaiTTSService();
export default thaiTTSService;

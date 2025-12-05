import { useState, useEffect } from "react";
import { HealthChatbotEnhanced } from "@/components/HealthChatbotEnhanced";
import { ConversationHistory } from "@/components/ConversationHistory";
import { ChatLoadingSkeleton } from "@/components/ChatLoadingSkeleton";
import { UserMenu } from "@/components/UserMenu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, History } from "lucide-react";

interface CachedAirQuality {
  pm25: number;
  aqi: number;
  temperature: number;
  humidity: number;
  location: string;
  timestamp: string;
}

const Chat = () => {
  const [airQuality, setAirQuality] = useState<CachedAirQuality | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load cached air quality data from localStorage
    const loadCachedData = () => {
      try {
        const cached = localStorage.getItem('airQualityCache');
        if (cached) {
          const data = JSON.parse(cached);
          setAirQuality(data);
        }
      } catch (error) {
        console.error('Error loading cached air quality:', error);
      } finally {
        // Short delay for smoother UX
        setTimeout(() => setIsLoading(false), 300);
      }
    };

    loadCachedData();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">AI Health Assistant</h1>
            <p className="text-sm text-muted-foreground mt-1">ปรึกษา AI เกี่ยวกับสุขภาพและคุณภาพอากาศ</p>
          </div>
          <UserMenu />
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span>ประวัติการสนทนา</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-0">
            {isLoading ? (
              <ChatLoadingSkeleton />
            ) : (
              <HealthChatbotEnhanced 
                pm25={airQuality?.pm25}
                aqi={airQuality?.aqi}
                temperature={airQuality?.temperature}
                humidity={airQuality?.humidity}
                location={airQuality?.location}
              />
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <ConversationHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Chat;

import { HealthChatbotEnhanced } from "@/components/HealthChatbotEnhanced";
import { ConversationHistory } from "@/components/ConversationHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, History } from "lucide-react";

const Chat = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-display font-bold">AI Health Assistant</h1>
          <p className="text-sm text-muted-foreground mt-1">ปรึกษา AI เกี่ยวกับสุขภาพและคุณภาพอากาศ</p>
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
            <HealthChatbotEnhanced />
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

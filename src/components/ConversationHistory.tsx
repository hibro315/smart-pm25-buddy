import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, User, Bot, Trash2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Conversation {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  session_id: string;
  metadata?: any;
}

export const ConversationHistory = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("conversation_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setConversations((data as Conversation[]) || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดประวัติการสนทนาได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("conversation_history")
        .delete()
        .eq("user_id", user.id)
        .eq("session_id", sessionId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.session_id !== sessionId));
      toast({
        title: "ลบสำเร็จ",
        description: "ลบประวัติการสนทนาเรียบร้อยแล้ว",
      });
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถลบประวัติได้",
        variant: "destructive",
      });
    }
  };

  // Group conversations by session
  const sessionGroups = conversations.reduce((acc, conv) => {
    if (!acc[conv.session_id]) {
      acc[conv.session_id] = [];
    }
    acc[conv.session_id].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  const sessions = Object.entries(sessionGroups).map(([sessionId, messages]) => ({
    sessionId,
    messages: messages.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
    lastMessage: messages[messages.length - 1],
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>ประวัติการสนทนา</CardTitle>
              <CardDescription>
                บันทึกการสนทนากับ AI ที่ปรึกษาสุขภาพ
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">{sessions.length} เซสชัน</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              กำลังโหลด...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>ยังไม่มีประวัติการสนทนา</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.sessionId} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(session.lastMessage.created_at), "d MMMM yyyy HH:mm", { locale: th })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {session.messages.length} ข้อความ
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            if (confirm("ต้องการลบการสนทนานี้หรือไม่?")) {
                              deleteSession(session.sessionId);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left p-2 h-auto"
                      onClick={() => 
                        setSelectedSession(
                          selectedSession === session.sessionId ? null : session.sessionId
                        )
                      }
                    >
                      <div className="flex-1 space-y-2">
                        {selectedSession === session.sessionId ? (
                          session.messages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex gap-2 ${
                                msg.role === "user" ? "justify-end" : "justify-start"
                              }`}
                            >
                              {msg.role === "assistant" && (
                                <Bot className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                              )}
                              <div
                                className={`text-sm p-2 rounded-lg max-w-[80%] ${
                                  msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                {msg.content.length > 200
                                  ? msg.content.substring(0, 200) + "..."
                                  : msg.content}
                              </div>
                              {msg.role === "user" && (
                                <User className="h-4 w-4 text-secondary mt-1 flex-shrink-0" />
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {session.messages[0]?.content}
                          </p>
                        )}
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
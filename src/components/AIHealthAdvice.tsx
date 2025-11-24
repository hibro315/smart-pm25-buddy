import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useHealthAdvice } from '@/hooks/useHealthAdvice';
import { useEffect } from 'react';

interface AIHealthAdviceProps {
  pm25: number;
  temperature: number;
  humidity: number;
  healthConditions?: string[];
}

export const AIHealthAdvice = ({ pm25, temperature, humidity, healthConditions }: AIHealthAdviceProps) => {
  const { advice, loading, getAdvice } = useHealthAdvice();

  useEffect(() => {
    // Auto-fetch advice when data changes
    if (pm25 > 0) {
      getAdvice({ pm25, temperature, humidity, healthConditions });
    }
  }, [pm25]);

  const handleRefresh = () => {
    getAdvice({ pm25, temperature, humidity, healthConditions });
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>คำแนะนำจาก AI</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'รีเฟรช'
            )}
          </Button>
        </div>
        <CardDescription>
          คำแนะนำสุขภาพเฉพาะบุคคลจากระบบ AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : advice ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {advice}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            กดปุ่มรีเฟรชเพื่อรับคำแนะนำจาก AI
          </p>
        )}
      </CardContent>
    </Card>
  );
};

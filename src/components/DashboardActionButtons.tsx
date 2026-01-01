import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Route, 
  Shield, 
  FileText, 
  MessageCircle,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ActionButton {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  highlight?: boolean;
}

interface DashboardActionButtonsProps {
  riskLevel?: 'low' | 'moderate' | 'high' | 'severe';
  className?: string;
}

export const DashboardActionButtons = ({ 
  riskLevel = 'low', 
  className 
}: DashboardActionButtonsProps) => {
  const navigate = useNavigate();

  const handleExportReport = () => {
    toast.info('กำลังสร้างรายงาน...', {
      description: 'ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้'
    });
  };

  const actions: ActionButton[] = [
    {
      id: 'safe-routes',
      label: 'เส้นทางปลอดภัย',
      description: 'ค้นหาเส้นทางที่มีมลพิษต่ำ',
      icon: <Route className="w-5 h-5" />,
      action: () => navigate('/map'),
      variant: riskLevel === 'high' || riskLevel === 'severe' ? 'default' : 'outline',
      highlight: riskLevel === 'high' || riskLevel === 'severe',
    },
    {
      id: 'compare-locations',
      label: 'เปรียบเทียบพื้นที่',
      description: 'ดูคุณภาพอากาศหลายจุด',
      icon: <MapPin className="w-5 h-5" />,
      action: () => navigate('/map'),
      variant: 'outline',
    },
    {
      id: 'health-chat',
      label: 'สอบถาม AI',
      description: 'ปรึกษาเรื่องสุขภาพ',
      icon: <MessageCircle className="w-5 h-5" />,
      action: () => navigate('/chat'),
      variant: 'outline',
    },
    {
      id: 'mitigation-tips',
      label: 'วิธีป้องกัน',
      description: 'คำแนะนำลดความเสี่ยง',
      icon: <Shield className="w-5 h-5" />,
      action: () => navigate('/notifications'),
      variant: 'outline',
    },
  ];

  return (
    <Card className={cn('w-full animate-fade-in', className)} style={{ animationDelay: '300ms' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          ดำเนินการ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action, index) => (
            <Button
              key={action.id}
              variant={action.variant}
              onClick={action.action}
              className={cn(
                'h-auto py-4 px-3 flex flex-col items-center gap-2 transition-all duration-200 hover:scale-[1.02] group',
                action.highlight && 'ring-2 ring-primary ring-offset-2 animate-pulse',
                'animate-fade-in'
              )}
              style={{ animationDelay: `${(index + 1) * 75}ms` }}
            >
              <div className={cn(
                'p-2 rounded-full transition-colors',
                action.variant === 'default' 
                  ? 'bg-primary-foreground/20' 
                  : 'bg-primary/10 group-hover:bg-primary/20'
              )}>
                {action.icon}
              </div>
              <div className="text-center">
                <div className="font-medium text-sm">{action.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                  {action.description}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Button>
          ))}
        </div>

        {/* Export Button */}
        <div className="mt-4 pt-4 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={handleExportReport}
          >
            <FileText className="w-4 h-4 mr-2" />
            ส่งออกรายงานสุขภาพ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

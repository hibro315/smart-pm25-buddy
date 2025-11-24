import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Clock, X, MapPin } from "lucide-react";

interface LocationMonitorAlertProps {
  pm25: number;
  location: string;
  recommendedOutdoorTime: number;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  onDismiss: () => void;
}

export const LocationMonitorAlert = ({ 
  pm25, 
  location, 
  recommendedOutdoorTime, 
  severity,
  onDismiss 
}: LocationMonitorAlertProps) => {
  const getSeverityColor = () => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-600 text-white';
      case 'moderate': return 'bg-yellow-600 text-white';
      default: return 'bg-blue-600 text-white';
    }
  };

  const getTimeDisplay = () => {
    if (recommendedOutdoorTime === Infinity) return 'ไม่จำกัด';
    if (recommendedOutdoorTime >= 60) return `${Math.floor(recommendedOutdoorTime / 60)} ชั่วโมง`;
    return `${recommendedOutdoorTime} นาที`;
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top-5 duration-500">
      <Card className={`${getSeverityColor()} shadow-2xl border-0`}>
        <Alert className="border-0 bg-transparent">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 mt-1 animate-pulse" />
            <div className="flex-1">
              <AlertTitle className="text-lg font-bold mb-2">
                {severity === 'critical' ? '⚠️ เตือนภัย! PM2.5 อันตราย' : '⚠️ แจ้งเตือน: คุณเข้าพื้นที่ PM2.5 สูง'}
              </AlertTitle>
              <AlertDescription className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">{location}</span>
                </div>
                
                <div className="bg-white/20 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span>ค่า PM2.5:</span>
                    <span className="text-xl font-bold">{pm25} µg/m³</span>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-white/30">
                    <Clock className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="text-sm opacity-90">เวลาที่แนะนำให้อยู่นอกอาคาร:</p>
                      <p className="text-lg font-bold">{getTimeDisplay()}</p>
                    </div>
                  </div>
                </div>

                {severity === 'critical' && (
                  <p className="text-sm font-semibold bg-white/20 p-2 rounded">
                    🚨 ด่วน! คุณมีโรคประจำตัวกลุ่มเสี่ยง ควรเข้าอาคารโดยเร็ว
                  </p>
                )}
              </AlertDescription>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-white/20 shrink-0"
              onClick={onDismiss}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </Alert>
      </Card>
    </div>
  );
};

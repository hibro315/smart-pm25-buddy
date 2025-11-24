import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { useState } from "react";

interface AlertNotificationProps {
  pm25: number;
  location: string;
  hasHealthConditions?: boolean;
}

export const AlertNotification = ({ pm25, location, hasHealthConditions }: AlertNotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || pm25 <= 37) return null;

  const getSeverity = () => {
    if (pm25 > 90) return "critical";
    if (pm25 > 50) return "high";
    return "moderate";
  };

  const severity = getSeverity();

  return (
    <Alert 
      variant="destructive" 
      className="shadow-alert border-destructive bg-gradient-alert text-white relative animate-in slide-in-from-top-5 duration-500"
    >
      <Bell className="h-5 w-5 animate-pulse" />
      <AlertTitle className="text-white font-semibold">
        {severity === "critical" ? "⚠️ เตือนภัย! ระดับอันตราย" : "แจ้งเตือน: ค่าฝุ่นสูง"}
      </AlertTitle>
      <AlertDescription className="text-white/90">
        พื้นที่ <span className="font-semibold">{location}</span> มีค่า PM2.5 อยู่ที่ <span className="font-bold">{pm25} µg/m³</span>
        {hasHealthConditions && (
          <span className="block mt-2 font-medium">
            ⚠️ คุณมีโรคประจำตัว โปรดระมัดระวังเป็นพิเศษและหลีกเลี่ยงการออกจากบ้าน
          </span>
        )}
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-white hover:bg-white/20"
        onClick={() => setIsVisible(false)}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
};

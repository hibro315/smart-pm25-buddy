import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wind, AlertTriangle } from "lucide-react";

interface AirQualityCardProps {
  pm25: number;
  pm10?: number;
  no2?: number;
  o3?: number;
  aqi?: number;
  location: string;
  timestamp?: string;
  source?: string;
}

export const AirQualityCard = ({ pm25, pm10, no2, o3, aqi, location, timestamp, source }: AirQualityCardProps) => {
  const getAQILevel = (value: number) => {
    if (value <= 25) return { level: "ดี", color: "bg-aqi-good", textColor: "text-aqi-good" };
    if (value <= 37) return { level: "ปานกลาง", color: "bg-aqi-moderate", textColor: "text-aqi-moderate" };
    if (value <= 50) return { level: "เริ่มมีผลกระทบต่อสุขภาพ", color: "bg-aqi-unhealthy-sensitive", textColor: "text-aqi-unhealthy-sensitive" };
    if (value <= 90) return { level: "มีผลกระทบต่อสุขภาพ", color: "bg-aqi-unhealthy", textColor: "text-aqi-unhealthy" };
    return { level: "อันตราย", color: "bg-aqi-hazardous", textColor: "text-aqi-hazardous" };
  };

  const formatThaiDateTime = (isoString?: string) => {
    if (!isoString) return '';
    
    const date = new Date(isoString);
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist Era
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day} ${month} ${year} เวลา ${hours}:${minutes}`;
  };

  const aqiLevel = getAQILevel(pm25);
  const isUnsafe = pm25 > 37;

  return (
    <Card className="relative overflow-hidden shadow-elevated transition-smooth hover:shadow-alert">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">{location}</h3>
            </div>
            {timestamp && (
              <p className="text-sm text-muted-foreground">{formatThaiDateTime(timestamp)}</p>
            )}
            {source && (
              <p className="text-xs text-muted-foreground">แหล่งข้อมูล: {source}</p>
            )}
          </div>
          {isUnsafe && (
            <AlertTriangle className="w-6 h-6 text-destructive animate-pulse" />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-bold ${aqiLevel.textColor}`}>
              {pm25}
            </span>
            <span className="text-xl text-muted-foreground">µg/m³</span>
          </div>

          <Badge className={`${aqiLevel.color} text-white border-0`}>
            {aqiLevel.level}
          </Badge>
        </div>

        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full ${aqiLevel.color} transition-all duration-500`}
            style={{ width: `${Math.min((pm25 / 150) * 100, 100)}%` }}
          />
        </div>

        {/* Additional pollutants info */}
        {(pm10 !== undefined || no2 !== undefined || o3 !== undefined) && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">สารมลพิษอื่นๆ</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {pm10 !== undefined && (
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-muted-foreground">PM10</div>
                  <div className="font-semibold">{pm10} µg/m³</div>
                </div>
              )}
              {no2 !== undefined && (
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-muted-foreground">NO₂</div>
                  <div className="font-semibold">{no2} µg/m³</div>
                </div>
              )}
              {o3 !== undefined && (
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-muted-foreground">O₃</div>
                  <div className="font-semibold">{o3} µg/m³</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

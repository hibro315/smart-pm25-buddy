import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wind, AlertTriangle } from "lucide-react";

interface NearbyStation {
  name: string;
  aqi: number;
  distance: number;
}

interface AirQualityCardProps {
  pm25: number;
  pm10?: number;
  no2?: number;
  o3?: number;
  aqi?: number;
  location: string;
  timestamp?: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  wind?: number;
  nearbyStations?: NearbyStation[];
  source?: string;
}

export const AirQualityCard = ({ pm25, pm10, no2, o3, aqi, location, timestamp, temperature, humidity, pressure, wind, nearbyStations, source }: AirQualityCardProps) => {
  // AQI Level based on standard AQI scale (0-500)
  const getAQILevel = (value: number) => {
    if (value <= 50) return { level: "ดี", levelEn: "Good", color: "bg-aqi-good", textColor: "text-aqi-good" };
    if (value <= 100) return { level: "ปานกลาง", levelEn: "Moderate", color: "bg-aqi-moderate", textColor: "text-aqi-moderate" };
    if (value <= 150) return { level: "ไม่ดีต่อกลุ่มเสี่ยง", levelEn: "Unhealthy for Sensitive", color: "bg-aqi-unhealthy-sensitive", textColor: "text-aqi-unhealthy-sensitive" };
    if (value <= 200) return { level: "ไม่ดีต่อสุขภาพ", levelEn: "Unhealthy", color: "bg-aqi-unhealthy", textColor: "text-aqi-unhealthy" };
    if (value <= 300) return { level: "ไม่ดีต่อสุขภาพมาก", levelEn: "Very Unhealthy", color: "bg-aqi-very-unhealthy", textColor: "text-aqi-very-unhealthy" };
    return { level: "อันตราย", levelEn: "Hazardous", color: "bg-aqi-hazardous", textColor: "text-aqi-hazardous" };
  };

  // PM2.5 Level based on Thai AQI standards (µg/m³)
  const getPM25Level = (value: number) => {
    if (value <= 15) return { level: "ดีมาก", color: "text-emerald-500" };
    if (value <= 25) return { level: "ดี", color: "text-green-500" };
    if (value <= 37.5) return { level: "ปานกลาง", color: "text-yellow-500" };
    if (value <= 75) return { level: "เริ่มมีผลกระทบ", color: "text-orange-500" };
    return { level: "มีผลกระทบต่อสุขภาพ", color: "text-red-500" };
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
    const year = date.getFullYear() + 543;
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day} ${month} ${year} เวลา ${hours}:${minutes}`;
  };

  const displayAQI = aqi || Math.round(pm25 * 2.5); // Estimate if not provided
  const aqiLevel = getAQILevel(displayAQI);
  const pm25Level = getPM25Level(pm25);
  const isUnsafe = displayAQI > 100;

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

        {/* AQI Section - Primary */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">ดัชนีคุณภาพอากาศ (AQI)</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${aqiLevel.textColor}`}>
              {displayAQI}
            </span>
            <Badge className={`${aqiLevel.color} text-white border-0`}>
              {aqiLevel.level}
            </Badge>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-3">
            <div 
              className={`h-full ${aqiLevel.color} transition-all duration-500`}
              style={{ width: `${Math.min((displayAQI / 300) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* PM2.5 Section - Secondary */}
        <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
          <p className="text-xs text-muted-foreground mb-1">ฝุ่นละอองขนาดเล็ก PM2.5</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${pm25Level.color}`}>
              {pm25}
            </span>
            <span className="text-sm text-muted-foreground">µg/m³</span>
            <span className={`text-xs ${pm25Level.color} ml-2`}>
              ({pm25Level.level})
            </span>
          </div>
        </div>

        {/* Weather conditions */}
        {(temperature !== undefined || humidity !== undefined || pressure !== undefined || wind !== undefined) && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">สภาพอากาศ</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {temperature !== undefined && (
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-muted-foreground">🌡️ อุณหภูมิ</div>
                  <div className="font-semibold">{temperature}°C</div>
                </div>
              )}
              {humidity !== undefined && (
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-muted-foreground">💧 ความชื้น</div>
                  <div className="font-semibold">{humidity}%</div>
                </div>
              )}
              {pressure !== undefined && (
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-muted-foreground">📊 ความกดอากาศ</div>
                  <div className="font-semibold">{pressure} hPa</div>
                </div>
              )}
              {wind !== undefined && (
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-muted-foreground">💨 ลม</div>
                  <div className="font-semibold">{wind} m/s</div>
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Nearby stations comparison */}
        {nearbyStations && nearbyStations.length > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">พื้นที่ใกล้เคียง</p>
            <div className="space-y-2">
              {nearbyStations.map((station, index) => (
                <div key={index} className="flex items-center justify-between text-xs bg-muted/30 rounded p-2">
                  <div className="flex-1">
                    <div className="font-medium truncate">{station.name}</div>
                    <div className="text-muted-foreground">{station.distance} km</div>
                  </div>
                  <div className={`font-semibold ${getAQILevel(station.aqi).textColor}`}>
                    AQI {station.aqi}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

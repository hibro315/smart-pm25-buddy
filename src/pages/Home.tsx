import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAirQualityWithFallback } from "@/hooks/useAirQualityWithFallback";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { AirQualityCard } from "@/components/AirQualityCard";
import { AlertNotification } from "@/components/AlertNotification";
import { Activity, MapPin, MessageSquare, Bell, TrendingUp, Wind, Droplets, Thermometer, ChevronRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Home = () => {
  const { data, loading, refetch } = useAirQualityWithFallback();
  const { profile } = useHealthProfile();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("สวัสดีตอนเช้า");
    else if (hour < 18) setGreeting("สวัสดีตอนบ่าย");
    else setGreeting("สวัสดีตอนเย็น");
  }, []);

  const pm25 = data?.pm25 || 0;
  const aqi = data?.aqi || 0;

  const getAQIStatus = () => {
    if (aqi <= 50) return { text: "ดีเยี่ยม", color: "text-success", bg: "bg-success/10" };
    if (aqi <= 100) return { text: "ปานกลาง", color: "text-warning", bg: "bg-warning/10" };
    return { text: "ไม่ดี", color: "text-destructive", bg: "bg-destructive/10" };
  };

  const status = getAQIStatus();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section */}
      <div className="relative bg-gradient-primary text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        
        <div className="relative container mx-auto px-6 py-8">
          <div className="space-y-3">
            <p className="text-white/90 text-sm font-medium">{greeting}</p>
            <h1 className="text-3xl font-display font-bold">
              Smart Air Quality
            </h1>
            <p className="text-white/80 text-sm">
              ระบบเฝ้าระวังคุณภาพอากาศเพื่อสุขภาพที่ดี
            </p>
          </div>

          {/* Quick Status Card */}
          <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-elevated">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs mb-1">ค่า AQI ปัจจุบัน</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{aqi}</span>
                  <span className="text-lg text-white/90">{status.text}</span>
                </div>
                <p className="text-white/60 text-xs mt-1">
                  <MapPin className="inline w-3 h-3 mr-1" />
                  {data?.location || "กำลังโหลด..."}
                </p>
              </div>
              <div className="text-right">
                <div className={`${status.bg} ${status.color} px-4 py-2 rounded-xl font-semibold text-sm`}>
                  PM2.5: {pm25}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Section */}
      <div className="container mx-auto px-6 -mt-4">
        <AlertNotification 
          pm25={pm25} 
          location={data?.location || ""}
          hasHealthConditions={profile !== null && profile.chronicConditions.length > 0}
        />
      </div>

      {/* Quick Stats Grid */}
      <div className="container mx-auto px-6 mt-6">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 shadow-card hover:shadow-elevated transition-all">
            <Thermometer className="w-6 h-6 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">อุณหภูมิ</p>
            <p className="text-lg font-bold">{data?.temperature || "-"}°C</p>
          </Card>
          <Card className="p-4 shadow-card hover:shadow-elevated transition-all">
            <Droplets className="w-6 h-6 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">ความชื้น</p>
            <p className="text-lg font-bold">{data?.humidity || "-"}%</p>
          </Card>
          <Card className="p-4 shadow-card hover:shadow-elevated transition-all">
            <Wind className="w-6 h-6 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">ลม</p>
            <p className="text-lg font-bold">
              {data?.wind && typeof data.wind === 'object' ? (data.wind as any)?.speed || "-" : data?.wind || "-"}
            </p>
          </Card>
        </div>
      </div>

      {/* Main Features Cards */}
      <div className="container mx-auto px-6 mt-8 space-y-4">
        <h2 className="text-lg font-display font-semibold mb-4">คุณสมบัติหลัก</h2>

        <Link to="/dashboard">
          <Card className="p-5 shadow-card hover:shadow-hover transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Health Dashboard</h3>
                  <p className="text-sm text-muted-foreground">ดูสถิติสุขภาพและ PHRI ของคุณ</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>
        </Link>

        <Link to="/map">
          <Card className="p-5 shadow-card hover:shadow-hover transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Air Quality Map</h3>
                  <p className="text-sm text-muted-foreground">ดูแผนที่คุณภาพอากาศแบบ real-time</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>
        </Link>

        <Link to="/chat">
          <Card className="p-5 shadow-card hover:shadow-hover transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">AI Health Assistant</h3>
                  <p className="text-sm text-muted-foreground">พูดคุยกับ AI เพื่อคำแนะนำสุขภาพ</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>
        </Link>

        <Link to="/notifications">
          <Card className="p-5 shadow-card hover:shadow-hover transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Notifications Center</h3>
                  <p className="text-sm text-muted-foreground">ตั้งค่าและดูการแจ้งเตือนทั้งหมด</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Today's Recommendations */}
      <div className="container mx-auto px-6 mt-8">
        <h2 className="text-lg font-display font-semibold mb-4">คำแนะนำวันนี้</h2>
        <Card className="p-5 shadow-card bg-gradient-card">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-2">สภาพอากาศวันนี้</h3>
              {aqi <= 50 ? (
                <p className="text-sm text-muted-foreground">
                  คุณภาพอากาศดีเยี่ยม! เหมาะสำหรับกิจกรรมกลางแจ้ง
                </p>
              ) : aqi <= 100 ? (
                <p className="text-sm text-muted-foreground">
                  คุณภาพอากาศปานกลาง กลุ่มเสี่ยงควรระมัดระวัง
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  คุณภาพอากาศไม่ดี ควรสวมหน้ากากและลดกิจกรรมกลางแจ้ง
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Home;

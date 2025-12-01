import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationSettings } from "@/components/NotificationSettings";
import { PushNotificationSettings } from "@/components/PushNotificationSettings";
import { BackgroundMonitorSettings } from "@/components/BackgroundMonitorSettings";
import { GeofenceSettings } from "@/components/GeofenceSettings";
import { UserMenu } from "@/components/UserMenu";
import { Bell, Settings, MapPin, Activity } from "lucide-react";

const Notifications = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">จัดการการแจ้งเตือนและการตั้งค่า</p>
          </div>
          <UserMenu />
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="settings" className="flex flex-col items-center gap-1 py-3">
              <Settings className="w-4 h-4" />
              <span className="text-xs">ตั้งค่า</span>
            </TabsTrigger>
            <TabsTrigger value="push" className="flex flex-col items-center gap-1 py-3">
              <Bell className="w-4 h-4" />
              <span className="text-xs">Push</span>
            </TabsTrigger>
            <TabsTrigger value="monitor" className="flex flex-col items-center gap-1 py-3">
              <Activity className="w-4 h-4" />
              <span className="text-xs">ติดตาม</span>
            </TabsTrigger>
            <TabsTrigger value="geofence" className="flex flex-col items-center gap-1 py-3">
              <MapPin className="w-4 h-4" />
              <span className="text-xs">พื้นที่</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="push" className="space-y-6">
            <PushNotificationSettings />
          </TabsContent>

          <TabsContent value="monitor" className="space-y-6">
            <BackgroundMonitorSettings />
          </TabsContent>

          <TabsContent value="geofence" className="space-y-6">
            <GeofenceSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Notifications;

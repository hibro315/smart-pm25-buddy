import { Link, useLocation } from "react-router-dom";
import { Home, Activity, MapPin, MessageSquare, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "หน้าแรก" },
    { path: "/dashboard", icon: Activity, label: "Dashboard" },
    { path: "/map", icon: MapPin, label: "แผนที่" },
    { path: "/chat", icon: MessageSquare, label: "AI Chat" },
    { path: "/notifications", icon: Bell, label: "แจ้งเตือน" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-elevated z-50">
      <div className="container mx-auto">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center py-3 transition-all",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 mb-1", isActive && "scale-110")} />
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-t-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;

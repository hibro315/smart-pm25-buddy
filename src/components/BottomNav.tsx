import { Link, useLocation } from "react-router-dom";
import { Home, Activity, MapPin, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";

const BottomNav = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { path: "/", icon: Home, label: t('nav.home') },
    { path: "/dashboard", icon: Activity, label: t('nav.dashboard') },
    { path: "/map", icon: MapPin, label: t('nav.map') },
    { path: "/chat", icon: MessageSquare, label: t('nav.chat') },
    { path: "/settings", icon: Settings, label: t('nav.settings') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t shadow-elevated z-50">
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
                  "relative flex flex-col items-center justify-center py-3 transition-all",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <motion.div
                  initial={false}
                  animate={isActive ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Icon className="w-5 h-5 mb-1" />
                </motion.div>
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-t-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
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

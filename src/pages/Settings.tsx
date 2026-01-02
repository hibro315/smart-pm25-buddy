import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { 
  Globe, 
  Bell, 
  User, 
  Info, 
  LogOut, 
  ChevronRight,
  Settings as SettingsIcon,
  Languages
} from 'lucide-react';

const languageOptions: { value: Language; label: string; flag: string }[] = [
  { value: 'th', label: 'ไทย', flag: '🇹🇭' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
];

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: t('common.success'),
      description: t('settings.logout.success'),
    });
    navigate('/auth');
  };

  const menuItems = [
    { 
      icon: User, 
      label: t('settings.profile'), 
      onClick: () => navigate('/dashboard?tab=profile'),
      color: 'text-blue-500'
    },
    { 
      icon: Bell, 
      label: t('settings.notifications'), 
      onClick: () => navigate('/notifications'),
      color: 'text-orange-500'
    },
    { 
      icon: Info, 
      label: t('settings.about'), 
      onClick: () => {},
      color: 'text-green-500'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-4 pt-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('settings.subtitle')}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-lg space-y-6">
        {/* Language Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-5 bg-card/80 backdrop-blur-xl border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Languages className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{t('settings.language')}</h2>
                <p className="text-xs text-muted-foreground">
                  {t('settings.language.select')}
                </p>
              </div>
            </div>

            <RadioGroup 
              value={language} 
              onValueChange={(v) => setLanguage(v as Language)}
              className="space-y-2"
            >
              {languageOptions.map((option) => (
                <motion.div
                  key={option.value}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                    ${language === option.value 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-muted/30 border-border/50 hover:border-primary/50'
                    }
                  `}
                  onClick={() => setLanguage(option.value)}
                >
                  <RadioGroupItem value={option.value} id={`lang_${option.value}`} />
                  <span className="text-2xl">{option.flag}</span>
                  <Label htmlFor={`lang_${option.value}`} className="flex-1 cursor-pointer font-medium">
                    {option.label}
                  </Label>
                  {language === option.value && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full bg-primary"
                    />
                  )}
                </motion.div>
              ))}
            </RadioGroup>
          </Card>
        </motion.div>

        {/* Menu Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="overflow-hidden bg-card/80 backdrop-blur-xl border-border/50">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.label}
                whileHover={{ backgroundColor: 'rgba(var(--primary), 0.05)' }}
                whileTap={{ scale: 0.99 }}
                onClick={item.onClick}
                className="w-full flex items-center gap-4 p-4 text-left transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="flex-1 font-medium">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            ))}
          </Card>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button 
            variant="outline" 
            className="w-full gap-2 h-12 border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            {t('settings.logout')}
          </Button>
        </motion.div>

        {/* App Version */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-muted-foreground"
        >
          AirGuard Health v1.0.0
        </motion.p>
      </div>
    </div>
  );
}

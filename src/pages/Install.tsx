import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background p-6 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {isInstalled ? (
              <CheckCircle className="w-10 h-10 text-primary" />
            ) : (
              <Download className="w-10 h-10 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isInstalled ? 'แอปติดตั้งแล้ว!' : 'ติดตั้งแอป Smart PM2.5'}
          </CardTitle>
          <CardDescription>
            {isInstalled 
              ? 'คุณสามารถเปิดแอปได้จากหน้าจอหลักของคุณ' 
              : 'ติดตั้งแอปเพื่อเข้าถึงได้ง่ายและใช้งานแบบออฟไลน์'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isInstalled && deferredPrompt && (
            <Button 
              onClick={handleInstall} 
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              ติดตั้งตอนนี้
            </Button>
          )}
          
          {!isInstalled && !deferredPrompt && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Smartphone className="mr-2 h-5 w-5" />
                  วิธีติดตั้งแอป
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium">สำหรับ iPhone:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>กดปุ่ม Share (แชร์)</li>
                    <li>เลือก "Add to Home Screen"</li>
                    <li>กด "Add"</li>
                  </ol>
                  
                  <p className="font-medium mt-3">สำหรับ Android:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>เปิดเมนูเบราว์เซอร์ (⋮)</li>
                    <li>เลือก "Add to Home screen" หรือ "Install app"</li>
                    <li>กด "Install"</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {isInstalled && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  ขอบคุณที่ติดตั้งแอป! คุณสามารถปิดหน้านี้และเปิดแอปจากหน้าจอหลักได้เลย
                </p>
              </div>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                กลับสู่หน้าหลัก
              </Button>
            </div>
          )}

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2 text-sm">ข้อดีของการติดตั้งแอป:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✓ เข้าถึงได้เร็วจากหน้าจอหลัก</li>
              <li>✓ ใช้งานได้แม้ไม่มีอินเทอร์เน็ต</li>
              <li>✓ รับการแจ้งเตือนค่า PM2.5</li>
              <li>✓ ประหยัดพื้นที่กว่าแอปทั่วไป</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;

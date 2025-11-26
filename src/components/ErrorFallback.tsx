import { ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  isolate?: boolean;
}

export function ErrorFallback({ error, errorInfo, onReset, isolate = false }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyError = async () => {
    const errorText = `
Error: ${error?.message}

Stack Trace:
${error?.stack}

Component Stack:
${errorInfo?.componentStack}

Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy error:', e);
    }
  };

  const handleRefresh = () => {
    if (isolate) {
      // Just reset this component
      onReset();
    } else {
      // Reload the entire page
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className={`flex items-center justify-center p-4 ${isolate ? 'min-h-[300px]' : 'min-h-screen'} bg-gradient-to-br from-background via-background to-muted/20`}>
      <Card className="w-full max-w-2xl p-6 md:p-8 shadow-lg border-2 border-destructive/20">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {isolate ? 'เกิดข้อผิดพลาดในส่วนนี้' : 'เกิดข้อผิดพลาด'}
              </h1>
              <p className="text-muted-foreground">
                {isolate 
                  ? 'ส่วนนี้ของแอปพลิเคชันเกิดข้อผิดพลาด แต่ส่วนอื่นยังทำงานได้ปกติ'
                  : 'แอปพลิเคชันเกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง'
                }
              </p>
            </div>
          </div>

          {/* Error Message */}
          <Alert variant="destructive" className="border-destructive/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <span className="font-semibold">ข้อความข้อผิดพลาด:</span>
              <div className="mt-1 font-mono text-sm break-all">
                {error?.message || 'Unknown error'}
              </div>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleRefresh}
              className="flex-1 min-w-[140px]"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {isolate ? 'ลองใหม่' : 'รีเฟรชหน้า'}
            </Button>
            
            {!isolate && (
              <Button 
                onClick={handleGoHome}
                variant="outline"
                className="flex-1 min-w-[140px]"
                size="lg"
              >
                <Home className="w-4 h-4 mr-2" />
                กลับหน้าหลัก
              </Button>
            )}

            <Button 
              onClick={() => setShowDetails(!showDetails)}
              variant="outline"
              size="lg"
            >
              <Bug className="w-4 h-4 mr-2" />
              {showDetails ? 'ซ่อน' : 'แสดง'}รายละเอียด
            </Button>
          </div>

          {/* Error Details (Collapsible) */}
          {showDetails && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  รายละเอียดข้อผิดพลาด (สำหรับนักพัฒนา)
                </h3>
                <Button
                  onClick={handleCopyError}
                  variant="ghost"
                  size="sm"
                  className="h-8"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      คัดลอกแล้ว
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      คัดลอก
                    </>
                  )}
                </Button>
              </div>

              {/* Stack Trace */}
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Stack Trace:</p>
                <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap break-all font-mono">
                  {error?.stack || 'No stack trace available'}
                </pre>
              </div>

              {/* Component Stack */}
              {errorInfo?.componentStack && (
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Component Stack:</p>
                  <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap break-all font-mono">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}

              {/* Additional Info */}
              <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground">Timestamp:</span>
                  <span className="ml-2 text-foreground">{new Date().toLocaleString('th-TH')}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">URL:</span>
                  <span className="ml-2 text-foreground break-all">{window.location.href}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">User Agent:</span>
                  <span className="ml-2 text-foreground break-all">{navigator.userAgent}</span>
                </div>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              หากปัญหายังคงอยู่ กรุณาติดต่อทีมสนับสนุน หรือ{' '}
              <button
                onClick={handleCopyError}
                className="text-primary hover:underline font-medium"
              >
                คัดลอกข้อความข้อผิดพลาด
              </button>
              {' '}เพื่อแชร์กับทีมพัฒนา
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

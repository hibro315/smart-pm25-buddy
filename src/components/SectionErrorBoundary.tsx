import { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface SectionErrorBoundaryProps {
  children: ReactNode;
  sectionName: string;
}

/**
 * Lightweight Error Boundary for specific sections
 * Shows a compact error UI that doesn't break the entire page
 */
export function SectionErrorBoundary({ children, sectionName }: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      isolate
      fallback={
        <Card className="p-6 border-destructive/50 bg-destructive/5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                ไม่สามารถโหลด {sectionName}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                เกิดข้อผิดพลาดในการโหลดส่วนนี้ กรุณาลองใหม่อีกครั้ง
              </p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                ลองใหม่
              </Button>
            </div>
          </div>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

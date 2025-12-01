import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, AlertCircle, AlertOctagon } from 'lucide-react';
import { useEnhancedPHRI, EnhancedPHRIResult } from '@/hooks/useEnhancedPHRI';
import { useEffect, useState } from 'react';

interface PHRIDisplayProps {
  result?: EnhancedPHRIResult;
}

export const PHRIDisplay = ({ result }: PHRIDisplayProps) => {
  if (!result) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>ดัชนีความเสี่ยงสุขภาพส่วนบุคคล (PHRI)</CardTitle>
          <CardDescription>ยังไม่มีข้อมูล กรุณาบันทึกข้อมูลสุขภาพ</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getIcon = () => {
    switch (result.alertLevel) {
      case 'emergency':
        return <AlertOctagon className="h-8 w-8" />;
      case 'urgent':
        return <AlertTriangle className="h-8 w-8" />;
      case 'warning':
        return <AlertCircle className="h-8 w-8" />;
      default:
        return <Shield className="h-8 w-8" />;
    }
  };

  const getColor = () => {
    switch (result.alertLevel) {
      case 'emergency':
        return 'hsl(var(--destructive))';
      case 'urgent':
        return 'hsl(var(--destructive))';
      case 'warning':
        return 'hsl(var(--warning))';
      default:
        return 'hsl(var(--success))';
    }
  };

  const getBadgeVariant = () => {
    switch (result.alertLevel) {
      case 'emergency':
        return 'destructive';
      case 'urgent':
        return 'destructive';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRiskText = () => {
    switch (result.alertLevel) {
      case 'emergency':
        return 'ฉุกเฉิน';
      case 'urgent':
        return 'เร่งด่วน';
      case 'warning':
        return 'เตือน';
      default:
        return 'ปลอดภัย';
    }
  };

  return (
    <Card className="w-full border-2" style={{ borderColor: getColor() }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span style={{ color: getColor() }}>{getIcon()}</span>
            ดัชนีความเสี่ยงสุขภาพส่วนบุคคล
          </CardTitle>
          <Badge variant={getBadgeVariant() as any}>
            {getRiskText()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div 
            className="text-6xl font-bold mb-2" 
            style={{ color: getColor() }}
          >
            {result.phri.toFixed(1)}
          </div>
          <div className="text-sm text-muted-foreground">PHRI Index</div>
        </div>

        <div 
          className="p-4 rounded-lg"
          style={{ 
            backgroundColor: `${getColor()}15`,
            border: `1px solid ${getColor()}30`
          }}
        >
          <p className="text-sm font-medium text-center">
            {result.recommendation}
          </p>
        </div>

        {result.personalizedAdvice.length > 0 && (
          <div className="space-y-1">
            {result.personalizedAdvice.map((advice, index) => (
              <p key={index} className="text-xs text-muted-foreground">
                {advice}
              </p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground text-center pt-2 border-t">
          <div>
            <div className="font-semibold" style={{ color: 'hsl(var(--success))' }}>
              &lt; 3
            </div>
            <div>ปลอดภัย</div>
          </div>
          <div>
            <div className="font-semibold" style={{ color: 'hsl(var(--warning))' }}>
              3-6
            </div>
            <div>เตือน</div>
          </div>
          <div>
            <div className="font-semibold" style={{ color: 'hsl(var(--destructive))' }}>
              &gt; 6
            </div>
            <div>อันตราย</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

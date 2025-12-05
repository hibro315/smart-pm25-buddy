import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailySymptoms, DailySymptom } from '@/hooks/useDailySymptoms';
import { toast } from 'sonner';
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Symptom {
  id: keyof DailySymptom;
  severityKey: keyof DailySymptom;
  label: string;
  icon: string;
}

// Only use symptoms that exist in the database schema
const SYMPTOMS: Symptom[] = [
  { id: 'cough', severityKey: 'cough_severity', label: 'ไอ', icon: '🤧' },
  { id: 'sneeze', severityKey: 'sneeze_severity', label: 'จาม', icon: '🤧' },
  { id: 'wheezing', severityKey: 'wheezing_severity', label: 'หายใจมีเสียงหวีด', icon: '🌬️' },
  { id: 'chest_tightness', severityKey: 'chest_tightness_severity', label: 'แน่นหน้าอก', icon: '💔' },
  { id: 'eye_irritation', severityKey: 'eye_irritation_severity', label: 'แสบตา', icon: '👁️' },
  { id: 'fatigue', severityKey: 'fatigue_severity', label: 'เหนื่อยง่าย', icon: '😴' },
  { id: 'shortness_of_breath', severityKey: 'shortness_of_breath_severity', label: 'หายใจไม่สะดวก', icon: '😮‍💨' },
];

// Loading Skeleton Component
const SymptomLogSkeleton = () => (
  <Card className="p-6 animate-fade-in">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Skeleton className="w-6 h-6 rounded" />
        <Skeleton className="h-8 w-48" />
      </div>
    </div>
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  </Card>
);

export const EnhancedSymptomLog = () => {
  const { todaySymptoms, saveSymptoms, loading, hasLoggedToday } = useDailySymptoms();
  
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [outdoorTime, setOutdoorTime] = useState(60);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (todaySymptoms) {
      const symptoms: Record<string, number> = {};
      SYMPTOMS.forEach(symptom => {
        const hasSymptom = todaySymptoms[symptom.id as keyof DailySymptom];
        const severity = todaySymptoms[symptom.severityKey as keyof DailySymptom];
        if (hasSymptom) {
          symptoms[symptom.id] = (severity as number) || 3;
        }
      });
      setSelectedSymptoms(symptoms);
      setNotes(todaySymptoms.notes || '');
    }
  }, [todaySymptoms]);

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev => {
      const newSymptoms = { ...prev };
      if (newSymptoms[symptomId]) {
        delete newSymptoms[symptomId];
      } else {
        newSymptoms[symptomId] = 3; // Default severity
      }
      return newSymptoms;
    });
  };

  const updateSeverity = (symptomId: string, severity: number) => {
    setSelectedSymptoms(prev => ({
      ...prev,
      [symptomId]: severity,
    }));
  };

  const calculateSymptomScore = () => {
    const severities = Object.values(selectedSymptoms);
    if (severities.length === 0) return 0;
    const avgSeverity = severities.reduce((sum, val) => sum + val, 0) / severities.length;
    return Math.round((severities.length * 2 + avgSeverity * 10) / 2);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    
    try {
      // Build the proper DailySymptom object
      const symptomData: DailySymptom = {
        cough: !!selectedSymptoms['cough'],
        cough_severity: selectedSymptoms['cough'] || undefined,
        sneeze: !!selectedSymptoms['sneeze'],
        sneeze_severity: selectedSymptoms['sneeze'] || undefined,
        wheezing: !!selectedSymptoms['wheezing'],
        wheezing_severity: selectedSymptoms['wheezing'] || undefined,
        chest_tightness: !!selectedSymptoms['chest_tightness'],
        chest_tightness_severity: selectedSymptoms['chest_tightness'] || undefined,
        eye_irritation: !!selectedSymptoms['eye_irritation'],
        eye_irritation_severity: selectedSymptoms['eye_irritation'] || undefined,
        fatigue: !!selectedSymptoms['fatigue'],
        fatigue_severity: selectedSymptoms['fatigue'] || undefined,
        shortness_of_breath: !!selectedSymptoms['shortness_of_breath'],
        shortness_of_breath_severity: selectedSymptoms['shortness_of_breath'] || undefined,
        notes: notes || undefined,
      };

      const result = await saveSymptoms(symptomData);
      
      if (result !== undefined) {
        toast.success('บันทึกอาการสำเร็จ', {
          description: `คะแนนอาการ: ${result}/100`,
        });
      }
    } catch (error) {
      console.error('Error saving symptoms:', error);
      toast.error('ไม่สามารถบันทึกได้', {
        description: 'กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading skeleton
  if (loading) {
    return <SymptomLogSkeleton />;
  }

  const symptomScore = calculateSymptomScore();
  const riskLevel = symptomScore < 30 ? 'Low' : symptomScore < 60 ? 'Moderate' : 'High';
  const riskColor = symptomScore < 30 ? 'text-green-600' : symptomScore < 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Card className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-display font-bold">บันทึกอาการวันนี้</h2>
        </div>
        <div className="flex items-center gap-3">
          {hasLoggedToday && (
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>บันทึกแล้ว</span>
            </div>
          )}
          {Object.keys(selectedSymptoms).length > 0 && (
            <div className="text-right">
              <div className={`text-2xl font-bold ${riskColor}`}>{symptomScore}</div>
              <div className="text-sm text-muted-foreground">คะแนนอาการ</div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* เวลาการอยู่กลางแจ้ง */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">⏰ เวลาการอยู่กลางแจ้งวันนี้</Label>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>เวลา: {outdoorTime} นาที</span>
              <span className="text-muted-foreground">
                {outdoorTime < 30 ? '🏠 อยู่ในบ้านส่วนใหญ่' : 
                 outdoorTime < 120 ? '🚶 ออกกลางแจ้งปานกลาง' : 
                 '🌳 ออกกลางแจ้งเป็นเวลานาน'}
              </span>
            </div>
            <Slider
              value={[outdoorTime]}
              onValueChange={(values) => setOutdoorTime(values[0])}
              min={0}
              max={480}
              step={15}
              className="w-full"
            />
          </div>
        </div>

        {/* อาการที่พบ */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">😷 อาการที่พบ (เลือกได้หลายอาการ)</Label>
          <div className="grid grid-cols-2 gap-3">
            {SYMPTOMS.map((symptom) => (
              <div key={symptom.id}>
                <button
                  type="button"
                  onClick={() => toggleSymptom(symptom.id)}
                  className={`w-full p-3 rounded-lg border-2 transition-all hover-scale ${
                    selectedSymptoms[symptom.id]
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{symptom.icon}</span>
                    <span className="text-sm font-medium">{symptom.label}</span>
                  </div>
                </button>
                
                {selectedSymptoms[symptom.id] && (
                  <div className="mt-2 space-y-1 animate-fade-in">
                    <div className="flex justify-between text-xs">
                      <span>ระดับ:</span>
                      <span className="font-semibold">
                        {selectedSymptoms[symptom.id]} / 5
                      </span>
                    </div>
                    <Slider
                      value={[selectedSymptoms[symptom.id]]}
                      onValueChange={(values) => updateSeverity(symptom.id, values[0])}
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ระดับความเสี่ยง */}
        {Object.keys(selectedSymptoms).length > 0 && (
          <div className={`p-4 rounded-lg border-2 animate-fade-in ${
            riskLevel === 'Low' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
            riskLevel === 'Moderate' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
            'border-red-500 bg-red-50 dark:bg-red-950/20'
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 mt-0.5 ${riskColor}`} />
              <div>
                <h4 className={`font-semibold ${riskColor}`}>
                  ระดับความเสี่ยง: {riskLevel === 'Low' ? 'ต่ำ' : riskLevel === 'Moderate' ? 'ปานกลาง' : 'สูง'}
                </h4>
                <p className="text-sm mt-1">
                  {riskLevel === 'Low' && 'อาการเล็กน้อย ควรสังเกตอาการต่อไป'}
                  {riskLevel === 'Moderate' && 'อาการปานกลาง ควรหลีกเลี่ยงพื้นที่มลพิษสูง'}
                  {riskLevel === 'High' && 'อาการหนัก ควรพักผ่อนและปรึกษาแพทย์หากอาการไม่ดีขึ้น'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* บันทึกเพิ่มเติม */}
        <div className="space-y-2">
          <Label htmlFor="notes">📝 บันทึกเพิ่มเติม (ถ้ามี)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="เช่น อาการเกิดหลังจากออกกลางแจ้ง, ดีขึ้นหลังใช้ยา..."
            rows={3}
          />
        </div>

        <Button
          onClick={handleSubmit}
          className="w-full"
          disabled={isSaving}
          size="lg"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              กำลังบันทึก...
            </span>
          ) : hasLoggedToday ? '🔄 อัปเดตอาการวันนี้' : '✅ บันทึกอาการวันนี้'}
        </Button>
      </div>
    </Card>
  );
};

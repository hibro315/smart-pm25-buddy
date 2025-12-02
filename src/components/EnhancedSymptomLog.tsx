import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useDailySymptoms } from '@/hooks/useDailySymptoms';
import { toast } from 'sonner';
import { Activity, AlertCircle } from 'lucide-react';

interface Symptom {
  id: string;
  label: string;
  icon: string;
}

// Only use symptoms that exist in the database schema
const SYMPTOMS: Symptom[] = [
  { id: 'cough', label: 'ไอ', icon: '🤧' },
  { id: 'sneeze', label: 'จาม', icon: '🤧' },
  { id: 'wheezing', label: 'หายใจมีเสียงหวีด', icon: '🌬️' },
  { id: 'chest_tightness', label: 'แน่นหน้าอก', icon: '💔' },
  { id: 'eye_irritation', label: 'แสบตา', icon: '👁️' },
  { id: 'fatigue', label: 'เหนื่อยง่าย', icon: '😴' },
  { id: 'shortness_of_breath', label: 'หายใจไม่สะดวก', icon: '😮‍💨' },
];

export const EnhancedSymptomLog = () => {
  const { todaySymptoms, saveSymptoms, loading } = useDailySymptoms();
  
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [outdoorTime, setOutdoorTime] = useState(60);

  useEffect(() => {
    if (todaySymptoms) {
      const symptoms: Record<string, number> = {};
      SYMPTOMS.forEach(symptom => {
        const hasSymptom = todaySymptoms[symptom.id as keyof typeof todaySymptoms];
        const severity = todaySymptoms[`${symptom.id}_severity` as keyof typeof todaySymptoms];
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
    const symptomData: any = {
      log_date: new Date().toISOString().split('T')[0],
      notes,
      symptom_score: calculateSymptomScore(),
    };

    SYMPTOMS.forEach(symptom => {
      symptomData[symptom.id] = !!selectedSymptoms[symptom.id];
      symptomData[`${symptom.id}_severity`] = selectedSymptoms[symptom.id] || null;
    });

    const success = await saveSymptoms(symptomData);
    
    if (success) {
      toast.success('บันทึกอาการสำเร็จ', {
        description: `คะแนนอาการ: ${symptomData.symptom_score}/100`,
      });
    }
  };

  const symptomScore = calculateSymptomScore();
  const riskLevel = symptomScore < 30 ? 'Low' : symptomScore < 60 ? 'Moderate' : 'High';
  const riskColor = symptomScore < 30 ? 'text-green-600' : symptomScore < 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-display font-bold">บันทึกอาการวันนี้</h2>
        </div>
        {Object.keys(selectedSymptoms).length > 0 && (
          <div className="text-right">
            <div className={`text-2xl font-bold ${riskColor}`}>{symptomScore}</div>
            <div className="text-sm text-muted-foreground">คะแนนอาการ</div>
          </div>
        )}
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
                  className={`w-full p-3 rounded-lg border-2 transition-all ${
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
                  <div className="mt-2 space-y-1">
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
          <div className={`p-4 rounded-lg border-2 ${
            riskLevel === 'Low' ? 'border-green-500 bg-green-50' :
            riskLevel === 'Moderate' ? 'border-yellow-500 bg-yellow-50' :
            'border-red-500 bg-red-50'
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 mt-0.5 ${riskColor}`} />
              <div>
                <h4 className={`font-semibold ${riskColor}`}>
                  ระดับความเสี่ยง: {riskLevel}
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
          disabled={loading}
          size="lg"
        >
          {loading ? 'กำลังบันทึก...' : '✅ บันทึกอาการวันนี้'}
        </Button>
      </div>
    </Card>
  );
};

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { usePHRI } from '@/hooks/usePHRI';
import { toast } from '@/hooks/use-toast';
import { Clock, User, Activity } from 'lucide-react';

interface PHRICalculatorProps {
  currentAQI?: number;
  currentPM25?: number;
  currentLocation?: string;
  onCalculated?: (phri: number) => void;
}

const symptomsList = [
  { id: 'cough', label: 'ไอ' },
  { id: 'sore_throat', label: 'เจ็บคอ' },
  { id: 'eye_irritation', label: 'แสบตา' },
  { id: 'breathing_difficulty', label: 'หายใจไม่สะดวก' },
  { id: 'headache', label: 'ปวดหัว' },
  { id: 'fatigue', label: 'อ่อนเพลีย' },
];

export const PHRICalculator = ({ 
  currentAQI = 0, 
  currentPM25 = 0, 
  currentLocation = '',
  onCalculated 
}: PHRICalculatorProps) => {
  const [outdoorTime, setOutdoorTime] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [wearingMask, setWearingMask] = useState(false);
  const { saveHealthLog, loading } = usePHRI();

  const handleSymptomToggle = (symptomId: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptomId)
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!outdoorTime || !age) {
      toast({
        title: 'กรุณากรอกข้อมูลให้ครบ',
        description: 'กรุณากรอกเวลาที่อยู่กลางแจ้งและอายุ',
        variant: 'destructive',
      });
      return;
    }

    const outdoorTimeNum = parseInt(outdoorTime);
    const ageNum = parseInt(age);

    if (outdoorTimeNum <= 0 || ageNum <= 0) {
      toast({
        title: 'ข้อมูลไม่ถูกต้อง',
        description: 'กรุณากรอกตัวเลขที่มากกว่า 0',
        variant: 'destructive',
      });
      return;
    }

    // Check mask warning for high PM2.5
    if (currentPM25 > 60 && !wearingMask) {
      toast({
        title: '⚠️ คำเตือน: ฝุ่น PM2.5 สูง',
        description: 'ค่าฝุ่น PM2.5 เกิน 60 คุณควรใส่หน้ากาก N95 เมื่ออยู่กลางแจ้ง',
        variant: 'destructive',
      });
    }

    try {
      const result = await saveHealthLog({
        aqi: currentAQI,
        pm25: currentPM25,
        outdoorTime: outdoorTimeNum,
        age: ageNum,
        gender: gender || 'ไม่ระบุ',
        hasSymptoms: selectedSymptoms.length > 0,
        symptoms: selectedSymptoms,
        location: currentLocation,
        wearingMask,
      });

      if (result && onCalculated) {
        onCalculated(result.phri);
      }

      // Reset form
      setOutdoorTime('');
      setAge('');
      setGender('');
      setSelectedSymptoms([]);
      setWearingMask(false);
    } catch (error) {
      console.error('Error submitting PHRI data:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          บันทึกข้อมูลสุขภาพ
        </CardTitle>
        <CardDescription>
          กรอกข้อมูลเพื่อคำนวณดัชนีความเสี่ยงส่วนบุคคล (PHRI)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="outdoorTime" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              เวลาที่อยู่กลางแจ้งวันนี้ (นาที)
            </Label>
            <Input
              id="outdoorTime"
              type="number"
              min="0"
              value={outdoorTime}
              onChange={(e) => setOutdoorTime(e.target.value)}
              placeholder="เช่น 60"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                อายุ
              </Label>
              <Input
                id="age"
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="เช่น 25"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">เพศ (ไม่บังคับ)</Label>
              <Input
                id="gender"
                type="text"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                placeholder="เช่น ชาย/หญิง"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>อาการที่พบ (ถ้ามี)</Label>
            <div className="grid grid-cols-2 gap-3">
              {symptomsList.map((symptom) => (
                <div key={symptom.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={symptom.id}
                    checked={selectedSymptoms.includes(symptom.id)}
                    onCheckedChange={() => handleSymptomToggle(symptom.id)}
                  />
                  <label
                    htmlFor={symptom.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {symptom.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {currentPM25 > 60 && (
            <div className="p-4 rounded-lg bg-warning/10 border border-warning">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-warning mb-1">
                    ⚠️ ค่าฝุ่น PM2.5 สูง ({currentPM25.toFixed(1)} µg/m³)
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    แนะนำให้สวมหน้ากาก N95 เมื่ออยู่กลางแจ้ง
                  </p>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="wearing-mask"
                      checked={wearingMask}
                      onCheckedChange={(checked) => setWearingMask(checked as boolean)}
                    />
                    <label
                      htmlFor="wearing-mask"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      ฉันได้สวมหน้ากากเมื่ออยู่กลางแจ้ง
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึกและคำนวณ PHRI'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

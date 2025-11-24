import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVitalSigns } from '@/hooks/useVitalSigns';
import { toast } from '@/hooks/use-toast';
import { Heart, Activity, Thermometer, Droplet } from 'lucide-react';

interface VitalSignsInputProps {
  onCalculated?: (result: any) => void;
}

export const VitalSignsInput = ({ onCalculated }: VitalSignsInputProps) => {
  const [heartRate, setHeartRate] = useState('');
  const [respirationRate, setRespirationRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [spo2, setSpo2] = useState('');
  const { saveVitalSigns, fetchVitalSigns, loading } = useVitalSigns();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!heartRate || !respirationRate || !temperature || !bpSystolic || !bpDiastolic || !spo2) {
      toast({
        title: 'กรุณากรอกข้อมูลให้ครบ',
        description: 'กรุณากรอกข้อมูลสัญญาณชีพทั้งหมด',
        variant: 'destructive',
      });
      return;
    }

    const data = {
      heartRate: parseInt(heartRate),
      respirationRate: parseInt(respirationRate),
      temperature: parseFloat(temperature),
      bpSystolic: parseInt(bpSystolic),
      bpDiastolic: parseInt(bpDiastolic),
      spo2: parseInt(spo2),
    };

    // Validate ranges
    if (
      data.heartRate <= 0 ||
      data.respirationRate <= 0 ||
      data.temperature <= 0 ||
      data.bpSystolic <= 0 ||
      data.bpDiastolic <= 0 ||
      data.spo2 <= 0 ||
      data.spo2 > 100
    ) {
      toast({
        title: 'ข้อมูลไม่ถูกต้อง',
        description: 'กรุณากรอกค่าที่ถูกต้อง',
        variant: 'destructive',
      });
      return;
    }

    const history = await fetchVitalSigns(3);
    const result = await saveVitalSigns(data, history);

    if (result && onCalculated) {
      onCalculated(result);
    }

    // Reset form
    setHeartRate('');
    setRespirationRate('');
    setTemperature('');
    setBpSystolic('');
    setBpDiastolic('');
    setSpo2('');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          บันทึกสัญญาณชีพ
        </CardTitle>
        <CardDescription>กรอกข้อมูลสัญญาณชีพของคุณ</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heartRate" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Heart Rate (bpm)
              </Label>
              <Input
                id="heartRate"
                type="number"
                min="30"
                max="200"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="เช่น 72"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="respirationRate" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Respiration Rate (ครั้ง/นาที)
              </Label>
              <Input
                id="respirationRate"
                type="number"
                min="5"
                max="40"
                value={respirationRate}
                onChange={(e) => setRespirationRate(e.target.value)}
                placeholder="เช่น 16"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature" className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Temperature (°C)
              </Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="33"
                max="42"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="เช่น 36.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spo2" className="flex items-center gap-2">
                <Droplet className="h-4 w-4" />
                SpO₂ (%)
              </Label>
              <Input
                id="spo2"
                type="number"
                min="50"
                max="100"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                placeholder="เช่น 98"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Blood Pressure (mmHg)</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                min="60"
                max="220"
                value={bpSystolic}
                onChange={(e) => setBpSystolic(e.target.value)}
                placeholder="Systolic (เช่น 120)"
                required
              />
              <Input
                type="number"
                min="30"
                max="150"
                value={bpDiastolic}
                onChange={(e) => setBpDiastolic(e.target.value)}
                placeholder="Diastolic (เช่น 80)"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึกและวิเคราะห์'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

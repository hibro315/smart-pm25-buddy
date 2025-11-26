import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useEnhancedPHRI, EnhancedPHRIInput } from '@/hooks/useEnhancedPHRI';
import { usePersonalizedRecommendation } from '@/hooks/usePersonalizedRecommendation';
import { useExposureHistory } from '@/hooks/useExposureHistory';
import { useHealthProfile } from '@/hooks/useHealthProfile';
import { Loader2, Activity, Heart, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SmartPHRICalculatorProps {
  currentPM25: number;
  currentAQI: number;
  currentLocation: string;
  temperature?: number;
  humidity?: number;
  latitude?: number;
  longitude?: number;
}

export const SmartPHRICalculator = ({
  currentPM25,
  currentAQI,
  currentLocation,
  temperature,
  humidity,
  latitude,
  longitude,
}: SmartPHRICalculatorProps) => {
  const { profile } = useHealthProfile();
  const { calculateEnhancedPHRI, saveEnhancedPHRILog, loading: phriLoading } = useEnhancedPHRI();
  const { generateRecommendations, recommendations, loading: recLoading } = usePersonalizedRecommendation();
  const { saveExposureLog } = useExposureHistory();

  const [outdoorTime, setOutdoorTime] = useState(60);
  const [wearingMask, setWearingMask] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [exerciseIntensity, setExerciseIntensity] = useState<'none' | 'light' | 'moderate' | 'vigorous'>('none');
  const [result, setResult] = useState<any>(null);

  const symptomsList = [
    { id: 'cough', label: 'ไอ' },
    { id: 'sore throat', label: 'เจ็บคอ' },
    { id: 'nasal congestion', label: 'คัดจมูก' },
    { id: 'shortness of breath', label: 'หายใจลำบาก' },
    { id: 'chest pain', label: 'แน่นหน้าอก' },
    { id: 'headache', label: 'ปวดหัว' },
    { id: 'eye irritation', label: 'ตาแสบ' },
  ];

  const toggleSymptom = (symptomId: string) => {
    setSymptoms(prev =>
      prev.includes(symptomId)
        ? prev.filter(s => s !== symptomId)
        : [...prev, symptomId]
    );
  };

  const handleCalculate = async () => {
    if (!profile) {
      toast({
        title: 'กรุณาตั้งค่าโปรไฟล์ก่อน',
        description: 'ต้องมีข้อมูลสุขภาพเพื่อคำนวณ PHRI',
        variant: 'destructive',
      });
      return;
    }

    const input: EnhancedPHRIInput = {
      pm25: currentPM25,
      aqi: currentAQI,
      temperature,
      humidity,
      age: profile.age,
      gender: profile.gender,
      weight: profile.weight,
      chronicConditions: profile.chronicConditions,
      dustSensitivity: profile.dustSensitivity,
      physicalActivity: profile.physicalActivity,
      hasAirPurifier: profile.hasAirPurifier,
      outdoorTime,
      wearingMask,
      exerciseIntensity,
      hasSymptoms: symptoms.length > 0,
      symptoms,
      location: currentLocation,
      latitude,
      longitude,
    };

    // Calculate PHRI
    const phriResult = calculateEnhancedPHRI(input);
    setResult(phriResult);

    // Save to database
    await saveEnhancedPHRILog(input, phriResult);

    // Save to exposure history
    await saveExposureLog({
      pm25: currentPM25,
      aqi: currentAQI,
      location: currentLocation,
      latitude,
      longitude,
      outdoorTime,
      phri: phriResult.phri,
      symptoms,
      wearingMask,
      temperature,
      humidity,
    });

    // Generate personalized recommendations
    const location = latitude && longitude ? { lat: latitude, lng: longitude } : undefined;
    await generateRecommendations(
      phriResult,
      profile.chronicConditions,
      location,
      temperature,
      humidity
    );
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'emergency': return 'bg-red-500 text-white';
      case 'urgent': return 'bg-orange-500 text-white';
      case 'warning': return 'bg-yellow-500 text-black';
      default: return 'bg-green-500 text-white';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Smart PHRI Calculator</h3>
          </div>

          {/* Current Conditions */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">PM2.5</p>
              <p className="text-lg font-bold">{currentPM25} µg/m³</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">AQI</p>
              <p className="text-lg font-bold">{currentAQI}</p>
            </div>
            {temperature && (
              <div>
                <p className="text-xs text-muted-foreground">อุณหภูมิ</p>
                <p className="text-lg font-bold">{temperature}°C</p>
              </div>
            )}
            {humidity && (
              <div>
                <p className="text-xs text-muted-foreground">ความชื้น</p>
                <p className="text-lg font-bold">{humidity}%</p>
              </div>
            )}
          </div>

          {/* Outdoor Time */}
          <div>
            <Label>เวลาอยู่นอกอาคาร (นาที)</Label>
            <Input
              type="number"
              value={outdoorTime}
              onChange={(e) => setOutdoorTime(Number(e.target.value))}
              min={0}
              max={1440}
            />
          </div>

          {/* Exercise Intensity */}
          <div>
            <Label>ความหนักของกิจกรรม</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                { value: 'none', label: 'ไม่มี' },
                { value: 'light', label: 'เบา' },
                { value: 'moderate', label: 'ปานกลาง' },
                { value: 'vigorous', label: 'หนัก' },
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  variant={exerciseIntensity === value ? 'default' : 'outline'}
                  onClick={() => setExerciseIntensity(value as any)}
                  size="sm"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Mask Wearing */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="mask"
              checked={wearingMask}
              onCheckedChange={(checked) => setWearingMask(checked as boolean)}
            />
            <Label htmlFor="mask" className="cursor-pointer">
              สวมหน้ากาก (N95 หรือเทียบเท่า)
            </Label>
          </div>

          {/* Symptoms */}
          <div>
            <Label className="mb-2 block">อาการวันนี้</Label>
            <div className="grid grid-cols-2 gap-2">
              {symptomsList.map(({ id, label }) => (
                <div key={id} className="flex items-center space-x-2">
                  <Checkbox
                    id={id}
                    checked={symptoms.includes(id)}
                    onCheckedChange={() => toggleSymptom(id)}
                  />
                  <Label htmlFor={id} className="cursor-pointer text-sm">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Calculate Button */}
          <Button
            onClick={handleCalculate}
            disabled={phriLoading || !profile}
            className="w-full"
            size="lg"
          >
            {phriLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                กำลังคำนวณ...
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 mr-2" />
                คำนวณ PHRI
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* PHRI Result */}
      {result && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getAlertColor(result.alertLevel)} text-3xl font-bold mb-2`}>
                {result.phri}
              </div>
              <p className="text-lg font-semibold">{result.recommendation}</p>
              <Badge className={`mt-2 ${getAlertColor(result.alertLevel)}`}>
                {result.alertLevel.toUpperCase()}
              </Badge>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">สิ่งแวดล้อม</p>
                <p className="font-semibold">{result.environmentalScore}</p>
              </div>
              <div>
                <p className="text-muted-foreground">อากาศ</p>
                <p className="font-semibold">{result.weatherScore}</p>
              </div>
              <div>
                <p className="text-muted-foreground">AQI</p>
                <p className="font-semibold">{result.aqiScore}</p>
              </div>
              <div>
                <p className="text-muted-foreground">สุขภาพ</p>
                <p className="font-semibold">{result.personalScore}</p>
              </div>
              <div>
                <p className="text-muted-foreground">พฤติกรรม</p>
                <p className="font-semibold">{result.behavioralScore}</p>
              </div>
              <div>
                <p className="text-muted-foreground">ป้องกัน</p>
                <p className="font-semibold text-green-600">-{result.protectiveScore}</p>
              </div>
            </div>

            {/* Personalized Advice */}
            {result.personalizedAdvice.length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <p className="font-semibold text-sm">คำแนะนำเฉพาะบุคคล:</p>
                {result.personalizedAdvice.map((advice: string, index: number) => (
                  <p key={index} className="text-sm text-muted-foreground">• {advice}</p>
                ))}
              </div>
            )}

            {/* Immediate Actions */}
            {result.immediateActions.length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <p className="font-semibold text-sm">การดำเนินการทันที:</p>
                </div>
                {result.immediateActions.map((action: string, index: number) => (
                  <p key={index} className="text-sm">• {action}</p>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Personalized Recommendations */}
      {recommendations && (
        <Card className="p-6">
          <h4 className="font-semibold mb-3">คำแนะนำส่วนบุคคล</h4>
          
          {recommendations.healthTips.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">💊 สุขภาพ:</p>
              {recommendations.healthTips.map((tip, i) => (
                <p key={i} className="text-sm text-muted-foreground mb-1">• {tip}</p>
              ))}
            </div>
          )}

          {recommendations.locationBasedAdvice.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">📍 ตำแหน่ง:</p>
              {recommendations.locationBasedAdvice.map((advice, i) => (
                <p key={i} className="text-sm text-muted-foreground mb-1">• {advice}</p>
              ))}
            </div>
          )}

          {recommendations.timingRecommendations.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">⏰ เวลา:</p>
              {recommendations.timingRecommendations.map((rec, i) => (
                <p key={i} className="text-sm text-muted-foreground mb-1">• {rec}</p>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

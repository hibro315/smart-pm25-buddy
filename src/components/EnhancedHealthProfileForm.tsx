import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useHealthProfile } from '@/hooks/useHealthProfile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Activity, Wind, Heart } from 'lucide-react';

const CHRONIC_CONDITIONS = [
  { id: 'asthma', label: 'หอบหืด' },
  { id: 'allergy', label: 'ภูมิแพ้' },
  { id: 'sinusitis', label: 'ไซนัสอักเสบ' },
  { id: 'copd', label: 'COPD' },
  { id: 'heart_disease', label: 'โรคหัวใจ' },
  { id: 'diabetes', label: 'เบาหวาน' },
  { id: 'hypertension', label: 'ความดันโลหิตสูง' },
  { id: 'other', label: 'อื่นๆ' },
];

const MASK_TYPES = [
  { id: 'n95', label: 'N95' },
  { id: 'kf94', label: 'KF94' },
  { id: 'surgical', label: 'Surgical Mask' },
  { id: 'cloth', label: 'หน้ากากผ้า' },
];

const POLLUTION_SOURCES = [
  { id: 'road', label: 'ถนนใหญ่' },
  { id: 'factory', label: 'โรงงาน' },
  { id: 'construction', label: 'สถานีก่อสร้าง' },
];

export const EnhancedHealthProfileForm = () => {
  const { profile, saveProfile, loading } = useHealthProfile();
  
  // State for all form fields
  const [name, setName] = useState(profile?.name || '');
  const [age, setAge] = useState(profile?.age || 30);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(profile?.gender || 'male');
  const [height, setHeight] = useState(profile?.height || 0);
  const [weight, setWeight] = useState(profile?.weight || 0);
  const [occupation, setOccupation] = useState(profile?.occupation || '');
  const [workEnvironment, setWorkEnvironment] = useState<'outdoor' | 'indoor' | 'mixed'>(profile?.workEnvironment || 'indoor');
  const [location, setLocation] = useState(profile?.location || '');
  
  const [chronicConditions, setChronicConditions] = useState<string[]>(profile?.chronicConditions || []);
  const [allergies, setAllergies] = useState(profile?.allergies || '');
  const [immunoCompromised, setImmunoCompromised] = useState(profile?.immunoCompromised || false);
  const [smokingStatus, setSmokingStatus] = useState<'non_smoker' | 'occasional' | 'regular'>(profile?.smokingStatus || 'non_smoker');
  const [alcoholConsumption, setAlcoholConsumption] = useState<'none' | 'occasional' | 'regular'>(profile?.alcoholConsumption || 'none');
  const [exerciseFrequency, setExerciseFrequency] = useState(profile?.exerciseFrequency || 0);
  
  const [dustSensitivity, setDustSensitivity] = useState<'low' | 'medium' | 'high'>(profile?.dustSensitivity || 'medium');
  const [hasAirPurifier, setHasAirPurifier] = useState(profile?.hasAirPurifier || false);
  const [maskUsage, setMaskUsage] = useState<'none' | 'regular' | 'n95' | 'kf94'>(profile?.maskUsage || 'none');
  const [selectedMaskTypes, setSelectedMaskTypes] = useState<string[]>([]);
  const [maskFrequency, setMaskFrequency] = useState<'daily' | 'high_dust' | 'rarely' | 'none'>('none');
  const [selectedPollutionSources, setSelectedPollutionSources] = useState<string[]>([]);
  const [outdoorTimeDaily, setOutdoorTimeDaily] = useState(profile?.outdoorTimeDaily || 60);
  const [physicalActivity, setPhysicalActivity] = useState<'sedentary' | 'moderate' | 'active'>(profile?.physicalActivity || 'moderate');

  // Calculate BMI
  const bmi = height && weight ? (weight / ((height / 100) ** 2)).toFixed(1) : '0';

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.age);
      setGender(profile.gender);
      setHeight(profile.height || 0);
      setWeight(profile.weight || 0);
      setOccupation(profile.occupation || '');
      setWorkEnvironment(profile.workEnvironment || 'indoor');
      setLocation(profile.location || '');
      setChronicConditions(profile.chronicConditions);
      setAllergies(profile.allergies || '');
      setImmunoCompromised(profile.immunoCompromised || false);
      setSmokingStatus(profile.smokingStatus || 'non_smoker');
      setAlcoholConsumption(profile.alcoholConsumption || 'none');
      setExerciseFrequency(profile.exerciseFrequency || 0);
      setDustSensitivity(profile.dustSensitivity);
      setHasAirPurifier(profile.hasAirPurifier);
      setMaskUsage(profile.maskUsage || 'none');
      setOutdoorTimeDaily(profile.outdoorTimeDaily || 60);
      setPhysicalActivity(profile.physicalActivity);
    }
  }, [profile]);

  const handleConditionToggle = (conditionId: string) => {
    setChronicConditions(prev =>
      prev.includes(conditionId)
        ? prev.filter(id => id !== conditionId)
        : [...prev, conditionId]
    );
  };

  const handleMaskTypeToggle = (maskId: string) => {
    setSelectedMaskTypes(prev =>
      prev.includes(maskId)
        ? prev.filter(id => id !== maskId)
        : [...prev, maskId]
    );
  };

  const handlePollutionSourceToggle = (sourceId: string) => {
    setSelectedPollutionSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await saveProfile({
      name,
      age,
      gender,
      height: height || undefined,
      weight: weight || undefined,
      occupation: occupation || undefined,
      workEnvironment: workEnvironment || undefined,
      location: location || undefined,
      chronicConditions,
      allergies: allergies || undefined,
      immunoCompromised,
      smokingStatus,
      alcoholConsumption,
      exerciseFrequency,
      dustSensitivity,
      hasAirPurifier,
      maskUsage,
      outdoorTimeDaily,
      physicalActivity,
    });
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-display font-bold">โปรไฟล์สุขภาพ</h2>
        </div>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">ข้อมูลส่วนตัว</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">สุขภาพ</span>
            </TabsTrigger>
            <TabsTrigger value="environment" className="flex items-center gap-2">
              <Wind className="w-4 h-4" />
              <span className="hidden sm:inline">สิ่งแวดล้อม</span>
            </TabsTrigger>
            <TabsTrigger value="lifestyle" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">ไลฟ์สไตล์</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: ข้อมูลส่วนตัวพื้นฐาน */}
          <TabsContent value="personal" className="space-y-4 mt-6">
            <div>
              <Label htmlFor="name">ชื่อ-นามสกุล</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="กรอกชื่อของคุณ"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age">อายุ (ปี)</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  min={1}
                  max={150}
                />
              </div>

              <div>
                <Label>เพศ</Label>
                <RadioGroup value={gender} onValueChange={(v) => setGender(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">ชาย</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">หญิง</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other">อื่นๆ</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="height">ส่วนสูง (ซม.)</Label>
                <Input
                  id="height"
                  type="number"
                  value={height || ''}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  placeholder="เช่น 170"
                />
              </div>

              <div>
                <Label htmlFor="weight">น้ำหนัก (กก.)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={weight || ''}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  placeholder="เช่น 65"
                />
              </div>

              <div>
                <Label>BMI</Label>
                <Input value={bmi} disabled className="bg-muted" />
              </div>
            </div>

            <div>
              <Label htmlFor="occupation">อาชีพ</Label>
              <Input
                id="occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="เช่น พนักงานบริษัท, นักเรียน"
              />
            </div>

            <div>
              <Label>ลักษณะการทำงาน</Label>
              <RadioGroup value={workEnvironment} onValueChange={(v) => setWorkEnvironment(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="indoor" id="indoor" />
                  <Label htmlFor="indoor">ในอาคาร</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="outdoor" id="outdoor" />
                  <Label htmlFor="outdoor">กลางแจ้ง</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mixed" id="mixed" />
                  <Label htmlFor="mixed">ทั้งสองแบบ</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="location">ที่อยู่ปัจจุบัน (อำเภอ/เขต)</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="เช่น เขตบางรัก, อ.เมือง"
              />
            </div>
          </TabsContent>

          {/* Tab 2: ประวัติสุขภาพพื้นฐาน */}
          <TabsContent value="health" className="space-y-4 mt-6">
            <div>
              <Label className="mb-3 block">โรคประจำตัว</Label>
              <div className="grid grid-cols-2 gap-3">
                {CHRONIC_CONDITIONS.map((condition) => (
                  <div key={condition.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={condition.id}
                      checked={chronicConditions.includes(condition.id)}
                      onCheckedChange={() => handleConditionToggle(condition.id)}
                    />
                    <Label htmlFor={condition.id} className="font-normal cursor-pointer">
                      {condition.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="allergies">ประวัติการแพ้ยา/อาหาร</Label>
              <Textarea
                id="allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="เช่น แพ้เพนิซิลิน, แพ้กุ้ง"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="immunoCompromised"
                checked={immunoCompromised}
                onCheckedChange={(checked) => setImmunoCompromised(checked as boolean)}
              />
              <Label htmlFor="immunoCompromised" className="font-normal cursor-pointer">
                มีภาวะภูมิคุ้มกันบกพร่อง
              </Label>
            </div>

            <div>
              <Label>การสูบบุหรี่</Label>
              <RadioGroup value={smokingStatus} onValueChange={(v) => setSmokingStatus(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non_smoker" id="non_smoker" />
                  <Label htmlFor="non_smoker">ไม่สูบ</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="occasional" id="smoke_occasional" />
                  <Label htmlFor="smoke_occasional">สูบนาน ๆ ครั้ง</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="regular" id="smoke_regular" />
                  <Label htmlFor="smoke_regular">สูบประจำ</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>การดื่มแอลกอฮอล์</Label>
              <RadioGroup value={alcoholConsumption} onValueChange={(v) => setAlcoholConsumption(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="alcohol_none" />
                  <Label htmlFor="alcohol_none">ไม่ดื่ม</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="occasional" id="alcohol_occasional" />
                  <Label htmlFor="alcohol_occasional">ดื่มเป็นครั้งคราว</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="regular" id="alcohol_regular" />
                  <Label htmlFor="alcohol_regular">ดื่มประจำ</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="exerciseFrequency">การออกกำลังกาย (ครั้ง/สัปดาห์)</Label>
              <Input
                id="exerciseFrequency"
                type="number"
                value={exerciseFrequency}
                onChange={(e) => setExerciseFrequency(Number(e.target.value))}
                min={0}
                max={30}
              />
            </div>
          </TabsContent>

          {/* Tab 3: ปัจจัยเสี่ยงด้านคุณภาพอากาศ */}
          <TabsContent value="environment" className="space-y-4 mt-6">
            <div>
              <Label>ความไวต่อฝุ่น/อากาศเย็น</Label>
              <RadioGroup value={dustSensitivity} onValueChange={(v) => setDustSensitivity(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="dust_low" />
                  <Label htmlFor="dust_low">ต่ำ</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="dust_medium" />
                  <Label htmlFor="dust_medium">ปานกลาง</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="dust_high" />
                  <Label htmlFor="dust_high">สูง</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasAirPurifier"
                checked={hasAirPurifier}
                onCheckedChange={(checked) => setHasAirPurifier(checked as boolean)}
              />
              <Label htmlFor="hasAirPurifier" className="font-normal cursor-pointer">
                มีเครื่องฟอกอากาศในบ้าน
              </Label>
            </div>

            <div>
              <Label>ความถี่ในการใช้หน้ากากอนามัย</Label>
              <RadioGroup value={maskFrequency} onValueChange={(v) => setMaskFrequency(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="mask_freq_daily" />
                  <Label htmlFor="mask_freq_daily">ใช้ทุกวัน</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high_dust" id="mask_freq_dust" />
                  <Label htmlFor="mask_freq_dust">ใช้เฉพาะวันที่ฝุ่นสูง</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rarely" id="mask_freq_rarely" />
                  <Label htmlFor="mask_freq_rarely">ไม่ค่อยใช้</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="mask_freq_none" />
                  <Label htmlFor="mask_freq_none">ไม่ใช้</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="mb-3 block">ประเภทหน้ากากที่ใช้ (เลือกได้หลายข้อ)</Label>
              <div className="grid grid-cols-2 gap-3">
                {MASK_TYPES.map((mask) => (
                  <div key={mask.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={mask.id}
                      checked={selectedMaskTypes.includes(mask.id)}
                      onCheckedChange={() => handleMaskTypeToggle(mask.id)}
                    />
                    <Label htmlFor={mask.id} className="font-normal cursor-pointer">
                      {mask.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-3 block">ทำงาน/เรียนใกล้แหล่งมลพิษ (เลือกได้หลายข้อ)</Label>
              <div className="grid grid-cols-2 gap-3">
                {POLLUTION_SOURCES.map((source) => (
                  <div key={source.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={source.id}
                      checked={selectedPollutionSources.includes(source.id)}
                      onCheckedChange={() => handlePollutionSourceToggle(source.id)}
                    />
                    <Label htmlFor={source.id} className="font-normal cursor-pointer">
                      {source.label}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="no_pollution"
                  checked={selectedPollutionSources.length === 0}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedPollutionSources([]);
                  }}
                />
                <Label htmlFor="no_pollution" className="font-normal cursor-pointer">
                  ไม่มี
                </Label>
              </div>
            </div>

            <div>
              <Label htmlFor="outdoorTimeDaily">เวลาอยู่กลางแจ้งต่อวัน (นาที)</Label>
              <Input
                id="outdoorTimeDaily"
                type="number"
                value={outdoorTimeDaily}
                onChange={(e) => setOutdoorTimeDaily(Number(e.target.value))}
                min={0}
                max={1440}
              />
            </div>
          </TabsContent>

          {/* Tab 4: ไลฟ์สไตล์และกิจกรรม */}
          <TabsContent value="lifestyle" className="space-y-4 mt-6">
            <div>
              <Label>ระดับกิจกรรมทางกาย</Label>
              <RadioGroup value={physicalActivity} onValueChange={(v) => setPhysicalActivity(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sedentary" id="sedentary" />
                  <Label htmlFor="sedentary">นั่งทำงาน ไม่ค่อยเคลื่อนไหว</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="moderate" id="moderate" />
                  <Label htmlFor="moderate">ปานกลาง เดินเคลื่อนไหวบ้าง</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="active" />
                  <Label htmlFor="active">มีการออกแรงหรือเดินมาก</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold">สรุปข้อมูล</h4>
              <div className="text-sm space-y-1">
                <p>• อายุ: {age} ปี | เพศ: {gender === 'male' ? 'ชาย' : gender === 'female' ? 'หญิง' : 'อื่นๆ'}</p>
                {height && weight && <p>• BMI: {bmi} {Number(bmi) < 18.5 ? '(น้ำหนักต่ำ)' : Number(bmi) < 25 ? '(ปกติ)' : Number(bmi) < 30 ? '(น้ำหนักเกิน)' : '(อ้วน)'}</p>}
                <p>• โรคประจำตัว: {chronicConditions.length} โรค</p>
                <p>• ความไวต่อฝุ่น: {dustSensitivity === 'low' ? 'ต่ำ' : dustSensitivity === 'medium' ? 'ปานกลาง' : 'สูง'}</p>
                <p>• กิจกรรมทางกาย: {physicalActivity === 'sedentary' ? 'นั่งทำงาน' : physicalActivity === 'moderate' ? 'ปานกลาง' : 'มาก'}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
        </Button>
      </form>
    </Card>
  );
};

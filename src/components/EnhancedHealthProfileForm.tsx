import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHealthProfile, HealthProfile } from '@/hooks/useHealthProfile';
import { User, Heart, Activity, Shield, Wind } from 'lucide-react';

const CHRONIC_CONDITIONS = [
  { id: 'asthma', label: 'โรคหอบหืด (Asthma)' },
  { id: 'allergy', label: 'โรคภูมิแพ้ (Allergy)' },
  { id: 'COPD', label: 'โรคปอดอุดกั้นเรื้อรัง (COPD)' },
  { id: 'heart disease', label: 'โรคหัวใจ (Heart Disease)' },
  { id: 'hypertension', label: 'ความดันโลหิตสูง' },
  { id: 'diabetes', label: 'เบาหวาน' },
];

export const EnhancedHealthProfileForm = () => {
  const { profile, saving, saveProfile } = useHealthProfile();
  const [formData, setFormData] = useState<HealthProfile>(profile);

  const handleConditionToggle = (conditionId: string) => {
    const updated = formData.chronicConditions.includes(conditionId)
      ? formData.chronicConditions.filter(id => id !== conditionId)
      : [...formData.chronicConditions, conditionId];
    setFormData({ ...formData, chronicConditions: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile(formData);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          โปรไฟล์สุขภาพส่วนบุคคล
        </CardTitle>
        <CardDescription>
          กรุณากรอกข้อมูลเพื่อให้ระบบคำนวณความเสี่ยง PHRI ได้แม่นยำ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">อายุ (ปี) *</Label>
              <Input
                id="age"
                type="number"
                min="1"
                max="150"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">เพศ *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger id="gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ชาย</SelectItem>
                  <SelectItem value="female">หญิง</SelectItem>
                  <SelectItem value="other">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">น้ำหนัก (กก.)</Label>
              <Input
                id="weight"
                type="number"
                min="1"
                max="300"
                value={formData.weight || ''}
                onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || undefined })}
              />
            </div>
          </div>

          {/* Chronic Conditions */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              โรคประจำตัว
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CHRONIC_CONDITIONS.map((condition) => (
                <div key={condition.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={condition.id}
                    checked={formData.chronicConditions.includes(condition.id)}
                    onCheckedChange={() => handleConditionToggle(condition.id)}
                  />
                  <label
                    htmlFor={condition.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {condition.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Dust Sensitivity */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Wind className="h-4 w-4" />
              ความไวต่อฝุ่น *
            </Label>
            <RadioGroup
              value={formData.dustSensitivity}
              onValueChange={(value: 'low' | 'medium' | 'high') =>
                setFormData({ ...formData, dustSensitivity: value })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low">ต่ำ (ไม่ค่อยมีปัญหา)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">ปานกลาง (มีปัญหาบางครั้ง)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high">สูง (มีปัญหาบ่อย)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Physical Activity */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              ระดับกิจกรรมทางกาย *
            </Label>
            <RadioGroup
              value={formData.physicalActivity}
              onValueChange={(value: 'sedentary' | 'moderate' | 'active') =>
                setFormData({ ...formData, physicalActivity: value })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sedentary" id="sedentary" />
                <Label htmlFor="sedentary">นั่งทำงาน/ไม่ค่อยเคลื่อนไหว</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="moderate" id="moderate" />
                <Label htmlFor="moderate">ปานกลาง (เดินบ้าง ยืนบ้าง)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="active" />
                <Label htmlFor="active">ออกกำลังกายเป็นประจำ</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Protective Equipment */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              อุปกรณ์ป้องกัน
            </Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="airPurifier"
                checked={formData.hasAirPurifier}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hasAirPurifier: checked as boolean })
                }
              />
              <label
                htmlFor="airPurifier"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                มีเครื่องฟอกอากาศในบ้าน
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

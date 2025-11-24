import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const healthConditions = [
  { id: "asthma", label: "โรคหอบหืด", severity: "high" },
  { id: "copd", label: "โรคปอดอุดกั้นเรื้อรัง (COPD)", severity: "high" },
  { id: "heart", label: "โรคหัวใจ", severity: "high" },
  { id: "diabetes", label: "โรคเบาหวาน", severity: "medium" },
  { id: "allergy", label: "โรคภูมิแพ้ทางเดินหายใจ", severity: "medium" },
  { id: "elderly", label: "ผู้สูงอายุ (65 ปีขึ้นไป)", severity: "medium" },
  { id: "children", label: "เด็กเล็ก (ต่ำกว่า 5 ปี)", severity: "medium" },
  { id: "pregnant", label: "หญิงตั้งครรภ์", severity: "high" },
];

export interface UserHealthProfile {
  conditions: string[];
  name: string;
  age: string;
  emergencyContact: string;
  medications: string;
}

interface HealthProfileFormProps {
  onSave?: (profile: UserHealthProfile) => void;
  initialProfile?: UserHealthProfile;
}

export const HealthProfileForm = ({ onSave, initialProfile }: HealthProfileFormProps) => {
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    initialProfile?.conditions || []
  );
  const [name, setName] = useState(initialProfile?.name || "");
  const [age, setAge] = useState(initialProfile?.age || "");
  const [emergencyContact, setEmergencyContact] = useState(
    initialProfile?.emergencyContact || ""
  );
  const [medications, setMedications] = useState(initialProfile?.medications || "");

  const handleToggle = (conditionId: string) => {
    setSelectedConditions(prev =>
      prev.includes(conditionId)
        ? prev.filter(id => id !== conditionId)
        : [...prev, conditionId]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("กรุณากรอกชื่อของคุณ");
      return;
    }

    const profile: UserHealthProfile = {
      conditions: selectedConditions,
      name: name.trim(),
      age: age.trim(),
      emergencyContact: emergencyContact.trim(),
      medications: medications.trim(),
    };

    onSave?.(profile);
    toast.success("บันทึกข้อมูลสุขภาพเรียบร้อยแล้ว", {
      description: `โรคประจำตัว ${selectedConditions.length} รายการ`
    });
  };

  const highRiskConditions = selectedConditions.filter(id => 
    healthConditions.find(c => c.id === id)?.severity === "high"
  );

  return (
    <Card className="shadow-card">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-destructive" />
          <h2 className="text-xl font-semibold text-foreground">ข้อมูลสุขภาพของคุณ</h2>
        </div>

        {highRiskConditions.length > 0 && (
          <Alert variant="destructive" className="bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              คุณมีโรคประจำตัวกลุ่มเสี่ยงสูง {highRiskConditions.length} โรค 
              โปรดปฏิบัติตามคำแนะนำอย่างเคร่งครัดเมื่อค่า PM2.5 สูง
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">ชื่อ-นามสกุล *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="กรอกชื่อของคุณ"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">อายุ</Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="กรอกอายุของคุณ"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency">เบอร์ติดต่อฉุกเฉิน</Label>
            <Input
              id="emergency"
              type="tel"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="เบอร์โทรศัพท์ผู้ติดต่อฉุกเฉิน"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medications">ยาที่ใช้ประจำ</Label>
            <Textarea
              id="medications"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              placeholder="ระบุยาที่ใช้ประจำ (ถ้ามี)"
              className="w-full min-h-[80px]"
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-base">โรคประจำตัว/ภาวะสุขภาพ</Label>
            <p className="text-sm text-muted-foreground">
              เลือกโรคประจำตัวหรือภาวะสุขภาพที่คุณมี
            </p>
            <div className="space-y-3">
              {healthConditions.map((condition) => (
                <div key={condition.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={condition.id}
                    checked={selectedConditions.includes(condition.id)}
                    onCheckedChange={() => handleToggle(condition.id)}
                  />
                  <Label
                    htmlFor={condition.id}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {condition.label}
                    {condition.severity === "high" && (
                      <span className="ml-2 text-xs text-destructive">
                        (กลุ่มเสี่ยงสูง)
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSave}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Save className="w-4 h-4 mr-2" />
          บันทึกข้อมูล
        </Button>
      </div>
    </Card>
  );
};


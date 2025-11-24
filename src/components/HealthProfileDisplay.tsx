import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Heart, Pill, Phone, Edit } from "lucide-react";
import { UserHealthProfile } from "./HealthProfileForm";

interface HealthProfileDisplayProps {
  profile: UserHealthProfile;
  onEdit: () => void;
}

const conditionLabels: Record<string, string> = {
  asthma: "โรคหอบหืด",
  copd: "โรคปอดอุดกั้นเรื้อรัง",
  heart: "โรคหัวใจ",
  diabetes: "โรคเบาหวาน",
  allergy: "โรคภูมิแพ้ทางเดินหายใจ",
  elderly: "ผู้สูงอายุ",
  children: "เด็กเล็ก",
  pregnant: "หญิงตั้งครรภ์",
};

export const HealthProfileDisplay = ({ profile, onEdit }: HealthProfileDisplayProps) => {
  return (
    <Card className="shadow-card">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">โปรไฟล์สุขภาพ</h2>
          </div>
          <Button onClick={onEdit} variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            แก้ไข
          </Button>
        </div>

        <div className="space-y-3">
          {profile.name && (
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 mt-1 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">ชื่อ</p>
                <p className="font-medium text-foreground">{profile.name}</p>
              </div>
            </div>
          )}

          {profile.age && (
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 mt-1 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">อายุ</p>
                <p className="font-medium text-foreground">{profile.age} ปี</p>
              </div>
            </div>
          )}

          {profile.emergencyContact && (
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 mt-1 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">เบอร์ฉุกเฉิน</p>
                <a 
                  href={`tel:${profile.emergencyContact}`}
                  className="font-medium text-primary hover:underline"
                >
                  {profile.emergencyContact}
                </a>
              </div>
            </div>
          )}

          {profile.conditions.length > 0 && (
            <div className="flex items-start gap-3">
              <Heart className="w-4 h-4 mt-1 text-destructive" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">โรคประจำตัว</p>
                <div className="flex flex-wrap gap-2">
                  {profile.conditions.map((conditionId) => (
                    <Badge key={conditionId} variant="outline" className="bg-destructive/10 border-destructive/20">
                      {conditionLabels[conditionId] || conditionId}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {profile.medications && (
            <div className="flex items-start gap-3">
              <Pill className="w-4 h-4 mt-1 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">ยาที่ใช้ประจำ</p>
                <p className="text-sm text-foreground mt-1">{profile.medications}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

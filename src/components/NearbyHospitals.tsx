import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hospital, Phone, MapPin, Navigation } from "lucide-react";

interface Hospital {
  id: string;
  name: string;
  distance: string;
  phone: string;
  address: string;
  specialties: string[];
}

const hospitals: Hospital[] = [
  {
    id: "1",
    name: "โรงพยาบาลจุฬาลงกรณ์",
    distance: "2.5 กม.",
    phone: "02-256-4000",
    address: "1873 ถ.พระราม 4 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ",
    specialties: ["โรคทางเดินหายใจ", "โรคหัวใจ", "ฉุกเฉิน 24 ชม."]
  },
  {
    id: "2",
    name: "โรงพยาบาลรามาธิบดี",
    distance: "3.8 กม.",
    phone: "02-201-1000",
    address: "270 ถ.พระราม 6 แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพฯ",
    specialties: ["โรคปอด", "โรคภูมิแพ้", "ฉุกเฉิน 24 ชม."]
  },
  {
    id: "3",
    name: "โรงพยาบาลศิริราช",
    distance: "5.2 กม.",
    phone: "02-419-7000",
    address: "2 ถ.วังหลัง แขวงศิริราช เขตบางกอกน้อย กรุงเทพฯ",
    specialties: ["โรคทางเดินหายใจ", "โรคหอบหืด", "ฉุกเฉิน 24 ชม."]
  },
];

export const NearbyHospitals = () => {
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleNavigate = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  return (
    <Card className="shadow-card">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Hospital className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            โรงพยาบาลใกล้เคียง
          </h2>
        </div>

        <p className="text-sm text-muted-foreground">
          โรงพยาบาลที่รองรับการรักษาโรคทางเดินหายใจและโรคที่เกี่ยวข้องกับ PM2.5
        </p>

        <div className="space-y-3">
          {hospitals.map((hospital) => (
            <Card key={hospital.id} className="bg-muted/30 border-border hover:shadow-md transition-smooth">
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold text-foreground">
                      {hospital.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{hospital.distance}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {hospital.address}
                </p>

                <div className="flex flex-wrap gap-1">
                  {hospital.specialties.map((specialty, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleCall(hospital.phone)}
                    size="sm"
                    className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    โทร
                  </Button>
                  <Button
                    onClick={() => handleNavigate(hospital.address)}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    นำทาง
                  </Button>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {hospital.phone}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="pt-2 space-y-2">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm font-semibold text-destructive mb-1">
              ⚠️ ฉุกเฉิน? โทร 1669
            </p>
            <p className="text-xs text-muted-foreground">
              สายด่วนการแพทย์ฉุกเฉินของประเทศไทย
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

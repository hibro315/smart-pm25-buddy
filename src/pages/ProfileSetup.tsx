import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useHealthProfile } from '@/hooks/useHealthProfile';
import { WelcomeAnimation } from '@/components/WelcomeAnimation';
import { Heart, User, Activity, Wind, ChevronRight, ChevronLeft, Sparkles, Shield, CheckCircle2, Edit3 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

const CHRONIC_CONDITIONS = [
  { id: 'asthma', label: 'หอบหืด', icon: '🫁' },
  { id: 'allergy', label: 'ภูมิแพ้', icon: '🤧' },
  { id: 'sinusitis', label: 'ไซนัสอักเสบ', icon: '👃' },
  { id: 'copd', label: 'COPD', icon: '💨' },
  { id: 'heart_disease', label: 'โรคหัวใจ', icon: '❤️' },
  { id: 'diabetes', label: 'เบาหวาน', icon: '🩸' },
  { id: 'hypertension', label: 'ความดันโลหิตสูง', icon: '📊' },
  { id: 'none', label: 'ไม่มีโรคประจำตัว', icon: '✅' },
];

const steps = [
  { id: 'personal', title: 'ข้อมูลส่วนตัว', icon: User, description: 'บอกเราเกี่ยวกับตัวคุณ' },
  { id: 'health', title: 'สุขภาพ', icon: Heart, description: 'ประวัติสุขภาพของคุณ' },
  { id: 'environment', title: 'สิ่งแวดล้อม', icon: Wind, description: 'ปัจจัยเสี่ยงรอบตัว' },
  { id: 'lifestyle', title: 'ไลฟ์สไตล์', icon: Activity, description: 'กิจกรรมประจำวัน' },
  { id: 'confirm', title: 'ยืนยัน', icon: CheckCircle2, description: 'ตรวจสอบข้อมูล' },
];

export default function ProfileSetup() {
  const { saveProfile, saving } = useHealthProfile();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward
  const [showWelcome, setShowWelcome] = useState(false);
  const [savedName, setSavedName] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [height, setHeight] = useState<number | undefined>();
  const [weight, setWeight] = useState<number | undefined>();
  const [occupation, setOccupation] = useState<'indoor' | 'outdoor' | 'student' | 'other'>('indoor');
  const [location, setLocation] = useState('');
  
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [smokingStatus, setSmokingStatus] = useState<'non_smoker' | 'occasional' | 'regular'>('non_smoker');
  const [alcoholConsumption, setAlcoholConsumption] = useState<'none' | 'occasional' | 'regular'>('none');
  
  const [dustSensitivity, setDustSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  const [hasAirPurifier, setHasAirPurifier] = useState(false);
  const [maskUsage, setMaskUsage] = useState<'none' | 'regular' | 'n95' | 'kf94'>('none');
  
  const [physicalActivity, setPhysicalActivity] = useState<'sedentary' | 'moderate' | 'active'>('moderate');
  const [outdoorTimeRange, setOutdoorTimeRange] = useState<'<1' | '1-3' | '3-5' | '>5'>('1-3');
  const [exerciseFrequency, setExerciseFrequency] = useState<'0' | '1-2' | '3-4' | '5+'>('1-2');

  const progress = ((currentStep + 1) / steps.length) * 100;

  // Animation variants for step transitions
  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
  };

  const handleConditionToggle = (conditionId: string) => {
    if (conditionId === 'none') {
      setChronicConditions(['none']);
    } else {
      setChronicConditions(prev => {
        const filtered = prev.filter(id => id !== 'none');
        return filtered.includes(conditionId)
          ? filtered.filter(id => id !== conditionId)
          : [...filtered, conditionId];
      });
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setDirection(stepIndex > currentStep ? 1 : -1);
    setCurrentStep(stepIndex);
  };

  const handleSubmit = async () => {
    // Convert to integer for database compatibility
    const exerciseFreqValue = exerciseFrequency === '0' ? 0 : exerciseFrequency === '1-2' ? 2 : exerciseFrequency === '3-4' ? 4 : 5;
    const outdoorTimeValue = outdoorTimeRange === '<1' ? 30 : outdoorTimeRange === '1-3' ? 120 : outdoorTimeRange === '3-5' ? 240 : 360;

    try {
      const success = await saveProfile({
        name: name || 'ผู้ใช้',
        age,
        gender,
        height,
        weight,
        occupation,
        workEnvironment: occupation === 'outdoor' ? 'outdoor' : occupation === 'indoor' ? 'indoor' : 'mixed',
        location,
        chronicConditions: chronicConditions.filter(c => c !== 'none'),
        smokingStatus,
        alcoholConsumption,
        exerciseFrequency: exerciseFreqValue,
        dustSensitivity,
        hasAirPurifier,
        maskUsage,
        outdoorTimeDaily: outdoorTimeValue,
        physicalActivity,
      });

      if (success) {
        setSavedName(name || 'ผู้ใช้');
        setShowWelcome(true);
      } else {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Profile save error:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    }
  };

  const handleWelcomeComplete = () => {
    window.location.href = '/';
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return age > 0 && gender;
      case 1:
        return chronicConditions.length > 0;
      case 2:
        return dustSensitivity;
      case 3:
        return physicalActivity;
      case 4:
        return true; // Confirmation step is always valid
      default:
        return true;
    }
  };

  return (
    <>
      <WelcomeAnimation 
        show={showWelcome} 
        userName={savedName}
        onComplete={handleWelcomeComplete}
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">ตั้งค่าโปรไฟล์สุขภาพ</span>
          </div>
          <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            สร้างโปรไฟล์สุขภาพของคุณ
          </h1>
          <p className="text-muted-foreground mt-2">
            เพื่อให้เราดูแลสุขภาพของคุณได้อย่างเฉพาะเจาะจง
          </p>
        </motion.div>

        {/* Progress */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <div className="flex justify-between mb-3">
            {steps.map((step, index) => (
              <motion.div 
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex flex-col items-center ${index <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${index < currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : index === currentStep 
                      ? 'bg-primary/20 border-2 border-primary text-primary' 
                      : 'bg-muted text-muted-foreground'
                  }
                `}>
                  <step.icon className="w-5 h-5" />
                </div>
                <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
              </motion.div>
            ))}
          </div>
          <Progress value={progress} className="h-2 bg-muted" />
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl">
            <AnimatePresence mode="wait" custom={direction}>
              {/* Step 1: Personal Info */}
              {currentStep === 0 && (
                <motion.div
                  key="personal"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">ข้อมูลส่วนตัว</h2>
                      <p className="text-sm text-muted-foreground">บอกเราเกี่ยวกับตัวคุณ</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="name">ชื่อ-นามสกุล (ไม่บังคับ)</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="กรอกชื่อของคุณ"
                      className="mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="age">อายุ (ปี) *</Label>
                      <Input
                        id="age"
                        type="number"
                        value={age}
                        onChange={(e) => setAge(Number(e.target.value))}
                        min={1}
                        max={150}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>เพศ *</Label>
                      <RadioGroup value={gender} onValueChange={(v) => setGender(v as typeof gender)} className="mt-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="male" />
                          <Label htmlFor="male" className="font-normal">ชาย</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="female" />
                          <Label htmlFor="female" className="font-normal">หญิง</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="other" id="other" />
                          <Label htmlFor="other" className="font-normal">อื่นๆ</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="height">ส่วนสูง (ซม.)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={height || ''}
                        onChange={(e) => setHeight(Number(e.target.value) || undefined)}
                        placeholder="170"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="weight">น้ำหนัก (กก.)</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={weight || ''}
                        onChange={(e) => setWeight(Number(e.target.value) || undefined)}
                        placeholder="65"
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>อาชีพ</Label>
                    <RadioGroup value={occupation} onValueChange={(v) => setOccupation(v as typeof occupation)} className="mt-2 grid grid-cols-2 gap-2">
                      {[
                        { value: 'indoor', label: 'ทำงานในอาคาร' },
                        { value: 'outdoor', label: 'ทำงานกลางแจ้ง' },
                        { value: 'student', label: 'นักเรียน/นักศึกษา' },
                        { value: 'other', label: 'อื่นๆ' },
                      ].map(opt => (
                        <div key={opt.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt.value} id={`occ_${opt.value}`} />
                          <Label htmlFor={`occ_${opt.value}`} className="font-normal">{opt.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="location">ที่อยู่ (อำเภอ/เขต)</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="เช่น เขตบางรัก"
                      className="mt-2"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Health History */}
              {currentStep === 1 && (
                <motion.div
                  key="health"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">ประวัติสุขภาพ</h2>
                      <p className="text-sm text-muted-foreground">เลือกโรคประจำตัวของคุณ</p>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-4 block">โรคประจำตัว (เลือกได้หลายข้อ) *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {CHRONIC_CONDITIONS.map((condition) => (
                        <motion.div 
                          key={condition.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                            ${chronicConditions.includes(condition.id)
                              ? 'bg-primary/10 border-primary'
                              : 'bg-muted/30 border-border/50 hover:border-primary/50'
                            }
                          `}
                          onClick={() => handleConditionToggle(condition.id)}
                        >
                          <Checkbox
                            id={condition.id}
                            checked={chronicConditions.includes(condition.id)}
                            className="pointer-events-none"
                          />
                          <span className="text-lg">{condition.icon}</span>
                          <Label htmlFor={condition.id} className="font-normal cursor-pointer flex-1">
                            {condition.label}
                          </Label>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>การสูบบุหรี่</Label>
                      <RadioGroup value={smokingStatus} onValueChange={(v) => setSmokingStatus(v as typeof smokingStatus)} className="mt-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="non_smoker" id="non_smoker" />
                          <Label htmlFor="non_smoker" className="font-normal">ไม่สูบ</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="occasional" id="occasional_smoke" />
                          <Label htmlFor="occasional_smoke" className="font-normal">สูบเป็นครั้งคราว</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="regular" id="regular_smoke" />
                          <Label htmlFor="regular_smoke" className="font-normal">สูบประจำ</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div>
                      <Label>การดื่มแอลกอฮอล์</Label>
                      <RadioGroup value={alcoholConsumption} onValueChange={(v) => setAlcoholConsumption(v as typeof alcoholConsumption)} className="mt-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="none" id="no_alcohol" />
                          <Label htmlFor="no_alcohol" className="font-normal">ไม่ดื่ม</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="occasional" id="occasional_alcohol" />
                          <Label htmlFor="occasional_alcohol" className="font-normal">ดื่มเป็นครั้งคราว</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="regular" id="regular_alcohol" />
                          <Label htmlFor="regular_alcohol" className="font-normal">ดื่มประจำ</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Environment */}
              {currentStep === 2 && (
                <motion.div
                  key="environment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                      <Wind className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">ปัจจัยสิ่งแวดล้อม</h2>
                      <p className="text-sm text-muted-foreground">ความเสี่ยงจากมลพิษ</p>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block">ความไวต่อฝุ่น PM2.5 *</Label>
                    <RadioGroup value={dustSensitivity} onValueChange={(v) => setDustSensitivity(v as typeof dustSensitivity)} className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'low', label: 'ต่ำ', desc: 'ไม่ค่อยมีอาการ', color: 'bg-safe/10 border-safe' },
                        { value: 'medium', label: 'ปานกลาง', desc: 'มีอาการบ้าง', color: 'bg-warning/10 border-warning' },
                        { value: 'high', label: 'สูง', desc: 'มีอาการบ่อย', color: 'bg-danger/10 border-danger' },
                      ].map(opt => (
                        <motion.div
                          key={opt.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            p-4 rounded-xl border-2 cursor-pointer text-center transition-all
                            ${dustSensitivity === opt.value ? opt.color : 'bg-muted/30 border-border/50'}
                          `}
                          onClick={() => setDustSensitivity(opt.value as typeof dustSensitivity)}
                        >
                          <RadioGroupItem value={opt.value} id={`dust_${opt.value}`} className="sr-only" />
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
                        </motion.div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="mb-3 block">การใช้หน้ากาก</Label>
                    <RadioGroup value={maskUsage} onValueChange={(v) => setMaskUsage(v as typeof maskUsage)} className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'none', label: 'ไม่ใช้', icon: '😷' },
                        { value: 'regular', label: 'หน้ากากทั่วไป', icon: '😷' },
                        { value: 'n95', label: 'N95', icon: '🛡️' },
                        { value: 'kf94', label: 'KF94', icon: '🛡️' },
                      ].map(opt => (
                        <motion.div
                          key={opt.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                            ${maskUsage === opt.value 
                              ? 'bg-primary/10 border-primary' 
                              : 'bg-muted/30 border-border/50 hover:border-primary/50'
                            }
                          `}
                          onClick={() => setMaskUsage(opt.value as typeof maskUsage)}
                        >
                          <RadioGroupItem value={opt.value} id={`mask_${opt.value}`} className="sr-only" />
                          <span className="text-xl">{opt.icon}</span>
                          <span className="font-normal">{opt.label}</span>
                        </motion.div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div>
                      <Label className="font-medium">มีเครื่องฟอกอากาศ</Label>
                      <p className="text-xs text-muted-foreground">ที่บ้านหรือที่ทำงาน</p>
                    </div>
                    <Checkbox 
                      checked={hasAirPurifier} 
                      onCheckedChange={(checked) => setHasAirPurifier(checked as boolean)}
                      className="w-6 h-6"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 4: Lifestyle */}
              {currentStep === 3 && (
                <motion.div
                  key="lifestyle"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">ไลฟ์สไตล์</h2>
                      <p className="text-sm text-muted-foreground">กิจกรรมประจำวัน</p>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block">ระดับกิจกรรมทางกาย *</Label>
                    <RadioGroup value={physicalActivity} onValueChange={(v) => setPhysicalActivity(v as typeof physicalActivity)} className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'sedentary', label: 'นั่งทำงาน', desc: 'ไม่ค่อยเคลื่อนไหว', icon: '🪑' },
                        { value: 'moderate', label: 'ปานกลาง', desc: 'เดินบ้าง', icon: '🚶' },
                        { value: 'active', label: 'กระตือรือร้น', desc: 'ออกกำลังกายบ่อย', icon: '🏃' },
                      ].map(opt => (
                        <motion.div
                          key={opt.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            p-4 rounded-xl border-2 cursor-pointer text-center transition-all
                            ${physicalActivity === opt.value 
                              ? 'bg-primary/10 border-primary' 
                              : 'bg-muted/30 border-border/50 hover:border-primary/50'
                            }
                          `}
                          onClick={() => setPhysicalActivity(opt.value as typeof physicalActivity)}
                        >
                          <RadioGroupItem value={opt.value} id={`activity_${opt.value}`} className="sr-only" />
                          <div className="text-2xl mb-1">{opt.icon}</div>
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.desc}</div>
                        </motion.div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="mb-3 block">เวลาอยู่กลางแจ้งต่อวัน</Label>
                    <RadioGroup value={outdoorTimeRange} onValueChange={(v) => setOutdoorTimeRange(v as typeof outdoorTimeRange)} className="grid grid-cols-4 gap-2">
                      {[
                        { value: '<1', label: '< 1 ชม.' },
                        { value: '1-3', label: '1-3 ชม.' },
                        { value: '3-5', label: '3-5 ชม.' },
                        { value: '>5', label: '> 5 ชม.' },
                      ].map(opt => (
                        <motion.div
                          key={opt.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            p-3 rounded-xl border cursor-pointer text-center transition-all text-sm
                            ${outdoorTimeRange === opt.value 
                              ? 'bg-primary/10 border-primary' 
                              : 'bg-muted/30 border-border/50'
                            }
                          `}
                          onClick={() => setOutdoorTimeRange(opt.value as typeof outdoorTimeRange)}
                        >
                          <RadioGroupItem value={opt.value} id={`outdoor_${opt.value}`} className="sr-only" />
                          {opt.label}
                        </motion.div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="mb-3 block">ความถี่ในการออกกำลังกาย (ครั้ง/สัปดาห์)</Label>
                    <RadioGroup value={exerciseFrequency} onValueChange={(v) => setExerciseFrequency(v as typeof exerciseFrequency)} className="grid grid-cols-4 gap-2">
                      {[
                        { value: '0', label: 'ไม่ออก' },
                        { value: '1-2', label: '1-2 ครั้ง' },
                        { value: '3-4', label: '3-4 ครั้ง' },
                        { value: '5+', label: '5+ ครั้ง' },
                      ].map(opt => (
                        <motion.div
                          key={opt.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            p-3 rounded-xl border cursor-pointer text-center transition-all text-sm
                            ${exerciseFrequency === opt.value 
                              ? 'bg-primary/10 border-primary' 
                              : 'bg-muted/30 border-border/50'
                            }
                          `}
                          onClick={() => setExerciseFrequency(opt.value as typeof exerciseFrequency)}
                        >
                          <RadioGroupItem value={opt.value} id={`exercise_${opt.value}`} className="sr-only" />
                          {opt.label}
                        </motion.div>
                      ))}
                    </RadioGroup>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Confirmation */}
              {currentStep === 4 && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">ยืนยันข้อมูล</h2>
                      <p className="text-sm text-muted-foreground">ตรวจสอบข้อมูลก่อนบันทึก</p>
                    </div>
                  </div>

                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {/* Personal Info Summary */}
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            <h3 className="font-medium">ข้อมูลส่วนตัว</h3>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCurrentStep(0)}
                            className="h-8 gap-1 text-xs"
                          >
                            <Edit3 className="w-3 h-3" />
                            แก้ไข
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">ชื่อ:</div>
                          <div>{name || 'ไม่ระบุ'}</div>
                          <div className="text-muted-foreground">อายุ:</div>
                          <div>{age} ปี</div>
                          <div className="text-muted-foreground">เพศ:</div>
                          <div>{gender === 'male' ? 'ชาย' : gender === 'female' ? 'หญิง' : 'อื่นๆ'}</div>
                          {height && (
                            <>
                              <div className="text-muted-foreground">ส่วนสูง:</div>
                              <div>{height} ซม.</div>
                            </>
                          )}
                          {weight && (
                            <>
                              <div className="text-muted-foreground">น้ำหนัก:</div>
                              <div>{weight} กก.</div>
                            </>
                          )}
                          <div className="text-muted-foreground">อาชีพ:</div>
                          <div>{occupation === 'indoor' ? 'ทำงานในอาคาร' : occupation === 'outdoor' ? 'ทำงานกลางแจ้ง' : occupation === 'student' ? 'นักเรียน/นักศึกษา' : 'อื่นๆ'}</div>
                          {location && (
                            <>
                              <div className="text-muted-foreground">ที่อยู่:</div>
                              <div>{location}</div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Health History Summary */}
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-destructive" />
                            <h3 className="font-medium">ประวัติสุขภาพ</h3>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCurrentStep(1)}
                            className="h-8 gap-1 text-xs"
                          >
                            <Edit3 className="w-3 h-3" />
                            แก้ไข
                          </Button>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">โรคประจำตัว: </span>
                            <span>
                              {chronicConditions.includes('none') 
                                ? 'ไม่มี' 
                                : chronicConditions.map(c => CHRONIC_CONDITIONS.find(cc => cc.id === c)?.label).join(', ')
                              }
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">การสูบบุหรี่: </span>
                            <span>{smokingStatus === 'non_smoker' ? 'ไม่สูบ' : smokingStatus === 'occasional' ? 'สูบบ้าง' : 'สูบประจำ'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">การดื่มแอลกอฮอล์: </span>
                            <span>{alcoholConsumption === 'none' ? 'ไม่ดื่ม' : alcoholConsumption === 'occasional' ? 'ดื่มบ้าง' : 'ดื่มประจำ'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Environment Summary */}
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Wind className="w-4 h-4 text-blue-500" />
                            <h3 className="font-medium">สิ่งแวดล้อม</h3>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCurrentStep(2)}
                            className="h-8 gap-1 text-xs"
                          >
                            <Edit3 className="w-3 h-3" />
                            แก้ไข
                          </Button>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">ความไวต่อฝุ่น: </span>
                            <span>{dustSensitivity === 'low' ? 'ต่ำ' : dustSensitivity === 'medium' ? 'ปานกลาง' : 'สูง'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">เครื่องฟอกอากาศ: </span>
                            <span>{hasAirPurifier ? 'มี' : 'ไม่มี'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">การใช้หน้ากาก: </span>
                            <span>
                              {maskUsage === 'none' ? 'ไม่ใช้' : maskUsage === 'regular' ? 'หน้ากากผ้า/อนามัย' : maskUsage === 'n95' ? 'N95' : 'KF94'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lifestyle Summary */}
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-orange-500" />
                            <h3 className="font-medium">ไลฟ์สไตล์</h3>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCurrentStep(3)}
                            className="h-8 gap-1 text-xs"
                          >
                            <Edit3 className="w-3 h-3" />
                            แก้ไข
                          </Button>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">กิจกรรม: </span>
                            <span>{physicalActivity === 'sedentary' ? 'นั่งทำงาน' : physicalActivity === 'moderate' ? 'ปานกลาง' : 'กระฉับกระเฉง'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">เวลากลางแจ้ง: </span>
                            <span>
                              {outdoorTimeRange === '<1' ? 'น้อยกว่า 1 ชม.' : outdoorTimeRange === '1-3' ? '1-3 ชม.' : outdoorTimeRange === '3-5' ? '3-5 ชม.' : 'มากกว่า 5 ชม.'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">ออกกำลังกาย: </span>
                            <span>
                              {exerciseFrequency === '0' ? 'ไม่ออก' : exerciseFrequency === '1-2' ? '1-2 ครั้ง/สัปดาห์' : exerciseFrequency === '3-4' ? '3-4 ครั้ง/สัปดาห์' : '5+ ครั้ง/สัปดาห์'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                    <p className="text-sm text-center text-green-700 dark:text-green-300">
                      ✅ ข้อมูลครบถ้วน พร้อมบันทึก
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-border/50">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                ย้อนกลับ
              </Button>

              {currentStep === steps.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={saving || !isStepValid()}
                  className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  {saving ? (
                    <>กำลังบันทึก...</>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      เริ่มใช้งาน
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid()}
                  className="gap-2"
                >
                  ถัดไป
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Footer Note */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          ข้อมูลของคุณจะถูกเก็บอย่างปลอดภัยและใช้เพื่อให้คำแนะนำด้านสุขภาพเฉพาะบุคคล
        </motion.p>
      </div>
    </div>
    </>
  );
}

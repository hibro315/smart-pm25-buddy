import { z } from 'zod';

// Health Profile Validation Schema
export const healthProfileSchema = z.object({
  // ข้อมูลส่วนตัวพื้นฐาน
  name: z.string().min(1, 'กรุณากรอกชื่อ').optional(),
  age: z.number()
    .min(1, 'อายุต้องมากกว่า 0 ปี')
    .max(150, 'อายุต้องน้อยกว่า 150 ปี')
    .int('อายุต้องเป็นจำนวนเต็ม'),
  gender: z.union([
    z.literal('male'),
    z.literal('female'),
    z.literal('other'),
  ]),
  height: z.number()
    .min(50, 'ส่วนสูงต้องมากกว่า 50 ซม.')
    .max(250, 'ส่วนสูงต้องน้อยกว่า 250 ซม.')
    .optional(),
  weight: z.number()
    .min(1, 'น้ำหนักต้องมากกว่า 0 กก.')
    .max(500, 'น้ำหนักต้องน้อยกว่า 500 กก.')
    .optional(),
  occupation: z.string().optional(),
  workEnvironment: z.union([
    z.literal('outdoor'),
    z.literal('indoor'),
    z.literal('mixed'),
  ]).optional(),
  location: z.string().optional(),
  
  // ประวัติสุขภาพพื้นฐาน
  chronicConditions: z.array(z.string()).max(10, 'สามารถเลือกได้สูงสุด 10 โรค'),
  allergies: z.string().optional(),
  immunoCompromised: z.boolean().optional(),
  smokingStatus: z.union([
    z.literal('non_smoker'),
    z.literal('occasional'),
    z.literal('regular'),
  ]).optional(),
  alcoholConsumption: z.union([
    z.literal('none'),
    z.literal('occasional'),
    z.literal('regular'),
  ]).optional(),
  exerciseFrequency: z.number().min(0).max(30).optional(),
  
  // ปัจจัยเสี่ยงด้านคุณภาพอากาศ
  dustSensitivity: z.union([
    z.literal('low'),
    z.literal('medium'),
    z.literal('high'),
  ]),
  hasAirPurifier: z.boolean(),
  maskUsage: z.union([
    z.literal('none'),
    z.literal('regular'),
    z.literal('n95'),
    z.literal('kf94'),
  ]).optional(),
  outdoorTimeDaily: z.number().min(0).max(1440).optional(),
  physicalActivity: z.union([
    z.literal('sedentary'),
    z.literal('moderate'),
    z.literal('active'),
  ]),
});

export type HealthProfileInput = z.infer<typeof healthProfileSchema>;

// PHRI Input Validation Schema
export const phriInputSchema = z.object({
  pm25: z.number().min(0).max(1000, 'PM2.5 ต้องอยู่ระหว่าง 0-1000'),
  aqi: z.number().min(0).max(500, 'AQI ต้องอยู่ระหว่าง 0-500'),
  outdoorTime: z.number().min(0).max(24, 'เวลากลางแจ้งต้องอยู่ระหว่าง 0-24 ชั่วโมง'),
  age: z.number().min(1).max(150),
  chronicConditions: z.array(z.string()).optional(),
  dustSensitivity: z.union([
    z.literal('low'),
    z.literal('medium'),
    z.literal('high'),
  ]).optional(),
  physicalActivity: z.union([
    z.literal('sedentary'),
    z.literal('moderate'),
    z.literal('active'),
  ]).optional(),
  hasAirPurifier: z.boolean().optional(),
  hasSymptoms: z.boolean().optional(),
  wearingMask: z.boolean().optional(),
});

export type PHRIInput = z.infer<typeof phriInputSchema>;

// Vital Signs Validation Schema
export const vitalSignsSchema = z.object({
  heartRate: z.number()
    .min(30, 'อัตราการเต้นหัวใจต้องอยู่ระหว่าง 30-200')
    .max(200, 'อัตราการเต้นหัวใจต้องอยู่ระหว่าง 30-200'),
  respirationRate: z.number()
    .min(5, 'อัตราการหายใจต้องอยู่ระหว่าง 5-40')
    .max(40, 'อัตราการหายใจต้องอยู่ระหว่าง 5-40'),
  temperature: z.number()
    .min(33, 'อุณหภูมิร่างกายต้องอยู่ระหว่าง 33-42°C')
    .max(42, 'อุณหภูมิร่างกายต้องอยู่ระหว่าง 33-42°C'),
  bpSystolic: z.number()
    .min(60, 'ความดันโลหิตต้องอยู่ระหว่าง 60-220 mmHg')
    .max(220, 'ความดันโลหิตต้องอยู่ระหว่าง 60-220 mmHg'),
  bpDiastolic: z.number()
    .min(30, 'ความดันโลหิตต้องอยู่ระหว่าง 30-150 mmHg')
    .max(150, 'ความดันโลหิตต้องอยู่ระหว่าง 30-150 mmHg'),
  spo2: z.number()
    .min(50, 'SpO2 ต้องอยู่ระหว่าง 50-100%')
    .max(100, 'SpO2 ต้องอยู่ระหว่าง 50-100%'),
}).refine(
  (data) => data.bpSystolic > data.bpDiastolic,
  {
    message: 'ความดันโลหิตตัวบนต้องมากกว่าตัวล่าง',
    path: ['bpSystolic'],
  }
);

export type VitalSignsInput = z.infer<typeof vitalSignsSchema>;

// Location Validation
export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Latitude ต้องอยู่ระหว่าง -90 ถึง 90'),
  longitude: z.number().min(-180).max(180, 'Longitude ต้องอยู่ระหว่าง -180 ถึง 180'),
});

export type LocationInput = z.infer<typeof locationSchema>;

// Sanitization helpers
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

export const sanitizeArray = (arr: string[]): string[] => {
  return arr
    .filter((item) => typeof item === 'string')
    .map(sanitizeString)
    .slice(0, 20); // Limit array length
};

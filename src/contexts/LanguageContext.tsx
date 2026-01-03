import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Language = 'th' | 'en' | 'zh';

const LANGUAGE_STORAGE_KEY = 'airguard_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  th: {
    // Common
    'app.name': 'AirGuard Health',
    'common.save': 'บันทึก',
    'common.cancel': 'ยกเลิก',
    'common.next': 'ถัดไป',
    'common.back': 'ย้อนกลับ',
    'common.edit': 'แก้ไข',
    'common.delete': 'ลบ',
    'common.loading': 'กำลังโหลด...',
    'common.saving': 'กำลังบันทึก...',
    'common.error': 'เกิดข้อผิดพลาด',
    'common.success': 'สำเร็จ',
    'common.yes': 'ใช่',
    'common.no': 'ไม่',
    'common.refresh': 'รีเฟรช',
    'common.close': 'ปิด',
    'common.search': 'ค้นหา',
    'common.send': 'ส่ง',
    'common.start': 'เริ่ม',
    'common.stop': 'หยุด',
    
    // Navigation
    'nav.home': 'หน้าหลัก',
    'nav.dashboard': 'แดชบอร์ด',
    'nav.map': 'แผนที่',
    'nav.chat': 'แชท',
    'nav.notifications': 'การแจ้งเตือน',
    'nav.settings': 'ตั้งค่า',
    
    // Home Page
    'home.brand': 'Smart PM2.5',
    'home.subtitle': 'Personal Health Intelligence',
    'home.loading': 'กำลังรับรู้...',
    'home.air.excellent': 'อากาศสะอาดบริสุทธิ์',
    'home.air.good': 'อากาศดี',
    'home.air.moderate': 'อากาศปานกลาง',
    'home.air.unhealthy.sensitive': 'เริ่มมีมลพิษ',
    'home.air.unhealthy': 'มลพิษสูง',
    'home.air.hazardous': 'อากาศไม่ดีต่อสุขภาพ',
    'home.tap.speak': 'แตะเพื่อพูดคุย',
    'home.pm25': 'PM2.5',
    'home.temperature': 'อุณหภูมิ',
    'home.humidity': 'ความชื้น',
    'home.personal.risk': 'ความเสี่ยงส่วนบุคคล',
    'home.explore.more': 'สำรวจเพิ่มเติม',
    'home.health.dashboard': 'Health Dashboard',
    'home.health.dashboard.desc': 'สถิติและแนวโน้มสุขภาพ',
    'home.environment.map': 'Environment Map',
    'home.environment.map.desc': 'แผนที่คุณภาพอากาศ',
    'home.ai.consultant': 'AI Consultant',
    'home.ai.consultant.desc': 'ที่ปรึกษาสุขภาพ AI',
    'home.alerts.settings': 'Alerts & Settings',
    'home.alerts.settings.desc': 'การแจ้งเตือนและตั้งค่า',
    
    // Dashboard Page
    'dashboard.title': 'Health Dashboard',
    'dashboard.subtitle': 'ระบบติดตามสุขภาพอัจฉริยะ',
    'dashboard.phri': 'ดัชนีความเสี่ยงสุขภาพ',
    'dashboard.aqi': 'คุณภาพอากาศ',
    'dashboard.advice': 'คำแนะนำ',
    'dashboard.tab.trends': 'เทรนด์',
    'dashboard.tab.analysis': 'วิเคราะห์',
    'dashboard.tab.history': 'ประวัติ',
    'dashboard.tab.profile': 'โปรไฟล์',
    'dashboard.health.profile': 'โปรไฟล์สุขภาพ',
    'dashboard.health.profile.desc': 'แก้ไขข้อมูลเพื่อรับคำแนะนำที่เหมาะสม',
    'dashboard.decision.safe': 'ทำกิจกรรมกลางแจ้งได้ตามปกติ',
    'dashboard.decision.caution': 'จำกัดกิจกรรมกลางแจ้ง ใส่หน้ากากหากออกนอกอาคาร',
    'dashboard.decision.warning': 'หลีกเลี่ยงกิจกรรมกลางแจ้ง อยู่ในอาคารที่มีเครื่องฟอกอากาศ',
    'dashboard.decision.danger': 'อยู่ในอาคารปิด หลีกเลี่ยงออกนอกบ้านโดยเด็ดขาด',
    'dashboard.respiratory.condition': 'มีโรคทางเดินหายใจ - ปรับเกณฑ์เข้มงวดขึ้น',
    'dashboard.action.mask': 'สวมหน้ากาก N95',
    'dashboard.action.indoor': 'อยู่ในอาคาร',
    'dashboard.action.immediate': 'ทันที',
    
    // Chat Page
    'chat.title': 'Health AI',
    'chat.subtitle': 'ผู้ช่วยสุขภาพอัจฉริยะ',
    'chat.tab.chat': 'แชท',
    'chat.tab.voice': 'Voice AI',
    'chat.tab.weather': 'อากาศ',
    'chat.tab.history': 'ประวัติ',
    'chat.voice.title': 'Voice Health AI',
    'chat.voice.desc': 'พูดคุยกับผู้เชี่ยวชาญ AI ด้านสุขภาพ ถามเกี่ยวกับคุณภาพอากาศและการดูแลตัวเองได้ทันที',
    'chat.voice.start': 'เริ่มสนทนาด้วยเสียง',
    'chat.voice.support.thai': 'รองรับภาษาไทย',
    'chat.placeholder': 'พิมพ์คำถามเกี่ยวกับสุขภาพ...',
    
    // Map Page
    'map.title': 'Health Navigation',
    'map.subtitle': 'เส้นทางที่ปลอดภัยสำหรับสุขภาพ',
    'map.risk.group': 'กลุ่มเสี่ยง',
    'map.pm25.now': 'PM2.5 ตอนนี้',
    'map.aqi.label': 'ดัชนีคุณภาพอากาศ (AQI)',
    'map.aqi.good': 'ดี',
    'map.aqi.moderate': 'ปานกลาง',
    'map.aqi.unhealthySensitive': 'ไม่ดีต่อกลุ่มเสี่ยง',
    'map.aqi.unhealthy': 'ไม่ดีต่อสุขภาพ',
    'map.aqi.veryUnhealthy': 'ไม่ดีต่อสุขภาพมาก',
    'map.aqi.hazardous': 'อันตราย',
    'map.search.safe.route': 'ค้นหาเส้นทางที่ปลอดภัย',
    'map.search.placeholder': 'ไปไหน? เช่น สยาม, เซ็นทรัล...',
    'map.analyzing': 'กำลังวิเคราะห์เส้นทางที่ปลอดภัยที่สุด...',
    'map.updating': 'อัปเดต...',
    'map.loading': 'กำลังโหลด...',
    'map.locating': 'กำลังระบุตำแหน่ง...',
    'map.flyToLocation': 'ไปที่ตำแหน่งของฉัน',
    
    // Location Permission
    'location.granted.title': 'ระบุตำแหน่งสำเร็จ',
    'location.granted.description': 'แอปสามารถเข้าถึงตำแหน่งของคุณได้',
    'location.denied.title': 'ไม่ได้รับอนุญาต',
    'location.denied.description': 'กรุณาเปิดการเข้าถึงตำแหน่งในการตั้งค่า',
    'location.prompt.title': 'ขออนุญาตเข้าถึงตำแหน่ง',
    'location.prompt.description': 'เพื่อแสดงคุณภาพอากาศและเส้นทางในพื้นที่ของคุณ',
    'location.current': 'ตำแหน่งปัจจุบัน',
    'location.accuracy': 'ความแม่นยำ',
    'location.refresh': 'รีเฟรชตำแหน่ง',
    'location.openSettings': 'เปิดการตั้งค่า',
    'location.allow': 'อนุญาตตำแหน่ง',
    
    // Profile Setup
    'profile.setup.title': 'สร้างโปรไฟล์สุขภาพของคุณ',
    'profile.setup.subtitle': 'เพื่อให้เราดูแลสุขภาพของคุณได้อย่างเฉพาะเจาะจง',
    'profile.setup.badge': 'ตั้งค่าโปรไฟล์สุขภาพ',
    'profile.step.personal': 'ข้อมูลส่วนตัว',
    'profile.step.personal.desc': 'บอกเราเกี่ยวกับตัวคุณ',
    'profile.step.health': 'สุขภาพ',
    'profile.step.health.desc': 'ประวัติสุขภาพของคุณ',
    'profile.step.environment': 'สิ่งแวดล้อม',
    'profile.step.environment.desc': 'ปัจจัยเสี่ยงรอบตัว',
    'profile.step.lifestyle': 'ไลฟ์สไตล์',
    'profile.step.lifestyle.desc': 'กิจกรรมประจำวัน',
    'profile.step.confirm': 'ยืนยัน',
    'profile.step.confirm.desc': 'ตรวจสอบข้อมูล',
    
    // Personal Info
    'profile.name': 'ชื่อ-นามสกุล',
    'profile.name.placeholder': 'กรอกชื่อของคุณ',
    'profile.name.optional': '(ไม่บังคับ)',
    'profile.age': 'อายุ (ปี)',
    'profile.gender': 'เพศ',
    'profile.gender.male': 'ชาย',
    'profile.gender.female': 'หญิง',
    'profile.gender.other': 'อื่นๆ',
    'profile.height': 'ส่วนสูง (ซม.)',
    'profile.weight': 'น้ำหนัก (กก.)',
    'profile.occupation': 'อาชีพ',
    'profile.occupation.indoor': 'ทำงานในอาคาร',
    'profile.occupation.outdoor': 'ทำงานกลางแจ้ง',
    'profile.occupation.student': 'นักเรียน/นักศึกษา',
    'profile.occupation.other': 'อื่นๆ',
    'profile.location': 'ที่อยู่ (อำเภอ/เขต)',
    'profile.location.placeholder': 'เช่น เขตบางรัก',
    
    // Health
    'profile.chronic': 'โรคประจำตัว (เลือกได้หลายข้อ)',
    'profile.chronic.asthma': 'หอบหืด',
    'profile.chronic.allergy': 'ภูมิแพ้',
    'profile.chronic.sinusitis': 'ไซนัสอักเสบ',
    'profile.chronic.copd': 'COPD',
    'profile.chronic.heart': 'โรคหัวใจ',
    'profile.chronic.diabetes': 'เบาหวาน',
    'profile.chronic.hypertension': 'ความดันโลหิตสูง',
    'profile.chronic.none': 'ไม่มีโรคประจำตัว',
    'profile.smoking': 'การสูบบุหรี่',
    'profile.smoking.none': 'ไม่สูบ',
    'profile.smoking.occasional': 'สูบบ้าง',
    'profile.smoking.regular': 'สูบประจำ',
    'profile.alcohol': 'การดื่มแอลกอฮอล์',
    'profile.alcohol.none': 'ไม่ดื่ม',
    'profile.alcohol.occasional': 'ดื่มบ้าง',
    'profile.alcohol.regular': 'ดื่มประจำ',
    
    // Environment
    'profile.dust': 'ความไวต่อฝุ่น PM2.5',
    'profile.dust.low': 'ต่ำ - ไม่ค่อยมีอาการ',
    'profile.dust.medium': 'ปานกลาง - มีอาการบ้าง',
    'profile.dust.high': 'สูง - มีอาการบ่อย',
    'profile.airpurifier': 'มีเครื่องฟอกอากาศที่บ้าน/ที่ทำงาน',
    'profile.mask': 'ประเภทหน้ากากที่ใช้',
    'profile.mask.none': 'ไม่ใช้',
    'profile.mask.regular': 'หน้ากากผ้า/อนามัย',
    'profile.mask.n95': 'N95',
    'profile.mask.kf94': 'KF94',
    
    // Lifestyle
    'profile.activity': 'ระดับกิจกรรมประจำวัน',
    'profile.activity.sedentary': 'นั่งทำงาน',
    'profile.activity.sedentary.desc': 'ส่วนใหญ่นั่งทำงาน',
    'profile.activity.moderate': 'ปานกลาง',
    'profile.activity.moderate.desc': 'เดินบ้าง ทำงานบ้าน',
    'profile.activity.active': 'กระฉับกระเฉง',
    'profile.activity.active.desc': 'ออกกำลังกายสม่ำเสมอ',
    'profile.outdoor': 'เวลาอยู่กลางแจ้งต่อวัน',
    'profile.outdoor.<1': '< 1 ชม.',
    'profile.outdoor.1-3': '1-3 ชม.',
    'profile.outdoor.3-5': '3-5 ชม.',
    'profile.outdoor.>5': '> 5 ชม.',
    'profile.exercise': 'ความถี่ในการออกกำลังกาย (ครั้ง/สัปดาห์)',
    'profile.exercise.0': 'ไม่ออก',
    'profile.exercise.1-2': '1-2 ครั้ง',
    'profile.exercise.3-4': '3-4 ครั้ง',
    'profile.exercise.5+': '5+ ครั้ง',
    
    // Confirmation
    'profile.confirm.title': 'ยืนยันข้อมูล',
    'profile.confirm.subtitle': 'ตรวจสอบข้อมูลก่อนบันทึก',
    'profile.confirm.ready': 'ข้อมูลครบถ้วน พร้อมบันทึก',
    'profile.confirm.start': 'เริ่มใช้งาน',
    'profile.confirm.notspecified': 'ไม่ระบุ',
    'profile.confirm.nochronic': 'ไม่มี',
    'profile.confirm.hasairpurifier': 'มี',
    'profile.confirm.noairpurifier': 'ไม่มี',
    
    // Settings
    'settings.title': 'ตั้งค่า',
    'settings.subtitle': 'ปรับแต่งการใช้งาน',
    'settings.language': 'ภาษา',
    'settings.language.select': 'เลือกภาษาที่ต้องการ',
    'settings.language.th': 'ไทย',
    'settings.language.en': 'English',
    'settings.language.zh': '中文',
    'settings.theme': 'ธีม',
    'settings.notifications': 'การแจ้งเตือน',
    'settings.profile': 'แก้ไขโปรไฟล์',
    'settings.about': 'เกี่ยวกับ',
    'settings.logout': 'ออกจากระบบ',
    'settings.logout.success': 'ออกจากระบบสำเร็จ',
    
    // Welcome
    'welcome.title': 'ยินดีต้อนรับ',
    'welcome.subtitle': 'โปรไฟล์ของคุณถูกสร้างเรียบร้อยแล้ว',
    'welcome.ready': 'พร้อมดูแลสุขภาพของคุณแล้ว!',
    'welcome.start': 'เริ่มใช้งาน',
    
    // Footer
    'profile.footer': 'ข้อมูลของคุณจะถูกเก็บอย่างปลอดภัยและใช้เพื่อให้คำแนะนำด้านสุขภาพเฉพาะบุคคล',
  },
  en: {
    // Common
    'app.name': 'AirGuard Health',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.next': 'Next',
    'common.back': 'Back',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.loading': 'Loading...',
    'common.saving': 'Saving...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.refresh': 'Refresh',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.send': 'Send',
    'common.start': 'Start',
    'common.stop': 'Stop',
    
    // Navigation
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.map': 'Map',
    'nav.chat': 'Chat',
    'nav.notifications': 'Notifications',
    'nav.settings': 'Settings',
    
    // Home Page
    'home.brand': 'Smart PM2.5',
    'home.subtitle': 'Personal Health Intelligence',
    'home.loading': 'Sensing...',
    'home.air.excellent': 'Excellent air quality',
    'home.air.good': 'Good air quality',
    'home.air.moderate': 'Moderate air quality',
    'home.air.unhealthy.sensitive': 'Starting to pollute',
    'home.air.unhealthy': 'High pollution',
    'home.air.hazardous': 'Unhealthy air quality',
    'home.tap.speak': 'Tap to speak',
    'home.pm25': 'PM2.5',
    'home.temperature': 'Temperature',
    'home.humidity': 'Humidity',
    'home.personal.risk': 'Personal Risk',
    'home.explore.more': 'Explore More',
    'home.health.dashboard': 'Health Dashboard',
    'home.health.dashboard.desc': 'Statistics and health trends',
    'home.environment.map': 'Environment Map',
    'home.environment.map.desc': 'Air quality map',
    'home.ai.consultant': 'AI Consultant',
    'home.ai.consultant.desc': 'AI Health Advisor',
    'home.alerts.settings': 'Alerts & Settings',
    'home.alerts.settings.desc': 'Notifications and settings',
    
    // Dashboard Page
    'dashboard.title': 'Health Dashboard',
    'dashboard.subtitle': 'Smart Health Tracking System',
    'dashboard.phri': 'Health Risk Index',
    'dashboard.aqi': 'Air Quality',
    'dashboard.advice': 'Recommendations',
    'dashboard.tab.trends': 'Trends',
    'dashboard.tab.analysis': 'Analysis',
    'dashboard.tab.history': 'History',
    'dashboard.tab.profile': 'Profile',
    'dashboard.health.profile': 'Health Profile',
    'dashboard.health.profile.desc': 'Edit info for personalized recommendations',
    'dashboard.decision.safe': 'Outdoor activities are safe',
    'dashboard.decision.caution': 'Limit outdoor activities, wear mask outside',
    'dashboard.decision.warning': 'Avoid outdoor activities, stay in air-filtered buildings',
    'dashboard.decision.danger': 'Stay indoors, absolutely avoid going outside',
    'dashboard.respiratory.condition': 'Respiratory condition - stricter thresholds applied',
    'dashboard.action.mask': 'Wear N95 mask',
    'dashboard.action.indoor': 'Stay indoors',
    'dashboard.action.immediate': 'Immediately',
    
    // Chat Page
    'chat.title': 'Health AI',
    'chat.subtitle': 'Smart Health Assistant',
    'chat.tab.chat': 'Chat',
    'chat.tab.voice': 'Voice AI',
    'chat.tab.weather': 'Weather',
    'chat.tab.history': 'History',
    'chat.voice.title': 'Voice Health AI',
    'chat.voice.desc': 'Talk to AI health expert. Ask about air quality and self-care instantly.',
    'chat.voice.start': 'Start voice conversation',
    'chat.voice.support.thai': 'Thai language supported',
    'chat.placeholder': 'Type your health question...',
    
    // Map Page
    'map.title': 'Health Navigation',
    'map.subtitle': 'Safe routes for your health',
    'map.risk.group': 'At Risk',
    'map.pm25.now': 'PM2.5 Now',
    'map.aqi.label': 'Air Quality Index (AQI)',
    'map.aqi.good': 'Good',
    'map.aqi.moderate': 'Moderate',
    'map.aqi.unhealthySensitive': 'Unhealthy for Sensitive Groups',
    'map.aqi.unhealthy': 'Unhealthy',
    'map.aqi.veryUnhealthy': 'Very Unhealthy',
    'map.aqi.hazardous': 'Hazardous',
    'map.search.safe.route': 'Search for safe routes',
    'map.search.placeholder': 'Where to? e.g., Siam, Central...',
    'map.analyzing': 'Analyzing safest routes...',
    'map.updating': 'Updating...',
    'map.loading': 'Loading...',
    'map.locating': 'Locating...',
    'map.flyToLocation': 'Go to my location',
    
    // Location Permission
    'location.granted.title': 'Location detected',
    'location.granted.description': 'App can access your location',
    'location.denied.title': 'Permission denied',
    'location.denied.description': 'Please enable location access in settings',
    'location.prompt.title': 'Location permission required',
    'location.prompt.description': 'To show air quality and routes in your area',
    'location.current': 'Current location',
    'location.accuracy': 'Accuracy',
    'location.refresh': 'Refresh location',
    'location.openSettings': 'Open Settings',
    'location.allow': 'Allow Location',
    
    // Profile Setup
    'profile.setup.title': 'Create Your Health Profile',
    'profile.setup.subtitle': 'To provide personalized health recommendations',
    'profile.setup.badge': 'Health Profile Setup',
    'profile.step.personal': 'Personal',
    'profile.step.personal.desc': 'Tell us about yourself',
    'profile.step.health': 'Health',
    'profile.step.health.desc': 'Your health history',
    'profile.step.environment': 'Environment',
    'profile.step.environment.desc': 'Risk factors around you',
    'profile.step.lifestyle': 'Lifestyle',
    'profile.step.lifestyle.desc': 'Daily activities',
    'profile.step.confirm': 'Confirm',
    'profile.step.confirm.desc': 'Review your data',
    
    // Personal Info
    'profile.name': 'Full Name',
    'profile.name.placeholder': 'Enter your name',
    'profile.name.optional': '(Optional)',
    'profile.age': 'Age (years)',
    'profile.gender': 'Gender',
    'profile.gender.male': 'Male',
    'profile.gender.female': 'Female',
    'profile.gender.other': 'Other',
    'profile.height': 'Height (cm)',
    'profile.weight': 'Weight (kg)',
    'profile.occupation': 'Occupation',
    'profile.occupation.indoor': 'Indoor Work',
    'profile.occupation.outdoor': 'Outdoor Work',
    'profile.occupation.student': 'Student',
    'profile.occupation.other': 'Other',
    'profile.location': 'Location (District)',
    'profile.location.placeholder': 'e.g., Bang Rak District',
    
    // Health
    'profile.chronic': 'Chronic Conditions (Select multiple)',
    'profile.chronic.asthma': 'Asthma',
    'profile.chronic.allergy': 'Allergies',
    'profile.chronic.sinusitis': 'Sinusitis',
    'profile.chronic.copd': 'COPD',
    'profile.chronic.heart': 'Heart Disease',
    'profile.chronic.diabetes': 'Diabetes',
    'profile.chronic.hypertension': 'Hypertension',
    'profile.chronic.none': 'No Chronic Conditions',
    'profile.smoking': 'Smoking',
    'profile.smoking.none': 'Non-smoker',
    'profile.smoking.occasional': 'Occasional',
    'profile.smoking.regular': 'Regular',
    'profile.alcohol': 'Alcohol Consumption',
    'profile.alcohol.none': 'None',
    'profile.alcohol.occasional': 'Occasional',
    'profile.alcohol.regular': 'Regular',
    
    // Environment
    'profile.dust': 'PM2.5 Sensitivity',
    'profile.dust.low': 'Low - Rarely affected',
    'profile.dust.medium': 'Medium - Sometimes affected',
    'profile.dust.high': 'High - Frequently affected',
    'profile.airpurifier': 'Have air purifier at home/work',
    'profile.mask': 'Type of mask used',
    'profile.mask.none': 'None',
    'profile.mask.regular': 'Cloth/Surgical Mask',
    'profile.mask.n95': 'N95',
    'profile.mask.kf94': 'KF94',
    
    // Lifestyle
    'profile.activity': 'Daily Activity Level',
    'profile.activity.sedentary': 'Sedentary',
    'profile.activity.sedentary.desc': 'Mostly sitting',
    'profile.activity.moderate': 'Moderate',
    'profile.activity.moderate.desc': 'Some walking, housework',
    'profile.activity.active': 'Active',
    'profile.activity.active.desc': 'Regular exercise',
    'profile.outdoor': 'Daily Outdoor Time',
    'profile.outdoor.<1': '< 1 hr',
    'profile.outdoor.1-3': '1-3 hrs',
    'profile.outdoor.3-5': '3-5 hrs',
    'profile.outdoor.>5': '> 5 hrs',
    'profile.exercise': 'Exercise Frequency (times/week)',
    'profile.exercise.0': 'Never',
    'profile.exercise.1-2': '1-2 times',
    'profile.exercise.3-4': '3-4 times',
    'profile.exercise.5+': '5+ times',
    
    // Confirmation
    'profile.confirm.title': 'Confirm Information',
    'profile.confirm.subtitle': 'Review before saving',
    'profile.confirm.ready': 'All information complete, ready to save',
    'profile.confirm.start': 'Start Using',
    'profile.confirm.notspecified': 'Not specified',
    'profile.confirm.nochronic': 'None',
    'profile.confirm.hasairpurifier': 'Yes',
    'profile.confirm.noairpurifier': 'No',
    
    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize your experience',
    'settings.language': 'Language',
    'settings.language.select': 'Select preferred language',
    'settings.language.th': 'ไทย',
    'settings.language.en': 'English',
    'settings.language.zh': '中文',
    'settings.theme': 'Theme',
    'settings.notifications': 'Notifications',
    'settings.profile': 'Edit Profile',
    'settings.about': 'About',
    'settings.logout': 'Logout',
    'settings.logout.success': 'Logged out successfully',
    
    // Welcome
    'welcome.title': 'Welcome',
    'welcome.subtitle': 'Your profile has been created',
    'welcome.ready': 'Ready to take care of your health!',
    'welcome.start': 'Get Started',
    
    // Footer
    'profile.footer': 'Your data is securely stored and used for personalized health recommendations',
  },
  zh: {
    // Common
    'app.name': 'AirGuard 健康',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.next': '下一步',
    'common.back': '返回',
    'common.edit': '编辑',
    'common.delete': '删除',
    'common.loading': '加载中...',
    'common.saving': '保存中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.yes': '是',
    'common.no': '否',
    'common.refresh': '刷新',
    'common.close': '关闭',
    'common.search': '搜索',
    'common.send': '发送',
    'common.start': '开始',
    'common.stop': '停止',
    
    // Navigation
    'nav.home': '首页',
    'nav.dashboard': '仪表板',
    'nav.map': '地图',
    'nav.chat': '聊天',
    'nav.notifications': '通知',
    'nav.settings': '设置',
    
    // Home Page
    'home.brand': 'Smart PM2.5',
    'home.subtitle': '个人健康智能',
    'home.loading': '感知中...',
    'home.air.excellent': '空气质量优秀',
    'home.air.good': '空气质量良好',
    'home.air.moderate': '空气质量中等',
    'home.air.unhealthy.sensitive': '开始有污染',
    'home.air.unhealthy': '污染严重',
    'home.air.hazardous': '空气质量不健康',
    'home.tap.speak': '点击说话',
    'home.pm25': 'PM2.5',
    'home.temperature': '温度',
    'home.humidity': '湿度',
    'home.personal.risk': '个人风险',
    'home.explore.more': '探索更多',
    'home.health.dashboard': '健康仪表板',
    'home.health.dashboard.desc': '统计和健康趋势',
    'home.environment.map': '环境地图',
    'home.environment.map.desc': '空气质量地图',
    'home.ai.consultant': 'AI 顾问',
    'home.ai.consultant.desc': 'AI 健康顾问',
    'home.alerts.settings': '警报和设置',
    'home.alerts.settings.desc': '通知和设置',
    
    // Dashboard Page
    'dashboard.title': '健康仪表板',
    'dashboard.subtitle': '智能健康追踪系统',
    'dashboard.phri': '健康风险指数',
    'dashboard.aqi': '空气质量',
    'dashboard.advice': '建议',
    'dashboard.tab.trends': '趋势',
    'dashboard.tab.analysis': '分析',
    'dashboard.tab.history': '历史',
    'dashboard.tab.profile': '档案',
    'dashboard.health.profile': '健康档案',
    'dashboard.health.profile.desc': '编辑信息以获得个性化建议',
    'dashboard.decision.safe': '可以正常进行户外活动',
    'dashboard.decision.caution': '限制户外活动，外出戴口罩',
    'dashboard.decision.warning': '避免户外活动，待在有空气过滤的建筑中',
    'dashboard.decision.danger': '待在室内，绝对避免外出',
    'dashboard.respiratory.condition': '呼吸系统疾病 - 应用更严格的标准',
    'dashboard.action.mask': '戴N95口罩',
    'dashboard.action.indoor': '待在室内',
    'dashboard.action.immediate': '立即',
    
    // Chat Page
    'chat.title': '健康AI',
    'chat.subtitle': '智能健康助手',
    'chat.tab.chat': '聊天',
    'chat.tab.voice': '语音AI',
    'chat.tab.weather': '天气',
    'chat.tab.history': '历史',
    'chat.voice.title': '语音健康AI',
    'chat.voice.desc': '与AI健康专家交谠。立即询问空气质量和自我护理。',
    'chat.voice.start': '开始语音对话',
    'chat.voice.support.thai': '支持泰语',
    'chat.placeholder': '输入您的健康问题...',
    
    // Map Page
    'map.title': '健康导航',
    'map.subtitle': '为您的健康提供安全路线',
    'map.risk.group': '高风险',
    'map.pm25.now': '当前PM2.5',
    'map.aqi.label': '空气质量指数 (AQI)',
    'map.aqi.good': '良好',
    'map.aqi.moderate': '中等',
    'map.aqi.unhealthySensitive': '对敏感人群不健康',
    'map.aqi.unhealthy': '不健康',
    'map.aqi.veryUnhealthy': '非常不健康',
    'map.aqi.hazardous': '危险',
    'map.search.safe.route': '搜索安全路线',
    'map.search.placeholder': '去哪里？例如：暹罗、中央...',
    'map.analyzing': '正在分析最安全的路线...',
    'map.updating': '更新中...',
    'map.loading': '加载中...',
    'map.locating': '定位中...',
    'map.flyToLocation': '转到我的位置',
    
    // Location Permission
    'location.granted.title': '位置已检测',
    'location.granted.description': '应用可以访问您的位置',
    'location.denied.title': '权限被拒绝',
    'location.denied.description': '请在设置中启用位置访问',
    'location.prompt.title': '需要位置权限',
    'location.prompt.description': '显示您所在地区的空气质量和路线',
    'location.current': '当前位置',
    'location.accuracy': '精度',
    'location.refresh': '刷新位置',
    'location.openSettings': '打开设置',
    'location.allow': '允许位置',
    
    // Profile Setup
    'profile.setup.title': '创建您的健康档案',
    'profile.setup.subtitle': '为您提供个性化健康建议',
    'profile.setup.badge': '健康档案设置',
    'profile.step.personal': '个人信息',
    'profile.step.personal.desc': '告诉我们关于您自己',
    'profile.step.health': '健康',
    'profile.step.health.desc': '您的健康历史',
    'profile.step.environment': '环境',
    'profile.step.environment.desc': '周围的风险因素',
    'profile.step.lifestyle': '生活方式',
    'profile.step.lifestyle.desc': '日常活动',
    'profile.step.confirm': '确认',
    'profile.step.confirm.desc': '查看您的数据',
    
    // Personal Info
    'profile.name': '姓名',
    'profile.name.placeholder': '请输入您的姓名',
    'profile.name.optional': '（可选）',
    'profile.age': '年龄（岁）',
    'profile.gender': '性别',
    'profile.gender.male': '男',
    'profile.gender.female': '女',
    'profile.gender.other': '其他',
    'profile.height': '身高（厘米）',
    'profile.weight': '体重（公斤）',
    'profile.occupation': '职业',
    'profile.occupation.indoor': '室内工作',
    'profile.occupation.outdoor': '室外工作',
    'profile.occupation.student': '学生',
    'profile.occupation.other': '其他',
    'profile.location': '位置（区）',
    'profile.location.placeholder': '例如：曼谷区',
    
    // Health
    'profile.chronic': '慢性病（可多选）',
    'profile.chronic.asthma': '哮喘',
    'profile.chronic.allergy': '过敏',
    'profile.chronic.sinusitis': '鼻窦炎',
    'profile.chronic.copd': '慢阻肺',
    'profile.chronic.heart': '心脏病',
    'profile.chronic.diabetes': '糖尿病',
    'profile.chronic.hypertension': '高血压',
    'profile.chronic.none': '无慢性病',
    'profile.smoking': '吸烟',
    'profile.smoking.none': '不吸烟',
    'profile.smoking.occasional': '偶尔',
    'profile.smoking.regular': '经常',
    'profile.alcohol': '饮酒',
    'profile.alcohol.none': '不饮酒',
    'profile.alcohol.occasional': '偶尔',
    'profile.alcohol.regular': '经常',
    
    // Environment
    'profile.dust': 'PM2.5 敏感度',
    'profile.dust.low': '低 - 很少受影响',
    'profile.dust.medium': '中 - 有时受影响',
    'profile.dust.high': '高 - 经常受影响',
    'profile.airpurifier': '家里/办公室有空气净化器',
    'profile.mask': '使用的口罩类型',
    'profile.mask.none': '不使用',
    'profile.mask.regular': '布/医用口罩',
    'profile.mask.n95': 'N95',
    'profile.mask.kf94': 'KF94',
    
    // Lifestyle
    'profile.activity': '日常活动水平',
    'profile.activity.sedentary': '久坐',
    'profile.activity.sedentary.desc': '主要坐着工作',
    'profile.activity.moderate': '适度',
    'profile.activity.moderate.desc': '一些步行、家务',
    'profile.activity.active': '活跃',
    'profile.activity.active.desc': '定期锻炼',
    'profile.outdoor': '每日户外时间',
    'profile.outdoor.<1': '< 1 小时',
    'profile.outdoor.1-3': '1-3 小时',
    'profile.outdoor.3-5': '3-5 小时',
    'profile.outdoor.>5': '> 5 小时',
    'profile.exercise': '锻炼频率（次/周）',
    'profile.exercise.0': '从不',
    'profile.exercise.1-2': '1-2 次',
    'profile.exercise.3-4': '3-4 次',
    'profile.exercise.5+': '5+ 次',
    
    // Confirmation
    'profile.confirm.title': '确认信息',
    'profile.confirm.subtitle': '保存前请检查',
    'profile.confirm.ready': '信息完整，准备保存',
    'profile.confirm.start': '开始使用',
    'profile.confirm.notspecified': '未指定',
    'profile.confirm.nochronic': '无',
    'profile.confirm.hasairpurifier': '有',
    'profile.confirm.noairpurifier': '无',
    
    // Settings
    'settings.title': '设置',
    'settings.subtitle': '自定义您的体验',
    'settings.language': '语言',
    'settings.language.select': '选择首选语言',
    'settings.language.th': 'ไทย',
    'settings.language.en': 'English',
    'settings.language.zh': '中文',
    'settings.theme': '主题',
    'settings.notifications': '通知',
    'settings.profile': '编辑个人资料',
    'settings.about': '关于',
    'settings.logout': '退出登录',
    'settings.logout.success': '退出成功',
    
    // Welcome
    'welcome.title': '欢迎',
    'welcome.subtitle': '您的档案已创建',
    'welcome.ready': '准备好照顾您的健康了！',
    'welcome.start': '开始使用',
    
    // Footer
    'profile.footer': '您的数据将被安全存储并用于个性化健康建议',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && ['th', 'en', 'zh'].includes(saved)) {
        return saved as Language;
      }
    } catch {
      // localStorage not available
    }
    return 'th';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // localStorage not available
    }
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language;
    // Also set HTML dir for RTL languages if needed in future
    document.documentElement.setAttribute('data-language', language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

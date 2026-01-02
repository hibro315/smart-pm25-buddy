import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'th' | 'en' | 'zh';

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
    
    // Navigation
    'nav.home': 'หน้าหลัก',
    'nav.dashboard': 'แดชบอร์ด',
    'nav.map': 'แผนที่',
    'nav.chat': 'แชท',
    'nav.notifications': 'การแจ้งเตือน',
    'nav.settings': 'ตั้งค่า',
    
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
    'settings.language': 'ภาษา',
    'settings.language.th': 'ไทย',
    'settings.language.en': 'English',
    'settings.language.zh': '中文',
    'settings.theme': 'ธีม',
    'settings.notifications': 'การแจ้งเตือน',
    'settings.profile': 'แก้ไขโปรไฟล์',
    'settings.about': 'เกี่ยวกับ',
    'settings.logout': 'ออกจากระบบ',
    
    // Welcome
    'welcome.title': 'ยินดีต้อนรับ',
    'welcome.subtitle': 'โปรไฟล์ของคุณถูกสร้างเรียบร้อยแล้ว',
    'welcome.ready': 'พร้อมดูแลสุขภาพของคุณแล้ว!',
    'welcome.start': 'เริ่มใช้งาน',
    
    // Dashboard
    'dashboard.title': 'แดชบอร์ดสุขภาพ',
    'dashboard.phri': 'ดัชนีความเสี่ยงสุขภาพ',
    'dashboard.aqi': 'คุณภาพอากาศ',
    'dashboard.advice': 'คำแนะนำ',
    
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
    
    // Navigation
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.map': 'Map',
    'nav.chat': 'Chat',
    'nav.notifications': 'Notifications',
    'nav.settings': 'Settings',
    
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
    'settings.language': 'Language',
    'settings.language.th': 'ไทย',
    'settings.language.en': 'English',
    'settings.language.zh': '中文',
    'settings.theme': 'Theme',
    'settings.notifications': 'Notifications',
    'settings.profile': 'Edit Profile',
    'settings.about': 'About',
    'settings.logout': 'Logout',
    
    // Welcome
    'welcome.title': 'Welcome',
    'welcome.subtitle': 'Your profile has been created',
    'welcome.ready': 'Ready to take care of your health!',
    'welcome.start': 'Get Started',
    
    // Dashboard
    'dashboard.title': 'Health Dashboard',
    'dashboard.phri': 'Health Risk Index',
    'dashboard.aqi': 'Air Quality',
    'dashboard.advice': 'Recommendations',
    
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
    
    // Navigation
    'nav.home': '首页',
    'nav.dashboard': '仪表板',
    'nav.map': '地图',
    'nav.chat': '聊天',
    'nav.notifications': '通知',
    'nav.settings': '设置',
    
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
    'settings.language': '语言',
    'settings.language.th': 'ไทย',
    'settings.language.en': 'English',
    'settings.language.zh': '中文',
    'settings.theme': '主题',
    'settings.notifications': '通知',
    'settings.profile': '编辑个人资料',
    'settings.about': '关于',
    'settings.logout': '退出登录',
    
    // Welcome
    'welcome.title': '欢迎',
    'welcome.subtitle': '您的档案已创建',
    'welcome.ready': '准备好照顾您的健康了！',
    'welcome.start': '开始使用',
    
    // Dashboard
    'dashboard.title': '健康仪表板',
    'dashboard.phri': '健康风险指数',
    'dashboard.aqi': '空气质量',
    'dashboard.advice': '建议',
    
    // Footer
    'profile.footer': '您的数据将被安全存储并用于个性化健康建议',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'th';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
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

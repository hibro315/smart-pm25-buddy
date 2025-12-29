/**
 * Thai Text Sanitizer for TTS
 * Removes markdown, symbols, and converts units to natural Thai speech
 */

// Unit conversions to Thai words
const unitConversions: Record<string, string> = {
  'µg/m³': 'ไมโครกรัมต่อลูกบาศก์เมตร',
  'μg/m³': 'ไมโครกรัมต่อลูกบาศก์เมตร',
  'ug/m3': 'ไมโครกรัมต่อลูกบาศก์เมตร',
  'mg/m³': 'มิลลิกรัมต่อลูกบาศก์เมตร',
  'PM2.5': 'พีเอ็ม 2.5',
  'PM10': 'พีเอ็ม 10',
  'AQI': 'เอคิวไอ',
  'PHRI': 'พีเอชอาร์ไอ',
  '°C': 'องศาเซลเซียส',
  '°F': 'องศาฟาเรนไฮต์',
  '%': 'เปอร์เซ็นต์',
  'km': 'กิโลเมตร',
  'km/h': 'กิโลเมตรต่อชั่วโมง',
  'm/s': 'เมตรต่อวินาที',
  'hPa': 'เฮกโตปาสคาล',
  'mmHg': 'มิลลิเมตรปรอท',
  'N95': 'เอ็น 95',
  'CO2': 'คาร์บอนไดออกไซด์',
  'NO2': 'ไนโตรเจนไดออกไซด์',
  'SO2': 'ซัลเฟอร์ไดออกไซด์',
  'O3': 'โอโซน',
  'CO': 'คาร์บอนมอนอกไซด์',
};

// Markdown patterns to remove
const markdownPatterns = [
  /\*\*\*(.*?)\*\*\*/g,
  /\*\*(.*?)\*\*/g,
  /\*(.*?)\*/g,
  /__(.*?)__/g,
  /_(.*?)_/g,
  /~~(.*?)~~/g,
  /`{3}[\s\S]*?`{3}/g,
  /`(.*?)`/g,
  /^#{1,6}\s*/gm,
  /^\s*[-*+]\s+/gm,
  /^\s*\d+\.\s+/gm,
  /\[(.*?)\]\(.*?\)/g,
  /!\[(.*?)\]\(.*?\)/g,
  /^\s*>\s*/gm,
  /^\s*---\s*$/gm,
  /^\s*\*\*\*\s*$/gm,
  /\|.*\|/g,
];

// Remove URLs
function removeUrls(text: string): string {
  text = text.replace(/https?:\/\/[^\s]+/gi, '');
  text = text.replace(/www\.[^\s]+/gi, '');
  text = text.replace(/[\w.-]+@[\w.-]+\.\w+/gi, '');
  return text;
}

// Remove code blocks and technical content
function removeCodeBlocks(text: string): string {
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]+`/g, '');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/\{[^}]*\}/g, '');
  return text;
}

// Convert units to Thai words
function convertUnits(text: string): string {
  for (const [unit, thaiWord] of Object.entries(unitConversions)) {
    const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedUnit, 'gi');
    text = text.replace(regex, ` ${thaiWord} `);
  }
  return text;
}

// Convert numbers with context
function convertNumbers(text: string): string {
  text = text.replace(/(\d+)\.(\d+)/g, (_, whole, decimal) => {
    return `${whole} จุด ${decimal}`;
  });
  text = text.replace(/(\d+)\s*[-–]\s*(\d+)/g, '$1 ถึง $2');
  text = text.replace(/(\d{1,2}):(\d{2})/g, '$1 นาฬิกา $2 นาที');
  return text;
}

// Remove emojis and special symbols
function removeEmojisAndSymbols(text: string): string {
  // Remove emojis
  text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
  text = text.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
  text = text.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
  text = text.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');
  text = text.replace(/[\u{2600}-\u{26FF}]/gu, '');
  text = text.replace(/[\u{2700}-\u{27BF}]/gu, '');
  
  // Replace arrows with words
  text = text.replace(/→/g, ' ไปยัง ');
  text = text.replace(/←/g, ' จาก ');
  text = text.replace(/↑/g, ' ขึ้น ');
  text = text.replace(/↓/g, ' ลง ');
  
  // Remove bullet points and other symbols
  text = text.replace(/[•·…—–]/g, ' ');
  
  // Remove special quotes
  text = text.replace(/[""''「」『』【】《》〈〉]/g, ' ');
  
  // Remove remaining special characters but keep Thai, English, numbers, and basic punctuation
  text = text.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s.,!?()]/g, ' ');
  
  return text;
}

// Remove markdown formatting
function removeMarkdown(text: string): string {
  for (const pattern of markdownPatterns) {
    text = text.replace(pattern, '$1');
  }
  return text;
}

// Clean up whitespace
function cleanWhitespace(text: string): string {
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\s+([.,!?])/g, '$1');
  text = text.replace(/([.,!?])([^\s])/g, '$1 $2');
  text = text.trim();
  return text;
}

// Split text into sentences for chunked TTS
export function splitIntoSentences(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

// Main sanitizer function
export function sanitizeForTTS(text: string): string {
  if (!text) return '';
  
  let sanitized = text;
  
  sanitized = removeUrls(sanitized);
  sanitized = removeCodeBlocks(sanitized);
  sanitized = removeMarkdown(sanitized);
  sanitized = convertUnits(sanitized);
  sanitized = convertNumbers(sanitized);
  sanitized = removeEmojisAndSymbols(sanitized);
  sanitized = cleanWhitespace(sanitized);
  
  return sanitized;
}

// Test function to validate sanitization
export function testSanitizer(): { input: string; output: string; passed: boolean }[] {
  const testCases = [
    { input: '**ค่า PM2.5** อยู่ที่ 35.7 µg/m³', expected: 'พีเอ็ม' },
    { input: '# หัวข้อหลัก\n- รายการ 1', expected: 'หัวข้อหลัก' },
    { input: 'ดูรายละเอียดที่ https://example.com/path', expected: 'ดูรายละเอียดที่' },
    { input: 'อุณหภูมิ 32°C ความชื้น 65%', expected: 'องศาเซลเซียส' },
    { input: 'AQI อยู่ในช่วง 50-100', expected: 'เอคิวไอ' },
    { input: 'สวมหน้ากาก N95 เมื่อออกนอกบ้าน', expected: 'เอ็น 95' },
  ];
  
  return testCases.map(({ input, expected }) => {
    const output = sanitizeForTTS(input);
    return {
      input,
      output,
      passed: output.includes(expected)
    };
  });
}

export default sanitizeForTTS;

export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export const THAI_WEEKDAYS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

const THAI_DIGITS = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
const THAI_NUMBER_WORDS = [
  "ศูนย์",
  "หนึ่ง",
  "สอง",
  "สาม",
  "สี่",
  "ห้า",
  "หก",
  "เจ็ด",
  "แปด",
  "เก้า",
];

export function toThaiDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => THAI_DIGITS[Number(d)]);
}

export function fromThaiDigits(value: string): string {
  return String(value).replace(/[๐-๙]/g, (digit) => {
    const index = THAI_DIGITS.indexOf(digit);
    return index >= 0 ? String(index) : digit;
  });
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function getDaysInMonth(yearBE: number, month: number): number {
  return new Date(yearBE - 543, month, 0).getDate();
}

export function monthDates(yearBE: number, month: number): string[] {
  const days = getDaysInMonth(yearBE, month);
  const yearCE = yearBE - 543;
  return Array.from({ length: days }, (_, i) =>
    `${yearCE}-${pad2(month)}-${pad2(i + 1)}`,
  );
}

export function formatThaiDate(iso: string): string {
  const date = parseIsoDate(iso);
  return `${toThaiDigits(date.getDate())} ${THAI_MONTHS[date.getMonth()]} ${toThaiDigits(
    date.getFullYear() + 543,
  )}`;
}

export function formatThaiDateShort(iso: string): string {
  const date = parseIsoDate(iso);
  return `${toThaiDigits(date.getDate())} ${THAI_MONTHS_SHORT[date.getMonth()]} ${toThaiDigits(
    date.getFullYear() + 543,
  )}`;
}

export function formatThaiDateNumeric(iso: string): string {
  const date = parseIsoDate(iso);
  return `${toThaiDigits(date.getDate())}/${toThaiDigits(
    date.getMonth() + 1,
  )}/${toThaiDigits(date.getFullYear() + 543)}`;
}

export function formatThaiMonthYear(month: number, yearBE: number): string {
  return `${THAI_MONTHS[month - 1]} ${toThaiDigits(yearBE)}`;
}

export function formatThaiMonthYearShort(month: number, yearBE: number): string {
  return `${THAI_MONTHS_SHORT[month - 1]} ${toThaiDigits(yearBE)}`;
}

export function weekdayName(iso: string): string {
  return THAI_WEEKDAYS[parseIsoDate(iso).getDay()];
}

export function isWeekend(iso: string): boolean {
  const day = parseIsoDate(iso).getDay();
  return day === 0 || day === 6;
}

export function dateRange(startIso: string, endIso: string): string[] {
  if (!startIso || !endIso) return [];
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (start > end) return [];
  const out: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    out.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function sortDates(dates: string[]): string[] {
  return [...new Set(dates)].sort((a, b) => a.localeCompare(b));
}

export function formatTimeThai(time: string): string {
  return toThaiDigits(time.replace(":", "."));
}

export function formatTimeRangeThai(start: string, end: string): string {
  return `${formatTimeThai(start)}–${formatTimeThai(end)} น.`;
}

export function formatTimeRangeShortTh(start: string, end: string): string {
  return `${formatTimeThai(start)}-${formatTimeThai(end)} น.`;
}

export function shiftHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0) minutes += 24 * 60;
  return Math.round((minutes / 60) * 100) / 100;
}

export function formatThaiNumber(value: number, decimals = 0): string {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(decimals);
  const [integer, fraction] = fixed.split(".");
  const withCommas = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const text = fraction ? `${withCommas}.${fraction}` : withCommas;
  return `${negative ? "-" : ""}${toThaiDigits(text)}`;
}

export function formatBaht(value: number): string {
  return formatThaiNumber(value, 2);
}

function thaiGroupWords(value: number): string {
  const places = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
  const text = String(value);
  const length = text.length;
  let out = "";
  for (let i = 0; i < length; i += 1) {
    const digit = Number(text[i]);
    const place = length - i - 1;
    if (digit === 0) continue;
    if (place === 0) {
      out += digit === 1 && length > 1 ? "เอ็ด" : THAI_NUMBER_WORDS[digit];
    } else if (place === 1) {
      if (digit === 1) out += "สิบ";
      else if (digit === 2) out += "ยี่สิบ";
      else out += `${THAI_NUMBER_WORDS[digit]}สิบ`;
    } else {
      out += `${THAI_NUMBER_WORDS[digit]}${places[place]}`;
    }
  }
  return out;
}

export function thaiNumberWords(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (value === 0) return "ศูนย์";
  const integer = Math.floor(Math.abs(value));
  let remaining = integer;
  let out = "";
  const million = Math.floor(remaining / 1_000_000);
  if (million > 0) {
    out += `${million >= 1_000_000 ? thaiNumberWords(million) : thaiGroupWords(million)}ล้าน`;
    remaining %= 1_000_000;
  }
  if (remaining > 0) out += thaiGroupWords(remaining);
  return `${value < 0 ? "ลบ" : ""}${out}`;
}

export function thaiBahtText(amount: number): string {
  const negative = amount < 0;
  const absolute = Math.abs(amount);
  let baht = Math.floor(absolute);
  let satang = Math.round((absolute - baht) * 100);
  if (satang === 100) {
    baht += 1;
    satang = 0;
  }
  let text = `${thaiNumberWords(baht)}บาท`;
  text += satang === 0 ? "ถ้วน" : `${thaiNumberWords(satang)}สตางค์`;
  return negative ? `ลบ${text}` : text;
}

export function formatThaiYear(yearCE: number): string {
  return toThaiDigits(yearCE + 543);
}

/* ── UI-only Arabic numeral formatting (documents keep Thai) ───────── */

export function formatNumberUi(value: number, decimals = 0): string {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(decimals);
  const [integer, fraction] = fixed.split(".");
  const withCommas = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${withCommas}${fraction ? `.${fraction}` : ""}`;
}

export function formatBahtUi(value: number): string {
  return formatNumberUi(value, 2);
}

export function formatDateUi(iso: string): string {
  const date = parseIsoDate(iso);
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
}

export function formatDateShortUi(iso: string): string {
  const date = parseIsoDate(iso);
  return `${date.getDate()} ${THAI_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear() + 543}`;
}

export function formatMonthYearUi(month: number, yearBE: number): string {
  return `${THAI_MONTHS[month - 1]} ${yearBE}`;
}

export function formatTimeUi(time: string): string {
  return time.replace(":", ".");
}

export function formatTimeRangeUi(start: string, end: string): string {
  return `${formatTimeUi(start)}–${formatTimeUi(end)} น.`;
}

export function formatTimeRangeShortUi(start: string, end: string): string {
  return `${formatTimeUi(start)}-${formatTimeUi(end)} น.`;
}

export function toArabicDigits(value: string | number): string {
  return fromThaiDigits(String(value));
}

export function formatOrderNumber(orderNumber: string, yearBE: number): string {
  const yearThai = toThaiDigits(yearBE);
  if (!orderNumber.trim()) return `......./${yearThai}`;
  if (orderNumber.includes(yearThai) || orderNumber.includes(String(yearBE))) {
    return orderNumber;
  }
  return `${orderNumber}/${yearThai}`;
}

export function thaiYearFromIso(iso: string): number {
  return parseIsoDate(iso).getFullYear() + 543;
}

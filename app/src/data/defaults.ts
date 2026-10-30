import type {
  AppSettings,
  Assignment,
  AttendanceRecord,
  DocumentSet,
  OrgInfo,
  Person,
  Shift,
  SignatoryMap,
} from "../types";

export const ORG_DEFAULT: OrgInfo = {
  hospitalName: "โรงพยาบาลสระโบสถ์",
  province: "ลพบุรี",
  department: "งานการแพทย์แผนไทย",
  departmentShort: "งานแพทย์แผนไทย",
  groupName: "กลุ่มงานการแพทย์แผนไทยและการแพทย์ทางเลือก",
  ministryRef:
    "คำสั่งกระทรวงสาธารณสุข ที่ สธ0202.3.7/ว79 ลงวันที่ 3 กุมภาพันธ์ 2566 เรื่องมอบหมายให้ข้าราชการเป็นผู้บังคับบัญชา",
  lawRef:
    "ข้อบังคับกระทรวงสาธารณสุข ว่าด้วยการจ่ายเงินค่าตอบแทนเจ้าหน้าที่ที่ปฏิบัติงานให้กับหน่วยงานบริการในสังกัดกระทรวงสาธารณสุข พ.ศ. 2566 ลงวันที่ 3 กุมภาพันธ์ พ.ศ.2566",
};

export const STAFF_DEFAULT: Person[] = [
  {
    id: "staff-anchirya",
    prefix: "น.ส.",
    firstName: "อชิรญาณ์",
    lastName: "รมยศิริไทย",
    position: "แพทย์แผนไทยปฏิบัติการ",
    ratePerHour: 80,
    active: true,
  },
  {
    id: "staff-jirawan",
    prefix: "น.ส.",
    firstName: "จิรวรรณ",
    lastName: "เจริญมา",
    position: "แพทย์แผนไทย",
    ratePerHour: 80,
    active: true,
  },
  {
    id: "staff-patcharin",
    prefix: "น.ส.",
    firstName: "พัชรินทร์",
    lastName: "เสมเหลือง",
    position: "พนักงานบันทึกข้อมูล",
    ratePerHour: 41.25,
    active: true,
  },
  {
    id: "staff-thipwan",
    prefix: "นาง",
    firstName: "ทิพวัลย์",
    lastName: "อินทร์จาด",
    position: "ผู้ช่วยเหลือคนไข้",
    ratePerHour: 41.25,
    active: true,
  },
  {
    id: "staff-thansuda",
    prefix: "น.ส.",
    firstName: "ธัญสุดา",
    lastName: "ยงยุทธ",
    position: "ผู้ช่วยเหลือคนไข้",
    ratePerHour: 41.25,
    active: true,
  },
];

export const SHIFTS_DEFAULT: Shift[] = [
  {
    id: "shift-morning",
    name: "เช้า",
    start: "06:30",
    end: "08:30",
    active: true,
  },
  {
    id: "shift-evening",
    name: "เย็น",
    start: "16:30",
    end: "18:30",
    active: true,
  },
];

export const SIGNATORIES_DEFAULT: SignatoryMap = {
  director: {
    name: "นายพงษ์จุมพฏ นิยมพฤกษ์",
    position:
      "นายแพทย์ชำนาญการ รักษาการในตำแหน่ง\nผู้อำนวยการโรงพยาบาลสระโบสถ์",
  },
  groupHead: {
    name: "น.ส.อชิรญาณ์ รมยศิริไทย",
    position: "หัวหน้ากลุ่มการแพทย์แผนไทยและการแพทย์ทางเลือก",
  },
  controller: {
    name: "น.ส.อชิรญาณ์ รมยศิริไทย",
    position: "แพทย์แผนไทยปฏิบัติการ",
  },
  nursingHead: {
    name: "",
    position: "หัวหน้ากลุ่มการพยาบาล",
  },
  financeOfficer: {
    name: "นางสาววรรณฑิกา พรมไทย",
    position: "เจ้าพนักงานการเงินและบัญชีชำนาญงาน",
  },
  payer: {
    name: "นางสาววรรณฑิกา พรมไทย",
    position: "เจ้าพนักงานการเงินและบัญชีชำนาญงาน",
  },
  auditor: {
    name: "",
    position: "",
  },
};

export const SETTINGS_DEFAULT: AppSettings = {
  org: ORG_DEFAULT,
  staff: STAFF_DEFAULT,
  shifts: SHIFTS_DEFAULT,
  signatories: SIGNATORIES_DEFAULT,
  numbering: {
    orderPattern: "......./{year}",
    memoPattern: "ลบ0033.302/พิเศษ",
    nextOrder: 1,
    nextMemo: 1,
  },
  profiles: [
    {
      id: "profile-anchirya",
      name: "น.ส.อชิรญาณ์ รมยศิริไทย",
      role: "หัวหน้ากลุ่มการแพทย์แผนไทยและการแพทย์ทางเลือก",
    },
    {
      id: "profile-finance",
      name: "นางสาววรรณฑิกา พรมไทย",
      role: "เจ้าพนักงานการเงินและบัญชีชำนาญงาน",
    },
    {
      id: "profile-director",
      name: "นายพงษ์จุมพฏ นิยมพฤกษ์",
      role: "ผู้อำนวยการโรงพยาบาลสระโบสถ์",
    },
  ],
};

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function personFullName(person: Person): string {
  return `${person.prefix}${person.firstName} ${person.lastName}`.trim();
}

export function personShortName(person: Person): string {
  return `${person.prefix}${person.firstName} ${person.lastName}`.trim();
}

export function blankSet(settings: AppSettings): DocumentSet {
  const now = new Date();
  const year = now.getFullYear() + 543;
  const month = now.getMonth() + 1;
  const issueDate = `${now.getFullYear()}-${String(month).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return {
    id: newId(),
    title: "",
    month,
    year,
    issueDate,
    dateMode: "month",
    selectedDates: [],
    org: { ...settings.org },
    orderNumber: "",
    memoNumber: "",
    staffIds: settings.staff.filter((s) => s.active).map((s) => s.id),
    assignments: [],
    attendance: {},
    completedSteps: [],
    status: "draft",
    controllerId: settings.staff[0]?.id ?? "",
    signatories: structuredClone(settings.signatories),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function assignmentKey(a: Pick<Assignment, "date" | "staffId" | "shiftId">): string {
  return `${a.date}|${a.staffId}|${a.shiftId}`;
}

export function blankAttendance(
  a: Pick<Assignment, "date" | "staffId" | "shiftId">,
): AttendanceRecord {
  return {
    date: a.date,
    staffId: a.staffId,
    shiftId: a.shiftId,
    status: "present",
  };
}

export function cloneSet(set: DocumentSet): DocumentSet {
  return structuredClone(set);
}

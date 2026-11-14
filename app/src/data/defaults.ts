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
  hospitalName: "",
  province: "",
  department: "",
  departmentShort: "",
  groupName: "",
  ministryRef: "",
  lawRef: "",
};

export const STAFF_DEFAULT: Person[] = [];

export const SHIFTS_DEFAULT: Shift[] = [];

export const SIGNATORIES_DEFAULT: SignatoryMap = {
  director: { name: "", position: "" },
  groupHead: { name: "", position: "" },
  controller: { name: "", position: "" },
  payer: { name: "", position: "" },
};

export const SETTINGS_DEFAULT: AppSettings = {
  org: ORG_DEFAULT,
  staff: STAFF_DEFAULT,
  shifts: SHIFTS_DEFAULT,
  signatories: SIGNATORIES_DEFAULT,
  numbering: {
    orderPattern: "......./{year}",
    memoPattern: "",
    nextOrder: 1,
    nextMemo: 1,
  },
  exchange: {
    approverKey: "groupHead",
    approvalText: "อนุญาต",
  },
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
    staff: structuredClone(settings.staff),
    shifts: structuredClone(settings.shifts),
    exchange: structuredClone(settings.exchange),
    assignments: [],
    attendance: {},
    shiftExchanges: [],
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

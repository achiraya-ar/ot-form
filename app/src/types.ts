export type StepId = 1 | 2 | 3 | 4 | 5;
export type DateMode = "single" | "multiple" | "range" | "month";
export type SetStatus = "draft" | "in_progress" | "completed";
export type AttendanceStatus = "present" | "absent";

export interface OrgInfo {
  hospitalName: string;
  province: string;
  department: string;
  /** ชื่อหน่วยงานแบบสั้นที่ใช้ในใบลงเวลา เช่น "งานแพทย์แผนไทย" */
  departmentShort: string;
  groupName: string;
  ministryRef: string;
  lawRef: string;
}

export interface Person {
  id: string;
  prefix: string;
  firstName: string;
  lastName: string;
  position: string;
  ratePerHour: number;
  active: boolean;
}

export interface Shift {
  id: string;
  name: string;
  start: string;
  end: string;
  active: boolean;
}

export interface Signatory {
  name: string;
  position: string;
}

export type SignatoryKey =
  | "director"
  | "groupHead"
  | "controller"
  | "nursingHead"
  | "financeOfficer"
  | "payer"
  | "auditor";

export type SignatoryMap = Record<SignatoryKey, Signatory>;

export interface DocumentNumbering {
  orderPattern: string;
  memoPattern: string;
  nextOrder: number;
  nextMemo: number;
}

export interface Profile {
  id: string;
  name: string;
  role: string;
}

export interface AppSettings {
  org: OrgInfo;
  staff: Person[];
  shifts: Shift[];
  signatories: SignatoryMap;
  numbering: DocumentNumbering;
  profiles: Profile[];
}

export interface Assignment {
  date: string;
  staffId: string;
  shiftId: string;
}

export interface AttendanceRecord {
  date: string;
  staffId: string;
  shiftId: string;
  status: AttendanceStatus;
  timeIn?: string;
  timeOut?: string;
  note?: string;
}

export interface DocumentSet {
  id: string;
  title: string;
  month: number;
  year: number;
  issueDate: string;
  dateMode: DateMode;
  rangeStart?: string;
  rangeEnd?: string;
  selectedDates: string[];
  org: OrgInfo;
  orderNumber: string;
  memoNumber: string;
  staffIds: string[];
  assignments: Assignment[];
  attendance: Record<string, AttendanceRecord>;
  completedSteps: StepId[];
  status: SetStatus;
  controllerId: string;
  signatories: SignatoryMap;
  rateOverrides?: Record<string, number>;
  paymentDate?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  profileId: string;
  loginAt: string;
}

export interface AppState {
  settings: AppSettings;
  sets: DocumentSet[];
  session: Session | null;
}

export type AppRoute =
  | { name: "dashboard" }
  | { name: "create" }
  | { name: "set"; setId: string; step: StepId }
  | { name: "settings"; tab?: string };

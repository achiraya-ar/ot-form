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

export type SignatoryKey = "director" | "groupHead" | "controller" | "payer";

/** ผู้มีอำนาจลงนามในใบขอแลกเปลี่ยนเวร */
export type ExchangeApproverKey = "groupHead" | "director";

export interface ExchangeSettings {
  approverKey: ExchangeApproverKey;
  /** ข้อความในช่องอนุมัติท้ายใบ เช่น "อนุญาต" */
  approvalText: string;
}

export type SignatoryMap = Record<SignatoryKey, Signatory>;

export interface DocumentNumbering {
  orderPattern: string;
  memoPattern: string;
  nextOrder: number;
  nextMemo: number;
}

export interface AppSettings {
  org: OrgInfo;
  staff: Person[];
  shifts: Shift[];
  signatories: SignatoryMap;
  numbering: DocumentNumbering;
  exchange: ExchangeSettings;
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

export interface ShiftExchange {
  id: string;
  /** วันที่ของเวรที่ขอแลกเปลี่ยน */
  date: string;
  /** ผู้ขอแลกเปลี่ยน (เจ้าของเวรเดิม) */
  staffId: string;
  /** เวรเดิมที่ขอแลกเปลี่ยน */
  shiftId: string;
  /** ผู้ปฏิบัติงานแทน; null/ว่างหมายถึงไม่มีคนแทน */
  replacementStaffId?: string | null;
  /** เหตุผลการแลกเปลี่ยน */
  reason: string;
  /** วันที่ยื่นคำขอ */
  requestDate: string;
  /** วันที่อนุมัติท้ายใบ; เว้นว่างได้ */
  approvalDate?: string;
  createdAt: string;
  updatedAt: string;
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
  /** Custom opening paragraph of the order; empty means use the generated text. */
  orderBody?: string;
  /** Custom closing paragraph of the order; empty means use the generated text. */
  orderClosing?: string;
  /** Custom body text for the memo; empty means use the generated text. */
  memoBody?: string;
  staffIds: string[];
  /** Snapshot of staff data used by this set; later Settings changes do not affect it. */
  staff?: Person[];
  /** Snapshot of shift definitions used by this set; later Settings changes do not affect it. */
  shifts?: Shift[];
  /** Snapshot of shift-exchange form settings for this set. */
  exchange?: ExchangeSettings;
  assignments: Assignment[];
  attendance: Record<string, AttendanceRecord>;
  /** ใบขอแลกเปลี่ยนเวรที่แนบกับชุดเอกสารนี้ */
  shiftExchanges: ShiftExchange[];
  completedSteps: StepId[];
  status: SetStatus;
  controllerId: string;
  signatories: SignatoryMap;
  rateOverrides?: Record<string, number>;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
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

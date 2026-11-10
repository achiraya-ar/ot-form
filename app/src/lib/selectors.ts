import type {
  AppSettings,
  Assignment,
  AttendanceRecord,
  DocumentSet,
  Person,
  Shift,
  ShiftExchange,
  StepId,
} from "../types";
import { assignmentKey, personFullName } from "../data/defaults";
import {
  formatDateDoc,
  formatMonthYearDoc,
  formatTimeDoc,
  formatTimeRangeDoc,
  formatTimeThai,
  getDaysInMonth,
  parseIsoDate,
  shiftHours,
  toThaiDigits,
} from "./thai";

export function getPerson(settings: AppSettings, id: string): Person | undefined {
  return settings.staff.find((person) => person.id === id);
}

export function getShift(settings: AppSettings, id: string): Shift | undefined {
  return settings.shifts.find((shift) => shift.id === id);
}

/**
 * Staff and shifts are snapshotted into each document set when it is created,
 * so later changes in Settings do not rewrite finished documents. Old sets fall
 * back to the global settings until they have been migrated.
 */
export function getSetPeople(set: DocumentSet, settings: AppSettings): Person[] {
  return set.staff?.length ? set.staff : settings.staff;
}

export function getSetPerson(
  set: DocumentSet,
  settings: AppSettings,
  id: string,
): Person | undefined {
  return (
    getSetPeople(set, settings).find((person) => person.id === id) ??
    settings.staff.find((person) => person.id === id)
  );
}

export function getSetShiftPool(set: DocumentSet, settings: AppSettings): Shift[] {
  return set.shifts?.length ? set.shifts : settings.shifts;
}

export function getSetShift(
  set: DocumentSet,
  settings: AppSettings,
  id: string,
): Shift | undefined {
  return (
    getSetShiftPool(set, settings).find((shift) => shift.id === id) ??
    settings.shifts.find((shift) => shift.id === id)
  );
}

export function getSetExchangeSettings(
  set: DocumentSet,
  settings: AppSettings,
) {
  return {
    ...settings.exchange,
    ...(set.exchange ?? {}),
  };
}

export function getSetStaff(set: DocumentSet, settings: AppSettings): Person[] {
  return set.staffIds
    .map((id) => getSetPerson(set, settings, id))
    .filter((person): person is Person => Boolean(person));
}

export function getSetShifts(set: DocumentSet, settings: AppSettings): Shift[] {
  const ids = new Set(set.assignments.map((a) => a.shiftId));
  return getSetShiftPool(set, settings)
    .filter((shift) => shift.active || ids.has(shift.id))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Shifts that actually appear in this set's schedule. Before the schedule is
 * filled in, fall back to the active shifts so the documents still show the
 * configured time columns.
 */
export function getDocumentShifts(set: DocumentSet, settings: AppSettings): Shift[] {
  const used = new Set(set.assignments.map((assignment) => assignment.shiftId));
  const shifts = getSetShiftPool(set, settings).filter((shift) => used.has(shift.id));
  return (
    shifts.length > 0
      ? shifts
      : getSetShiftPool(set, settings).filter((shift) => shift.active)
  ).sort((a, b) => a.start.localeCompare(b.start));
}

/** "๑, ๓-๕, ๘" — consecutive selected days are compressed into ranges. */
function formatDayRuns(dates: string[]): string {
  const days = [...new Set(dates.map((date) => parseIsoDate(date).getDate()))].sort(
    (a, b) => a - b,
  );
  const parts: string[] = [];
  let start = days[0];
  let previous = days[0];
  for (let index = 1; index <= days.length; index += 1) {
    const day = days[index];
    if (day === previous + 1) {
      previous = day;
      continue;
    }
    parts.push(
      start === previous
        ? toThaiDigits(start)
        : `${toThaiDigits(start)}-${toThaiDigits(previous)}`,
    );
    start = day;
    previous = day;
  }
  return parts.join(", ");
}

/**
 * Period text for the order and memo, following the date mode chosen when the
 * set was created:
 * - month:    "ประจำเดือน ตุลาคม ๒๕๖๙"
 * - single:   "ในวันที่ ๑ ตุลาคม ๒๕๖๙"
 * - range:    "ช่วงระหว่างวันที่ ๑-๑๐ ตุลาคม ๒๕๖๙"
 * - multiple: "ในวันที่ ๑๗, ๒๐-๒๖, ๓๐-๓๑ ตุลาคม ๒๕๖๙"
 */
export function documentPeriodPhrase(set: DocumentSet): string {
  const dates =
    set.selectedDates.length > 0
      ? [...new Set(set.selectedDates)].sort()
      : [...new Set(set.assignments.map((assignment) => assignment.date))].sort();
  const monthYear = formatMonthYearDoc(set.month, set.year);
  if (dates.length === 0 || set.dateMode === "month") {
    return `ประจำเดือน ${monthYear}`;
  }
  if (dates.length === 1) return `ในวันที่ ${formatDateDoc(dates[0])}`;
  if (set.dateMode === "range") {
    const first = parseIsoDate(dates[0]).getDate();
    const last = parseIsoDate(dates[dates.length - 1]).getDate();
    return `ช่วงระหว่างวันที่ ${toThaiDigits(first)}-${toThaiDigits(last)} ${monthYear}`;
  }
  return `ในวันที่ ${formatDayRuns(dates)} ${monthYear}`;
}

/** Auto-generated opening paragraph of the appointment order. */
export function orderBodyText(set: DocumentSet): string {
  const shortDepartment = set.org.departmentShort || set.org.department;
  return `เพื่อให้การปฏิบัติหน้าที่เป็นไปด้วยความเรียบร้อยและมีประสิทธิภาพ ${shortDepartment} ${set.org.groupName} มีความประสงค์ขออนุมัติขึ้นปฏิบัติงานนอกเวลาราชการ${documentPeriodPhrase(set)} โดยอาศัยอำนาจตาม${toThaiDigits(set.org.ministryRef)} จึงขอแต่งตั้งผู้มีรายนามดังต่อไปนี้ขึ้นปฏิบัติงานนอกเวลาราชการ`;
}

/** Opening paragraph of the order, using the edited text when customised. */
export function orderBodyOf(set: DocumentSet): string {
  return set.orderBody?.trim() ? set.orderBody : orderBodyText(set);
}

/** Auto-generated closing paragraph of the appointment order. */
export function orderClosingText(
  set: DocumentSet,
  controllerName = set.signatories.controller.name,
): string {
  return `ทั้งนี้ให้มีสิทธิ์เบิกเงินตาม${toThaiDigits(set.org.lawRef)} โดยให้ ${controllerName} เป็นผู้ควบคุมการปฏิบัติงาน`;
}

/** Closing paragraph of the order, using the edited text when customised. */
export function orderClosingOf(set: DocumentSet): string {
  return set.orderClosing?.trim() ? set.orderClosing : orderClosingText(set);
}

interface MemoDateGroup {
  dates: string[];
  timeText: string;
}

const timeTextOf = (shifts: Shift[]): string =>
  shifts
    .map((shift) => `${formatTimeDoc(shift.start)}-${formatTimeDoc(shift.end)} น.`)
    .join(" และ");

/**
 * Group scheduled dates by the shifts worked on that date, so the memo can say
 * e.g. "วันที่ ๒, ๖ ... ตั้งแต่เวลา ๑๖.๓๐-๑๘.๓๐ น." separately from the days
 * that use another shift.
 */
function getMemoDateGroups(set: DocumentSet, settings: AppSettings): MemoDateGroup[] {
  const byDate = new Map<string, Set<string>>();
  for (const assignment of set.assignments) {
    const shiftIds = byDate.get(assignment.date) ?? new Set<string>();
    shiftIds.add(assignment.shiftId);
    byDate.set(assignment.date, shiftIds);
  }

  if (byDate.size === 0) {
    return [
      {
        dates: [...new Set(set.selectedDates)].sort(),
        timeText: timeTextOf(getDocumentShifts(set, settings)),
      },
    ];
  }

  const shiftById = new Map(
    getSetShiftPool(set, settings).map((shift) => [shift.id, shift]),
  );
  const groups = new Map<string, { shiftIds: string[]; dates: string[] }>();
  for (const date of [...byDate.keys()].sort()) {
    const shiftIds = [...(byDate.get(date) ?? [])].sort();
    const key = shiftIds.join("|");
    const group = groups.get(key) ?? { shiftIds, dates: [] };
    group.dates.push(date);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => ({
    dates: group.dates,
    timeText: timeTextOf(
      group.shiftIds
        .map((id) => shiftById.get(id))
        .filter((shift): shift is Shift => Boolean(shift))
        .sort((a, b) => a.start.localeCompare(b.start)),
    ),
  }));
}

/** Auto-generated body paragraph of the approval memo. */
export function memoBodyText(set: DocumentSet, settings: AppSettings): string {
  const groups = getMemoDateGroups(set, settings);
  const monthYear = formatMonthYearDoc(set.month, set.year);
  const intro = `ด้วย${set.org.department} ${set.org.groupName} ${set.org.hospitalName} มีความประสงค์จะจัดเจ้าหน้าที่ขึ้นปฏิบัติงานนอกเวลาราชการ`;
  const outro =
    "โดยมีเจ้าหน้าที่ปฏิบัติงาน ดังรายชื่อพร้อมตารางการปฏิบัติงานที่แนบมาพร้อมนี้";

  if (groups.length <= 1) {
    const timeText = groups[0]?.timeText ?? "";
    return `${intro} ${documentPeriodPhrase(set)} โดยทำการนอกเวลาราชการ ตั้งแต่เวลา ${timeText} ${outro}`;
  }

  const clauses = groups.map((group, index) => {
    const prefix =
      index === 0 ? "ในวันที่" : index === groups.length - 1 ? "และวันที่" : "วันที่";
    return `${prefix} ${formatDayRuns(group.dates)} ${monthYear} โดยทำการนอกเวลาราชการ ตั้งแต่เวลา ${group.timeText}`;
  });

  return `${intro} ${clauses.join(" ")} ${outro}`;
}

/** Body of the memo, using the edited text when the user has customised it. */
export function memoBodyOf(set: DocumentSet, settings: AppSettings): string {
  return set.memoBody?.trim() ? set.memoBody : memoBodyText(set, settings);
}

export function getAttendance(
  set: DocumentSet,
  date: string,
  staffId: string,
  shiftId: string,
): AttendanceRecord | undefined {
  return set.attendance[`${date}|${staffId}|${shiftId}`];
}

export function isAbsent(
  set: DocumentSet,
  date: string,
  staffId: string,
  shiftId: string,
): boolean {
  return getAttendance(set, date, staffId, shiftId)?.status === "absent";
}

export function isPresent(
  set: DocumentSet,
  date: string,
  staffId: string,
  shiftId: string,
): boolean {
  return !isAbsent(set, date, staffId, shiftId);
}

export function assignmentsForDate(set: DocumentSet, date: string): Assignment[] {
  return set.assignments.filter((a) => a.date === date);
}

export function assignmentsForStaff(set: DocumentSet, staffId: string): Assignment[] {
  return set.assignments.filter((a) => a.staffId === staffId);
}

export function workDatesForStaff(set: DocumentSet, staffId: string): string[] {
  const dates = new Set<string>();
  for (const assignment of set.assignments) {
    if (assignment.staffId !== staffId) continue;
    if (isPresent(set, assignment.date, assignment.staffId, assignment.shiftId)) {
      dates.add(assignment.date);
    }
  }
  return [...dates].sort();
}

export function paidHoursFor(
  set: DocumentSet,
  settings: AppSettings,
  assignment: Assignment,
): number {
  if (isAbsent(set, assignment.date, assignment.staffId, assignment.shiftId)) return 0;
  const record = getAttendance(set, assignment.date, assignment.staffId, assignment.shiftId);
  if (record?.timeIn && record?.timeOut) {
    return shiftHours(record.timeIn, record.timeOut);
  }
  const shift = getSetShift(set, settings, assignment.shiftId);
  return shift ? shiftHours(shift.start, shift.end) : 0;
}

export function staffPayment(
  set: DocumentSet,
  settings: AppSettings,
  staffId: string,
): { hours: number; amount: number; days: number } {
  const person = getSetPerson(set, settings, staffId);
  if (!person) return { hours: 0, amount: 0, days: 0 };
  const assignments = set.assignments.filter((a) => a.staffId === staffId);
  const hours = assignments.reduce(
    (sum, assignment) => sum + paidHoursFor(set, settings, assignment),
    0,
  );
  const rate = set.rateOverrides?.[staffId] ?? person.ratePerHour;
  return {
    hours: Math.round(hours * 100) / 100,
    amount: Math.round(hours * rate * 100) / 100,
    days: workDatesForStaff(set, staffId).length,
  };
}

export function getSetExchanges(set: DocumentSet): ShiftExchange[] {
  return Array.isArray(set.shiftExchanges) ? set.shiftExchanges : [];
}

export function exchangePaidHours(
  set: DocumentSet,
  settings: AppSettings,
  exchange: ShiftExchange,
): number {
  if (!exchange.replacementStaffId) return 0;
  const shift = getSetShift(set, settings, exchange.shiftId);
  return shift ? shiftHours(shift.start, shift.end) : 0;
}

export function exchangeAmount(
  set: DocumentSet,
  settings: AppSettings,
  exchange: ShiftExchange,
): number {
  const person = exchange.replacementStaffId
    ? getSetPerson(set, settings, exchange.replacementStaffId)
    : undefined;
  if (!person) return 0;
  const rate = set.rateOverrides?.[person.id] ?? person.ratePerHour;
  return Math.round(exchangePaidHours(set, settings, exchange) * rate * 100) / 100;
}

export function exchangePaymentSummary(
  set: DocumentSet,
  settings: AppSettings,
): { hours: number; amount: number } {
  let hours = 0;
  let amount = 0;
  for (const exchange of getSetExchanges(set)) {
    if (!exchange.replacementStaffId) continue;
    hours += exchangePaidHours(set, settings, exchange);
    amount += exchangeAmount(set, settings, exchange);
  }
  return {
    hours: Math.round(hours * 100) / 100,
    amount: Math.round(amount * 100) / 100,
  };
}

export function eligibleReplacementStaff(
  set: DocumentSet,
  settings: AppSettings,
  date: string,
  originalStaffId: string,
  shiftId: string,
  exchangeId?: string,
): Person[] {
  const assigned = new Set(
    set.assignments
      .filter((assignment) => assignment.date === date)
      .map((assignment) => assignment.staffId),
  );
  const targetShift = getSetShift(set, settings, shiftId);
  return getSetStaff(set, settings).filter((person) => {
    if (person.id === originalStaffId) return false;
    if (assigned.has(person.id)) return false;

    const existingReplacements = getSetExchanges(set).filter(
      (exchange) =>
        exchange.date === date &&
        exchange.id !== exchangeId &&
        exchange.replacementStaffId === person.id,
    );
    if (!targetShift) return existingReplacements.length === 0;

    return existingReplacements.every((exchange) => {
      const otherShift = getSetShift(set, settings, exchange.shiftId);
      if (!otherShift) return true;
      const overlaps =
        targetShift.start < otherShift.end &&
        otherShift.start < targetShift.end;
      return !overlaps;
    });
  });
}

export function totalPayment(set: DocumentSet, settings: AppSettings): number {
  const total = getSetStaff(set, settings).reduce(
    (sum, person) => sum + staffPayment(set, settings, person.id).amount,
    0,
  );
  return Math.round((total + exchangePaymentSummary(set, settings).amount) * 100) / 100;
}

export function totalHours(set: DocumentSet, settings: AppSettings): number {
  const total = getSetStaff(set, settings).reduce(
    (sum, person) => sum + staffPayment(set, settings, person.id).hours,
    0,
  );
  return Math.round((total + exchangePaymentSummary(set, settings).hours) * 100) / 100;
}

export interface Form1Row {
  date: string;
  cells: { shift: Shift; names: string[] }[];
}

export function getForm1Rows(set: DocumentSet, settings: AppSettings): Form1Row[] {
  const shifts = getDocumentShifts(set, settings);
  const staffOrder = new Map(set.staffIds.map((id, index) => [id, index]));
  return set.selectedDates
    .map((date) => {
      const dateAssignments = assignmentsForDate(set, date);
      if (dateAssignments.length === 0) return null;
      return {
        date,
        cells: shifts.map((shift) => ({
          shift,
          names: dateAssignments
            .filter((a) => a.shiftId === shift.id)
            .sort((a, b) => (staffOrder.get(a.staffId) ?? 0) - (staffOrder.get(b.staffId) ?? 0))
            .map((a) => {
              const person = getSetPerson(set, settings, a.staffId);
              return person ? personFullName(person) : "";
            })
            .filter(Boolean),
        })),
      };
    })
    .filter((row): row is Form1Row => Boolean(row));
}

export function getUsedShiftsForStaff(
  set: DocumentSet,
  settings: AppSettings,
  staffId: string,
): Shift[] {
  const shiftIds = new Set(
    set.assignments.filter((a) => a.staffId === staffId).map((a) => a.shiftId),
  );
  return getSetShiftPool(set, settings)
    .filter((shift) => shiftIds.has(shift.id))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export interface Form3StaffRow {
  staff: Person;
  shifts: Shift[];
  totalDays: number;
  totalHours: number;
  cells: Record<string, Record<string, string>>;
}

/**
 * Rows for the overtime schedule.
 *
 * The schedule is the document approved before the work takes place, so it
 * keeps the assigned shift times even when the person is later marked absent.
 * The payment form opts into `markAbsent` so its day cells still show `-` for
 * days that are not paid.
 */
export function getForm3Rows(
  set: DocumentSet,
  settings: AppSettings,
  options: { markAbsent?: boolean } = {},
): Form3StaffRow[] {
  const markAbsent = options.markAbsent ?? false;
  const monthDays = getDaysInMonth(set.year, set.month);
  return getSetStaff(set, settings).map((staff) => {
    const staffAssignments = set.assignments.filter(
      (assignment) => assignment.staffId === staff.id,
    );
    const usedShifts = getUsedShiftsForStaff(set, settings, staff.id);
    const shifts =
      usedShifts.length > 0
        ? usedShifts
        : getSetShiftPool(set, settings)
            .filter((shift) => shift.active)
            .slice(0, 1);
    const cells: Record<string, Record<string, string>> = {};
    for (let day = 1; day <= monthDays; day += 1) {
      const date = `${set.year - 543}-${String(set.month).padStart(2, "0")}-${String(
        day,
      ).padStart(2, "0")}`;
      cells[date] = {};
      for (const shift of shifts) {
        const assignment = staffAssignments.find(
          (a) => a.date === date && a.shiftId === shift.id,
        );
        if (!assignment) {
          cells[date][shift.id] = "";
          continue;
        }
        if (markAbsent && isAbsent(set, date, staff.id, shift.id)) {
          cells[date][shift.id] = "-";
        } else {
          cells[date][shift.id] = formatTimeRangeDoc(shift.start, shift.end);
        }
      }
    }
    const summary = staffPayment(set, settings, staff.id);
    return {
      staff,
      shifts,
      totalDays: markAbsent
        ? summary.days
        : new Set(staffAssignments.map((assignment) => assignment.date)).size,
      totalHours: summary.hours,
      cells,
    };
  });
}

export interface Form4Row {
  key: string;
  date: string;
  showDate: boolean;
  dateSpan: number;
  staff: Person;
  showStaff: boolean;
  staffSpan: number;
  shift: Shift;
  timeIn: string;
  timeOut: string;
  absent: boolean;
  note?: string;
  /** แถวที่เพิ่มจากใบขอแลกเปลี่ยนเวร (ผู้ปฏิบัติงานแทน) */
  isReplacement?: boolean;
}

export function getForm4Rows(set: DocumentSet, settings: AppSettings): Form4Row[] {
  const rows: Form4Row[] = [];
  const staffOrder = new Map(set.staffIds.map((id, index) => [id, index]));
  for (const date of set.selectedDates) {
    const dateAssignments = assignmentsForDate(set, date).sort((a, b) => {
      const staffDiff =
        (staffOrder.get(a.staffId) ?? 0) - (staffOrder.get(b.staffId) ?? 0);
      if (staffDiff !== 0) return staffDiff;
      const shiftA = getSetShift(set, settings, a.shiftId);
      const shiftB = getSetShift(set, settings, b.shiftId);
      return (shiftA?.start ?? "").localeCompare(shiftB?.start ?? "");
    });
    if (dateAssignments.length === 0) continue;
    const byStaff = new Map<string, Assignment[]>();
    for (const assignment of dateAssignments) {
      const list = byStaff.get(assignment.staffId) ?? [];
      list.push(assignment);
      byStaff.set(assignment.staffId, list);
    }
    let dateSpan = 0;
    for (const list of byStaff.values()) dateSpan += list.length;
    let dateRowIndex = 0;
    const dateStartIndex = rows.length;
    for (const staffId of set.staffIds) {
      const list = byStaff.get(staffId);
      if (!list?.length) continue;
      const person = getSetPerson(set, settings, staffId);
      if (!person) continue;
      const staffSpan = list.length;
      list.forEach((assignment, index) => {
        const shift = getSetShift(set, settings, assignment.shiftId);
        if (!shift) return;
        const record = getAttendance(set, date, staffId, shift.id);
        const absent = record?.status === "absent";
        rows.push({
          key: `${date}|${staffId}|${shift.id}`,
          date,
          showDate: dateRowIndex === 0,
          dateSpan,
          staff: person,
          showStaff: index === 0,
          staffSpan,
          shift,
          timeIn: record?.timeIn || shift.start,
          timeOut: record?.timeOut || shift.end,
          absent,
          note: record?.note,
        });
        dateRowIndex += 1;
      });
    }

    const replacementExchanges = getSetExchanges(set)
      .filter(
        (exchange) => exchange.date === date && exchange.replacementStaffId,
      )
      .sort((a, b) => {
        const startA = getSetShift(set, settings, a.shiftId)?.start ?? "";
        const startB = getSetShift(set, settings, b.shiftId)?.start ?? "";
        return startA.localeCompare(startB);
      });

    for (const exchange of replacementExchanges) {
      const replacement = getSetPerson(set, settings, exchange.replacementStaffId as string);
      const shift = getSetShift(set, settings, exchange.shiftId);
      if (!replacement || !shift) continue;
      const original = getSetPerson(set, settings, exchange.staffId);
      rows.push({
        key: `exchange|${exchange.id}`,
        date,
        showDate: false,
        dateSpan: 0,
        staff: replacement,
        showStaff: true,
        staffSpan: 1,
        shift,
        timeIn: shift.start,
        timeOut: shift.end,
        absent: false,
        note: original ? `แทน ${personFullName(original)}` : "แทน",
        isReplacement: true,
      });
    }

    const dateRowCount = rows.length - dateStartIndex;
    if (dateRowCount > 0) {
      rows[dateStartIndex].dateSpan = dateRowCount;
    }
  }
  return rows;
}

export interface Form5StaffRow {
  staff: Person;
  shifts: Shift[];
  totalDays: number;
  totalHours: number;
  amount: number;
  rate: number;
  cells: Record<string, Record<string, string>>;
  /** แถวที่เพิ่มจากใบขอแลกเปลี่ยนเวร (ผู้ปฏิบัติงานแทน) */
  isReplacement?: boolean;
  note?: string;
}

export function getForm5Rows(set: DocumentSet, settings: AppSettings): Form5StaffRow[] {
  const rows: Form5StaffRow[] = getForm3Rows(set, settings, { markAbsent: true }).map(
    (row) => {
      const summary = staffPayment(set, settings, row.staff.id);
      return {
        staff: row.staff,
        shifts: row.shifts,
        totalDays: summary.days,
        totalHours: summary.hours,
        amount: summary.amount,
        rate: set.rateOverrides?.[row.staff.id] ?? row.staff.ratePerHour,
        cells: row.cells,
      };
    },
  );

  const rowByStaff = new Map(rows.map((row) => [row.staff.id, row]));
  const countedDates = new Map(
    rows.map((row) => [
      row.staff.id,
      new Set(workDatesForStaff(set, row.staff.id)),
    ]),
  );

  const replacements = getSetExchanges(set)
    .filter((exchange) => exchange.replacementStaffId)
    .map((exchange) => {
      const person = getSetPerson(set, settings, exchange.replacementStaffId as string);
      const shift = getSetShift(set, settings, exchange.shiftId);
      if (!person || !shift) return null;
      const hours = shiftHours(shift.start, shift.end);
      const rate = set.rateOverrides?.[person.id] ?? person.ratePerHour;
      return {
        exchange,
        person,
        shift,
        hours,
        amount: Math.round(hours * rate * 100) / 100,
      };
    })
    .filter(
      (item): item is {
        exchange: ShiftExchange;
        person: Person;
        shift: Shift;
        hours: number;
        amount: number;
      } => Boolean(item),
    )
    .sort((a, b) => {
      if (a.exchange.date !== b.exchange.date) {
        return a.exchange.date.localeCompare(b.exchange.date);
      }
      return a.shift.start.localeCompare(b.shift.start);
    });

  for (const { exchange, person, shift, hours, amount } of replacements) {
    const existing = rowByStaff.get(person.id);
    if (!existing) {
      const cells = {
        [exchange.date]: {
          [shift.id]: formatTimeRangeDoc(shift.start, shift.end),
        },
      };
      const row: Form5StaffRow = {
        staff: person,
        shifts: [shift],
        totalDays: 1,
        totalHours: Math.round(hours * 100) / 100,
        amount,
        rate: set.rateOverrides?.[person.id] ?? person.ratePerHour,
        cells,
        isReplacement: true,
        note: "แทน",
      };
      rows.push(row);
      rowByStaff.set(person.id, row);
      continue;
    }

    if (existing.totalDays === 0) {
      existing.shifts = [shift];
    } else if (!existing.shifts.some((item) => item.id === shift.id)) {
      existing.shifts.push(shift);
    }
    existing.cells[exchange.date] = {
      ...(existing.cells[exchange.date] ?? {}),
      [shift.id]: formatTimeRangeDoc(shift.start, shift.end),
    };
    const dates = countedDates.get(person.id) ?? new Set<string>();
    if (!dates.has(exchange.date)) {
      dates.add(exchange.date);
      existing.totalDays += 1;
    }
    countedDates.set(person.id, dates);
    existing.totalHours = Math.round((existing.totalHours + hours) * 100) / 100;
    existing.amount = Math.round((existing.amount + amount) * 100) / 100;
    existing.note = existing.note ? existing.note : "มีเวรแทน";
  }

  return rows;
}

export function formatTimeCell(shift: Shift): string {
  return `${formatTimeThai(shift.start)}-${formatTimeThai(shift.end)}`;
}

export function setDateLabel(set: DocumentSet): string {
  return `${set.month}/${set.year}`;
}

export function nextStep(step: StepId): StepId | null {
  return step < 5 ? ((step + 1) as StepId) : null;
}

export function absentCount(set: DocumentSet): number {
  return Object.values(set.attendance).filter((record) => record.status === "absent").length;
}

export function assignmentHours(set: DocumentSet, settings: AppSettings): number {
  return set.assignments.reduce((sum, assignment) => {
    const shift = getSetShift(set, settings, assignment.shiftId);
    return sum + (shift ? shiftHours(shift.start, shift.end) : 0);
  }, 0);
}

export { assignmentKey };

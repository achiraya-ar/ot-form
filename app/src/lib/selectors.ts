import type {
  AppSettings,
  Assignment,
  AttendanceRecord,
  DocumentSet,
  Person,
  Shift,
  StepId,
} from "../types";
import { assignmentKey, personFullName } from "../data/defaults";
import {
  formatTimeRangeShortTh,
  formatTimeThai,
  getDaysInMonth,
  shiftHours,
} from "./thai";

export function getPerson(settings: AppSettings, id: string): Person | undefined {
  return settings.staff.find((person) => person.id === id);
}

export function getShift(settings: AppSettings, id: string): Shift | undefined {
  return settings.shifts.find((shift) => shift.id === id);
}

export function getSetStaff(set: DocumentSet, settings: AppSettings): Person[] {
  return set.staffIds
    .map((id) => getPerson(settings, id))
    .filter((person): person is Person => Boolean(person));
}

export function getSetShifts(set: DocumentSet, settings: AppSettings): Shift[] {
  const ids = new Set(set.assignments.map((a) => a.shiftId));
  return settings.shifts
    .filter((shift) => shift.active || ids.has(shift.id))
    .sort((a, b) => a.start.localeCompare(b.start));
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
  const shift = getShift(settings, assignment.shiftId);
  return shift ? shiftHours(shift.start, shift.end) : 0;
}

export function staffPayment(
  set: DocumentSet,
  settings: AppSettings,
  staffId: string,
): { hours: number; amount: number; days: number } {
  const person = getPerson(settings, staffId);
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

export function totalPayment(set: DocumentSet, settings: AppSettings): number {
  const total = getSetStaff(set, settings).reduce(
    (sum, person) => sum + staffPayment(set, settings, person.id).amount,
    0,
  );
  return Math.round(total * 100) / 100;
}

export function totalHours(set: DocumentSet, settings: AppSettings): number {
  const total = getSetStaff(set, settings).reduce(
    (sum, person) => sum + staffPayment(set, settings, person.id).hours,
    0,
  );
  return Math.round(total * 100) / 100;
}

export interface Form1Row {
  date: string;
  cells: { shift: Shift; names: string[] }[];
}

export function getForm1Rows(set: DocumentSet, settings: AppSettings): Form1Row[] {
  const shifts = getSetShifts(set, settings);
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
              const person = getPerson(settings, a.staffId);
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
  return settings.shifts
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

export function getForm3Rows(set: DocumentSet, settings: AppSettings): Form3StaffRow[] {
  const monthDays = getDaysInMonth(set.year, set.month);
  return getSetStaff(set, settings).map((staff) => {
    const usedShifts = getUsedShiftsForStaff(set, settings, staff.id);
    const shifts =
      usedShifts.length > 0
        ? usedShifts
        : settings.shifts.filter((shift) => shift.active).slice(0, 1);
    const cells: Record<string, Record<string, string>> = {};
    for (let day = 1; day <= monthDays; day += 1) {
      const date = `${set.year - 543}-${String(set.month).padStart(2, "0")}-${String(
        day,
      ).padStart(2, "0")}`;
      cells[date] = {};
      for (const shift of shifts) {
        const assignment = set.assignments.find(
          (a) => a.date === date && a.staffId === staff.id && a.shiftId === shift.id,
        );
        if (!assignment) {
          cells[date][shift.id] = "";
          continue;
        }
        if (isAbsent(set, date, staff.id, shift.id)) {
          cells[date][shift.id] = "-";
        } else {
          cells[date][shift.id] = formatTimeRangeShortTh(shift.start, shift.end);
        }
      }
    }
    const summary = staffPayment(set, settings, staff.id);
    return {
      staff,
      shifts,
      totalDays: summary.days,
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
}

export function getForm4Rows(set: DocumentSet, settings: AppSettings): Form4Row[] {
  const rows: Form4Row[] = [];
  const staffOrder = new Map(set.staffIds.map((id, index) => [id, index]));
  for (const date of set.selectedDates) {
    const dateAssignments = assignmentsForDate(set, date).sort((a, b) => {
      const staffDiff =
        (staffOrder.get(a.staffId) ?? 0) - (staffOrder.get(b.staffId) ?? 0);
      if (staffDiff !== 0) return staffDiff;
      const shiftA = getShift(settings, a.shiftId);
      const shiftB = getShift(settings, b.shiftId);
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
    for (const staffId of set.staffIds) {
      const list = byStaff.get(staffId);
      if (!list?.length) continue;
      const person = getPerson(settings, staffId);
      if (!person) continue;
      const staffSpan = list.length;
      list.forEach((assignment, index) => {
        const shift = getShift(settings, assignment.shiftId);
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
          timeIn: absent ? "-" : record?.timeIn ?? shift.start,
          timeOut: absent ? "-" : record?.timeOut ?? shift.end,
          absent,
          note: record?.note,
        });
        dateRowIndex += 1;
      });
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
}

export function getForm5Rows(set: DocumentSet, settings: AppSettings): Form5StaffRow[] {
  return getForm3Rows(set, settings).map((row) => {
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
  });
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
    const shift = getShift(settings, assignment.shiftId);
    return sum + (shift ? shiftHours(shift.start, shift.end) : 0);
  }, 0);
}

export { assignmentKey };

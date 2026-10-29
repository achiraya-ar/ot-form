import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Copy,
  Eraser,
  Sparkles,
  Users,
} from "lucide-react";
import type { AppSettings, Assignment, DocumentSet } from "../../types";
import { Button, Modal, useToast } from "../ui";
import { getSetStaff, getSetShifts } from "../../lib/selectors";
import { personFullName } from "../../data/defaults";
import {
  formatMonthYearUi,
  formatNumberUi,
  formatTimeRangeUi,
  formatTimeUi,
  getDaysInMonth,
  parseIsoDate,
  shiftHours,
} from "../../lib/thai";

const WEEKDAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

type DatePattern = Record<string, Record<string, string[]>>;

export function ScheduleEditor({
  set,
  settings,
  onClose,
  onSave,
}: {
  set: DocumentSet;
  settings: AppSettings;
  onClose: () => void;
  onSave: (assignments: Assignment[]) => void;
}) {
  const notify = useToast();
  const staff = getSetStaff(set, settings);
  const shifts = getSetShifts(set, settings);
  const dates = useMemo(() => [...set.selectedDates].sort(), [set.selectedDates]);
  const selectedDateSet = useMemo(() => new Set(dates), [dates]);

  const [patterns, setPatterns] = useState<DatePattern>(() => {
    const next: DatePattern = {};
    for (const person of staff) next[person.id] = {};
    for (const assignment of set.assignments) {
      next[assignment.staffId] ??= {};
      const list = next[assignment.staffId][assignment.date] ?? [];
      if (!list.includes(assignment.shiftId)) list.push(assignment.shiftId);
      next[assignment.staffId][assignment.date] = list;
    }
    return next;
  });
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id ?? "");

  const selectedPerson = staff.find((person) => person.id === selectedStaffId) ?? staff[0];

  const stats = useMemo(() => {
    const byStaff = new Map<
      string,
      { days: number; shifts: number; hours: number; amount: number }
    >();
    let totalShifts = 0;
    let totalHours = 0;
    let totalAmount = 0;

    for (const person of staff) {
      const pattern = patterns[person.id] ?? {};
      const rate = set.rateOverrides?.[person.id] ?? person.ratePerHour;
      let days = 0;
      let count = 0;
      let hours = 0;
      let amount = 0;

      for (const date of dates) {
        const shiftIds = pattern[date] ?? [];
        if (shiftIds.length > 0) days += 1;
        for (const shiftId of shiftIds) {
          const shift = shifts.find((item) => item.id === shiftId);
          if (!shift) continue;
          const shiftHour = shiftHours(shift.start, shift.end);
          count += 1;
          hours += shiftHour;
          amount += shiftHour * rate;
        }
      }

      byStaff.set(person.id, {
        days,
        shifts: count,
        hours: Math.round(hours * 100) / 100,
        amount: Math.round(amount * 100) / 100,
      });
      totalShifts += count;
      totalHours += hours;
      totalAmount += amount;
    }

    return {
      byStaff,
      totalShifts,
      totalHours: Math.round(totalHours * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }, [patterns, staff, dates, shifts, set.rateOverrides]);

  const selectedStats = selectedPerson
    ? stats.byStaff.get(selectedPerson.id) ?? { days: 0, shifts: 0, hours: 0, amount: 0 }
    : { days: 0, shifts: 0, hours: 0, amount: 0 };

  const toggleShift = (staffId: string, date: string, shiftId: string) => {
    setPatterns((prev) => {
      const current = prev[staffId] ?? {};
      const list = current[date] ?? [];
      const nextList = list.includes(shiftId)
        ? list.filter((id) => id !== shiftId)
        : [...list, shiftId];
      return { ...prev, [staffId]: { ...current, [date]: nextList } };
    });
  };

  const addShiftForWeekdays = (weekdays: number[], shiftId?: string) => {
    if (!selectedStaffId || !shiftId) return;
    setPatterns((prev) => {
      const current = { ...(prev[selectedStaffId] ?? {}) };
      for (const date of dates) {
        if (!weekdays.includes(parseIsoDate(date).getDay())) continue;
        const list = current[date] ?? [];
        if (!list.includes(shiftId)) current[date] = [...list, shiftId];
      }
      return { ...prev, [selectedStaffId]: current };
    });
    notify("เติมเวรตามวันที่เลือกแล้ว");
  };

  const copyToAll = () => {
    if (!selectedStaffId) return;
    const source = patterns[selectedStaffId] ?? {};
    const next: DatePattern = {};
    for (const person of staff) {
      next[person.id] = {};
      for (const date of dates) {
        next[person.id][date] = [...(source[date] ?? [])];
      }
    }
    setPatterns(next);
    notify("คัดลอกตารางของคนนี้ไปทุกคนแล้ว");
  };

  const clearSelected = () => {
    if (!selectedStaffId) return;
    setPatterns((prev) => ({ ...prev, [selectedStaffId]: {} }));
    notify("ล้างตารางของพนักงานคนนี้แล้ว", "info");
  };

  const buildAssignments = (): Assignment[] => {
    const map = new Map<string, Assignment>();
    for (const person of staff) {
      const pattern = patterns[person.id] ?? {};
      for (const date of dates) {
        for (const shiftId of pattern[date] ?? []) {
          map.set(`${date}|${person.id}|${shiftId}`, {
            date,
            staffId: person.id,
            shiftId,
          });
        }
      }
    }
    return [...map.values()];
  };

  const yearCE = set.year - 543;
  const daysInMonth = getDaysInMonth(set.year, set.month);
  const firstDay = new Date(yearCE, set.month - 1, 1).getDay();
  const leading = (firstDay + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      return `${yearCE}-${String(set.month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const morningShift = shifts.find((shift) => shift.name.includes("เช้า")) ?? shifts[0];
  const eveningShift =
    shifts.find((shift) => shift.name.includes("เย็น")) ?? shifts[shifts.length - 1];

  return (
    <Modal
      open
      onClose={onClose}
      title="จัดตารางการปฏิบัติงานนอกเวลา"
      subtitle={`${formatMonthYearUi(set.month, set.year)} · คลิก เช้า/เย็น ในปฏิทินของแต่ละคน`}
      size="xl"
      className="schedule-modal"
      footer={
        <div className="schedule-footer">
          <div className="schedule-footer__summary">
            <span>
              <strong>{formatNumberUi(stats.totalShifts)}</strong> เวร
            </span>
            <span>
              <strong>{formatNumberUi(stats.totalHours, 2)}</strong> ชั่วโมง
            </span>
            <span>
              ประมาณ <strong>฿ {formatNumberUi(stats.totalAmount, 2)}</strong>
            </span>
          </div>
          <div className="schedule-footer__actions">
            <Button variant="secondary" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const generated = buildAssignments();
                if (generated.length === 0) {
                  notify("กรุณากำหนดวันและเวรของพนักงานอย่างน้อย 1 คน", "error");
                  return;
                }
                onSave(generated);
              }}
            >
              <Check size={16} /> สร้างตารางเวร
            </Button>
          </div>
        </div>
      }
    >
      <div className="schedule5">
        <div className="schedule4__hint">
          <CalendarDays size={16} />
          <span>
            เลือกพนักงานทางซ้าย แล้วคลิก เช้า/เย็น ในวันที่ต้องการ
            วันสีเทาคือวันที่ไม่ได้เลือกไว้ในชุดนี้
          </span>
        </div>

        <div className="schedule5__layout">
          <aside className="staff-pattern-list">
            <div className="staff-pattern-list__head">
              <Users size={15} /> พนักงาน {formatNumberUi(staff.length)} คน
            </div>
            {staff.map((person) => {
              const personStats = stats.byStaff.get(person.id);
              const active = person.id === selectedPerson?.id;
              return (
                <button
                  key={person.id}
                  type="button"
                  className={`staff-pattern-person ${active ? "is-active" : ""}`}
                  onClick={() => setSelectedStaffId(person.id)}
                >
                  <span className="staff-pattern-person__avatar">
                    {person.firstName.slice(0, 1)}
                    {person.lastName.slice(0, 1)}
                  </span>
                  <span className="staff-pattern-person__main">
                    <strong>{personFullName(person)}</strong>
                    <small>{person.position}</small>
                  </span>
                  <span
                    className={`staff-pattern-person__count ${
                      personStats?.shifts ? "is-set" : ""
                    }`}
                  >
                    {personStats?.shifts
                      ? `${formatNumberUi(personStats.shifts)} เวร`
                      : "ยังไม่ตั้ง"}
                  </span>
                </button>
              );
            })}
          </aside>

          {selectedPerson && (
            <section className="calendar-panel">
              <div className="calendar-panel__head">
                <div>
                  <span className="eyebrow">ตารางรายเดือน</span>
                  <h3>{personFullName(selectedPerson)}</h3>
                  <p>{selectedPerson.position}</p>
                </div>
                <div className="staff-pattern-editor__summary">
                  <strong>{formatNumberUi(selectedStats.days)} วัน</strong>
                  <span>{formatNumberUi(selectedStats.shifts)} เวร</span>
                  <span>{formatNumberUi(selectedStats.hours, 2)} ชม.</span>
                  <span>฿ {formatNumberUi(selectedStats.amount, 2)}</span>
                </div>
              </div>

              <div className="calendar-presets">
                <span>
                  <Sparkles size={14} /> เติมเร็ว
                </span>
                {morningShift && (
                  <button
                    type="button"
                    onClick={() => addShiftForWeekdays([2], morningShift.id)}
                  >
                    อ. {morningShift.name}
                  </button>
                )}
                {eveningShift && (
                  <button
                    type="button"
                    onClick={() => addShiftForWeekdays([1, 2, 3, 4], eveningShift.id)}
                  >
                    จ.–พฤ. {eveningShift.name}
                  </button>
                )}
                <button type="button" onClick={clearSelected}>
                  <Eraser size={12} /> ล้างเดือนนี้
                </button>
                <button type="button" onClick={copyToAll}>
                  <Copy size={12} /> คัดลอกไปทุกคน
                </button>
              </div>

              <div className="calendar-weekdays">
                {WEEKDAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="calendar-grid">
                {cells.map((iso, index) => {
                  if (!iso) {
                    return <span key={`blank-${index}`} className="cal-cell is-blank" />;
                  }
                  const day = Number(iso.slice(-2));
                  const inSet = selectedDateSet.has(iso);
                  const weekend = [0, 6].includes(parseIsoDate(iso).getDay());
                  const activeShifts = patterns[selectedPerson.id]?.[iso] ?? [];
                  return (
                    <div
                      key={iso}
                      className={`cal-cell ${weekend ? "is-weekend" : ""} ${
                        inSet ? "" : "is-disabled"
                      }`}
                    >
                      <span className="cal-cell__date">{day}</span>
                      {inSet ? (
                        <div className="cal-cell__shifts">
                          {shifts.map((shift, shiftIndex) => {
                            const active = activeShifts.includes(shift.id);
                            return (
                              <button
                                key={shift.id}
                                type="button"
                                className={`cal-shift ${
                                  shiftIndex === 0 ? "is-morning" : "is-evening"
                                } ${active ? "is-active" : ""}`}
                                onClick={() => toggleShift(selectedPerson.id, iso, shift.id)}
                                title={`${shift.name} ${formatTimeRangeUi(
                                  shift.start,
                                  shift.end,
                                )}`}
                              >
                                <span>{shift.name}</span>
                                <small>{formatTimeUi(shift.start)}</small>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="cal-cell__off">–</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="calendar-legend">
                <span>
                  <i className="legend-swatch legend-swatch--morning" />
                  {morningShift?.name ?? "เวรเช้า"}
                </span>
                <span>
                  <i className="legend-swatch legend-swatch--evening" />
                  {eveningShift?.name ?? "เวรเย็น"}
                </span>
                <span>คลิกซ้ำเพื่อยกเลิกเวรของวันนั้น</span>
              </div>
            </section>
          )}
        </div>
      </div>
    </Modal>
  );
}

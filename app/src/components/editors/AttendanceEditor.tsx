import { useMemo, useState } from "react";
import { Check, ChevronDown, Clock, Eraser, UserX } from "lucide-react";
import type {
  AppSettings,
  Assignment,
  AttendanceRecord,
  DocumentSet,
} from "../../types";
import { Button, Modal, TimeInput, useToast } from "../ui";
import { assignmentKey, personFullName } from "../../data/defaults";
import { getSetStaff, getShift } from "../../lib/selectors";
import {
  formatBahtUi,
  formatDateShortUi,
  formatMonthYearUi,
  formatNumberUi,
  formatTimeRangeUi,
  formatTimeUi,
  shiftHours,
  weekdayName,
} from "../../lib/thai";

function buildRecords(set: DocumentSet, settings: AppSettings) {
  const records: Record<string, AttendanceRecord> = { ...set.attendance };
  for (const assignment of set.assignments) {
    const key = assignmentKey(assignment);
    if (!records[key]) {
      const shift = getShift(settings, assignment.shiftId);
      records[key] = {
        ...assignment,
        status: "present",
        timeIn: shift?.start,
        timeOut: shift?.end,
      };
    }
  }
  return records;
}

interface StaffDayGroup {
  staffId: string;
  name: string;
  position: string;
  assignments: Assignment[];
}

interface DateGroup {
  date: string;
  staffGroups: StaffDayGroup[];
}

export function AttendanceEditor({
  set,
  settings,
  onClose,
  onSave,
}: {
  set: DocumentSet;
  settings: AppSettings;
  onClose: () => void;
  onSave: (attendance: Record<string, AttendanceRecord>) => void;
}) {
  const notify = useToast();
  const staff = getSetStaff(set, settings);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>(() =>
    buildRecords(set, settings),
  );
  const [onlyExceptions, setOnlyExceptions] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const dateGroups = useMemo<DateGroup[]>(() => {
    const map = new Map<string, Map<string, Assignment[]>>();
    for (const assignment of set.assignments) {
      const byStaff = map.get(assignment.date) ?? new Map<string, Assignment[]>();
      const list = byStaff.get(assignment.staffId) ?? [];
      list.push(assignment);
      byStaff.set(assignment.staffId, list);
      map.set(assignment.date, byStaff);
    }

    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, byStaff]) => {
        const groups: StaffDayGroup[] = [];
        for (const staffId of set.staffIds) {
          const assignments = byStaff.get(staffId);
          if (!assignments?.length) continue;
          const person = staff.find((item) => item.id === staffId);
          if (!person) continue;
          groups.push({
            staffId,
            name: personFullName(person),
            position: person.position,
            assignments: [...assignments].sort((a, b) => {
              const startA = getShift(settings, a.shiftId)?.start ?? "";
              const startB = getShift(settings, b.shiftId)?.start ?? "";
              return startA.localeCompare(startB);
            }),
          });
        }
        return { date, staffGroups: groups };
      });
  }, [set.assignments, set.staffIds, staff, settings]);

  const dateStats = useMemo(() => {
    const map = new Map<string, { present: number; absent: number }>();
    for (const assignment of set.assignments) {
      const record = records[assignmentKey(assignment)];
      const entry = map.get(assignment.date) ?? { present: 0, absent: 0 };
      if (record?.status === "absent") entry.absent += 1;
      else entry.present += 1;
      map.set(assignment.date, entry);
    }
    return map;
  }, [set.assignments, records]);

  const displayDates = onlyExceptions
    ? dateGroups.filter((group) => (dateStats.get(group.date)?.absent ?? 0) > 0)
    : dateGroups;

  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => {
    const firstDate = dateGroups[0]?.date;
    return new Set(firstDate ? [firstDate] : []);
  });

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let hours = 0;
    let amount = 0;
    for (const assignment of set.assignments) {
      const record = records[assignmentKey(assignment)];
      const shift = getShift(settings, assignment.shiftId);
      const person = staff.find((item) => item.id === assignment.staffId);
      if (!record || record.status === "absent") {
        absent += 1;
        continue;
      }
      present += 1;
      const hour =
        record.timeIn && record.timeOut
          ? shiftHours(record.timeIn, record.timeOut)
          : shift
            ? shiftHours(shift.start, shift.end)
            : 0;
      hours += hour;
      amount += hour * (set.rateOverrides?.[assignment.staffId] ?? person?.ratePerHour ?? 0);
    }
    return {
      present,
      absent,
      hours: Math.round(hours * 100) / 100,
      amount: Math.round(amount * 100) / 100,
    };
  }, [records, set.assignments, set.rateOverrides, settings, staff]);

  const update = (assignment: Assignment, patch: Partial<AttendanceRecord>) => {
    const key = assignmentKey(assignment);
    setRecords((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...assignment, ...patch },
    }));
  };

  const setStatus = (assignment: Assignment, status: "present" | "absent") => {
    const shift = getShift(settings, assignment.shiftId);
    const current = records[assignmentKey(assignment)];
    update(assignment, {
      status,
      ...(status === "present" && (!current?.timeIn || !current?.timeOut)
        ? { timeIn: shift?.start, timeOut: shift?.end }
        : {}),
    });
  };

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const markAllPresent = () => {
    setRecords((prev) => {
      const next = { ...prev };
      for (const assignment of set.assignments) {
        const key = assignmentKey(assignment);
        const shift = getShift(settings, assignment.shiftId);
        next[key] = {
          ...next[key],
          ...assignment,
          status: "present",
          timeIn: next[key]?.timeIn ?? shift?.start,
          timeOut: next[key]?.timeOut ?? shift?.end,
        };
      }
      return next;
    });
    notify("ทำเครื่องหมายมาปฏิบัติงานทั้งหมดแล้ว");
  };

  const resetTimes = () => {
    setRecords((prev) => {
      const next = { ...prev };
      for (const assignment of set.assignments) {
        const key = assignmentKey(assignment);
        const shift = getShift(settings, assignment.shiftId);
        next[key] = {
          ...next[key],
          ...assignment,
          timeIn: shift?.start,
          timeOut: shift?.end,
        };
      }
      return next;
    });
    notify("คืนค่าเวลาเริ่มต้นของทุกเวรแล้ว", "info");
  };

  const toggleExceptions = (checked: boolean) => {
    setOnlyExceptions(checked);
    if (checked) {
      const exceptionDates = dateGroups
        .filter((group) => (dateStats.get(group.date)?.absent ?? 0) > 0)
        .map((group) => group.date);
      setExpandedDates(new Set(exceptionDates));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="บันทึกใบรายชื่อเข้างาน"
      subtitle={`${formatMonthYearUi(set.month, set.year)} · ${formatNumberUi(
        set.assignments.length,
      )} เวร`}
      size="xl"
      className="attendance-modal"
      footer={
        <div className="schedule-footer">
          <div className="schedule-footer__summary">
            <span>
              มา <strong>{formatNumberUi(summary.present)}</strong>
            </span>
            <span>
              ไม่มา <strong className="text-danger">{formatNumberUi(summary.absent)}</strong>
            </span>
            <span>
              <strong>{formatNumberUi(summary.hours, 2)}</strong> ชั่วโมง
            </span>
            <span>
              ค่าตอบแทน <strong>฿ {formatBahtUi(summary.amount)}</strong>
            </span>
          </div>
          <div className="schedule-footer__actions">
            <Button variant="secondary" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const activeKeys = new Set(
                  set.assignments.map((assignment) => assignmentKey(assignment)),
                );
                onSave(
                  Object.fromEntries(
                    Object.entries(records).filter(([key]) => activeKeys.has(key)),
                  ),
                );
              }}
            >
              <Check size={16} /> บันทึกใบลงเวลา
            </Button>
          </div>
        </div>
      }
    >
      <div className="attendance2">
        <div className="attendance2__toolbar">
          <div className="attendance2__hint">
            <UserX size={15} />
            <span>
              คลิกชิป เช้า/เย็น เพื่อสลับ “มา/ไม่มา” · ถ้าไม่มา ระบบจะตัดเวลานั้นออก
            </span>
          </div>
          <div className="attendance2__actions">
            <Button size="sm" variant="soft" onClick={markAllPresent}>
              <Check size={14} /> มาทั้งหมด
            </Button>
            <label className="daily-check">
              <input
                type="checkbox"
                checked={onlyExceptions}
                onChange={(event) => toggleExceptions(event.target.checked)}
              />
              <span>เฉพาะวันที่มีการไม่มา</span>
            </label>
            <details className="schedule-menu">
              <summary>ตัวเลือก</summary>
              <div>
                <button type="button" onClick={resetTimes}>
                  <Eraser size={13} /> คืนค่าเวลาเริ่มต้น
                </button>
              </div>
            </details>
          </div>
        </div>

        {dateGroups.length === 0 ? (
          <div className="attendance2__empty">ยังไม่มีเวรในชุดเอกสารนี้</div>
        ) : displayDates.length === 0 ? (
          <div className="attendance2__empty">
            <strong>ยังไม่มีการไม่มาปฏิบัติงาน</strong>
            <p>ปิด “เฉพาะวันที่มีการไม่มา” เพื่อดูตารางทั้งหมด</p>
          </div>
        ) : (
          <div className="attendance2__list">
            {displayDates.map((group) => {
              const stats = dateStats.get(group.date) ?? { present: 0, absent: 0 };
              const expanded = expandedDates.has(group.date);
              return (
                <section
                  key={group.date}
                  className={`att-date-card ${expanded ? "is-open" : ""}`}
                >
                  <button
                    type="button"
                    className="att-date-card__head"
                    onClick={() => toggleDate(group.date)}
                    aria-expanded={expanded}
                  >
                    <span className="att-date-card__date">
                      <strong>{formatDateShortUi(group.date)}</strong>
                      <small>{weekdayName(group.date)}</small>
                    </span>
                    <span className="att-date-card__summary">
                      <span className="is-present">มา {formatNumberUi(stats.present)}</span>
                      <span className={stats.absent > 0 ? "is-absent" : ""}>
                        ไม่มา {formatNumberUi(stats.absent)}
                      </span>
                    </span>
                    <ChevronDown size={17} className="att-date-card__chevron" />
                  </button>

                  {expanded && (
                    <div className="att-date-card__body">
                      {group.staffGroups.map((staffGroup) => {
                        const rowKey = `${group.date}|${staffGroup.staffId}`;
                        const editing = editingKey === rowKey;
                        const anyPresent = staffGroup.assignments.some(
                          (assignment) =>
                            records[assignmentKey(assignment)]?.status !== "absent",
                        );
                        return (
                          <div key={rowKey} className="att-staff-block">
                            <div className="att-staff">
                              <div className="att-staff__name">
                                <strong>{staffGroup.name}</strong>
                                <small>{staffGroup.position}</small>
                              </div>
                              <div className="att-staff__chips">
                                {staffGroup.assignments.map((assignment) => {
                                  const shift = getShift(settings, assignment.shiftId);
                                  const record = records[assignmentKey(assignment)];
                                  const absent = record?.status === "absent";
                                  const timeText = shift
                                    ? `${formatTimeUi(
                                        record?.timeIn ?? shift.start,
                                      )}–${formatTimeUi(record?.timeOut ?? shift.end)}`
                                    : "";
                                  return (
                                    <button
                                      key={assignmentKey(assignment)}
                                      type="button"
                                      className={`att-chip ${
                                        absent ? "is-absent" : "is-present"
                                      }`}
                                      onClick={() =>
                                        setStatus(assignment, absent ? "present" : "absent")
                                      }
                                      title={`${shift?.name ?? "เวร"} ${timeText} — คลิกเพื่อสลับสถานะ`}
                                    >
                                      <span className="att-chip__status">
                                        {absent ? "ไม่มา" : "มา"}
                                      </span>
                                      <span className="att-chip__text">
                                        <strong>{shift?.name ?? "เวร"}</strong>
                                        <small>{timeText}</small>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              <button
                                type="button"
                                className={`att-time-btn ${editing ? "is-active" : ""}`}
                                onClick={() => setEditingKey(editing ? null : rowKey)}
                                disabled={!anyPresent}
                                title="ปรับเวลามา–กลับ"
                              >
                                <Clock size={13} />
                                เวลา
                              </button>
                            </div>

                            {editing && (
                              <div className="att-time-panel">
                                {staffGroup.assignments.map((assignment) => {
                                  const shift = getShift(settings, assignment.shiftId);
                                  const record = records[assignmentKey(assignment)];
                                  if (!shift) return null;
                                  return (
                                    <div
                                      key={assignmentKey(assignment)}
                                      className="att-time-line"
                                    >
                                      <strong>{shift.name}</strong>
                                      <TimeInput
                                        className="input input--time"
                                        value={record?.timeIn ?? shift.start}
                                        onChange={(value) =>
                                          update(assignment, { timeIn: value })
                                        }
                                      />
                                      <span>ถึง</span>
                                      <TimeInput
                                        className="input input--time"
                                        value={record?.timeOut ?? shift.end}
                                        onChange={(value) =>
                                          update(assignment, { timeOut: value })
                                        }
                                      />
                                      <button
                                        type="button"
                                        className="att-time-reset"
                                        onClick={() =>
                                          update(assignment, {
                                            timeIn: shift.start,
                                            timeOut: shift.end,
                                          })
                                        }
                                      >
                                        ใช้เวลาเวร
                                      </button>
                                      <input
                                        className="input att-note"
                                        value={record?.note ?? ""}
                                        placeholder="หมายเหตุภายใน"
                                        onChange={(event) =>
                                          update(assignment, { note: event.target.value })
                                        }
                                      />
                                    </div>
                                  );
                                })}
                                <small className="att-time-panel__hint">
                                  เวลาที่แก้ไขจะถูกใช้คำนวณชั่วโมงและค่าตอบแทน
                                </small>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

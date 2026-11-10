import { useCallback, useMemo, useState } from "react";
import { ArrowLeftRight, Check, ChevronDown, Clock, Eraser } from "lucide-react";
import type {
  AppSettings,
  Assignment,
  AttendanceRecord,
  DocumentSet,
  ShiftExchange,
} from "../../types";
import { Button, Modal, TimeInput, useToast } from "../ui";
import { ShiftExchangePanel } from "./ShiftExchangePanel";
import { ExchangeRequestModal } from "./ExchangeRequestModal";
import { assignmentKey, personFullName } from "../../data/defaults";
import { exchangePaymentSummary, getSetShift, getSetStaff } from "../../lib/selectors";
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
      const shift = getSetShift(set, settings, assignment.shiftId);
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
  onAutoSave,
}: {
  set: DocumentSet;
  settings: AppSettings;
  onClose: () => void;
  onSave: (
    attendance: Record<string, AttendanceRecord>,
    exchanges: ShiftExchange[],
  ) => void;
  onAutoSave?: (
    attendance: Record<string, AttendanceRecord>,
    exchanges: ShiftExchange[],
  ) => void;
}) {
  const notify = useToast();
  const staff = getSetStaff(set, settings);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>(() =>
    buildRecords(set, settings),
  );
  const [exchanges, setExchanges] = useState<ShiftExchange[]>(() =>
    Array.isArray(set.shiftExchanges) ? set.shiftExchanges : [],
  );
  const [tab, setTab] = useState<"attendance" | "exchanges">("attendance");
  const [onlyExceptions, setOnlyExceptions] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [exchangePrefill, setExchangePrefill] = useState<{
    assignment: Assignment;
    nonce: number;
  } | null>(null);
  const [printExchange, setPrintExchange] = useState<ShiftExchange | null>(null);
  const handlePrefillHandled = useCallback(() => setExchangePrefill(null), []);
  const exchangedKeys = useMemo(
    () => new Set(exchanges.map((exchange) => assignmentKey(exchange))),
    [exchanges],
  );

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
              const startA = getSetShift(set, settings, a.shiftId)?.start ?? "";
              const startB = getSetShift(set, settings, b.shiftId)?.start ?? "";
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
    for (const exchange of exchanges) {
      if (!exchange.replacementStaffId) continue;
      const entry = map.get(exchange.date) ?? { present: 0, absent: 0 };
      entry.present += 1;
      map.set(exchange.date, entry);
    }
    return map;
  }, [set.assignments, records, exchanges]);

  const displayDates = onlyExceptions
    ? dateGroups.filter((group) => (dateStats.get(group.date)?.absent ?? 0) > 0)
    : dateGroups;

  const [expandedDate, setExpandedDate] = useState<string | null>(
    dateGroups[0]?.date ?? null,
  );

  const exchangeSummary = useMemo(
    () => exchangePaymentSummary({ ...set, shiftExchanges: exchanges }, settings),
    [set, settings, exchanges],
  );

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let hours = 0;
    let amount = 0;
    for (const assignment of set.assignments) {
      const record = records[assignmentKey(assignment)];
      const shift = getSetShift(set, settings, assignment.shiftId);
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
    present += exchanges.filter((exchange) => exchange.replacementStaffId).length;
    hours += exchangeSummary.hours;
    amount += exchangeSummary.amount;
    return {
      present,
      absent,
      hours: Math.round(hours * 100) / 100,
      amount: Math.round(amount * 100) / 100,
    };
  }, [records, set.assignments, set.rateOverrides, settings, staff, exchanges, exchangeSummary]);

  const update = (assignment: Assignment, patch: Partial<AttendanceRecord>) => {
    const key = assignmentKey(assignment);
    setRecords((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...assignment, ...patch },
    }));
  };

  const setStatus = (assignment: Assignment, status: "present" | "absent") => {
    if (exchangedKeys.has(assignmentKey(assignment))) return;
    const shift = getSetShift(set, settings, assignment.shiftId);
    const current = records[assignmentKey(assignment)];
    update(assignment, {
      status,
      ...(status === "present" && (!current?.timeIn || !current?.timeOut)
        ? { timeIn: shift?.start, timeOut: shift?.end }
        : {}),
    });
    if (status === "absent") {
      setExchangePrefill({ assignment, nonce: Date.now() });
      setTab("exchanges");
    }
  };

  const activeAttendance = () => {
    const activeKeys = new Set(
      set.assignments.map((assignment) => assignmentKey(assignment)),
    );
    return Object.fromEntries(
      Object.entries(records).filter(([key]) => activeKeys.has(key)),
    );
  };

  const persistDraft = () => {
    onAutoSave?.(activeAttendance(), exchanges);
  };

  const toggleDate = (date: string) => {
    persistDraft();
    setExpandedDate((current) => (current === date ? null : date));
  };

  const closeEditor = () => {
    persistDraft();
    onClose();
  };

  const handleModalClose = () => {
    if (printExchange) {
      setPrintExchange(null);
      return;
    }
    closeEditor();
  };

  const saveExchange = (
    exchange: ShiftExchange,
    previous?: ShiftExchange,
  ) => {
    const nextExchanges = previous
      ? exchanges.map((item) => (item.id === exchange.id ? exchange : item))
      : [...exchanges, exchange];
    setExchanges(nextExchanges);

    setRecords((prev) => {
      const next = { ...prev };
      if (
        previous &&
        assignmentKey(previous) !== assignmentKey(exchange) &&
        !nextExchanges.some(
          (item) => assignmentKey(item) === assignmentKey(previous),
        )
      ) {
        const oldKey = assignmentKey(previous);
        const oldRecord = next[oldKey];
        const oldShift = getSetShift(set, settings, previous.shiftId);
        if (oldRecord) {
          next[oldKey] = {
            ...oldRecord,
            status: "present",
            timeIn: oldRecord.timeIn ?? oldShift?.start,
            timeOut: oldRecord.timeOut ?? oldShift?.end,
          };
        }
      }

      const key = assignmentKey(exchange);
      const shift = getSetShift(set, settings, exchange.shiftId);
      next[key] = {
        ...(next[key] ?? {
          date: exchange.date,
          staffId: exchange.staffId,
          shiftId: exchange.shiftId,
          timeIn: shift?.start,
          timeOut: shift?.end,
        }),
        status: "absent",
      };
      return next;
    });

    notify("บันทึกใบแลกเปลี่ยนเวรแล้ว");
    setTab("exchanges");
  };

  const deleteExchange = (exchange: ShiftExchange) => {
    const nextExchanges = exchanges.filter((item) => item.id !== exchange.id);
    setExchanges(nextExchanges);
    if (
      !nextExchanges.some(
        (item) => assignmentKey(item) === assignmentKey(exchange),
      )
    ) {
      setRecords((prev) => {
        const key = assignmentKey(exchange);
        const record = prev[key];
        if (!record) return prev;
        const shift = getSetShift(set, settings, exchange.shiftId);
        return {
          ...prev,
          [key]: {
            ...record,
            status: "present",
            timeIn: record.timeIn ?? shift?.start,
            timeOut: record.timeOut ?? shift?.end,
          },
        };
      });
    }
    notify("ลบใบแลกเปลี่ยนเวรแล้ว", "info");
  };

  const markAllPresent = () => {
    setRecords((prev) => {
      const next = { ...prev };
      for (const assignment of set.assignments) {
        const key = assignmentKey(assignment);
        if (exchangedKeys.has(key)) continue;
        const shift = getSetShift(set, settings, assignment.shiftId);
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
        const shift = getSetShift(set, settings, assignment.shiftId);
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
      setExpandedDate(exceptionDates[0] ?? null);
    }
  };

  return (
    <Modal
      open
      onClose={handleModalClose}
      title="บันทึกใบรายชื่อเข้างาน"
      subtitle={`${formatMonthYearUi(set.month, set.year)} · ${formatNumberUi(
        set.assignments.length,
      )} เวร`}
      size="xl"
      className="attendance-modal"
      footer={
        <>
          <Button variant="secondary" onClick={closeEditor}>
            ปิด
          </Button>
          <Button
            variant="primary"
            onClick={() => onSave(activeAttendance(), exchanges)}
          >
            <Check size={16} /> บันทึกใบลงเวลา
          </Button>
        </>
      }
    >
      <div className="attendance2">
        <div className="attendance-tabs" role="tablist" aria-label="ส่วนของใบลงเวลา">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "attendance"}
            className={tab === "attendance" ? "is-active" : ""}
            onClick={() => setTab("attendance")}
          >
            <Clock size={15} /> บัญชีลงเวลา
            <span>{formatNumberUi(set.assignments.length)}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "exchanges"}
            className={tab === "exchanges" ? "is-active" : ""}
            onClick={() => setTab("exchanges")}
          >
            <ArrowLeftRight size={15} /> ใบแลกเปลี่ยนเวร
            <span>{formatNumberUi(exchanges.length)}</span>
          </button>
        </div>

        <div className="attendance-overview">
          <div className="attendance-summary">
            <div className="attendance-metric is-present">
              <span>มา</span>
              <strong>{formatNumberUi(summary.present)}</strong>
            </div>
            <div className="attendance-metric is-absent">
              <span>ไม่มา</span>
              <strong>{formatNumberUi(summary.absent)}</strong>
            </div>
            <div className="attendance-metric">
              <span>ชั่วโมง</span>
              <strong>{formatNumberUi(summary.hours, 2)}</strong>
            </div>
            <div className="attendance-metric is-money">
              <span>ค่าตอบแทน</span>
              <strong>฿ {formatBahtUi(summary.amount)}</strong>
            </div>
          </div>

          {tab === "attendance" && (
            <div className="attendance-actions">
              <Button size="sm" variant="soft" onClick={markAllPresent}>
                <Check size={14} /> มาทั้งหมด
              </Button>
              <label className="attendance-filter-toggle">
                <input
                  type="checkbox"
                  checked={onlyExceptions}
                  onChange={(event) => toggleExceptions(event.target.checked)}
                />
                <span>เฉพาะไม่มา</span>
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
          )}
        </div>

        {tab === "attendance" ? (
          <>
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
              const replacements = exchanges.filter(
                (exchange) =>
                  exchange.date === group.date && exchange.replacementStaffId,
              ).length;
              const expanded = expandedDate === group.date;
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
                      {replacements > 0 && (
                        <span className="is-replacement">
                          แทน {formatNumberUi(replacements)}
                        </span>
                      )}
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
                                  const shift = getSetShift(set, settings, assignment.shiftId);
                                  const record = records[assignmentKey(assignment)];
                                  const absent = record?.status === "absent";
                                  const exchanged = exchangedKeys.has(
                                    assignmentKey(assignment),
                                  );
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
                                      } ${exchanged ? "is-exchanged" : ""}`}
                                      onClick={() =>
                                        setStatus(assignment, absent ? "present" : "absent")
                                      }
                                      disabled={exchanged}
                                      title={
                                        exchanged
                                          ? "มีใบแลกเปลี่ยนเวร — จัดการที่แท็บใบแลกเปลี่ยนเวร"
                                          : `${shift?.name ?? "เวร"} ${timeText} — คลิกเพื่อสลับสถานะ`
                                      }
                                    >
                                      <span className="att-chip__status">
                                        {exchanged ? "แลกเวร" : absent ? "ไม่มา" : "มา"}
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
                                  const shift = getSetShift(set, settings, assignment.shiftId);
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
          </>
        ) : (
          <ShiftExchangePanel
            set={set}
            settings={settings}
            exchanges={exchanges}
            attendance={records}
            prefill={exchangePrefill}
            onPrefillHandled={handlePrefillHandled}
            onSave={saveExchange}
            onDelete={deleteExchange}
            onPrint={setPrintExchange}
          />
        )}
      </div>

      {printExchange && (
        <ExchangeRequestModal
          set={set}
          settings={settings}
          exchange={printExchange}
          onClose={() => setPrintExchange(null)}
        />
      )}
    </Modal>
  );
}

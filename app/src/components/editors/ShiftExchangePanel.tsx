import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CalendarDays,
  Check,
  Pencil,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import type { AppSettings, Assignment, AttendanceRecord, DocumentSet, ShiftExchange } from "../../types";
import { Button, DateInput, Field } from "../ui";
import { newId, personFullName } from "../../data/defaults";
import {
  eligibleReplacementStaff,
  getSetPerson,
  getSetShift,
} from "../../lib/selectors";
import {
  formatDateShortUi,
  formatTimeRangeUi,
  weekdayName,
} from "../../lib/thai";

export function ShiftExchangePanel({
  set,
  settings,
  exchanges,
  attendance,
  prefill,
  onPrefillHandled,
  onSave,
  onDelete,
  onPrint,
}: {
  set: DocumentSet;
  settings: AppSettings;
  exchanges: ShiftExchange[];
  attendance: Record<string, AttendanceRecord>;
  prefill?: { assignment: Assignment; nonce: number } | null;
  onPrefillHandled?: () => void;
  onSave: (exchange: ShiftExchange, previous?: ShiftExchange) => void;
  onDelete: (exchange: ShiftExchange) => void;
  onPrint: (exchange: ShiftExchange) => void;
}) {
  const [draft, setDraft] = useState<ShiftExchange | null>(null);
  const [previous, setPrevious] = useState<ShiftExchange | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const assignmentOptions = useMemo(() => {
    const used = new Set(
      exchanges
        .filter((exchange) => exchange.id !== draft?.id)
        .map((exchange) => `${exchange.date}|${exchange.staffId}|${exchange.shiftId}`),
    );
    return [...set.assignments]
      .filter((assignment) => {
        const key = `${assignment.date}|${assignment.staffId}|${assignment.shiftId}`;
        return (
          !used.has(key) &&
          attendance[key]?.status === "absent"
        );
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const startA = getSetShift(set, settings, a.shiftId)?.start ?? "";
        const startB = getSetShift(set, settings, b.shiftId)?.start ?? "";
        if (startA !== startB) return startA.localeCompare(startB);
        return a.staffId.localeCompare(b.staffId);
      })
      .map((assignment) => {
        const person = getSetPerson(set, settings, assignment.staffId);
        const shift = getSetShift(set, settings, assignment.shiftId);
        return {
          value: `${assignment.date}|${assignment.staffId}|${assignment.shiftId}`,
          date: assignment.date,
          staffId: assignment.staffId,
          shiftId: assignment.shiftId,
          label: `${formatDateShortUi(assignment.date)} · ${
            person ? personFullName(person) : assignment.staffId
          } · ${shift?.name ?? "เวร"}${
            shift ? ` (${formatTimeRangeUi(shift.start, shift.end)})` : ""
          }`,
        };
      });
  }, [set.assignments, exchanges, draft?.id, settings, attendance]);

  const draftValue = draft
    ? `${draft.date}|${draft.staffId}|${draft.shiftId}`
    : "";

  const eligibleReplacements = useMemo(() => {
    if (!draft) return [];
    return eligibleReplacementStaff(
      set,
      settings,
      draft.date,
      draft.staffId,
      draft.shiftId,
      draft.id,
    );
  }, [draft, set, settings]);

  useEffect(() => {
    if (!prefill) return;
    const { assignment } = prefill;
    const key = `${assignment.date}|${assignment.staffId}|${assignment.shiftId}`;
    if (attendance[key]?.status !== "absent") {
      onPrefillHandled?.();
      return;
    }
    const now = new Date().toISOString();
    setPrevious(null);
    setDraft({
      id: newId(),
      date: assignment.date,
      staffId: assignment.staffId,
      shiftId: assignment.shiftId,
      replacementStaffId: null,
      reason: "",
      requestDate: assignment.date,
      approvalDate: assignment.date,
      createdAt: now,
      updatedAt: now,
    });
    onPrefillHandled?.();
  }, [prefill, attendance, onPrefillHandled]);

  const startNew = () => {
    const first = assignmentOptions[0];
    if (!first) return;
    const now = new Date().toISOString();
    setPrevious(null);
    setDraft({
      id: newId(),
      date: first.date,
      staffId: first.staffId,
      shiftId: first.shiftId,
      replacementStaffId: null,
      reason: "",
      requestDate: first.date,
      approvalDate: first.date,
      createdAt: now,
      updatedAt: now,
    });
  };

  const startEdit = (exchange: ShiftExchange) => {
    setPrevious(exchange);
    const requestDate = exchange.requestDate || exchange.date;
    setDraft({
      ...exchange,
      requestDate,
      approvalDate: exchange.approvalDate ?? requestDate,
    });
  };

  const cancelForm = () => {
    setDraft(null);
    setPrevious(null);
  };

  const changeAssignment = (value: string) => {
    const [date, staffId, shiftId] = value.split("|");
    setDraft((current) => {
      if (!current) return current;
      // Until the user changes a date manually, keep both document dates in
      // sync with the selected shift date.
      const requestFollowsShift =
        !current.requestDate || current.requestDate === current.date;
      const approvalFollowsShift =
        !current.approvalDate || current.approvalDate === current.date;
      return {
        ...current,
        date,
        staffId,
        shiftId,
        replacementStaffId: null,
        requestDate: requestFollowsShift ? date : current.requestDate,
        approvalDate: approvalFollowsShift ? date : current.approvalDate,
      };
    });
  };

  const save = () => {
    if (!draft) return;
    const replacementStaffId =
      draft.replacementStaffId &&
      eligibleReplacements.some((person) => person.id === draft.replacementStaffId)
        ? draft.replacementStaffId
        : null;
    onSave(
      { ...draft, replacementStaffId, updatedAt: new Date().toISOString() },
      previous ?? undefined,
    );
    setDraft(null);
    setPrevious(null);
  };

  const sortedExchanges = useMemo(
    () =>
      [...exchanges].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const startA = getSetShift(set, settings, a.shiftId)?.start ?? "";
        const startB = getSetShift(set, settings, b.shiftId)?.start ?? "";
        return startA.localeCompare(startB);
      }),
    [exchanges, settings],
  );

  return (
    <div className="exchange-panel">
      <div className="exchange-panel__head">
        <div>
          <span className="eyebrow">แลกเปลี่ยนเวร</span>
          <h3>ใบขอแลกเปลี่ยนเวร</h3>
          <p>เลือกเวรที่แจ้งไม่มา แล้วระบุผู้ปฏิบัติงานแทนถ้ามี</p>
        </div>
        <Button
          type="button"
          variant="soft"
          size="sm"
          onClick={startNew}
          disabled={assignmentOptions.length === 0 || Boolean(draft)}
        >
          <Plus size={15} /> เพิ่มใบแลกเปลี่ยน
        </Button>
      </div>

      {draft && (
        <form
          className="exchange-form"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="exchange-form__head">
            <div>
              <strong>{previous ? "แก้ไขใบแลกเปลี่ยนเวร" : "ใบแลกเปลี่ยนเวรใหม่"}</strong>
              <small>ระบบจะบันทึกผู้ขอว่าไม่มาปฏิบัติงานในเวรนี้อัตโนมัติ</small>
            </div>
            <button
              type="button"
              className="exchange-icon-btn"
              aria-label="ปิดแบบฟอร์ม"
              onClick={cancelForm}
            >
              <X size={15} />
            </button>
          </div>

          <div className="form-grid form-grid--2">
            <Field
              label="วันที่ขอแลกเปลี่ยน (มุมขวาบน)"
              hint="ค่าเริ่มต้นคือวันที่ของเวรที่ขอแลกเปลี่ยน"
              required
            >
              <DateInput
                value={draft.requestDate}
                onChange={(value) =>
                  setDraft((current) =>
                    current ? { ...current, requestDate: value } : current,
                  )
                }
              />
            </Field>
            <Field
              label="วันที่อนุมัติ (ท้ายใบ)"
              hint="ค่าเริ่มต้นเท่ากับวันที่ขอแลกเปลี่ยน; เปลี่ยนหรือเว้นว่างได้"
            >
              <DateInput
                value={draft.approvalDate ?? ""}
                onChange={(value) =>
                  setDraft((current) =>
                    current ? { ...current, approvalDate: value } : current,
                  )
                }
              />
            </Field>
          </div>

          <Field label="เวรที่ขอแลกเปลี่ยน" required>
            <select
              className="input"
              value={draftValue}
              onChange={(event) => changeAssignment(event.target.value)}
            >
              {assignmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="ผู้ปฏิบัติงานแทน (ถ้ามี)">
            <select
              className="input"
              value={draft.replacementStaffId ?? ""}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        replacementStaffId: event.target.value || null,
                      }
                    : current,
                )
              }
            >
              <option value="">ไม่มีคนแทน</option>
              {eligibleReplacements.map((person) => (
                <option key={person.id} value={person.id}>
                  {personFullName(person)} — {person.position}
                </option>
              ))}
            </select>
            <small className="exchange-form__hint">
              {eligibleReplacements.length > 0
                ? "แสดงเฉพาะพนักงานที่ยังไม่มีเวรในวันนั้น"
                : "ไม่มีพนักงานว่างในวันนั้น"}
            </small>
          </Field>

          <Field label="เหตุผล (ไม่บังคับ)">
            <textarea
              className="input exchange-form__reason"
              value={draft.reason}
              placeholder="เช่น ลาป่วย / ติดภารกิจ / ขอแลกเวร"
              onChange={(event) =>
                setDraft((current) =>
                  current ? { ...current, reason: event.target.value } : current,
                )
              }
            />
          </Field>

          <div className="exchange-form__actions">
            <Button type="button" variant="secondary" onClick={cancelForm}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="primary">
              <Check size={16} /> {previous ? "บันทึกการแก้ไข" : "บันทึกใบแลกเปลี่ยน"}
            </Button>
          </div>
        </form>
      )}

      {!draft && (sortedExchanges.length === 0 ? (
        <div className="exchange-empty">
          <span className="exchange-empty__icon">
            <ArrowLeftRight size={22} />
          </span>
          <div>
            <strong>
              {assignmentOptions.length === 0
                ? "ยังไม่มีเวรที่แจ้งไม่มา"
                : "ยังไม่มีใบแลกเปลี่ยนเวร"}
            </strong>
            <p>
              {assignmentOptions.length === 0
                ? "กลับไปที่บัญชีลงเวลา แล้วเลือก “ไม่มา” ในเวรที่ต้องการแลกเปลี่ยน"
                : "เพิ่มรายการเมื่อมีผู้ลา แล้วเลือกได้ว่าจะมีผู้ปฏิบัติงานแทนหรือไม่"}
            </p>
          </div>
        </div>
      ) : (
        <div className="exchange-list">
          {sortedExchanges.map((exchange) => {
            const original = getSetPerson(set, settings, exchange.staffId);
            const replacement = exchange.replacementStaffId
              ? getSetPerson(set, settings, exchange.replacementStaffId)
              : undefined;
            const shift = getSetShift(set, settings, exchange.shiftId);
            return (
              <article key={exchange.id} className="exchange-card">
                <div className="exchange-card__date">
                  <CalendarDays size={15} />
                  <strong>{formatDateShortUi(exchange.date)}</strong>
                  <span>{weekdayName(exchange.date)}</span>
                </div>

                <div className="exchange-card__main">
                  <div className="exchange-card__route">
                    <span>{original ? personFullName(original) : "-"}</span>
                    <ArrowLeftRight size={14} />
                    <span className={replacement ? "is-replacement" : "is-empty"}>
                      {replacement ? personFullName(replacement) : "ไม่มีคนแทน"}
                    </span>
                  </div>
                  <p>
                    {shift?.name ?? "เวร"}{" "}
                    {shift ? formatTimeRangeUi(shift.start, shift.end) : ""}
                    {exchange.reason ? ` · ${exchange.reason}` : ""}
                  </p>
                </div>

                <div className="exchange-card__actions">
                  <button
                    type="button"
                    className="exchange-icon-btn"
                    aria-label="พิมพ์ใบขอแลกเปลี่ยน"
                    onClick={() => onPrint(exchange)}
                  >
                    <Printer size={15} />
                  </button>
                  <button
                    type="button"
                    className="exchange-icon-btn"
                    aria-label="แก้ไขใบแลกเปลี่ยน"
                    onClick={() => startEdit(exchange)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="exchange-icon-btn is-danger"
                    aria-label="ลบใบแลกเปลี่ยน"
                    onClick={() => setDeleteId(exchange.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {deleteId === exchange.id && (
                  <div className="exchange-card__confirm">
                    <span>ลบใบแลกเปลี่ยนนี้?</span>
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => {
                        onDelete(exchange);
                        setDeleteId(null);
                      }}
                    >
                      ลบ
                    </button>
                    <button type="button" onClick={() => setDeleteId(null)}>
                      ยกเลิก
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ))}
    </div>
  );
}

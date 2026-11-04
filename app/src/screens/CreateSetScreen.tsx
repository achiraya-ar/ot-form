import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Info,
  Sparkles,
  UserCheck,
  Users,
  Wallet,
  Wand2,
} from "lucide-react";
import type { DocumentSet } from "../types";
import { useApp } from "../lib/store";
import { PageHeader } from "../components/AppShell";
import { Button, Card, Field, useToast } from "../components/ui";
import { personFullName } from "../data/defaults";
import {
  dateRange,
  formatDateUi,
  formatMonthYearUi,
  formatNumberUi,
  getDaysInMonth,
  isWeekend,
  monthDates,
  THAI_MONTHS,
  todayIso,
  weekdayName,
} from "../lib/thai";

type Phase = 1 | 2;
type DateMode = "month" | "range" | "multiple" | "single";

const WEEKDAY_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const DATE_MODES: {
  value: DateMode;
  label: string;
  hint: string;
  icon: ReactNode;
}[] = [
  {
    value: "month",
    label: "เต็มเดือน",
    hint: "ใช้ทุกวันในเดือน",
    icon: <CalendarDays size={18} />,
  },
  {
    value: "range",
    label: "ช่วงวันที่",
    hint: "กำหนดวันเริ่ม–สิ้นสุด",
    icon: <CalendarRange size={18} />,
  },
  {
    value: "multiple",
    label: "หลายวัน",
    hint: "เลือกจากปฏิทิน",
    icon: <CalendarCheck size={18} />,
  },
  {
    value: "single",
    label: "วันเดียว",
    hint: "เลือก 1 วัน",
    icon: <CalendarClock size={18} />,
  },
];

const STEPS: { id: Phase; label: string; hint: string }[] = [
  { id: 1, label: "ช่วงเวลาและวันที่", hint: "กำหนดงวดและวันทำงาน" },
  { id: 2, label: "ทีมงาน", hint: "เลือกผู้ปฏิบัติงานและผู้ควบคุม" },
];

const DOCUMENTS = [
  { name: "คำสั่งแต่งตั้ง", icon: <FileText size={15} /> },
  { name: "บันทึกขออนุมัติ", icon: <ClipboardList size={15} /> },
  { name: "ตารางการปฏิบัติงาน", icon: <CalendarDays size={15} /> },
  { name: "บัญชีลงเวลา", icon: <Clock size={15} /> },
  { name: "หลักฐานการจ่ายเงิน", icon: <Wallet size={15} /> },
];

function CalendarGrid({
  year,
  month,
  selected,
  onPick,
  mode,
}: {
  year: number;
  month: number;
  selected: string[];
  onPick: (iso: string) => void;
  mode: "single" | "multiple";
}) {
  const yearCE = year - 543;
  const days = getDaysInMonth(year, month);
  const firstDay = new Date(yearCE, month - 1, 1).getDay();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: days }, (_, index) => {
      return `${yearCE}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const today = todayIso();

  return (
    <div className="calendar">
      <div className="calendar__head">
        {WEEKDAY_SHORT.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar__grid">
        {cells.map((iso, index) => {
          if (!iso) return <span key={`blank-${index}`} className="calendar__blank" />;
          const day = Number(iso.slice(-2));
          const active = selected.includes(iso);
          const weekend = isWeekend(iso);
          return (
            <button
              key={iso}
              type="button"
              className={`calendar__day ${active ? "is-selected" : ""} ${
                weekend ? "is-weekend" : ""
              } ${iso === today ? "is-today" : ""}`}
              aria-pressed={active}
              onClick={() => onPick(iso)}
              title={`${weekdayName(iso)} ${formatDateUi(iso)}`}
            >
              {day}
              {active && mode === "multiple" && <span className="calendar__check">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThaiDatePicker({
  value,
  onChange,
  min,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const initialDate = new Date(`${value || min || max || todayIso()}T00:00:00`);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear() + 543);
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth() + 1);

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const openPicker = () => {
    if (!open) {
      const base = value || min || max || todayIso();
      const date = new Date(`${base}T00:00:00`);
      setViewYear(date.getFullYear() + 543);
      setViewMonth(date.getMonth() + 1);
    }
    setOpen((current) => !current);
  };

  const moveMonth = (delta: number) => {
    let nextMonth = viewMonth + delta;
    let nextYear = viewYear;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setViewMonth(nextMonth);
    setViewYear(nextYear);
  };

  const yearCE = viewYear - 543;
  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDay = new Date(yearCE, viewMonth - 1, 1).getDay();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: days }, (_, index) => {
      return `${yearCE}-${String(viewMonth).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = todayIso();
  const isDisabled = (iso: string) => Boolean((min && iso < min) || (max && iso > max));

  const choose = (iso: string) => {
    if (isDisabled(iso)) return;
    onChange(iso);
    setOpen(false);
  };

  return (
    <div className="thai-date-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`thai-date ${open ? "is-open" : ""}`}
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={value ? `วันที่ ${formatDateUi(value)}` : "เลือกวันที่"}
      >
        <CalendarDays size={15} aria-hidden="true" />
        <span className={`thai-date__value ${value ? "" : "is-placeholder"}`}>
          {value ? formatDateUi(value) : "เลือกวันที่"}
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <div className="thai-date-pop" role="dialog" aria-label="เลือกวันที่">
          <div className="thai-date-pop__head">
            <button
              type="button"
              className="thai-date-nav"
              aria-label="เดือนก่อนหน้า"
              onClick={() => moveMonth(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <span>เลือกวันที่</span>
              <strong>
                {THAI_MONTHS[viewMonth - 1]} {viewYear}
              </strong>
            </div>
            <button
              type="button"
              className="thai-date-nav"
              aria-label="เดือนถัดไป"
              onClick={() => moveMonth(1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="thai-date-weekdays">
            {WEEKDAY_SHORT.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="thai-date-grid">
            {cells.map((iso, index) => {
              if (!iso) {
                return <span key={`blank-${index}`} className="thai-date-blank" />;
              }
              const day = Number(iso.slice(-2));
              const disabled = isDisabled(iso);
              const selected = iso === value;
              return (
                <button
                  key={iso}
                  type="button"
                  className={`thai-date-day ${isWeekend(iso) ? "is-weekend" : ""} ${
                    iso === today ? "is-today" : ""
                  } ${selected ? "is-selected" : ""}`}
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => choose(iso)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="thai-date-foot">
            <button
              type="button"
              className="thai-date-today"
              disabled={isDisabled(today)}
              onClick={() => choose(today)}
            >
              วันนี้
            </button>
            <button type="button" className="thai-date-close" onClick={() => setOpen(false)}>
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThaiDateField({
  label,
  value,
  onChange,
  min,
  max,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
}) {
  return (
    <div className="field">
      <span className="field__label">
        {label}
        {required && <span className="field__required">*</span>}
      </span>
      <ThaiDatePicker value={value} onChange={onChange} min={min} max={max} />
    </div>
  );
}

export function CreateSetScreen({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (set: DocumentSet) => void;
}) {
  const { settings, createSet } = useApp();
  const notify = useToast();
  const now = new Date();
  const [phase, setPhase] = useState<Phase>(1);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear() + 543);
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dateMode, setDateMode] = useState<DateMode>("month");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [staffIds, setStaffIds] = useState<string[]>(
    settings.staff.filter((person) => person.active).map((person) => person.id),
  );
  const [controllerId, setControllerId] = useState(
    settings.staff.find((person) => person.active)?.id ?? "",
  );

  const effectiveDates = useMemo(() => {
    const prefix = `${year - 543}-${String(month).padStart(2, "0")}-`;
    if (dateMode === "month") return monthDates(year, month);
    if (dateMode === "range") {
      if (!rangeStart || !rangeEnd) return [];
      return dateRange(rangeStart, rangeEnd).filter((iso) => iso.startsWith(prefix));
    }
    return [...selectedDates].sort().filter((iso) => iso.startsWith(prefix));
  }, [dateMode, year, month, rangeStart, rangeEnd, selectedDates]);

  const selectedStaff = settings.staff.filter((person) => staffIds.includes(person.id));
  const autoTitle = `ค่าตอบแทนนอกเวลา ${THAI_MONTHS[month - 1]} ${year}`;
  const weekendCount = effectiveDates.filter(isWeekend).length;
  const dateModeLabel = {
    month: "เต็มเดือน",
    range: "ช่วงวันที่",
    multiple: "หลายวัน",
    single: "วันเดียว",
  }[dateMode];

  const changeMonth = (nextMonth: number, nextYear: number) => {
    setMonth(nextMonth);
    setYear(nextYear);
    setSelectedDates([]);
    setRangeStart("");
    setRangeEnd("");
  };

  const changeDateMode = (value: DateMode) => {
    setDateMode(value);
    setSelectedDates([]);
  };

  const pickDate = (iso: string) => {
    if (dateMode === "single") {
      setSelectedDates([iso]);
    } else if (dateMode === "multiple") {
      setSelectedDates((prev) =>
        prev.includes(iso) ? prev.filter((date) => date !== iso) : [...prev, iso],
      );
    }
  };

  const applyQuickDates = (kind: "weekdays" | "all" | "clear") => {
    const all = monthDates(year, month);
    if (kind === "clear") {
      setSelectedDates([]);
      return;
    }
    setSelectedDates(kind === "all" ? all : all.filter((iso) => !isWeekend(iso)));
  };

  const toggleStaff = (id: string) => {
    const next = staffIds.includes(id)
      ? staffIds.filter((staffId) => staffId !== id)
      : [...staffIds, id];
    setStaffIds(next);
    if (!next.includes(controllerId)) {
      setControllerId(next[0] ?? "");
    }
  };

  const selectAllStaff = () => {
    const ids = settings.staff.filter((person) => person.active).map((person) => person.id);
    setStaffIds(ids);
    if (!ids.includes(controllerId)) setControllerId(ids[0] ?? "");
  };

  const clearStaff = () => {
    setStaffIds([]);
    setControllerId("");
  };

  const goPhase = (target: Phase) => {
    if (target === 2) {
      if (!issueDate || effectiveDates.length === 0) {
        notify("กรุณาเลือกวันที่ปฏิบัติงานอย่างน้อย 1 วัน", "error");
        return;
      }
    }
    setPhase(target);
  };

  const submit = () => {
    if (staffIds.length === 0) {
      notify("กรุณาเลือกพนักงานอย่างน้อย 1 คน", "error");
      return;
    }
    if (!controllerId || !staffIds.includes(controllerId)) {
      notify("กรุณาเลือกผู้ควบคุมการปฏิบัติงาน", "error");
      return;
    }
    const set = createSet({
      month,
      year,
      issueDate,
      dateMode,
      rangeStart,
      rangeEnd,
      selectedDates: effectiveDates,
      staffIds,
      org: { ...settings.org },
      controllerId,
      title: autoTitle,
    });
    notify("สร้างชุดเอกสารแล้ว");
    onCreated(set);
  };

  const yearOptions = Array.from(
    { length: 7 },
    (_, index) => now.getFullYear() + 543 - 1 + index,
  );
  const monthPrefix = `${year - 543}-${String(month).padStart(2, "0")}-`;
  const monthFirst = `${monthPrefix}01`;
  const monthLast = `${monthPrefix}${getDaysInMonth(year, month)}`;
  const controller = selectedStaff.find((person) => person.id === controllerId);

  return (
    <div className="page page--create page--simple">
      <PageHeader
        back={{ label: "กลับหน้าหลัก", onClick: onBack }}
        eyebrow="สร้างชุดใหม่"
        title="สร้างชุดเอกสารใหม่"
        description="ตั้งค่าช่วงเวลาและทีมงานใน 2 ขั้นตอน แล้วเริ่มทำเอกสารทั้ง 5 ไฟล์"
      />

      <div className="create-steps" aria-label="ขั้นตอนสร้างชุดเอกสาร">
        {STEPS.map((step, index) => {
          const active = phase === step.id;
          const done = phase > step.id;
          return (
            <Fragment key={step.id}>
              <button
                type="button"
                className={`create-step ${active ? "is-active" : ""} ${
                  done ? "is-done" : ""
                }`}
                aria-current={active ? "step" : undefined}
                onClick={() => goPhase(step.id)}
              >
                <span className="create-step__num">
                  {done ? <Check size={15} /> : step.id}
                </span>
                <span className="create-step__text">
                  <small>ขั้นที่ {step.id}</small>
                  <strong>{step.label}</strong>
                  <span>{step.hint}</span>
                </span>
              </button>
              {index < STEPS.length - 1 && <span className="create-step__line" />}
            </Fragment>
          );
        })}
      </div>

      <div className="create-layout">
        <div className="create-main">
          <Card className="create-panel">
            {phase === 1 && (
              <>
                <header className="create-panel__head">
                  <div>
                    <span className="eyebrow">งวดเอกสาร</span>
                    <h2>ช่วงเวลาและวันที่</h2>
                    <p>เลือกงวดเอกสารและวันที่ใช้ปฏิบัติงาน</p>
                  </div>
                  <span className="create-pill">
                    <CalendarDays size={14} /> {formatNumberUi(effectiveDates.length)} วัน
                  </span>
                </header>

                <div className="create-field-row">
                  <Field label="เดือน" required>
                    <select
                      className="input"
                      value={month}
                      onChange={(event) => changeMonth(Number(event.target.value), year)}
                    >
                      {THAI_MONTHS.map((name, index) => (
                        <option key={name} value={index + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="ปี พ.ศ." required>
                    <select
                      className="input"
                      value={year}
                      onChange={(event) => changeMonth(month, Number(event.target.value))}
                    >
                      {yearOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <ThaiDateField
                    label="วันที่ออกเอกสาร"
                    value={issueDate}
                    onChange={setIssueDate}
                    required
                  />
                </div>

                <section className="create-block">
                  <div className="create-block__head">
                    <div>
                      <span className="eyebrow">วันปฏิบัติงาน</span>
                      <h3>เลือกวิธีกำหนดวัน</h3>
                    </div>
                    <span className="create-block__hint">เลือกได้ 1 วิธี</span>
                  </div>

                  <div className="date-mode-grid">
                    {DATE_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        className={`date-mode ${dateMode === mode.value ? "is-active" : ""}`}
                        aria-pressed={dateMode === mode.value}
                        onClick={() => changeDateMode(mode.value)}
                      >
                        <span className="date-mode__icon">{mode.icon}</span>
                        <span className="date-mode__text">
                          <strong>{mode.label}</strong>
                          <small>{mode.hint}</small>
                        </span>
                        {dateMode === mode.value && (
                          <Check size={15} className="date-mode__check" />
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                {dateMode === "range" && (
                  <div className="create-range">
                    <div className="create-field-row create-field-row--2">
                      <ThaiDateField
                        label="ตั้งแต่วันที่"
                        value={rangeStart}
                        onChange={setRangeStart}
                        min={monthFirst}
                        max={monthLast}
                        required
                      />
                      <ThaiDateField
                        label="ถึงวันที่"
                        value={rangeEnd}
                        onChange={setRangeEnd}
                        min={rangeStart || monthFirst}
                        max={monthLast}
                        required
                      />
                    </div>
                    {effectiveDates.length === 0 && (
                      <p className="create-hint">เลือกวันเริ่มต้นและวันสิ้นสุดภายในเดือนนี้</p>
                    )}
                  </div>
                )}

                {(dateMode === "multiple" || dateMode === "single") && (
                  <>
                    <div className="calendar-wrap setup-calendar">
                      <div className="calendar-head">
                        <button
                          type="button"
                          className="calendar-nav"
                          aria-label="เดือนก่อนหน้า"
                          onClick={() =>
                            changeMonth(
                              month === 1 ? 12 : month - 1,
                              month === 1 ? year - 1 : year,
                            )
                          }
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <div>
                          <strong>{formatMonthYearUi(month, year)}</strong>
                          <span>
                            {dateMode === "single"
                              ? "เลือกวันเดียว"
                              : "เลือกได้หลายวัน"}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="calendar-nav"
                          aria-label="เดือนถัดไป"
                          onClick={() =>
                            changeMonth(
                              month === 12 ? 1 : month + 1,
                              month === 12 ? year + 1 : year,
                            )
                          }
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                      <CalendarGrid
                        year={year}
                        month={month}
                        selected={selectedDates}
                        onPick={pickDate}
                        mode={dateMode === "single" ? "single" : "multiple"}
                      />
                    </div>

                    {dateMode === "multiple" && (
                      <div className="quick-dates">
                        <span>
                          <Wand2 size={15} /> เลือกเร็ว
                        </span>
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={() => applyQuickDates("weekdays")}
                        >
                          วันทำการ
                        </Button>
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={() => applyQuickDates("all")}
                        >
                          ทั้งเดือน
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => applyQuickDates("clear")}
                        >
                          ล้าง
                        </Button>
                      </div>
                    )}
                  </>
                )}

                <div className="date-summary">
                  <span className="date-summary__icon">
                    <CalendarCheck size={18} />
                  </span>
                  <div className="date-summary__main">
                    <strong>{formatNumberUi(effectiveDates.length)} วัน</strong>
                    <small>
                      {dateMode === "month" && `ทั้งเดือน ${formatMonthYearUi(month, year)}`}
                      {dateMode === "range" &&
                        (rangeStart && rangeEnd
                          ? `${formatDateUi(rangeStart)} – ${formatDateUi(rangeEnd)}`
                          : "ยังไม่กำหนดช่วงวันที่")}
                      {dateMode === "multiple" && "วันที่เลือกจากปฏิทิน"}
                      {dateMode === "single" &&
                        (effectiveDates[0] ? formatDateUi(effectiveDates[0]) : "ยังไม่ได้เลือกวัน")}
                    </small>
                  </div>
                  {weekendCount > 0 && (
                    <span className="date-summary__weekend">
                      เสาร์–อาทิตย์ {formatNumberUi(weekendCount)} วัน
                    </span>
                  )}
                  {dateMode === "multiple" && effectiveDates.length > 0 && (
                    <div className="date-chips">
                      {effectiveDates.slice(0, 12).map((iso) => (
                        <span key={iso} className="date-chip">
                          {Number(iso.slice(-2))}
                        </span>
                      ))}
                      {effectiveDates.length > 12 && (
                        <span className="date-chip date-chip--more">
                          +{formatNumberUi(effectiveDates.length - 12)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {phase === 2 && (
              <>
                <header className="create-panel__head">
                  <div>
                    <span className="eyebrow">ผู้ปฏิบัติงาน</span>
                    <h2>เลือกทีมงาน</h2>
                    <p>เลือกผู้ปฏิบัติงานและผู้ควบคุมการปฏิบัติงาน</p>
                  </div>
                  <span className="create-pill">
                    <Users size={14} /> {formatNumberUi(staffIds.length)} คน
                  </span>
                </header>

                <div className="create-note create-note--soft">
                  <span className="create-note__icon">
                    <Info size={18} />
                  </span>
                  <div>
                    <strong>ข้อมูลหน่วยงานและผู้ลงนาม</strong>
                    <p>ใช้ค่าจากหน้าตั้งค่า และแก้ไขภายหลังได้ในชุดเอกสาร</p>
                  </div>
                </div>

                <div className="staff-toolbar">
                  <span>พนักงานที่ใช้งาน</span>
                  <div>
                    <Button size="sm" variant="soft" onClick={selectAllStaff}>
                      เลือกทั้งหมด
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearStaff}>
                      ล้าง
                    </Button>
                  </div>
                </div>

                <div className="staff-select-list">
                  {settings.staff
                    .filter((person) => person.active)
                    .map((person) => {
                      const checked = staffIds.includes(person.id);
                      return (
                        <button
                          key={person.id}
                          type="button"
                          className={`staff-select ${checked ? "is-checked" : ""}`}
                          aria-pressed={checked}
                          onClick={() => toggleStaff(person.id)}
                        >
                          <span className="staff-select__check">
                            {checked ? <Check size={14} /> : null}
                          </span>
                          <span className="staff-select__main">
                            <strong>{personFullName(person)}</strong>
                            <small>{person.position}</small>
                          </span>
                          <span className="staff-select__rate">
                            ฿ {formatNumberUi(person.ratePerHour, 2)}/ชม.
                          </span>
                        </button>
                      );
                    })}
                </div>

                <div className="controller-card">
                  <span className="controller-card__icon">
                    <UserCheck size={18} />
                  </span>
                  <div className="controller-card__body">
                    <Field label="ผู้ควบคุมการปฏิบัติงาน" required>
                      <select
                        className="input"
                        value={controllerId}
                        disabled={selectedStaff.length === 0}
                        onChange={(event) => setControllerId(event.target.value)}
                      >
                        <option value="">
                          {selectedStaff.length === 0
                            ? "เลือกพนักงานก่อน"
                            : "เลือกผู้ควบคุม"}
                        </option>
                        {selectedStaff.map((person) => (
                          <option key={person.id} value={person.id}>
                            {personFullName(person)} — {person.position}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <p>ผู้ควบคุมต้องเป็นหนึ่งในพนักงานที่เลือก</p>
                  </div>
                </div>
              </>
            )}

            <div className="create-footer">
              <Button
                variant="ghost"
                onClick={phase === 1 ? onBack : () => setPhase(1)}
              >
                <ArrowLeft size={16} /> {phase === 1 ? "ยกเลิก" : "ย้อนกลับ"}
              </Button>
              {phase === 1 ? (
                <Button variant="primary" onClick={() => goPhase(2)}>
                  ถัดไป: เลือกทีมงาน <ArrowRight size={16} />
                </Button>
              ) : (
                <Button variant="primary" onClick={submit}>
                  <Sparkles size={16} /> สร้างชุดเอกสาร
                </Button>
              )}
            </div>
          </Card>
        </div>

        <aside className="create-aside">
          <Card className="create-summary-card">
            <div className="create-summary-card__head">
              <span className="eyebrow">สรุปชุดเอกสาร</span>
              <span className="create-summary-card__step">ขั้นที่ {phase} / 2</span>
            </div>
            <h2>{formatMonthYearUi(month, year)}</h2>
            <div className="create-summary-rows">
              <div>
                <span>วันที่ออกเอกสาร</span>
                <strong>{formatDateUi(issueDate)}</strong>
              </div>
              <div>
                <span>รูปแบบวันที่</span>
                <strong>{dateModeLabel}</strong>
              </div>
              <div>
                <span>วันปฏิบัติงาน</span>
                <strong>{formatNumberUi(effectiveDates.length)} วัน</strong>
              </div>
              <div>
                <span>พนักงาน</span>
                <strong>{formatNumberUi(staffIds.length)} คน</strong>
              </div>
              <div>
                <span>ผู้ควบคุม</span>
                <strong>{controller ? personFullName(controller) : "ยังไม่เลือก"}</strong>
              </div>
            </div>
            <div className="create-summary-note">
              <Info size={14} /> สร้างแล้วแก้ไขต่อได้ทุกไฟล์
            </div>
          </Card>

          <Card className="create-file-card">
            <div className="create-file-card__head">
              <span className="eyebrow">เอกสารในชุด</span>
              <span>5 ไฟล์</span>
            </div>
            <ul className="create-file-list">
              {DOCUMENTS.map((document, index) => (
                <li key={document.name}>
                  <span className="create-file-list__num">{index + 1}</span>
                  <span className="create-file-list__name">
                    <strong>{document.name}</strong>
                    <small>ไฟล์ที่ {index + 1}</small>
                  </span>
                  <span className="create-file-list__icon">{document.icon}</span>
                </li>
              ))}
            </ul>
            <p className="create-file-note">
              ระบบจะพาไปเริ่มที่ไฟล์ที่ 1 หลังสร้างเสร็จ
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import type { DocumentSet } from "../types";
import { useApp } from "../lib/store";
import { PageHeader } from "../components/AppShell";
import { Badge, Button, Card, Field, Segmented, DateInput, useToast } from "../components/ui";
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

const WEEKDAY_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

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
  const [dateMode, setDateMode] = useState<"month" | "range" | "multiple" | "single">(
    "month",
  );
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

  const changeMonth = (nextMonth: number, nextYear: number) => {
    setMonth(nextMonth);
    setYear(nextYear);
    setSelectedDates([]);
    setRangeStart("");
    setRangeEnd("");
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
    if (dateMode !== "multiple") setDateMode("multiple");
    if (kind === "all") setSelectedDates(all);
    if (kind === "weekdays") setSelectedDates(all.filter((iso) => !isWeekend(iso)));
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

  const yearOptions = Array.from({ length: 7 }, (_, index) => now.getFullYear() + 543 - 1 + index);
  const controller = selectedStaff.find((person) => person.id === controllerId);

  return (
    <div className="page page--create page--simple">
      <PageHeader
        back={{ label: "กลับหน้าหลัก", onClick: onBack }}
        eyebrow="สร้างชุดใหม่"
        title="เริ่มชุดเอกสารค่าตอบแทน"
        description="เลือกเดือน วันที่ และพนักงาน แล้วระบบจะสร้างเอกสารทั้ง 5 ไฟล์ให้"
      />

      <div className="phase-tabs">
        {[
          { id: 1 as Phase, label: "งวดและวันที่", icon: <CalendarDays size={16} /> },
          { id: 2 as Phase, label: "พนักงาน", icon: <Users size={16} /> },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`phase-tab ${phase === item.id ? "is-active" : ""} ${
              phase > item.id ? "is-done" : ""
            }`}
            onClick={() => goPhase(item.id)}
          >
            <span>{phase > item.id ? <Check size={14} /> : item.id}</span>
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {phase === 1 && (
        <Card className="form-card">
          <div className="form-card__head">
            <div>
              <span className="eyebrow">ขั้นที่ 1</span>
              <h2>เลือกงวดและวันที่</h2>
              <p>เลือกเดือน ปี และรูปแบบวันที่ที่ใช้ในชุดนี้</p>
            </div>
            <Badge tone="sky">{formatNumberUi(effectiveDates.length)} วัน</Badge>
          </div>

          <div className="form-grid form-grid--3">
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
            <Field label="วันที่ออกเอกสาร" required>
              <DateInput value={issueDate} onChange={setIssueDate} />
            </Field>
          </div>

          <Field label="รูปแบบการเลือกวันที่" required>
            <Segmented
              value={dateMode}
              onChange={(value) => {
                setDateMode(value);
                setSelectedDates([]);
              }}
              options={[
                { value: "month", label: "เต็มเดือน" },
                { value: "range", label: "ช่วงวันที่" },
                { value: "multiple", label: "หลายวัน" },
                { value: "single", label: "วันเดียว" },
              ]}
            />
          </Field>

          {dateMode === "range" && (
            <div className="form-grid form-grid--2">
              <Field label="ตั้งแต่วันที่" required>
                <DateInput
                  value={rangeStart}
                  min={`${year - 543}-${String(month).padStart(2, "0")}-01`}
                  max={`${year - 543}-${String(month).padStart(2, "0")}-${getDaysInMonth(year, month)}`}
                  onChange={setRangeStart}
                />
              </Field>
              <Field label="ถึงวันที่" required>
                <DateInput
                  value={rangeEnd}
                  min={rangeStart}
                  max={`${year - 543}-${String(month).padStart(2, "0")}-${getDaysInMonth(year, month)}`}
                  onChange={setRangeEnd}
                />
              </Field>
            </div>
          )}

          {(dateMode === "multiple" || dateMode === "single") && (
            <div className="calendar-wrap">
              <div className="calendar-head">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() =>
                    changeMonth(month === 1 ? 12 : month - 1, month === 1 ? year - 1 : year)
                  }
                >
                  <ChevronLeft size={18} />
                </button>
                <strong>{formatMonthYearUi(month, year)}</strong>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() =>
                    changeMonth(month === 12 ? 1 : month + 1, month === 12 ? year + 1 : year)
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
          )}

          <div className="quick-dates">
            <span>
              <Wand2 size={15} /> เลือกเร็ว
            </span>
            <Button size="sm" variant="soft" onClick={() => applyQuickDates("weekdays")}>
              วันทำการ
            </Button>
            <Button size="sm" variant="soft" onClick={() => applyQuickDates("all")}>
              ทั้งเดือน
            </Button>
            <Button size="sm" variant="ghost" onClick={() => applyQuickDates("clear")}>
              ล้าง
            </Button>
          </div>

          <div className="date-summary">
            <div>
              <CalendarDays size={18} />
              <span>
                เลือกทั้งหมด <strong>{formatNumberUi(effectiveDates.length)}</strong> วัน
                {weekendCount > 0 && ` · เสาร์–อาทิตย์ ${formatNumberUi(weekendCount)} วัน`}
              </span>
            </div>
            <div className="date-chips">
              {effectiveDates.slice(0, 14).map((iso) => (
                <span key={iso} className="date-chip">
                  {Number(iso.slice(-2))}
                </span>
              ))}
              {effectiveDates.length > 14 && (
                <span className="date-chip date-chip--more">
                  +{formatNumberUi(effectiveDates.length - 14)}
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {phase === 2 && (
        <Card className="form-card">
          <div className="form-card__head">
            <div>
              <span className="eyebrow">ขั้นที่ 2</span>
              <h2>เลือกพนักงาน</h2>
              <p>เลือกผู้ปฏิบัติงานและผู้ควบคุม ตารางเวรกำหนดได้ในขั้นถัดไป</p>
            </div>
            <Badge tone="gold">{formatNumberUi(staffIds.length)} คน</Badge>
          </div>

          <div className="info-note">
            <Info size={15} />
            ข้อมูลหน่วยงาน เลขเอกสาร และผู้ลงนาม ใช้ค่าจากหน้าตั้งค่า
            และแก้ไขภายหลังได้ในชุดเอกสาร
          </div>

          <div className="staff-select-toolbar">
            <Button
              size="sm"
              variant="soft"
              onClick={() =>
                setStaffIds(settings.staff.filter((p) => p.active).map((p) => p.id))
              }
            >
              เลือกทั้งหมด
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStaffIds([])}>
              ล้าง
            </Button>
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
                    onClick={() =>
                      setStaffIds((prev) =>
                        prev.includes(person.id)
                          ? prev.filter((id) => id !== person.id)
                          : [...prev, person.id],
                      )
                    }
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

          <Field label="ผู้ควบคุมการปฏิบัติงาน" required>
            <select
              className="input"
              value={controllerId}
              onChange={(event) => setControllerId(event.target.value)}
            >
              <option value="">เลือกผู้ควบคุม</option>
              {selectedStaff.map((person) => (
                <option key={person.id} value={person.id}>
                  {personFullName(person)} — {person.position}
                </option>
              ))}
            </select>
          </Field>
        </Card>
      )}

      <div className="create-summary-bar">
        <span>{formatMonthYearUi(month, year)}</span>
        <span>{formatNumberUi(effectiveDates.length)} วัน</span>
        <span>{formatNumberUi(staffIds.length)} คน</span>
        <span>
          ผู้ควบคุม: {controller ? personFullName(controller) : "ยังไม่เลือก"}
        </span>
      </div>

      <div className="wizard-actions">
        {phase > 1 ? (
          <Button variant="secondary" onClick={() => setPhase(1)}>
            <ArrowLeft size={16} /> ย้อนกลับ
          </Button>
        ) : (
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft size={16} /> กลับหน้าหลัก
          </Button>
        )}
        {phase < 2 ? (
          <Button variant="primary" onClick={() => goPhase(2)}>
            ถัดไป <ArrowRight size={16} />
          </Button>
        ) : (
          <Button variant="primary" onClick={submit}>
            <Sparkles size={16} /> สร้างชุดเอกสาร
          </Button>
        )}
      </div>
    </div>
  );
}

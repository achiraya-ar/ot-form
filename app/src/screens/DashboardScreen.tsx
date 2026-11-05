import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  FileCheck2,
  FolderOpen,
  Plus,
  Search,
  SearchX,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import type { DocumentSet, SetStatus, StepId } from "../types";
import { useApp } from "../lib/store";
import { PageHeader } from "../components/AppShell";
import { BrandMark } from "../components/Brand";
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Modal,
  useToast,
} from "../components/ui";
import { getSetStaff, totalPayment } from "../lib/selectors";
import {
  formatBahtUi,
  formatDateUi,
  formatNumberUi,
  THAI_MONTHS,
  THAI_MONTHS_SHORT,
  toArabicDigits,
  todayIso,
} from "../lib/thai";

const STATUS_LABEL: Record<SetStatus, string> = {
  draft: "กำลังทำ",
  in_progress: "กำลังทำ",
  completed: "เสร็จแล้ว",
};

type StatusFilter = "all" | "in_progress" | "completed";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "in_progress", label: "กำลังทำ" },
  { value: "completed", label: "เสร็จแล้ว" },
  { value: "all", label: "ทั้งหมด" },
];

const isInProgress = (set: DocumentSet) =>
  set.status === "in_progress" || set.status === "draft";


export function DashboardScreen({
  onCreate,
  onOpenSet,
}: {
  onCreate: () => void;
  onOpenSet: (set: DocumentSet) => void;
}) {
  const { sets, settings, duplicateSet, deleteSet, importBackup } = useApp();
  const notify = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentSet | null>(null);
  const [query, setQuery] = useState("");
  const [periodOpen, setPeriodOpen] = useState(false);
  const periodRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const currentBE = now.getFullYear() + 543;
  const currentMonth = now.getMonth() + 1;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    sets.some(isInProgress) ? "in_progress" : "all",
  );
  const [selectedYear, setSelectedYear] = useState(currentBE);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [periodYear, setPeriodYear] = useState(currentBE);
  const [wholeYear, setWholeYear] = useState(false);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const set of sets) years.add(set.year);
    years.add(selectedYear);
    years.add(periodYear);
    return [...years].sort((a, b) => b - a);
  }, [sets, selectedYear, periodYear]);

  const monthCounts = useMemo(() => {
    const counts = Array.from({ length: 12 }, () => 0);
    for (const set of sets) {
      if (set.year === periodYear) {
        counts[set.month - 1] += 1;
      }
    }
    return counts;
  }, [sets, periodYear]);

  const periodSets = useMemo(
    () =>
      wholeYear
        ? sets.filter((set) => set.year === selectedYear)
        : sets.filter(
            (set) => set.year === selectedYear && set.month === selectedMonth,
          ),
    [wholeYear, sets, selectedYear, selectedMonth],
  );

  const periodLabel = wholeYear
    ? `ทุกเดือน · ${selectedYear}`
    : `${THAI_MONTHS[selectedMonth - 1]} ${selectedYear}`;

  const openPeriodPicker = () => {
    if (!periodOpen) setPeriodYear(selectedYear);
    setPeriodOpen((open) => !open);
  };

  useEffect(() => {
    if (!periodOpen) return;

    const handlePointer = (event: PointerEvent) => {
      if (periodRef.current && !periodRef.current.contains(event.target as Node)) {
        setPeriodOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPeriodOpen(false);
    };

    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [periodOpen]);

  const chooseMonth = (month: number) => {
    setWholeYear(false);
    setSelectedYear(periodYear);
    setSelectedMonth(month);
    setPeriodOpen(false);
  };

  const chooseWholeYear = () => {
    setWholeYear(true);
    setSelectedYear(periodYear);
    setPeriodOpen(false);
  };

  const summary = useMemo(() => {
    const inProgress = periodSets.filter(isInProgress).length;
    const completed = periodSets.filter((set) => set.status === "completed").length;
    const totalAmount = periodSets.reduce((sum, set) => sum + totalPayment(set, settings), 0);
    return { total: periodSets.length, inProgress, completed, totalAmount };
  }, [periodSets, settings]);

  const sorted = useMemo(
    () =>
      [...periodSets].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;
        return b.updatedAt.localeCompare(a.updatedAt);
      }),
    [periodSets],
  );

  const counts = useMemo<Record<StatusFilter, number>>(
    () => ({
      all: periodSets.length,
      in_progress: periodSets.filter(isInProgress).length,
      completed: periodSets.filter((set) => set.status === "completed").length,
    }),
    [periodSets],
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return sorted.filter((set) => {
      if (statusFilter === "in_progress" && !isInProgress(set)) return false;
      if (statusFilter === "completed" && set.status !== "completed") return false;
      if (!keyword) return true;
      const haystack = [
        set.title,
        THAI_MONTHS[set.month - 1],
        THAI_MONTHS_SHORT[set.month - 1],
        String(set.year),
        STATUS_LABEL[set.status],
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [sorted, query, statusFilter]);

  const periodEmpty = periodSets.length === 0;
  const emptyTitle = periodEmpty
    ? "ไม่มีชุดเอกสารในช่วงที่เลือก"
    : query.trim()
      ? "ไม่พบชุดที่ค้นหา"
      : statusFilter === "in_progress"
        ? "ไม่มีชุดที่กำลังทำในช่วงนี้"
        : statusFilter === "completed"
          ? "ไม่มีชุดที่เสร็จแล้วในช่วงนี้"
          : "ไม่มีชุดเอกสารในช่วงนี้";
  const emptyDetail = periodEmpty
    ? wholeYear
      ? `ไม่พบชุดเอกสารในปี ${selectedYear}`
      : `ไม่พบชุดเอกสารใน ${periodLabel}`
    : query.trim()
      ? "ลองใช้คำค้นอื่น หรือล้างคำค้น"
      : statusFilter === "in_progress"
        ? wholeYear
          ? `ปี ${selectedYear} ยังไม่มีชุดที่กำลังทำ`
          : `ช่วง ${periodLabel} ยังไม่มีชุดที่กำลังทำ`
        : statusFilter === "completed"
          ? wholeYear
            ? `ปี ${selectedYear} ยังไม่มีชุดที่เสร็จแล้ว`
            : `ช่วง ${periodLabel} ยังไม่มีชุดที่เสร็จแล้ว`
          : wholeYear
            ? `ปี ${selectedYear} ยังไม่มีชุดเอกสาร`
            : `ช่วง ${periodLabel} ยังไม่มีชุดเอกสาร`;

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      await importBackup(file);
      notify("นำเข้าข้อมูลสำรองเรียบร้อยแล้ว");
    } catch (error) {
      notify(error instanceof Error ? error.message : "นำเข้าไม่สำเร็จ", "error");
    }
  };

  return (
    <div className="page page--dashboard page--simple">
      <PageHeader
        eyebrow={`วันนี้ ${formatDateUi(todayIso())}`}
        title="ชุดเอกสารค่าตอบแทน"
        description="เลือกชุดเดิมเพื่อทำต่อ หรือเริ่มสร้างชุดใหม่"
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                void handleImport(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> นำเข้าข้อมูล
            </Button>
            <Button variant="primary" onClick={onCreate}>
              <Plus size={17} /> สร้างชุดใหม่
            </Button>
          </>
        }
      />

      <Card className="dash-overview">
        <div className="dash-overview__brand">
          <BrandMark size={62} className="dash-overview__mark" />
          <div className="dash-overview__copy">
            <span className="eyebrow">ระบบชุดเอกสารค่าตอบแทน</span>
            <h2>ทำครบ 5 ไฟล์ในชุดเดียว</h2>
            <p>กรอกครั้งเดียว ตารางเวร ใบลงเวลา และค่าตอบแทนเชื่อมกันอัตโนมัติ</p>
          </div>
        </div>

        <div className="dash-overview__right">
          <div className="dash-overview__scope">
            <span className="dash-overview__scope-label">ช่วงข้อมูล</span>
            <div className="dash-period-wrap" ref={periodRef}>
              <button
                type="button"
                className={`dash-period ${periodOpen ? "is-open" : ""}`}
                onClick={openPeriodPicker}
                aria-haspopup="dialog"
                aria-expanded={periodOpen}
                aria-label={`เลือกช่วงข้อมูล ปัจจุบัน ${periodLabel}`}
              >
                <CalendarDays size={14} aria-hidden="true" />
                <span className="dash-period__value">{periodLabel}</span>
                <span className="dash-period__count">
                  {formatNumberUi(periodSets.length)} ชุด
                </span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>

              {periodOpen && (
                <div className="dash-period-pop" role="dialog" aria-label="เลือกช่วงข้อมูล">
                  <div className="dash-period-pop__head">
                    <strong>เลือกช่วงข้อมูล</strong>
                    <span>เลือกปีและเดือน หรือทุกเดือนในปีที่เลือก</span>
                  </div>

                  <div className="dash-period-years" role="group" aria-label="เลือกปี">
                    {availableYears.map((year) => (
                      <button
                        key={year}
                        type="button"
                        className={periodYear === year ? "is-active" : ""}
                        aria-pressed={periodYear === year}
                        onClick={() => setPeriodYear(year)}
                      >
                        {year}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={`dash-period-all ${
                      wholeYear && selectedYear === periodYear ? "is-active" : ""
                    }`}
                    onClick={chooseWholeYear}
                  >
                    <span>ทุกเดือนในปี {periodYear}</span>
                    <span>
                      {formatNumberUi(
                        monthCounts.reduce((sum, count) => sum + count, 0),
                      )}{" "}
                      ชุด
                    </span>
                    {wholeYear && selectedYear === periodYear && <Check size={14} />}
                  </button>

                  <div
                    className="dash-period-months"
                    role="group"
                    aria-label={`เลือกเดือน พ.ศ. ${periodYear}`}
                  >
                    {THAI_MONTHS_SHORT.map((monthLabel, index) => {
                      const month = index + 1;
                      const count = monthCounts[index];
                      const active =
                        !wholeYear &&
                        selectedYear === periodYear &&
                        selectedMonth === month;
                      const disabled = count === 0 && !active;
                      return (
                        <button
                          key={monthLabel}
                          type="button"
                          className={`dash-period-month ${
                            count > 0 || active ? "is-available" : ""
                          } ${active ? "is-active" : ""}`}
                          disabled={disabled}
                          aria-pressed={active}
                          title={`${monthLabel} · ${formatNumberUi(count)} ชุด`}
                          onClick={() => chooseMonth(month)}
                        >
                          <strong>{monthLabel}</strong>
                          <span>{count > 0 ? `${formatNumberUi(count)} ชุด` : "—"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <dl className="dash-overview__stats">
            <div className="dash-metric dash-metric--progress">
              <dt>กำลังทำ</dt>
              <dd>
                {formatNumberUi(summary.inProgress)}
                <small>ชุด</small>
              </dd>
            </div>
            <div className="dash-metric dash-metric--done">
              <dt>เสร็จแล้ว</dt>
              <dd>
                {formatNumberUi(summary.completed)}
                <small>ชุด</small>
              </dd>
            </div>
            <div className="dash-metric">
              <dt>ชุดทั้งหมด</dt>
              <dd>
                {formatNumberUi(summary.total)}
                <small>ชุด</small>
              </dd>
            </div>
            <div className="dash-metric dash-metric--money">
              <dt>ยอดในช่วงที่เลือก</dt>
              <dd>
                <span className="dash-metric__unit">฿</span>
                {formatBahtUi(summary.totalAmount)}
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      <Card className="dash-library">
        <div className="dash-library__head">
          <div className="dash-library__heading">
            <h2>ชุดเอกสารของฉัน</h2>
            <span>
              {formatNumberUi(filtered.length)} จาก {formatNumberUi(periodSets.length)} ชุด
            </span>
          </div>

          <div className="dash-toolbar">
            <label className="dash-search">
              <Search size={15} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาชื่อชุด เดือน หรือปี"
                aria-label="ค้นหาชุดเอกสาร"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="ล้างคำค้น">
                  <X size={13} />
                </button>
              )}
            </label>

            <div className="dash-filter" role="group" aria-label="กรองตามสถานะ">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={statusFilter === filter.value ? "is-active" : ""}
                  aria-pressed={statusFilter === filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label}
                  <span>{formatNumberUi(counts[filter.value])}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {sets.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={30} />}
            title="ยังไม่มีชุดเอกสาร"
            description="เริ่มสร้างชุดแรก แล้วทำเอกสารทั้ง 5 ไฟล์ทีละขั้นได้เลย"
            action={
              <Button variant="primary" onClick={onCreate}>
                <Plus size={16} /> สร้างชุดแรก
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <div className="dash-no-result">
            <span className="dash-no-result__icon">
              <SearchX size={22} />
            </span>
            <div>
              <strong>{emptyTitle}</strong>
              <p>{emptyDetail}</p>
            </div>
            <div className="dash-no-result__actions">
              {query && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setQuery("")}
                >
                  ล้างคำค้น
                </Button>
              )}
              {!periodEmpty && statusFilter !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  ดูทั้งหมด
                </Button>
              )}
              <Button
                variant={periodEmpty ? "primary" : "secondary"}
                size="sm"
                onClick={openPeriodPicker}
              >
                เปลี่ยนช่วงข้อมูล
              </Button>
            </div>
          </div>
        ) : (
          <div className="set-list">
            {filtered.map((set) => {
              const staff = getSetStaff(set, settings);
              const amount = totalPayment(set, settings);
              const workDays = new Set(
                set.assignments.map((assignment) => assignment.date),
              ).size;
              return (
                <article
                  key={set.id}
                  className={`set-card is-${set.status}`}
                  onClick={() => onOpenSet(set)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onOpenSet(set);
                  }}
                >
                  <div className="set-card__month">
                    <strong>{THAI_MONTHS_SHORT[set.month - 1]}</strong>
                    <span>{set.year}</span>
                  </div>

                  <div className="set-card__main">
                    <div className="set-card__title">
                      <h3>{toArabicDigits(set.title)}</h3>
                    </div>
                    <p className="set-card__meta">
                      <span>
                        <CalendarDays size={13} /> {formatNumberUi(workDays)} วันทำ
                      </span>
                      <span>
                        <Users size={13} /> {formatNumberUi(staff.length)} คน
                      </span>
                      <span>
                        <FileCheck2 size={13} /> {formatNumberUi(set.assignments.length)} เวร
                      </span>
                    </p>
                    <div className="set-card__progress">
                      <span className="set-steps" aria-hidden="true">
                        {([1, 2, 3, 4, 5] as StepId[]).map((step) => (
                          <i
                            key={step}
                            className={set.completedSteps.includes(step) ? "is-done" : ""}
                          />
                        ))}
                      </span>
                      <small>{formatNumberUi(set.completedSteps.length)}/5 ไฟล์</small>
                    </div>
                  </div>

                  <div className="set-card__side">
                    <div className="set-card__amount">
                      <span>ค่าตอบแทน</span>
                      <strong>฿ {formatBahtUi(amount)}</strong>
                    </div>
                    <div className="set-card__actions">
                      <Button size="sm" variant="soft">
                        เปิดชุด <ArrowRight size={14} />
                      </Button>
                      <IconButton
                        label="ทำสำเนา"
                        onClick={(event) => {
                          event.stopPropagation();
                          const copy = duplicateSet(set.id);
                          if (copy) {
                            notify("สร้างสำเนาแล้ว");
                            onOpenSet(copy);
                          }
                        }}
                      >
                        <Copy size={15} />
                      </IconButton>
                      <IconButton
                        label="ลบชุดเอกสาร"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(set);
                        }}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="ลบชุดเอกสารนี้?"
        subtitle={deleteTarget ? toArabicDigits(deleteTarget.title) : undefined}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!deleteTarget) return;
                deleteSet(deleteTarget.id);
                notify("ลบชุดเอกสารแล้ว", "info");
                setDeleteTarget(null);
              }}
            >
              <Trash2 size={16} /> ลบ
            </Button>
          </>
        }
      >
        <p className="modal-copy">
          เอกสารทั้ง 5 ไฟล์ของชุดนี้จะถูกลบออกจากเครื่อง
          การลบไม่สามารถย้อนกลับได้
        </p>
      </Modal>
    </div>
  );
}

import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Copy,
  FileCheck2,
  FolderOpen,
  Plus,
  Trash2,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import type { DocumentSet, SetStatus } from "../types";
import { setProgress, useApp } from "../lib/store";
import { PageHeader } from "../components/AppShell";
import { BrandMark } from "../components/Brand";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Modal,
  ProgressBar,
  useToast,
} from "../components/ui";
import { getSetStaff, totalPayment } from "../lib/selectors";
import {
  formatBahtUi,
  formatDateUi,
  formatNumberUi,
  THAI_MONTHS,
  toArabicDigits,
  todayIso,
} from "../lib/thai";

const STATUS_LABEL: Record<SetStatus, string> = {
  draft: "ฉบับร่าง",
  in_progress: "กำลังทำ",
  completed: "เสร็จแล้ว",
};

const STATUS_TONE: Record<SetStatus, "neutral" | "gold" | "green"> = {
  draft: "neutral",
  in_progress: "gold",
  completed: "green",
};

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

  const now = new Date();
  const currentBE = now.getFullYear() + 543;
  const currentMonth = now.getMonth() + 1;

  const summary = useMemo(() => {
    const inProgress = sets.filter((set) => set.status === "in_progress").length;
    const completed = sets.filter((set) => set.status === "completed").length;
    const monthTotal = sets
      .filter((set) => set.month === currentMonth && set.year === currentBE)
      .reduce((sum, set) => sum + totalPayment(set, settings), 0);
    return { total: sets.length, inProgress, completed, monthTotal };
  }, [sets, settings, currentMonth, currentBE]);

  const sorted = useMemo(
    () => [...sets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [sets],
  );

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

      <Card className="welcome-strip">
        <BrandMark size={58} />
        <div className="welcome-strip__text">
          <strong>ทำเอกสารครบ 5 ไฟล์ในชุดเดียว</strong>
          <p>กรอกข้อมูลครั้งเดียว ระบบเชื่อมตารางเวร ใบลงเวลา และค่าตอบแทนให้อัตโนมัติ</p>
        </div>
        <div className="welcome-strip__stats">
          <span>ทั้งหมด <b>{formatNumberUi(summary.total)}</b> ชุด</span>
          <span>กำลังทำ <b>{formatNumberUi(summary.inProgress)}</b></span>
          <span>เสร็จแล้ว <b>{formatNumberUi(summary.completed)}</b></span>
          <span>ยอดเดือนนี้ <b>฿ {formatBahtUi(summary.monthTotal)}</b></span>
        </div>
      </Card>

      {sorted.length === 0 ? (
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
      ) : (
        <div className="set-list">
          {sorted.map((set) => {
            const progress = setProgress(set);
            const staff = getSetStaff(set, settings);
            const amount = totalPayment(set, settings);
            const workDays = new Set(set.assignments.map((assignment) => assignment.date)).size;
            return (
              <article
                key={set.id}
                className="set-row"
                onClick={() => onOpenSet(set)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onOpenSet(set);
                }}
              >
                <div className="set-row__month">
                  <strong>{THAI_MONTHS[set.month - 1]}</strong>
                  <span>{formatNumberUi(set.year)}</span>
                </div>

                <div className="set-row__main">
                  <div className="set-row__title">
                    <h3>{toArabicDigits(set.title)}</h3>
                    <Badge tone={STATUS_TONE[set.status]}>{STATUS_LABEL[set.status]}</Badge>
                  </div>
                  <p className="set-row__meta">
                    <span>
                      <CalendarDays size={13} /> {formatNumberUi(workDays)} วันทำ
                    </span>
                    <span>
                      <Users size={13} /> {formatNumberUi(staff.length)} คน
                    </span>
                    <span>
                      <FileCheck2 size={13} /> {formatNumberUi(set.assignments.length)} เวร
                    </span>
                    <span>
                      <Wallet size={13} /> ฿ {formatBahtUi(amount)}
                    </span>
                  </p>
                  <div className="set-row__progress">
                    <ProgressBar
                      value={progress}
                      tone={set.status === "completed" ? "green" : "sky"}
                    />
                    <small>{formatNumberUi(progress)}%</small>
                  </div>
                </div>

                <div className="set-row__actions">
                  <Button size="sm" variant="secondary">
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
              </article>
            );
          })}
        </div>
      )}

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

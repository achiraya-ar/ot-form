import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  Info,
  Lock,
  Pencil,
} from "lucide-react";
import type {
  Assignment,
  AttendanceRecord,
  DocumentSet,
  SignatoryMap,
  StepId,
} from "../types";
import { isStepUnlocked, useApp } from "../lib/store";
import { assignmentKey, personFullName } from "../data/defaults";
import { getSetStaff, getShift, totalPayment } from "../lib/selectors";
import { formatBahtUi, formatNumberUi, toArabicDigits } from "../lib/thai";
import { StepNav } from "../components/StepNav";
import { PaperStage } from "../components/PaperStage";
import { Badge, Button, Card, IconButton, useToast } from "../components/ui";
import { Form1Document } from "../forms/Form1Document";
import { Form2Document } from "../forms/Form2Document";
import { Form3Document } from "../forms/Form3Document";
import { Form4Document } from "../forms/Form4Document";
import { Form5Document } from "../forms/Form5Document";
import { OrderEditor } from "../components/editors/OrderEditor";
import { MemoEditor } from "../components/editors/MemoEditor";
import { ScheduleEditor } from "../components/editors/ScheduleEditor";
import { AttendanceEditor } from "../components/editors/AttendanceEditor";
import { PaymentEditor } from "../components/editors/PaymentEditor";
import { SetInfoEditor } from "../components/editors/SetInfoEditor";
import { ExportModal } from "../components/ExportModal";

type EditorKind = "info" | "order" | "memo" | "schedule" | "attendance" | "payment" | "export" | null;

const STEP_META: Record<
  StepId,
  { title: string; orientation: "portrait" | "landscape"; filename: string; editLabel: string }
> = {
  1: {
    title: "คำสั่งแต่งตั้งเจ้าหน้าที่ปฏิบัติงานนอกเวลา",
    orientation: "portrait",
    filename: "คำสั่งแต่งตั้ง",
    editLabel: "แก้ไขคำสั่ง",
  },
  2: {
    title: "บันทึกขออนุมัติขึ้นปฏิบัติงานนอกเวลาราชการ",
    orientation: "portrait",
    filename: "บันทึกขออนุมัติ",
    editLabel: "แก้ไขบันทึก",
  },
  3: {
    title: "ตารางการปฏิบัติงานนอกเวลาราชการ",
    orientation: "landscape",
    filename: "ตารางเวร",
    editLabel: "จัดตารางเวร",
  },
  4: {
    title: "บัญชีลงเวลาปฏิบัติงานนอกเวลาราชการ",
    orientation: "portrait",
    filename: "ใบรายชื่อเข้างาน",
    editLabel: "บันทึกการเข้างาน",
  },
  5: {
    title: "หลักฐานการจ่ายเงินค่าตอบแทน",
    orientation: "landscape",
    filename: "หลักฐานการจ่ายเงิน",
    editLabel: "ตรวจสอบการจ่ายเงิน",
  },
};

export function SetWorkspace({
  setId,
  step,
  onStepChange,
  onBack,
}: {
  setId: string;
  step: StepId;
  onStepChange: (step: StepId) => void;
  onBack: () => void;
}) {
  const { sets, settings, updateSet, markStepComplete: markStep } = useApp();
  const notify = useToast();
  const [editor, setEditor] = useState<EditorKind>(null);
  const set = sets.find((item) => item.id === setId);

  const meta = STEP_META[step];

  const staff = useMemo(
    () => (set ? getSetStaff(set, settings) : []),
    [set, settings],
  );
  const amount = set ? totalPayment(set, settings) : 0;
  const workDays = set
    ? new Set(set.assignments.map((assignment) => assignment.date)).size
    : 0;
  const absent = set
    ? Object.values(set.attendance).filter((record) => record.status === "absent").length
    : 0;

  if (!set) {
    return (
      <div className="page">
        <Card className="not-found">
          <h2>ไม่พบชุดเอกสารนี้</h2>
          <p>อาจถูกลบไปแล้ว หรือข้อมูลในเครื่องถูกกู้คืนจากไฟล์สำรองชุดอื่น</p>
          <Button variant="primary" onClick={onBack}>
            กลับหน้าหลัก
          </Button>
        </Card>
      </div>
    );
  }

  const unlocked = isStepUnlocked(set, step);

  const normalizeAttendance = (
    current: DocumentSet,
    assignments: Assignment[],
  ): Record<string, AttendanceRecord> => {
    const next: Record<string, AttendanceRecord> = {};
    for (const assignment of assignments) {
      const key = assignmentKey(assignment);
      const shift = getShift(settings, assignment.shiftId);
      next[key] =
        current.attendance[key] ?? {
          ...assignment,
          status: "present",
          timeIn: shift?.start,
          timeOut: shift?.end,
        };
    }
    return next;
  };

  const completeAndAdvance = (targetStep: StepId, message: string) => {
    markStep(set.id, targetStep);
    setEditor(null);
    notify(message);
    if (targetStep < 5) {
      onStepChange((targetStep + 1) as StepId);
    }
  };

  const saveOrder = (patch: {
    orderNumber: string;
    issueDate: string;
    controllerId: string;
    signatories: SignatoryMap;
  }) => {
    updateSet(set.id, (current) => ({ ...current, ...patch }));
    completeAndAdvance(1, "บันทึกคำสั่งแต่งตั้งแล้ว");
  };

  const saveMemo = (patch: {
    memoNumber: string;
    issueDate: string;
    controllerId: string;
    signatories: SignatoryMap;
  }) => {
    updateSet(set.id, (current) => ({ ...current, ...patch }));
    completeAndAdvance(2, "บันทึกข้อความขออนุมัติแล้ว");
  };

  const saveSchedule = (assignments: Assignment[]) => {
    const allowedDates = new Set(set.selectedDates);
    const cleaned = assignments.filter((assignment) => allowedDates.has(assignment.date));
    updateSet(set.id, (current) => ({
      ...current,
      assignments: cleaned,
      attendance: normalizeAttendance(current, cleaned),
    }));
    completeAndAdvance(3, "บันทึกตารางเวรแล้ว");
  };

  const saveAttendance = (attendance: Record<string, AttendanceRecord>) => {
    updateSet(set.id, (current) => ({ ...current, attendance }));
    completeAndAdvance(4, "บันทึกใบลงเวลาแล้ว ตารางเวรจะแสดงเครื่องหมาย – สำหรับผู้ที่ไม่มา");
  };

  const savePayment = (patch: {
    rateOverrides: Record<string, number>;
    paymentDate: string;
    signatories: SignatoryMap;
  }) => {
    updateSet(set.id, (current) => ({ ...current, ...patch }));
    markStep(set.id, 5);
    setEditor(null);
    notify("ชุดเอกสารเสร็จสมบูรณ์ พร้อมส่งออกและพิมพ์แล้ว");
  };

  const saveInfo = (patch: {
    title: string;
    issueDate: string;
    orderNumber: string;
    memoNumber: string;
    controllerId: string;
    org: DocumentSet["org"];
  }) => {
    const controller = staff.find((person) => person.id === patch.controllerId);
    updateSet(set.id, (current) => ({
      ...current,
      ...patch,
      signatories: controller
        ? {
            ...current.signatories,
            controller: {
              name: personFullName(controller),
              position: controller.position,
            },
          }
        : current.signatories,
    }));
    setEditor(null);
    notify("บันทึกข้อมูลชุดเอกสารแล้ว");
  };

  const renderDocument = () => {
    switch (step) {
      case 1:
        return <Form1Document set={set} settings={settings} />;
      case 2:
        return <Form2Document set={set} settings={settings} />;
      case 3:
        return <Form3Document set={set} settings={settings} />;
      case 4:
        return <Form4Document set={set} settings={settings} />;
      case 5:
        return <Form5Document set={set} settings={settings} />;
    }
  };

  return (
    <div className="page page--workspace">
      <div className="workspace-head">
        <button type="button" className="back-link" onClick={onBack}>
          <ArrowLeft size={16} /> กลับหน้าหลัก
        </button>
        <div className="workspace-head__row">
          <div className="workspace-head__title">
            <div className="workspace-head__eyebrow">
              <Badge tone={set.status === "completed" ? "green" : "gold"}>
                {set.status === "completed" ? "เสร็จสมบูรณ์" : "กำลังดำเนินการ"}
              </Badge>
            </div>
            <h1>{toArabicDigits(set.title)}</h1>
            <p>
              {formatNumberUi(workDays)} วันทำ · {formatNumberUi(staff.length)} คน ·{" "}
              {formatNumberUi(set.assignments.length)} เวร · ฿ {formatBahtUi(amount)}
              {absent > 0 && ` · ไม่มา ${formatNumberUi(absent)} เวร`}
            </p>
          </div>
          <div className="workspace-head__actions">
            <IconButton label="ข้อมูลชุดเอกสาร" onClick={() => setEditor("info")}>
              <Info size={17} />
            </IconButton>
            <IconButton label="ส่งออกเอกสาร" onClick={() => setEditor("export")}>
              <Download size={17} />
            </IconButton>
            <Button variant="primary" size="sm" onClick={() => setEditor(stepToEditor(step))}>
              <Pencil size={15} /> {meta.editLabel}
            </Button>
          </div>
        </div>
      </div>

      <div className="workspace-steps">
        <StepNav set={set} current={step} onSelect={onStepChange} />
      </div>

      {!unlocked ? (
        <Card className="locked-card">
          <span className="locked-card__icon">
            <Lock size={26} />
          </span>
          <h2>ยังไม่ถึงขั้นตอนนี้</h2>
          <p>บันทึกเอกสารขั้นก่อนหน้าให้เรียบร้อยก่อน ระบบจะปลดล็อกไฟล์ถัดไปให้อัตโนมัติ</p>
          <Button variant="primary" onClick={() => onStepChange((step - 1) as StepId)}>
            ไปขั้นที่แล้ว
          </Button>
        </Card>
      ) : (
        <>
          <PaperStage
            title={meta.title}
            orientation={meta.orientation}
            filename={`${set.title}_${meta.filename}`}
          >
            {renderDocument()}
          </PaperStage>
        </>
      )}

      {editor === "info" && (
        <SetInfoEditor
          set={set}
          settings={settings}
          onClose={() => setEditor(null)}
          onSave={saveInfo}
        />
      )}
      {editor === "order" && (
        <OrderEditor
          set={set}
          settings={settings}
          onClose={() => setEditor(null)}
          onSave={saveOrder}
        />
      )}
      {editor === "memo" && (
        <MemoEditor
          set={set}
          settings={settings}
          onClose={() => setEditor(null)}
          onSave={saveMemo}
        />
      )}
      {editor === "schedule" && (
        <ScheduleEditor
          set={set}
          settings={settings}
          onClose={() => setEditor(null)}
          onSave={saveSchedule}
        />
      )}
      {editor === "attendance" && (
        <AttendanceEditor
          set={set}
          settings={settings}
          onClose={() => setEditor(null)}
          onSave={saveAttendance}
        />
      )}
      {editor === "payment" && (
        <PaymentEditor
          set={set}
          settings={settings}
          onClose={() => setEditor(null)}
          onSave={savePayment}
        />
      )}
      {editor === "export" && (
        <ExportModal set={set} settings={settings} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}

function stepToEditor(step: StepId): EditorKind {
  switch (step) {
    case 1:
      return "order";
    case 2:
      return "memo";
    case 3:
      return "schedule";
    case 4:
      return "attendance";
    case 5:
      return "payment";
  }
}

import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  Printer,
} from "lucide-react";
import type { AppSettings, DocumentSet } from "../types";
import { Badge, Button, Modal, useToast } from "./ui";
import { exportMemoDocx, exportOrderDocx } from "../lib/export/word";
import {
  exportAttendanceXlsx,
  exportPaymentXlsx,
  exportScheduleXlsx,
} from "../lib/export/excel";

type Busy = string | null;

export function ExportModal({
  set,
  settings,
  onClose,
}: {
  set: DocumentSet;
  settings: AppSettings;
  onClose: () => void;
}) {
  const notify = useToast();
  const [busy, setBusy] = useState<Busy>(null);
  const hasSchedule = set.assignments.length > 0;

  const run = async (key: string, action: () => Promise<boolean>, success: string) => {
    setBusy(key);
    try {
      const saved = await action();
      if (saved) notify(success);
    } catch (error) {
      console.error(error);
      notify("ส่งออกไม่สำเร็จ กรุณาลองใหม่", "error");
    } finally {
      setBusy(null);
    }
  };

  const items = [
    {
      key: "order",
      step: 1,
      title: "คำสั่งแต่งตั้งเจ้าหน้าที่",
      subtitle: "เอกสารไฟล์ที่ 1",
      format: "Word (.docx)",
      icon: <FileText size={20} />,
      enabled: true,
      action: () => exportOrderDocx(set, settings),
    },
    {
      key: "memo",
      step: 2,
      title: "บันทึกขออนุมัติขึ้นปฏิบัติงานนอกเวลา",
      subtitle: "เอกสารไฟล์ที่ 2",
      format: "Word (.docx)",
      icon: <FileText size={20} />,
      enabled: true,
      action: () => exportMemoDocx(set, settings),
    },
    {
      key: "schedule",
      step: 3,
      title: "ตารางการปฏิบัติงานนอกเวลา",
      subtitle: "เอกสารไฟล์ที่ 3",
      format: "Excel (.xlsx)",
      icon: <FileSpreadsheet size={20} />,
      enabled: hasSchedule,
      action: () => exportScheduleXlsx(set, settings),
    },
    {
      key: "attendance",
      step: 4,
      title: "บัญชีลงเวลาปฏิบัติงาน",
      subtitle: "เอกสารไฟล์ที่ 4",
      format: "Excel (.xlsx)",
      icon: <FileSpreadsheet size={20} />,
      enabled: hasSchedule,
      action: () => exportAttendanceXlsx(set, settings),
    },
    {
      key: "payment",
      step: 5,
      title: "หลักฐานการจ่ายเงินค่าตอบแทน",
      subtitle: "เอกสารไฟล์ที่ 5",
      format: "Excel (.xlsx)",
      icon: <FileSpreadsheet size={20} />,
      enabled: hasSchedule,
      action: () => exportPaymentXlsx(set, settings),
    },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title="ส่งออกเอกสาร"
      subtitle="เลือกไฟล์ที่ต้องการ ระบบจะสร้างตามข้อมูลล่าสุดของชุดนี้"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            ปิด
          </Button>
        </>
      }
    >
      <div className="export-list">
        {items.map((item) => {
          const done = set.completedSteps.includes(item.step as 1 | 2 | 3 | 4 | 5);
          const locked = item.step > 1 && !done && !hasSchedule;
          return (
            <div key={item.key} className="export-item">
              <span className="export-item__icon">{item.icon}</span>
              <div className="export-item__text">
                <strong>{item.title}</strong>
                <span>
                  {item.subtitle} · {item.format}
                </span>
              </div>
              <div className="export-item__meta">
                {done ? (
                  <Badge tone="green">บันทึกแล้ว</Badge>
                ) : locked ? (
                  <Badge tone="neutral">
                    <Lock size={12} /> ยังไม่มีข้อมูล
                  </Badge>
                ) : (
                  <Badge tone="gold">ฉบับร่าง</Badge>
                )}
              </div>
              <Button
                size="sm"
                variant="soft"
                disabled={!item.enabled || busy !== null}
                onClick={() =>
                  run(item.key, item.action, `ส่งออก ${item.format} แล้ว`)
                }
              >
                <Download size={14} />
                {busy === item.key ? "กำลังสร้าง…" : "ดาวน์โหลด"}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="export-note">
        <Printer size={16} />
        <span>
          ต้องการไฟล์ PDF แบบไม่ต้องแก้ไข ใช้ปุ่ม <strong>PDF</strong> บนแถบตัวอย่างเอกสาร
          ด้านบน ระบบจะสร้าง PDF ตามขนาดกระดาษ A4 ของแต่ละฟอร์ม
        </span>
      </div>
    </Modal>
  );
}

import { useRef, useState } from "react";
import {
  Download,
  FolderDown,
  FileSpreadsheet,
  FileText,
  Lock,
  Printer,
} from "lucide-react";
import type { AppSettings, DocumentSet } from "../types";
import { Badge, Button, Modal, Segmented, useToast } from "./ui";
import { exportMemoDocx, exportOrderDocx } from "../lib/export/word";
import {
  exportAttendanceXlsx,
  exportPaymentXlsx,
  exportScheduleXlsx,
} from "../lib/export/excel";
import {
  exportAllFolder,
  exportAllPdf,
  type PdfContainers,
} from "../lib/export/folder";
import { getSetExchanges } from "../lib/selectors";
import { Form1Document } from "../forms/Form1Document";
import { Form2Document } from "../forms/Form2Document";
import { Form3Document } from "../forms/Form3Document";
import { Form4Document } from "../forms/Form4Document";
import { Form5Document } from "../forms/Form5Document";
import { ExchangeRequestDocument } from "../forms/ExchangeRequestDocument";

type Busy = string | null;
type BulkFormat = "office" | "pdf";

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
  const [bulkFormat, setBulkFormat] = useState<BulkFormat>("office");
  const [savedFolder, setSavedFolder] = useState<string | null>(null);
  const hasSchedule = set.assignments.length > 0;
  const exchanges = getSetExchanges(set);
  const orderRef = useRef<HTMLDivElement>(null);
  const memoRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const attendanceRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const exchangeRef = useRef<HTMLDivElement>(null);

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

  const handleBulkExport = async () => {
    setBusy("bulk");
    try {
      if (bulkFormat === "office") {
        const saved = await exportAllFolder(set, settings);
        if (saved) {
          setSavedFolder(saved);
          notify("บันทึกทั้ง 5 ไฟล์ลงโฟลเดอร์แล้ว");
        }
        return;
      }

      const saved = await exportAllPdf(set, {
        order: orderRef.current,
        memo: memoRef.current,
        schedule: scheduleRef.current,
        attendance: attendanceRef.current,
        payment: paymentRef.current,
        exchange: exchangeRef.current,
      });
      if (saved) {
        setSavedFolder(saved);
        notify("บันทึกเอกสารทั้งชุดเป็น PDF แล้ว");
      }
    } catch (error) {
      console.error(error);
      notify("ส่งออกเอกสารทั้งชุดไม่สำเร็จ กรุณาลองใหม่", "error");
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
      subtitle="เลือกไฟล์เดี่ยว หรือส่งออกทั้งชุดเป็น Word + Excel หรือ PDF"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            ปิด
          </Button>
          <Button
            variant="primary"
            onClick={handleBulkExport}
            disabled={!hasSchedule || busy !== null}
          >
            <FolderDown size={16} />
            {busy === "bulk"
              ? "กำลังสร้าง…"
              : bulkFormat === "pdf"
                ? "ส่งออกทั้งชุดเป็น PDF"
                : "ส่งออกทั้งชุด (Word + Excel)"}
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

      <div className="export-bulk">
        <div className="export-bulk__copy">
          <strong>รูปแบบการส่งออกทั้งชุด</strong>
          <span>เลือก Word + Excel สำหรับแก้ไข หรือ PDF สำหรับส่งและพิมพ์</span>
        </div>
        <Segmented
          value={bulkFormat}
          onChange={(value) => {
            setBulkFormat(value);
            setSavedFolder(null);
          }}
          options={[
            {
              value: "office",
              label: "Word + Excel",
              icon: <FileSpreadsheet size={14} />,
            },
            {
              value: "pdf",
              label: "PDF",
              icon: <FileText size={14} />,
            },
          ]}
        />
      </div>

      {bulkFormat === "pdf" && hasSchedule && (
        <div className="export-pdf-stage" aria-hidden="true">
          <div ref={orderRef}>
            <Form1Document set={set} settings={settings} />
          </div>
          <div ref={memoRef}>
            <Form2Document set={set} settings={settings} />
          </div>
          <div ref={scheduleRef}>
            <Form3Document set={set} settings={settings} />
          </div>
          <div ref={attendanceRef}>
            <Form4Document set={set} settings={settings} />
          </div>
          <div ref={paymentRef}>
            <Form5Document set={set} settings={settings} />
          </div>
          {exchanges.length > 0 && (
            <div ref={exchangeRef}>
              {exchanges.map((exchange) => (
                <ExchangeRequestDocument
                  key={exchange.id}
                  set={set}
                  settings={settings}
                  exchange={exchange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {savedFolder && (
        <div className="export-saved">
          <FolderDown size={17} />
          <div>
            <strong>บันทึกเอกสารทั้งชุดแล้ว</strong>
            <span>{savedFolder}</span>
          </div>
        </div>
      )}

      {exchanges.length > 0 && (
        <div className="export-note">
          <FileText size={16} />
          <span>
            มีใบแลกเปลี่ยนเวร {exchanges.length} รายการ
            ระบบจะรวมไฟล์{" "}
            <strong>
              {bulkFormat === "pdf" ? "PDF" : "Word"} 6 ใบขอแลกเปลี่ยนเวร
            </strong>{" "}
            ไว้ในชุดด้วย
          </span>
        </div>
      )}

      <div className="export-note">
        <Printer size={16} />
        <span>
          เลือก <strong>PDF</strong> ด้านบนเพื่อส่งออกทั้งชุด
          หรือใช้ปุ่ม PDF บนแถบตัวอย่างเอกสารสำหรับส่งออกทีละไฟล์
          ระบบจะสร้าง PDF ตามขนาดกระดาษ A4 ของแต่ละฟอร์ม
        </span>
      </div>
    </Modal>
  );
}
